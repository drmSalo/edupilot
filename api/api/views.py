from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import auth as firebase_auth
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
def firebase_authenticate(request):
    id_token = request.data.get("token")
    if not id_token:
        return Response({"detail": "Missing token"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email")
        name = decoded_token.get("name", "")

        user, created = User.objects.get_or_create(
            username=uid,
            defaults={
                "email": email,
                "first_name": name.split(" ")[0] if name else "",
                "last_name": " ".join(name.split(" ")[1:]) if len(name.split()) > 1 else "",
            }
        )

        if created:
            logger.info(f"[Firebase] Created new user: {user.username}")

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
        })

    except Exception as e:
        logger.error(f"[Firebase Auth] Error: {str(e)}")
        return Response({"detail": "Invalid token or Firebase error"}, status=status.HTTP_401_UNAUTHORIZED)
