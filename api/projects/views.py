# views.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Tuple, List, Dict, Any, Literal, Optional

from django.utils.text import slugify
from rest_framework import status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from firebase_admin import firestore
import unicodedata

from api.settings import db  # Firestore Admin Client

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
# Plans & Limits
# ---------------------------
Plan = Literal["basic", "prime"]
BASIC: Plan = "basic"
PRIME: Plan = "prime"
ALLOWED_PLANS: set[str] = {BASIC, PRIME}

# Userweite Regeln
PLAN_RULES: Dict[Plan, Dict[str, int]] = {
    BASIC: {"max_pages": 0, "monthly_limit": 0},
    PRIME: {"max_pages": 420, "monthly_limit": 180},
}

# Userweite Monats-Regens (falls noch genutzt)
REGEN_LIMITS = {"cards": 5, "quiz": 5}

# Projektbezogene Regens → ALL-TIME (nicht mehr monatsbasiert)
PROJECT_REGEN_LIMITS = {"cards": 5, "quiz": 5}


# ---------------------------
# Serializers
# ---------------------------
class GenerateProjectIn(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True)
    name = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=120)
    page_count = serializers.IntegerField(required=False, min_value=0, default=0)


class ProjectActionIn(serializers.Serializer):
    # Für Abwärtskompatibilität: Frontend übergibt den Projektnamen
    name = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=120)


# ---------------------------
# Helpers
# ---------------------------
def _now_month_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _safe_doc_id_from_name(name: str) -> str:
    slug = slugify(name)
    if not slug:
        slug = name.strip().replace(" ", "-").replace("/", "-")
    return slug[:120] or "project"


def _resolve_plan_from_user(data: Dict[str, Any]) -> Plan:
    """
    Bevorzugt 'plan', fällt zurück auf 'subscription', dann Status.
    """
    plan = (data.get("plan") or "").strip().lower()
    if plan in ALLOWED_PLANS:
        return plan  # type: ignore[return-value]
    sub = (data.get("subscription") or "").strip().lower()
    if sub in ALLOWED_PLANS:
        return sub  # type: ignore[return-value]
    status_txt = (data.get("planStatus") or "").strip().lower()
    if status_txt in {"active", "trialing"}:
        return PRIME
    return BASIC


def _reset_user_counters_if_needed(user_data: Dict[str, Any], now_month: str) -> Dict[str, Any]:
    """
    Resettet NUR userweite Zähler auf Monatswechsel. Projekt-Regens bleiben ALL-TIME.
    Setzt dabei Limits-Snapshot gemäß aktuellem Plan/Override.
    """
    # Monatliche Uploads
    if (user_data.get("monthlyUploadsMonth") or "") != now_month:
        user_data["monthlyUploads"] = 0
        user_data["monthlyUploadsMonth"] = now_month

    # Userweite Regens (falls weiter genutzt)
    if (user_data.get("monthlyRegenMonth") or "") != now_month:
        user_data["monthlyCardsRegen"] = 0
        user_data["monthlyQuizRegen"] = 0
        user_data["monthlyRegenMonth"] = now_month

    # Plan → Limits
    resolved_plan = _resolve_plan_from_user(user_data)
    rules = PLAN_RULES[resolved_plan]

    limit_override = user_data.get("monthlyLimitOverride")
    pdf_monthly_limit = (
        int(limit_override) if isinstance(limit_override, int) else int(rules["monthly_limit"])
    )

    user_data["limits"] = {
        "pdfMonthlyLimit": pdf_monthly_limit,
        "cardsRegenMonthlyLimit": REGEN_LIMITS["cards"],
        "quizRegenMonthlyLimit": REGEN_LIMITS["quiz"],
    }
    user_data["monthlyLimit"] = pdf_monthly_limit  # falls Frontend das Feld noch nutzt

    user_data["countersUpdatedAt"] = firestore.SERVER_TIMESTAMP
    user_data["countersMonth"] = now_month
    return user_data


def _get_user_plan(uid: str) -> Plan:
    snap = db.collection("users").document(uid).get()
    return _resolve_plan_from_user(snap.to_dict() or {})


def _enforce_upload_limits_and_increment(uid: str, page_count: int) -> tuple[Dict[str, Any], Plan, int]:
    """
    Transaktion: prüft max_pages / monthly_limit und inkrementiert 'monthlyUploads'.
    Gibt snapshot-ähnliche Daten + Plan + neue Uploads-Anzahl zurück.
    """
    user_ref = db.collection("users").document(uid)

    @firestore.transactional
    def _txn(transaction, user_ref, page_count):
        snap = user_ref.get(transaction=transaction)
        user_data = snap.to_dict() or {}

        user_plan = _resolve_plan_from_user(user_data)
        rules = PLAN_RULES[user_plan]
        now_month = _now_month_str()

        user_data = _reset_user_counters_if_needed(user_data, now_month)

        if page_count > rules["max_pages"]:
            raise PermissionError(
                f"{user_plan.capitalize()} plan allows max {rules['max_pages']} pages per PDF."
            )

        uploads = int(user_data.get("monthlyUploads", 0) or 0)

        limit_override = user_data.get("monthlyLimitOverride")
        monthly_limit = (
            int(limit_override) if isinstance(limit_override, int) else int(rules["monthly_limit"])
        )

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


def _uploads_left_snapshot(uid: str) -> Dict[str, Any]:
    """
    Liefert konsistente userweite Quoten (inkl. Quiz-Kennzahlen).
    """
    snap = db.collection("users").document(uid).get()
    data = snap.to_dict() or {}

    now_month = _now_month_str()
    data = _reset_user_counters_if_needed(data, now_month)

    plan = _resolve_plan_from_user(data)
    rules = PLAN_RULES[plan]

    limit_override = data.get("monthlyLimitOverride")
    monthly_limit = int(limit_override) if isinstance(limit_override, int) else int(rules["monthly_limit"])

    used_uploads = int(data.get("monthlyUploads", 0) or 0)
    left_uploads = max(0, monthly_limit - used_uploads)

    used_cards = int(data.get("monthlyCardsRegen", 0) or 0)
    left_cards = max(0, REGEN_LIMITS["cards"] - used_cards)

    used_quiz = int(data.get("monthlyQuizRegen", 0) or 0)
    left_quiz = max(0, REGEN_LIMITS["quiz"] - used_quiz)

    return {
        "plan": plan,
        "monthly_limit": monthly_limit,
        "uploads_used_this_month": used_uploads,
        "uploads_left_this_month": left_uploads,
        "cards_regen_used_this_month": used_cards,
        "cards_regen_left_this_month": left_cards,
        "quiz_regen_used_this_month": used_quiz,
        "quiz_regen_left_this_month": left_quiz,
        "month": now_month,
    }


def _load_project(uid: str, project_name: str) -> Tuple[firestore.DocumentReference, Dict[str, Any]]:
    project_id = _safe_doc_id_from_name(project_name)
    project_ref = db.collection("users").document(uid).collection("projects").document(project_id)
    snap = project_ref.get()
    return project_ref, (snap.to_dict() or {})


def _flatten_sections(structured: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    flat: List[Dict[str, Any]] = []
    for topic in structured or []:
        flat.extend(topic.get("sections", []) or [])
    return flat


# ---------------------------
# Projekt-Regens (ALL-TIME)
# ---------------------------
def _inc_project_cards_regen(uid: str, project_name: str) -> tuple[Dict[str, Any], int, int]:
    """
    Erhöht ALL-TIME Karten-Regen (Feldname verbleibt 'monthlyCardsRegen' aus Back-compat).
    """
    project_id = _safe_doc_id_from_name(project_name)
    project_ref = db.collection("users").document(uid).collection("projects").document(project_id)

    @firestore.transactional
    def _txn(transaction, project_ref):
        snap = project_ref.get(transaction=transaction)
        project_data = snap.to_dict() or {}

        used = int(project_data.get("monthlyCardsRegen", 0) or 0)
        limit_ = PROJECT_REGEN_LIMITS["cards"]
        if used >= limit_:
            raise PermissionError(f"Study card regenerations for this project exhausted ({limit_} total).")

        used_after = used + 1
        project_data["monthlyCardsRegen"] = used_after
        project_data["monthlyRegenUpdatedAt"] = firestore.SERVER_TIMESTAMP

        transaction.set(project_ref, project_data, merge=True)
        left_after = max(0, limit_ - used_after)
        return project_data, used_after, left_after

    transaction = db.transaction()
    return _txn(transaction, project_ref)


def _inc_project_quiz_regen(uid: str, project_name: str) -> tuple[Dict[str, Any], int, int]:
    """
    Erhöht ALL-TIME Quiz-Regen (Feldname 'monthlyQuizRegen' aus Back-compat).
    """
    project_id = _safe_doc_id_from_name(project_name)
    project_ref = db.collection("users").document(uid).collection("projects").document(project_id)

    @firestore.transactional
    def _txn(transaction, project_ref):
        snap = project_ref.get(transaction=transaction)
        project_data = snap.to_dict() or {}

        used = int(project_data.get("monthlyQuizRegen", 0) or 0)
        limit_ = PROJECT_REGEN_LIMITS["quiz"]
        if used >= limit_:
            raise PermissionError(f"Quiz regenerations for this project exhausted ({limit_} total).")

        used_after = used + 1
        project_data["monthlyQuizRegen"] = used_after
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
    Erstellt IMMER eine kompakte Zusammenfassung (variant='small').
    Eingabe: PDF (multipart, Feld 'file') ODER text+name JSON.
    """
    uid = request.user.username

    has_file = bool(request.FILES.get("file"))
    min_pages, max_pages = 5, 10
    summary_variant = "small"

    page_count = 0
    name = ""
    text = ""

    if has_file:
        if fitz is None:
            return Response(
                {"error": "PyMuPDF not installed. Run `pip install pymupdf`"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        pdf_file = request.FILES["file"]
        name = (request.POST.get("name") or "").strip()
        if not name:
            return Response({"error": "Missing name"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pdf_bytes = pdf_file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = int(doc.page_count or 0)
            # Für sehr große PDFs: ggf. früh abbrechen (bereits durch Limits geschützt)
            pages_text = [pg.get_text("text") for pg in doc]
            doc.close()
            raw_text = "\n".join(pages_text)
            text = unicodedata.normalize("NFC", raw_text or "")
        except Exception as e:
            return Response({"error": f"PDF extraction failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    else:
        inp = GenerateProjectIn(data=request.data)
        if not inp.is_valid():
            return Response({"error": inp.errors}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        text = (inp.validated_data["text"] or "").strip()
        name = (inp.validated_data["name"] or "").strip()
        page_count = int(inp.validated_data.get("page_count", 0) or 0)

        if not text or not name:
            return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

    # Quotas (userweit)
    try:
        _user_after, plan, _uploads = _enforce_upload_limits_and_increment(uid, page_count)
    except PermissionError as pe:
        return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({"error": f"Quota transaction failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    model = choose_model_for_summary(plan=plan, text=text, page_count=page_count)
    chunks = split_into_chunks(text, max_tokens=2000, model_hint=model)

    try:
        structured_summary, total_tokens = call_openai_on_chunks(
            chunks,
            model=model,
            debug=False,
            summary_variant=summary_variant,
            min_pages=min_pages,
            max_pages=max_pages,
        )
    except Exception as e:
        return Response({"error": f"AI processing failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    project_ref, existing = _load_project(uid, name)
    if existing.get("initialized") is True:
        return Response({"error": "Project already initialized"}, status=status.HTTP_409_CONFLICT)

    project_data = {
        "name": name,
        "structured": structured_summary,
        "modelUsed": model,
        "isComplex": bool(str(model).endswith("mini-2025-08-07")),
        "pageCount": int(page_count or 0),
        "createdAt": firestore.SERVER_TIMESTAMP,
        "initialized": True,
        # Projekt-Regens (ALL-TIME)
        "monthlyCardsRegen": 0,
        "monthlyQuizRegen": 0,
    }
    project_ref.set(project_data, merge=True)

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
            # Userweite Quoten
            "plan": allowances["plan"],
            "monthly_limit": allowances["monthly_limit"],
            "uploads_used_this_month": allowances["uploads_used_this_month"],
            "uploads_left_this_month": allowances["uploads_left_this_month"],
            "cards_regen_used_this_month": allowances["cards_regen_used_this_month"],
            "cards_regen_left_this_month": allowances["cards_regen_left_this_month"],
            "quiz_regen_used_this_month": allowances["quiz_regen_used_this_month"],
            "quiz_regen_left_this_month": allowances["quiz_regen_left_this_month"],
            "month": allowances["month"],
            # Projektbezogene Totals (ALL-TIME)
            "project_cards_regen_used_total": 0,
            "project_cards_regen_left_total": PROJECT_REGEN_LIMITS["cards"],
            "project_quiz_regen_used_total": 0,
            "project_quiz_regen_left_total": PROJECT_REGEN_LIMITS["quiz"],
            # Back-compat Aliase (identisch)
            "project_cards_regen_used_this_month": 0,
            "project_cards_regen_left_this_month": PROJECT_REGEN_LIMITS["cards"],
            "project_quiz_regen_used_this_month": 0,
            "project_quiz_regen_left_this_month": PROJECT_REGEN_LIMITS["quiz"],
            "project_cards_regen_month": "ALL_TIME",
            "project_quiz_regen_month": "ALL_TIME",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_cards(request):
    uid = request.user.username

    # Paywall (serverseitig – nicht nur UI)
    if _get_user_plan(uid) != PRIME:
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

    project_ref, project = _load_project(uid, project_name)
    if not project:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = project.get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    # Projekt-ALL-TIME-Limit prüfen + inkrementieren
    try:
        project_after, used_now, left_now = _inc_project_cards_regen(uid, project_name)
    except PermissionError as pe:
        return Response({"error": str(pe)}, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        return Response({"error": f"Cards quota transaction failed: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    flat_sections = _flatten_sections(structured)
    try:
        model = "gpt-5-mini-2025-08-07"
        cards = generate_study_cards_json_from_summary(flat_sections, model=model)
    except Exception as e:
        return Response({"error": f"Card generation failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

    project_ref.update(
        {
            "cards": cards,
            "monthlyCardsRegen": project_after.get("monthlyCardsRegen", used_now),
            "monthlyRegenUpdatedAt": firestore.SERVER_TIMESTAMP,
        }
    )

    allowances = _uploads_left_snapshot(uid)
    return Response(
        {
            "status": "success",
            "cards": cards,
            # Userweite Quoten
            "uploads_left_this_month": allowances["uploads_left_this_month"],
            "cards_regen_left_this_month": allowances["cards_regen_left_this_month"],
            "quiz_regen_left_this_month": allowances["quiz_regen_left_this_month"],
            "month": allowances["month"],
            # Projektbezogene Totals (ALL-TIME)
            "project_cards_regen_used_total": int(project_after.get("monthlyCardsRegen", used_now)),
            "project_cards_regen_left_total": int(left_now),
            "project_cards_regen_monthly_limit_total": PROJECT_REGEN_LIMITS["cards"],
            # Back-compat Aliase
            "project_cards_regen_used_this_month": int(project_after.get("monthlyCardsRegen", used_now)),
            "project_cards_regen_left_this_month": int(left_now),
            "project_cards_regen_month": "ALL_TIME",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_quiz(request):
    uid = request.user.username

    # Paywall
    if _get_user_plan(uid) != PRIME:
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

    project_ref, project = _load_project(uid, project_name)
    if not project:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = project.get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    # Projekt-ALL-TIME-Limit prüfen + inkrementieren
    try:
        project_after, used_now, left_now = _inc_project_quiz_regen(uid, project_name)
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

    project_ref.update(
        {
            "quiz": quiz,
            "monthlyQuizRegen": project_after.get("monthlyQuizRegen", used_now),
            "monthlyRegenUpdatedAt": firestore.SERVER_TIMESTAMP,
        }
    )

    allowances = _uploads_left_snapshot(uid)
    return Response(
        {
            "status": "success",
            "quiz": quiz,
            # Userweite Quoten
            "uploads_left_this_month": allowances["uploads_left_this_month"],
            "cards_regen_left_this_month": allowances["cards_regen_left_this_month"],
            "quiz_regen_left_this_month": allowances["quiz_regen_left_this_month"],
            "month": allowances["month"],
            # Projektbezogene Totals (ALL-TIME)
            "project_quiz_regen_used_total": int(project_after.get("monthlyQuizRegen", used_now)),
            "project_quiz_regen_left_total": int(left_now),
            "project_quiz_regen_monthly_limit_total": PROJECT_REGEN_LIMITS["quiz"],
            # Back-compat Aliase
            "project_quiz_regen_used_this_month": int(project_after.get("monthlyQuizRegen", used_now)),
            "project_quiz_regen_left_this_month": int(left_now),
            "project_quiz_regen_month": "ALL_TIME",
        },
        status=status.HTTP_200_OK,
    )
