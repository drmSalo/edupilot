from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .ai import call_openai, generate_study_cards_json_from_summary, is_complex_topic
from .chunking import split_into_chunks
from firebase_admin import firestore
from datetime import datetime
from api.settings import db

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_project(request):
    user = request.user
    uid = user.username

    data = request.data
    text = data.get("text")
    name = data.get("name")
    page_count = data.get("page_count", 0)

    if not text or not name:
        return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

    db = firestore.client()
    user_ref = db.collection("users").document(uid)
    user_data = user_ref.get().to_dict() or {}
    uploads_this_month = user_data.get("monthlyUploads", 0)
    plan = user_data.get("subscription", "basic")

    if plan == "basic":
        if page_count > 30:
            return Response({"error": "Basic plan allows max 30 pages per PDF."}, status=status.HTTP_400_BAD_REQUEST)
        if uploads_this_month >= 25:
            return Response({"error": "Upload limit reached for Basic plan (25 PDFs/month)."}, status=status.HTTP_403_FORBIDDEN)
        model = "gpt-4.1-nano"
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
        model = "gpt-4.1-mini" if is_complex or page_count > 8 else "gpt-4.1-nano"

    chunks = split_into_chunks(text, max_tokens=2000)
    try:
        structured_summary, total_tokens = call_openai(chunks, model=model, debug=False)
    except Exception as e:
        return Response({"error": f"AI processing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    user_ref.update({"monthlyUploads": uploads_this_month + 1})

    project_ref = user_ref.collection("projects").document(name)
    existing = project_ref.get()
    if existing.exists and existing.to_dict().get("initialized") is True:
        return Response({"error": "Project already initialized"}, status=400)

    project_data = {
    "name": name,
    "structured": structured_summary,
    "modelUsed": model,
    "tokenUsage": total_tokens,
    "isComplex": is_complex,
    "pageCount": page_count,
    "createdAt": datetime.utcnow(),
    "initialized": True
    }
    project_ref.set(project_data, merge=True)

    return Response({
        "structured": structured_summary,
        "model_used": model,
        "token_usage": total_tokens,
        "is_complex": is_complex
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_study_cards(request):
    uid = request.user.username
    project_name = request.data.get("name")
    if not uid or not project_name:
        return Response({"error": "Missing uid or project name"}, status=400)

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=404)

    user_data = user_doc.to_dict()
    subscription = user_data.get("subscription", "basic")

    if subscription != "prime":
        return Response({"error": "Only prime users can generate study cards"}, status=403)

    project_ref = user_ref.collection("projects").document(project_name)
    project_doc = project_ref.get()
    if not project_doc.exists:
        return Response({"error": "Project not found"}, status=404)

    structured = project_doc.to_dict().get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=400)

    flat_sections = []
    for topic in structured:
        flat_sections.extend(topic.get("sections", []))

    model = "gpt-4.1-mini"  # Prime only
    cards = generate_study_cards_json_from_summary(flat_sections, model=model)
    project_ref.update({"cards": cards})

    return Response({"status": "success", "cards": cards})





@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_study_quiz(request):
    uid = request.user.username
    name = request.data.get("name")
    if not name:
        return Response({"error": "Missing 'name'"}, status=400)

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if not user_doc.exists:
        return Response({"error": "User not found"}, status=404)

    user_data = user_doc.to_dict()
    subscription = user_data.get("subscription", "basic")

    if subscription != "prime":
        return Response({"error": "Only prime users can generate quizzes"}, status=403)

    project_ref = user_ref.collection("projects").document(name)
    project_doc = project_ref.get()
    if not project_doc.exists:
        return Response({"error": "Project not found"}, status=404)

    structured = project_doc.to_dict().get("structured")
    if not structured:
        return Response({"error": "No summary found"}, status=400)

    flat_sections = []
    for topic in structured:
        flat_sections.extend(topic.get("sections", []))

    from .ai import generate_quiz_from_summary

    model = "gpt-4.1-mini"  # Prime only
    try:
        quiz = generate_quiz_from_summary(flat_sections, model=model)
        project_ref.update({"quiz": quiz})
        return Response({"quiz": quiz})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
