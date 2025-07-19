from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from firebase_admin import auth as firebase_auth, firestore
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
import traceback
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def firebase_authenticate(request):
    id_token = request.data.get("token")

    logger.debug("[DEBUG] Incoming Firebase Auth request")
    logger.debug(f"[DEBUG] Payload: {request.data}")
    logger.debug(f"[DEBUG] Extracted ID token: {id_token}")

    if not id_token:
        logger.warning("[Firebase] No token in request")
        return Response({"detail": "Missing token"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Validate Firebase ID token
        decoded_token = firebase_auth.verify_id_token(id_token)
        logger.debug(f"[Firebase] Decoded token: {decoded_token}")

        uid = decoded_token["uid"]
        email = decoded_token.get("email", "")
        name = decoded_token.get("name", "")

        # Name splitting
        parts = name.strip().split() if name else []
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        # Create or get Django user
        user, created = User.objects.get_or_create(
            username=uid,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
            }
        )

        if created:
            user.is_staff = False
            user.is_superuser = False
            user.save()
            logger.info(f"[Firebase] Created new user: {user.username}")

        # Generate Django JWT
        refresh = RefreshToken.for_user(user)

        # Get user subscription from Firestore
        db = firestore.client()
        user_ref = db.collection("users").document(uid)
        user_doc = user_ref.get()
        subscription = "basic"

        if user_doc.exists:
            user_data = user_doc.to_dict()
            subscription = user_data.get("subscription", "basic")

        logger.debug(f"[Firebase] Auth success for {uid} | Sub: {subscription}")

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
            "email": user.email,
            "subscription": subscription,
        })

    except Exception:
        logger.error(f"[Firebase Auth] Exception:\n{traceback.format_exc()}")
        return Response({"detail": "Invalid token or Firebase error"}, status=status.HTTP_401_UNAUTHORIZED)
