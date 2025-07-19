from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .ai import call_openai, is_complex_topic
from .chunking import split_into_chunks
from firebase_admin import firestore
from datetime import datetime

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
    plan = user_data.get("plan", "basic")

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
        structured_summary, _, _, total_tokens = call_openai(chunks, model=model, plan=plan)
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_study_cards(request):
    user = request.user
    uid = user.username
    text = request.data.get("text")
    name = request.data.get("name")

    if not text or not name:
        return Response({"error": "Missing 'text' or 'name'"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        chunks = split_into_chunks(text, max_tokens=2000)
        all_cards = []
        total_tokens = 0

        for chunk in chunks:
            _, cards, _, tokens = call_openai([chunk], model="gpt-4.1-mini", plan="prime")
            all_cards.append(cards[0])
            total_tokens += tokens

        db = firestore.client()
        project_ref = db.collection("users").document(uid).collection("projects").document(name)
        project_ref.update({"cards": all_cards})

        return Response({"cards": all_cards, "token_usage": total_tokens})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_study_quiz(request):
    user = request.user
    uid = user.username
    text = request.data.get("text")
    name = request.data.get("name")

    if not text or not name:
        return Response({"error": "Missing 'text' or 'name'"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        chunks = split_into_chunks(text, max_tokens=2000)
        all_quiz = []
        total_tokens = 0

        for chunk in chunks:
            _, _, quiz, tokens = call_openai([chunk], model="gpt-4.1-mini", plan="prime")
            all_quiz.append(quiz[0])
            total_tokens += tokens

        db = firestore.client()
        project_ref = db.collection("users").document(uid).collection("projects").document(name)
        project_ref.update({"quiz": all_quiz})

        return Response({"quiz": all_quiz, "token_usage": total_tokens})
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
