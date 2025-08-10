# views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import firestore
from datetime import datetime
from api.settings import db  # Firestore-Client aus Settings, NICHT überschreiben

from .ai import (
    call_openai,
    generate_study_cards_json_from_summary,
    is_complex_topic,
    generate_quiz_from_summary,
)
from .chunking import split_into_chunks


def _reset_monthly_uploads_if_needed(user_ref, user_data):
    """Reset monthlyUploads, wenn Monatswechsel."""
    now_month = datetime.utcnow().strftime("%Y-%m")
    stored_month = user_data.get("monthlyUploadsMonth")
    uploads = int(user_data.get("monthlyUploads", 0) or 0)

    if stored_month != now_month:
        # Reset
        user_ref.update({
            "monthlyUploads": 0,
            "monthlyUploadsMonth": now_month,
            "monthlyUploadsUpdatedAt": firestore.SERVER_TIMESTAMP,
        })
        return 0, now_month
    return uploads, stored_month or now_month


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_project(request):
    uid = request.user.username

    data = request.data
    text = (data.get("text") or "").strip()
    name = (data.get("name") or "").strip()
    try:
        page_count = int(data.get("page_count") or 0)
    except Exception:
        page_count = 0

    if not text or not name:
        return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

    # User laden
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    user_data = user_doc.to_dict() or {}

    # Monatszähler ggf. resetten
    uploads_this_month, current_month = _reset_monthly_uploads_if_needed(user_ref, user_data)

    plan = (user_data.get("subscription") or "basic").lower().strip()
    if plan not in ("basic", "prime"):
        plan = "basic"

    # Plan-Regeln
    if plan == "basic":
        if page_count > 30:
            return Response({"error": "Basic plan allows max 30 pages per PDF."}, status=status.HTTP_400_BAD_REQUEST)
        if uploads_this_month >= 25:
            return Response({"error": "Upload limit reached for Basic plan (25 PDFs/month)."}, status=status.HTTP_403_FORBIDDEN)
        model = "gpt-5-nano-2025-08-07"
        is_complex = False
    else:
        if page_count > 80:
            return Response({"error": "Prime plan allows max 80 pages per PDF."}, status=status.HTTP_400_BAD_REQUEST)
        if uploads_this_month >= 180:
            return Response({"error": "Upload limit reached for Prime plan (180 PDFs/month)."}, status=status.HTTP_403_FORBIDDEN)
        try:
            is_complex = is_complex_topic(text)
        except Exception as e:
            return Response({"error": f"Complexity check failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        model = "gpt-5-mini-2025-08-07" if is_complex or page_count > 8 else "gpt-5-nano-2025-08-07"

    # Chunking + OpenAI
    chunks = split_into_chunks(text, max_tokens=2000)
    try:
        structured_summary, total_tokens = call_openai(chunks, model=model, debug=False)
    except Exception as e:
        return Response({"error": f"AI processing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Uploadzähler + Monat aktualisieren
    user_ref.set(
        {
            "monthlyUploads": uploads_this_month + 1,
            "monthlyUploadsMonth": current_month,
            "monthlyUploadsUpdatedAt": firestore.SERVER_TIMESTAMP,
        },
        merge=True,
    )

    # Projekt-Dokument
    project_ref = user_ref.collection("projects").document(name)
    existing = project_ref.get()
    if existing.exists and existing.to_dict().get("initialized") is True:
        return Response({"error": "Project already initialized"}, status=status.HTTP_400_BAD_REQUEST)

    project_data = {
        "name": name,
        "structured": structured_summary,  # Array von Topics (mit sections)
        "modelUsed": model,
        "tokenUsage": int(total_tokens or 0),
        "isComplex": bool(is_complex),
        "pageCount": int(page_count or 0),
        "createdAt": firestore.SERVER_TIMESTAMP,
        "initialized": True,
    }
    project_ref.set(project_data, merge=True)

    # Response: Frontend-kompatibel + stabil
    return Response(
        {
            "structured": structured_summary,
            "model_used": model,
            "token_usage": int(total_tokens or 0),
            "is_complex": bool(is_complex),
            # Felder, die das Frontend früher erwartete – als None zurückgeben, um Brüche zu vermeiden
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
    project_name = (request.data.get("name") or "").strip()
    if not uid or not project_name:
        return Response({"error": "Missing uid or project name"}, status=status.HTTP_400_BAD_REQUEST)

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user_data = user_doc.to_dict() or {}
    subscription = (user_data.get("subscription") or "basic").lower().strip()

    if subscription != "prime":
        return Response({"error": "Only prime users can generate study cards"}, status=status.HTTP_403_FORBIDDEN)

    project_ref = user_ref.collection("projects").document(project_name)
    project_doc = project_ref.get()
    if not project_doc.exists:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = (project_doc.to_dict() or {}).get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    flat_sections = []
    for topic in structured:
        flat_sections.extend(topic.get("sections", []) or [])

    model = "gpt-5-mini-2025-08-07"  # Prime only
    try:
        cards = generate_study_cards_json_from_summary(flat_sections, model=model)
    except Exception as e:
        return Response({"error": f"Card generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    project_ref.update({"cards": cards})
    return Response({"status": "success", "cards": cards}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_quiz(request):
    uid = request.user.username
    name = (request.data.get("name") or "").strip()
    if not name:
        return Response({"error": "Missing 'name'"}, status=status.HTTP_400_BAD_REQUEST)

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user_data = user_doc.to_dict() or {}
    subscription = (user_data.get("subscription") or "basic").lower().strip()

    if subscription != "prime":
        return Response({"error": "Only prime users can generate quizzes"}, status=status.HTTP_403_FORBIDDEN)

    project_ref = user_ref.collection("projects").document(name)
    project_doc = project_ref.get()
    if not project_doc.exists:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    structured = (project_doc.to_dict() or {}).get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=status.HTTP_400_BAD_REQUEST)

    flat_sections = []
    for topic in structured:
        flat_sections.extend(topic.get("sections", []) or [])

    model = "gpt-5-mini-2025-08-07"  # Prime only
    try:
        quiz = generate_quiz_from_summary(flat_sections, model=model)
    except Exception as e:
        return Response({"error": f"Quiz generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    project_ref.update({"quiz": quiz})
    return Response({"quiz": quiz}, status=status.HTTP_200_OK)
