# views.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Tuple, List, Dict, Any

from django.utils.text import slugify
from rest_framework import status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from firebase_admin import firestore

from api.settings import db  # Firestore Client

from .ai import (
    choose_model_for_summary,
    call_openai_on_chunks,
    generate_study_cards_json_from_summary,
    generate_quiz_from_summary,
)
from .chunking import split_into_chunks


# ---------------------------
# Konstante Plan-Regeln
# ---------------------------
BASIC = "basic"
PRIME = "prime"
ALLOWED_PLANS = {BASIC, PRIME}

PLAN_RULES = {
    BASIC: {
        "max_pages": 30,
        "monthly_limit": 25,
        "default_model": "gpt-5-nano-2025-08-07",
    },
    PRIME: {
        "max_pages": 80,
        "monthly_limit": 180,
        
    },
}

# ---------------------------
# Serializers
# ---------------------------
class GenerateProjectIn(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True)
    name = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=120)
    page_count = serializers.IntegerField(required=False, min_value=0, default=0)
    summary_variant = serializers.ChoiceField(choices=("small", "medium", "big"), required=True)
    min_pages = serializers.IntegerField(required=False, allow_null=True)
    max_pages = serializers.IntegerField(required=False, allow_null=True)

class ProjectActionIn(serializers.Serializer):
    name = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=120)


# ---------------------------
# Helper
# ---------------------------
def _now_month_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _safe_doc_id_from_name(name: str) -> str:
    """
    Firestore-Dokument-ID sicher machen, aber trotzdem stabil fürs Frontend:
    - slugify
    - notfalls Fallback auf einfache Ersetzung
    """
    slug = slugify(name)
    if not slug:
        slug = name.strip().replace(" ", "-").replace("/", "-")
    return slug[:120]


def _get_user_subscription(user_data: Dict[str, Any]) -> str:
    plan = (user_data.get("subscription") or BASIC).lower().strip()
    return plan if plan in ALLOWED_PLANS else BASIC


from firebase_admin import firestore

def _enforce_limits_and_increment(uid: str, page_count: int):
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def _txn(transaction, user_ref, page_count):
        # READ innerhalb der TX – wichtig: ref.get(transaction=transaction)
        snap = user_ref.get(transaction=transaction)
        user_data = snap.to_dict() or {}

        plan = _get_user_subscription(user_data)
        rules = PLAN_RULES[plan]

        # Seitenlimit
        if page_count > rules["max_pages"]:
            raise ValueError(f"{plan.capitalize()} plan allows max {rules['max_pages']} pages per PDF.")

        # Monatslogik
        now_month = _now_month_str()
        stored_month = (user_data.get("monthlyUploadsMonth") or "").strip()
        uploads = int(user_data.get("monthlyUploads", 0) or 0)

        if stored_month != now_month:
            uploads = 0
            user_data["monthlyUploads"] = 0
            user_data["monthlyUploadsMonth"] = now_month

        # Monatslimit
        if uploads >= rules["monthly_limit"]:
            raise PermissionError(
                f"Upload limit reached for {plan.capitalize()} plan ({rules['monthly_limit']} PDFs/month)."
            )

        uploads_after = uploads + 1
        user_data["monthlyUploads"] = uploads_after
        user_data["monthlyUploadsMonth"] = now_month
        user_data["monthlyUploadsUpdatedAt"] = firestore.SERVER_TIMESTAMP

        # WRITE innerhalb der TX – wichtig: transaction.set(...)
        transaction.set(user_ref, user_data, merge=True)

        return user_data, plan, uploads_after

    # So ruft man’s im Admin-Python-SDK auf:
    transaction = db.transaction()
    return _txn(transaction, user_ref, page_count)






def _load_project(uid: str, project_name: str) -> Tuple[firestore.DocumentReference, Dict[str, Any]]:
    user_ref = db.collection("users").document(uid)
    project_id = _safe_doc_id_from_name(project_name)
    project_ref = user_ref.collection("projects").document(project_id)
    snap = project_ref.get()
    return project_ref, (snap.to_dict() or {})


def _flatten_sections(structured: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    flat: List[Dict[str, Any]] = []
    for topic in structured or []:
        flat.extend(topic.get("sections", []) or [])
    return flat


# ---------------------------
# Endpoints
# ---------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_project(request):
    uid = request.user.username

    inp = GenerateProjectIn(data=request.data)
    if not inp.is_valid():
        return Response({"error": inp.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    
    variant = inp.validated_data.get("summary_variant")  
    min_pages = inp.validated_data.get("min_pages")
    max_pages = inp.validated_data.get("max_pages")

    if min_pages is None or max_pages is None:
        if variant == "small":
            min_pages, max_pages = 5, 10
        elif variant == "medium":
            min_pages, max_pages = 11, 20
        else:  
            min_pages, max_pages = 25, 35

    text = inp.validated_data["text"].strip()
    name = inp.validated_data["name"].strip()
    page_count = int(inp.validated_data.get("page_count", 0) or 0)

    if not text or not name:
        return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

    # Quoten + Monatswechsel atomisch
    try:
        user_after, plan, _uploads = _enforce_limits_and_increment(uid, page_count)
    except ValueError as ve:
        return Response({"error": str(ve)}, status=status.HTTP_400_BAD_REQUEST)
    except PermissionError as pe:
        return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({"error": f"Quota transaction failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Modellwahl
    model = choose_model_for_summary(plan=plan, text=text, page_count=page_count)

    variant = inp.validated_data.get("summary_variant")
    min_pages = inp.validated_data.get("min_pages")
    max_pages = inp.validated_data.get("max_pages")


    # Chunking + OpenAI
    chunks = split_into_chunks(text, max_tokens=2000, model_hint=model)
    try:
        structured_summary, total_tokens = call_openai_on_chunks(chunks, model=model, debug=False,  
        summary_variant=variant,
        min_pages=min_pages,
        max_pages=max_pages,)
    except Exception as e:
        # Rollback der Upload-Erhöhung ist hier i.d.R. nicht notwendig/üblich. Wir loggen nur sauber.
        return Response({"error": f"AI processing failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    # Projekt anlegen (ID aus Name stabilisiert)
    project_ref, existing = _load_project(uid, name)
    if existing.get("initialized") is True:
        return Response({"error": "Project already initialized"}, status=status.HTTP_409_CONFLICT)

    project_data = {
        "name": name,  # Originalname für Anzeige
        "structured": structured_summary,  # Liste von Topics
        "modelUsed": model,
        "tokenUsage": int(total_tokens or 0),
        "isComplex": bool(model.endswith("mini-2025-08-07")),  # Proxy für Komplexität
        "pageCount": int(page_count or 0),
        "createdAt": firestore.SERVER_TIMESTAMP,
        "initialized": True,
    }
    project_ref.set(project_data, merge=True)

    # Frontend-kompatible Response
    return Response(
        {
            "structured": structured_summary,
            "model_used": model,
            "token_usage": int(total_tokens or 0),
            "is_complex": bool(project_data["isComplex"]),
            "summary": None,
            "cards": None,
            "quiz": None,
            "summary_pdf_url": None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_cards(request):
    uid = request.user.username

    inp = ProjectActionIn(data=request.data)
    if not inp.is_valid():
        return Response({"error": inp.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    project_name = inp.validated_data["name"].strip()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    plan = _get_user_subscription(user_doc.to_dict() or {})
    if plan != PRIME:
        return Response({"error": "Only prime users can generate study cards"}, status=status.HTTP_403_FORBIDDEN)

    project_ref, project = _load_project(uid, project_name)
    if not project:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = project.get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    flat_sections = _flatten_sections(structured)

    try:
        # Prime → mini
        model = "gpt-5-mini-2025-08-07"
        cards = generate_study_cards_json_from_summary(flat_sections, model=model)
    except Exception as e:
        return Response({"error": f"Card generation failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    project_ref.update({"cards": cards})
    return Response({"status": "success", "cards": cards}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_quiz(request):
    uid = request.user.username

    inp = ProjectActionIn(data=request.data)
    if not inp.is_valid():
        return Response({"error": inp.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    project_name = inp.validated_data["name"].strip()
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    plan = _get_user_subscription(user_doc.to_dict() or {})
    if plan != PRIME:
        return Response({"error": "Only prime users can generate quizzes"}, status=status.HTTP_403_FORBIDDEN)

    project_ref, project = _load_project(uid, project_name)
    if not project:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = project.get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    flat_sections = _flatten_sections(structured)

    try:
        model = "gpt-5-mini-2025-08-07"
        quiz = generate_quiz_from_summary(flat_sections, model=model)
    except Exception as e:
        return Response({"error": f"Quiz generation failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    project_ref.update({"quiz": quiz})
    return Response({"quiz": quiz}, status=status.HTTP_200_OK)
