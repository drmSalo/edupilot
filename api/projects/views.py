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
import unicodedata

from api.settings import db  # Firestore Client

from .ai import (
    choose_model_for_summary,
    call_openai_on_chunks,
    generate_study_cards_json_from_summary,
    generate_quiz_from_summary,
)
from .chunking import split_into_chunks

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

# ---------------------------
# Pläne & Regeln
# ---------------------------
BASIC = "basic"
PRIME = "prime"
ALLOWED_PLANS = {BASIC, PRIME}

PLAN_RULES = {
    BASIC: {
        "max_pages": 0,         # Basic darf aktuell keine PDFs
        "monthly_limit": 0,
    },
    PRIME: {
        "max_pages": 420,       # max Seiten pro PDF
        "monthly_limit": 180,   # max PDF-Uploads/Monat
    },
}

# Globale Monatslimits (user-weit)
REGEN_LIMITS = {"cards": 5, "quiz": 5}

# ---------------------------
# Serializers
# ---------------------------
class GenerateProjectIn(serializers.Serializer):
    """
    Raw-Text-Pfad ohne Varianten. Nur text/name/(optional)page_count.
    """
    text = serializers.CharField(allow_blank=False, trim_whitespace=True)
    name = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=120)
    page_count = serializers.IntegerField(required=False, min_value=0, default=0)

class ProjectActionIn(serializers.Serializer):
    name = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=120)

# ---------------------------
# Helper
# ---------------------------
def _now_month_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")

def _safe_doc_id_from_name(name: str) -> str:
    slug = slugify(name)
    if not slug:
        slug = name.strip().replace(" ", "-").replace("/", "-")
    return slug[:120]

def _get_user_plan(uid: str) -> str:
    """
    Reads the user's plan from Firestore.
    Accepts: plan ('basic'|'prime'), OR legacy 'subscription',
    OR planStatus in {'active','trialing'} as 'prime'.
    """
    user_ref = db.collection("users").document(uid)
    snap = user_ref.get()
    data = snap.to_dict() or {}

    # primary
    plan = (data.get("plan") or "").strip().lower()
    # legacy/alt
    if not plan:
        sub = (data.get("subscription") or "").strip().lower()
        if sub in ALLOWED_PLANS:
            plan = sub
    if not plan:
        status = (data.get("planStatus") or "").strip().lower()
        if status in {"active", "trialing"}:
            plan = PRIME

    return plan if plan in ALLOWED_PLANS else BASIC

def _reset_month_if_needed(user_data: Dict[str, Any], now_month: str) -> Dict[str, Any]:
    stored_month = (user_data.get("monthlyUploadsMonth") or "").strip()
    if stored_month != now_month:
        user_data["monthlyUploads"] = 0
        user_data["monthlyUploadsMonth"] = now_month

    regen_month = (user_data.get("monthlyRegenMonth") or "").strip()
    if regen_month != now_month:
        user_data["monthlyCardsRegen"] = 0
        user_data["monthlyQuizRegen"] = 0
        user_data["monthlyRegenMonth"] = now_month

    # --- IMPORTANT: resolve plan from multiple fields (plan, subscription, planStatus)
    plan_field = (user_data.get("plan") or "").strip().lower()
    sub_field = (user_data.get("subscription") or "").strip().lower()
    status_field = (user_data.get("planStatus") or "").strip().lower()

    if plan_field in {"prime", "basic"}:
        resolved_plan = plan_field
    elif sub_field in {"prime", "basic"}:
        resolved_plan = sub_field
    elif status_field in {"active", "trialing"}:
        resolved_plan = "prime"
    else:
        resolved_plan = "basic"

    rules = PLAN_RULES[resolved_plan] if resolved_plan in PLAN_RULES else PLAN_RULES[BASIC]

    # Override if present
    limit_override = user_data.get("monthlyLimitOverride")
    pdf_monthly_limit = int(limit_override) if isinstance(limit_override, int) else int(rules["monthly_limit"])

    # Persist both the nested and (optionally) a top-level mirror for easy UI/debug
    user_data["limits"] = {
        "pdfMonthlyLimit": pdf_monthly_limit,
        "cardsRegenMonthlyLimit": REGEN_LIMITS["cards"],
        "quizRegenMonthlyLimit": REGEN_LIMITS["quiz"],
    }
    # Optional: top-level mirror so you can see "monthlyLimit: 180" in Firestore UI
    user_data["monthlyLimit"] = pdf_monthly_limit

    user_data["countersUpdatedAt"] = firestore.SERVER_TIMESTAMP
    user_data["countersMonth"] = now_month
    return user_data


def _enforce_limits_and_increment(uid: str, page_count: int):
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def _txn(transaction, user_ref, page_count):
        snap = user_ref.get(transaction=transaction)
        user_data = snap.to_dict() or {}

        user_plan = _get_user_plan(uid)
        rules = PLAN_RULES[user_plan]
        now_month = _now_month_str()

        user_data = _reset_month_if_needed(user_data, now_month)

        if page_count > rules["max_pages"]:
            raise PermissionError(
                f"{user_plan.capitalize()} plan allows max {rules['max_pages']} pages per PDF."
            )

        uploads = int(user_data.get("monthlyUploads", 0) or 0)

        # --- NEW: Monatslimit via Override oder Plan ---
        limit_override = user_data.get("monthlyLimitOverride")
        monthly_limit = int(limit_override) if isinstance(limit_override, int) else int(rules["monthly_limit"])

        if uploads >= monthly_limit:
            raise PermissionError(
                f"Upload limit reached for {user_plan.capitalize()} plan ({monthly_limit} PDFs/month)."
            )

        uploads_after = uploads + 1
        user_data["monthlyUploads"] = uploads_after
        user_data["monthlyUploadsUpdatedAt"] = firestore.SERVER_TIMESTAMP

        transaction.set(user_ref, user_data, merge=True)
        return user_data, user_plan, uploads_after

    transaction = db.transaction()
    return _txn(transaction, user_ref, page_count)

def _require_prime(uid: str):
    if _get_user_plan(uid) != PRIME:
        raise PermissionError("Prime subscription required.")

def _enforce_and_increment_cards_regen(uid: str):
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def _txn(transaction, user_ref):
        snap = user_ref.get(transaction=transaction)
        user_data = snap.to_dict() or {}
        now_month = _now_month_str()
        user_data = _reset_month_if_needed(user_data, now_month)

        used = int(user_data.get("monthlyCardsRegen", 0) or 0)
        if used >= REGEN_LIMITS["cards"]:
            raise PermissionError(f"Monthly study card regenerations exhausted ({REGEN_LIMITS['cards']}).")

        user_data["monthlyCardsRegen"] = used + 1
        user_data["monthlyRegenMonth"] = now_month
        user_data["monthlyRegenUpdatedAt"] = firestore.SERVER_TIMESTAMP

        transaction.set(user_ref, user_data, merge=True)
        return user_data, used + 1

    transaction = db.transaction()
    return _txn(transaction, user_ref)

def _enforce_and_increment_quiz_regen(uid: str):
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def _txn(transaction, user_ref):
        snap = user_ref.get(transaction=transaction)
        user_data = snap.to_dict() or {}
        now_month = _now_month_str()
        user_data = _reset_month_if_needed(user_data, now_month)

        used = int(user_data.get("monthlyQuizRegen", 0) or 0)
        if used >= REGEN_LIMITS["quiz"]:
            raise PermissionError(f"Monthly study quiz regenerations exhausted ({REGEN_LIMITS['quiz']}).")

        user_data["monthlyQuizRegen"] = used + 1
        user_data["monthlyRegenMonth"] = now_month
        user_data["monthlyRegenUpdatedAt"] = firestore.SERVER_TIMESTAMP

        transaction.set(user_ref, user_data, merge=True)
        return user_data, used + 1

    transaction = db.transaction()
    return _txn(transaction, user_ref)

def _uploads_left_snapshot(uid: str) -> Dict[str, Any]:
    user_ref = db.collection("users").document(uid)
    snap = user_ref.get()
    data = snap.to_dict() or {}

    now_month = _now_month_str()
    data = _reset_month_if_needed(data, now_month)

    user_plan = (data.get("plan") or BASIC).strip().lower()
    rules = PLAN_RULES[user_plan] if user_plan in PLAN_RULES else PLAN_RULES[BASIC]

    limit_override = data.get("monthlyLimitOverride")
    limit_ = int(limit_override) if isinstance(limit_override, int) else int(rules["monthly_limit"])

    used_uploads = int(data.get("monthlyUploads", 0) or 0)
    left_uploads = max(0, limit_ - used_uploads)

    used_cards = int(data.get("monthlyCardsRegen", 0) or 0)
    used_quiz = int(data.get("monthlyQuizRegen", 0) or 0)
    left_cards = max(0, REGEN_LIMITS["cards"] - used_cards)
    left_quiz = max(0, REGEN_LIMITS["quiz"] - used_quiz)

    return {
        "plan": user_plan,
        "monthly_limit": limit_,
        "uploads_used_this_month": used_uploads,
        "uploads_left_this_month": left_uploads,
        "cards_regen_used_this_month": used_cards,
        "cards_regen_left_this_month": left_cards,
        "quiz_regen_used_this_month": used_quiz,
        "quiz_regen_left_this_month": left_quiz,
        "month": now_month,
    }

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

# ===========================
# Projektbezogene Re-Gens (5/Monat je Projekt)
# ===========================
PROJECT_REGEN_LIMITS = {"cards": 5, "quiz": 5}

def _reset_month_on_project_if_needed(project_data: Dict[str, Any], now_month: str) -> Dict[str, Any]:
    regen_month = (project_data.get("monthlyRegenMonth") or "").strip()
    if regen_month != now_month:
        project_data["monthlyCardsRegen"] = 0
        project_data["monthlyQuizRegen"] = 0
        project_data["monthlyRegenMonth"] = now_month
    return project_data

def _enforce_and_increment_cards_regen_for_project(uid: str, project_name: str) -> Tuple[Dict[str, Any], int, int]:
    user_ref = db.collection("users").document(uid)
    project_id = _safe_doc_id_from_name(project_name)
    project_ref = user_ref.collection("projects").document(project_id)

    @firestore.transactional
    def _txn(transaction, project_ref):
        snap = project_ref.get(transaction=transaction)
        project_data = snap.to_dict() or {}
        now_month = _now_month_str()

        project_data = _reset_month_on_project_if_needed(project_data, now_month)

        used = int(project_data.get("monthlyCardsRegen", 0) or 0)
        limit_ = PROJECT_REGEN_LIMITS["cards"]
        if used >= limit_:
            raise PermissionError(f"Monthly study card regenerations for this project exhausted ({limit_}).")

        used_after = used + 1
        project_data["monthlyCardsRegen"] = used_after
        project_data["monthlyRegenMonth"] = now_month
        project_data["monthlyRegenUpdatedAt"] = firestore.SERVER_TIMESTAMP

        transaction.set(project_ref, project_data, merge=True)
        left_after = max(0, limit_ - used_after)
        return project_data, used_after, left_after

    transaction = db.transaction()
    return _txn(transaction, project_ref)

def _enforce_and_increment_quiz_regen_for_project(uid: str, project_name: str) -> Tuple[Dict[str, Any], int, int]:
    user_ref = db.collection("users").document(uid)
    project_id = _safe_doc_id_from_name(project_name)
    project_ref = user_ref.collection("projects").document(project_id)

    @firestore.transactional
    def _txn(transaction, project_ref):
        snap = project_ref.get(transaction=transaction)
        project_data = snap.to_dict() or {}
        now_month = _now_month_str()

        project_data = _reset_month_on_project_if_needed(project_data, now_month)

        used = int(project_data.get("monthlyQuizRegen", 0) or 0)
        limit_ = PROJECT_REGEN_LIMITS["quiz"]
        if used >= limit_:
            raise PermissionError(f"Monthly study quiz regenerations for this project exhausted ({limit_}).")

        used_after = used + 1
        project_data["monthlyQuizRegen"] = used_after
        project_data["monthlyRegenMonth"] = now_month
        project_data["monthlyRegenUpdatedAt"] = firestore.SERVER_TIMESTAMP

        transaction.set(project_ref, project_data, merge=True)
        left_after = max(0, limit_ - used_after)
        return project_data, used_after, left_after

    transaction = db.transaction()
    return _txn(transaction, project_ref)

# ---------------------------
# Endpoints
# ---------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_project(request):
    """
    Erstellt IMMER eine 'normale' Zusammenfassung, intern wie SMALL:
    min_pages=5, max_pages=10. Keine Varianten mehr.
    """
    uid = request.user.username

    has_file = bool(request.FILES.get("file"))
    # Standard-Parameter für "normale" Zusammenfassung
    min_pages, max_pages = 5, 10
    summary_variant = "small"  # intern so behandeln

    if has_file:
        # ---- PDF Upload Pfad ----
        pdf_file = request.FILES["file"]
        name = (request.POST.get("name") or "").strip()

        if not name:
            return Response({"error": "Missing name"}, status=status.HTTP_400_BAD_REQUEST)

        if fitz is None:
            return Response(
                {"error": "PyMuPDF not installed. Run `pip install pymupdf`"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            pdf_bytes = pdf_file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = doc.page_count
            pages_text = [pg.get_text("text") for pg in doc]
            doc.close()
            raw_text = "\n".join(pages_text)
            text = unicodedata.normalize("NFC", raw_text)
        except Exception as e:
            return Response({"error": f"PDF extraction failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    else:
        # ---- Raw Text Pfad ----
        inp = GenerateProjectIn(data=request.data)
        if not inp.is_valid():
            return Response({"error": inp.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        text = inp.validated_data["text"].strip()
        name = inp.validated_data["name"].strip()
        page_count = int(inp.validated_data.get("page_count", 0) or 0)

        if not text or not name:
            return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

    # Quotas: PDF-Upload/Creation (nutzt echten User-Plan)
    try:
        _user_after, plan, _uploads = _enforce_limits_and_increment(uid, page_count)
    except PermissionError as pe:
        return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({"error": f"Quota transaction failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Modellwahl + Chunking + LLM
    model = choose_model_for_summary(plan=plan, text=text, page_count=page_count)
    chunks = split_into_chunks(text, max_tokens=2000, model_hint=model)
    try:
        structured_summary, total_tokens = call_openai_on_chunks(
            chunks,
            model=model,
            debug=False,
            summary_variant=summary_variant,  # immer "small"-artig
            min_pages=min_pages,
            max_pages=max_pages,
        )
    except Exception as e:
        return Response({"error": f"AI processing failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    # Projekt schreiben
    project_ref, existing = _load_project(uid, name)
    if existing.get("initialized") is True:
        return Response({"error": "Project already initialized"}, status=status.HTTP_409_CONFLICT)

    project_data = {
        "name": name,
        "structured": structured_summary,
        "modelUsed": model,
        "isComplex": bool(model.endswith("mini-2025-08-07")),
        "pageCount": int(page_count or 0),
        "createdAt": firestore.SERVER_TIMESTAMP,
        "initialized": True,
        # Projekt-Zähler initialisieren (Cards & Quiz)
        "monthlyCardsRegen": 0,
        "monthlyQuizRegen": 0,
        "monthlyRegenMonth": _now_month_str(),
    }
    project_ref.set(project_data, merge=True)

    # Restkontingente
    allowances = _uploads_left_snapshot(uid)

    return Response(
        {
            "structured": structured_summary,
            "model_used": model,
            "is_complex": bool(project_data["isComplex"]),
            "page_count": int(page_count or 0),
            "summary": None,
            "cards": None,
            "quiz": None,
            "summary_pdf_url": None,
            # Quotas: PDFs + Re-Generierungen
            "plan": allowances["plan"],
            "monthly_limit": allowances["monthly_limit"],
            "uploads_used_this_month": allowances["uploads_used_this_month"],
            "uploads_left_this_month": allowances["uploads_left_this_month"],
            "cards_regen_used_this_month": allowances["cards_regen_used_this_month"],
            "cards_regen_left_this_month": allowances["cards_regen_left_this_month"],
            "quiz_regen_used_this_month": allowances["quiz_regen_used_this_month"],
            "quiz_regen_left_this_month": allowances["quiz_regen_left_this_month"],
            "month": allowances["month"],
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_cards(request):
    uid = request.user.username

    # Harte Paywall für Cards
    try:
        _require_prime(uid)
    except PermissionError:
        return Response(
            {
                "error": "Prime subscription required. Please purchase the subscription to use this feature.",
                "code": "subscription_required",
                "required_plan": PRIME,
            },
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    inp = ProjectActionIn(data=request.data)
    if not inp.is_valid():
        return Response({"error": inp.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    project_name = inp.validated_data["name"].strip()

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    project_ref, project = _load_project(uid, project_name)
    if not project:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = project.get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    # Projektbezogenes Monatslimit prüfen + inkrementieren (atomar)
    try:
        project_after, used_now, left_now = _enforce_and_increment_cards_regen_for_project(uid, project_name)
    except PermissionError as pe:
        return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({"error": f"Cards quota transaction failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    flat_sections = _flatten_sections(structured)

    try:
        model = "gpt-5-mini-2025-08-07"  # PRIME → mini
        cards = generate_study_cards_json_from_summary(flat_sections, model=model)
    except Exception as e:
        return Response({"error": f"Card generation failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    project_ref.update({
        "cards": cards,
        "monthlyCardsRegen": project_after.get("monthlyCardsRegen", used_now),
        "monthlyRegenMonth": project_after.get("monthlyRegenMonth", _now_month_str()),
        "monthlyRegenUpdatedAt": firestore.SERVER_TIMESTAMP,
    })

    allowances = _uploads_left_snapshot(uid)
    return Response(
        {
            "status": "success",
            "cards": cards,
            # Globale Quotas (User)
            "uploads_left_this_month": allowances["uploads_left_this_month"],
            "cards_regen_left_this_month": allowances["cards_regen_left_this_month"],
            "quiz_regen_left_this_month": allowances["quiz_regen_left_this_month"],
            "month": allowances["month"],
            # Projektbezogene Infos (Cards)
            "project_cards_regen_used_this_month": int(project_after.get("monthlyCardsRegen", used_now)),
            "project_cards_regen_left_this_month": int(left_now),
            "project_cards_regen_month": project_after.get("monthlyRegenMonth", _now_month_str()),
            "project_cards_regen_monthly_limit": PROJECT_REGEN_LIMITS["cards"],
        },
        status=status.HTTP_200_OK,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_quiz(request):
    uid = request.user.username

    # Harte Paywall für Quiz
    try:
        _require_prime(uid)
    except PermissionError:
        return Response(
            {
                "error": "Prime subscription required. Please purchase the subscription to use this feature.",
                "code": "subscription_required",
                "required_plan": PRIME,
            },
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )

    inp = ProjectActionIn(data=request.data)
    if not inp.is_valid():
        return Response({"error": inp.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    project_name = inp.validated_data["name"].strip()

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    project_ref, project = _load_project(uid, project_name)
    if not project:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = project.get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    # Projektbezogenes Monatslimit prüfen + inkrementieren (atomar)
    try:
        project_after, used_now, left_now = _enforce_and_increment_quiz_regen_for_project(uid, project_name)
    except PermissionError as pe:
        return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({"error": f"Quiz quota transaction failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    flat_sections = _flatten_sections(structured)

    try:
        model = "gpt-5-mini-2025-08-07"
        quiz = generate_quiz_from_summary(flat_sections, model=model)
    except Exception as e:
        return Response({"error": f"Quiz generation failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    project_ref.update({
        "quiz": quiz,
        "monthlyQuizRegen": project_after.get("monthlyQuizRegen", used_now),
        "monthlyRegenMonth": project_after.get("monthlyRegenMonth", _now_month_str()),
        "monthlyRegenUpdatedAt": firestore.SERVER_TIMESTAMP,
    })

    allowances = _uploads_left_snapshot(uid)
    return Response(
        {
            "status": "success",
            "quiz": quiz,
            # Globale Quotas (User)
            "uploads_left_this_month": allowances["uploads_left_this_month"],
            "cards_regen_left_this_month": allowances["cards_regen_left_this_month"],
            "quiz_regen_left_this_month": allowances["quiz_regen_left_this_month"],
            "month": allowances["month"],
            # Projektbezogene Infos (Quiz)
            "project_quiz_regen_used_this_month": int(project_after.get("monthlyQuizRegen", used_now)),
            "project_quiz_regen_left_this_month": int(left_now),
            "project_quiz_regen_month": project_after.get("monthlyRegenMonth", _now_month_str()),
            "project_quiz_regen_monthly_limit": PROJECT_REGEN_LIMITS["quiz"],
        },
        status=status.HTTP_200_OK,
    )
