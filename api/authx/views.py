# authx/views.py
from __future__ import annotations
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from firebase_admin import auth as fb_auth, firestore
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
db = firestore.client()

@api_view(["POST"])
@permission_classes([AllowAny])
def firebase_authenticate(request):
    id_token = request.data.get("id_token")
    if not id_token:
        return Response({"detail": "Missing id_token"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        decoded = fb_auth.verify_id_token(id_token)
        uid = decoded.get("uid")
        if not uid:
            return Response({"detail": "Invalid token (no uid)"}, status=status.HTTP_401_UNAUTHORIZED)

        email = (decoded.get("email") or "").strip()
        name = (decoded.get("name") or "").strip()
        parts = name.split() if name else []
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        user, _ = User.objects.get_or_create(
            username=uid,
            defaults={"email": email, "first_name": first_name, "last_name": last_name},
        )
        if email and user.email != email:
            user.email = email
            user.save(update_fields=["email"])

        refresh = RefreshToken.for_user(user)

        plan = "basic"
        snap = db.collection("users").document(uid).get()
        if snap.exists:
            plan = (snap.to_dict() or {}).get("plan", "basic")

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "uid": uid,
            "email": email,
            "plan": plan,
        }, status=200)

    except fb_auth.ExpiredIdTokenError:
        return Response({"detail": "Firebase token expired"}, status=401)
    except fb_auth.RevokedIdTokenError:
        return Response({"detail": "Firebase token revoked"}, status=401)
    except fb_auth.InvalidIdTokenError:
        return Response({"detail": "Invalid Firebase token"}, status=401)
    except Exception:
        return Response({"detail": "Invalid token or Firebase error"}, status=401)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def whoami(request):
    return Response({
        "auth": True,
        "username": getattr(request.user, "username", None),
        "email": getattr(request.user, "email", None),
    })
