from rest_framework.decorators import api_view
from rest_framework.response import Response
from firebase_admin import auth
from .ai import call_openai, is_complex_topic
from .chunking import split_into_chunks

@api_view(['POST'])
def generate_project(request):
    # 1. Firebase Auth verification
    id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded["uid"]
    except:
        return Response({"error": "Invalid or missing Firebase ID token"}, status=401)

    # 2. Extract request data
    data = request.data
    text = data.get("text")
    name = data.get("name")
    plan = data.get("plan", "basic")
    page_count = data.get("page_count", 0)

    if not text or not name:
        return Response({"error": "Missing fields"}, status=400)

    # 3. Model selection
    if plan == "basic":
        model = "gpt-3.5-turbo"
        is_complex = False
    else:
        try:
            is_complex = is_complex_topic(text)
        except Exception as e:
            return Response({"error": f"Complexity check failed: {str(e)}"}, status=500)

        model = "gpt-4" if is_complex or page_count > 8 else "gpt-3.5-turbo"

    # 4. Chunk text
    chunks = split_into_chunks(text, max_tokens=2000)

    # 5. Generate with OpenAI
    try:
        summary, cards, quiz, total_tokens = call_openai(chunks, model=model, plan=plan)
    except Exception as e:
        return Response({"error": f"AI processing failed: {str(e)}"}, status=500)

    # 6. Respond to frontend
    return Response({
        "summary": summary,
        "cards": cards if plan == "prime" else None,
        "quiz": quiz if plan == "prime" else None,
        "model_used": model,
        "token_usage": total_tokens,
        "is_complex": is_complex
    })
