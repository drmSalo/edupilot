# payment/views.py
from __future__ import annotations
import json, stripe
from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from firebase_admin import firestore
from api.settings import db  # Firestore Client

# Stripe config
required = ["STRIPE_SECRET_KEY", "STRIPE_PRICE_ID_PRIME"]
for name in required:
    if not getattr(settings, name, None):
        raise RuntimeError(f"{name} not configured")
stripe.api_key = settings.STRIPE_SECRET_KEY

def _user_ref(uid: str):
    return db.collection("users").document(uid)

def _ensure_stripe_customer_for_user(uid: str, email: str | None) -> str:
    ref = _user_ref(uid)
    snap = ref.get()
    data = snap.to_dict() or {}
    if data.get("stripeCustomerId"):
        return data["stripeCustomerId"]
    customer = stripe.Customer.create(email=email or None, metadata={"firebase_uid": uid})
    ref.set({"stripeCustomerId": customer.id}, merge=True)
    return customer.id

def _set_user_plan(uid: str, *, plan: str, sub_id: str | None, status_txt: str,
                   current_period_end: int | None, customer_id: str | None = None):
    ref = _user_ref(uid)
    limit = 180 if plan == "prime" else 0
    update = {
        "plan": plan,
        "planStatus": status_txt,
        "stripeSubscriptionId": sub_id,
        "limits": {
            "pdfMonthlyLimit": limit,
            "cardsRegenMonthlyLimit": 5,
            "quizRegenMonthlyLimit": 5,
        },
        "monthlyLimit": limit,
    }
    if current_period_end:
        update["planCurrentPeriodEnd"] = firestore.Timestamp.from_seconds(current_period_end)
    if customer_id:
        update["stripeCustomerId"] = customer_id
    ref.set(update, merge=True)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    uid = request.user.username
    try:
        body = json.loads(request.body or "{}")
    except Exception:
        body = {}
    frontend = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:5173")
    success_url = body.get("success_url") or f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url  = body.get("cancel_url")  or f"{frontend}/plans"

    user_email = getattr(getattr(request, "user", None), "email", None)
    try:
        customer_id = _ensure_stripe_customer_for_user(uid, user_email)
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            client_reference_id=uid,
            line_items=[{"price": settings.STRIPE_PRICE_ID_PRIME, "quantity": 1}],
            allow_promotion_codes=True,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"firebase_uid": uid},
            subscription_data={"metadata": {"firebase_uid": uid}},
            automatic_tax={"enabled": True},
            customer_update={"address": "auto", "shipping": "auto"},
            billing_address_collection="required",
            locale="auto",
        )
        return JsonResponse({"checkout_url": session.url}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_portal_session(request):
    uid = request.user.username
    try:
        body = json.loads(request.body or "{}")
    except Exception:
        body = {}
    return_url = body.get("return_url") or f"{request.build_absolute_uri('/')}settings"
    try:
        user_data = _user_ref(uid).get().to_dict() or {}
        customer_id = user_data.get("stripeCustomerId")
        if not customer_id:
            return JsonResponse({"error": "No Stripe customer found."}, status=404)
        portal = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
        return JsonResponse({"portal_url": portal.url}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_checkout_session(request):
    try:
        body = json.loads(request.body or "{}")
        session_id = body.get("session_id")
        if not session_id:
            return JsonResponse({"error": "Missing session_id"}, status=400)
        session = stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
        sub = session.get("subscription")
        if not sub:
            return JsonResponse({"ok": True, "plan": "basic"}, status=200)

        uid = (session.get("metadata") or {}).get("firebase_uid") \
              or session.get("client_reference_id") \
              or getattr(request.user, "username", None)
        if not uid:
            return JsonResponse({"error": "Could not resolve user from session."}, status=400)

        status_txt = sub.get("status", "active")
        cpe = sub.get("current_period_end")
        sub_id = sub.get("id")
        customer_id = session.get("customer")

        if status_txt in ("active", "trialing"):
            _set_user_plan(uid, plan="prime", sub_id=sub_id, status_txt=status_txt,
                           current_period_end=cpe, customer_id=customer_id)
            return JsonResponse({"ok": True, "plan": "prime"}, status=200)
        return JsonResponse({"ok": True, "plan": "basic", "status": status_txt}, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def stripe_webhook(request: HttpRequest):
    secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    if not secret:
        return HttpResponse(status=500)
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=secret)
    except Exception:
        return HttpResponse(status=400)

    etype = event.get("type"); data = event.get("data", {}).get("object", {})

    try:
        if etype == "checkout.session.completed":
            uid = (data.get("metadata") or {}).get("firebase_uid") or data.get("client_reference_id")
            sub_id = data.get("subscription"); customer_id = data.get("customer")
            if uid and sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                _set_user_plan(uid, plan="prime", sub_id=sub_id,
                               status_txt=sub.get("status", "active"),
                               current_period_end=sub.get("current_period_end"),
                               customer_id=customer_id)
        elif etype in ("customer.subscription.created", "customer.subscription.updated"):
            uid = (data.get("metadata") or {}).get("firebase_uid")
            if uid:
                _set_user_plan(uid, plan="prime", sub_id=data.get("id"),
                               status_txt=data.get("status", "active"),
                               current_period_end=data.get("current_period_end"),
                               customer_id=data.get("customer"))
        elif etype == "customer.subscription.deleted":
            uid = (data.get("metadata") or {}).get("firebase_uid")
            if uid:
                _set_user_plan(uid, plan="basic", sub_id=data.get("id"),
                               status_txt="canceled", current_period_end=None)
        elif etype == "invoice.payment_succeeded":
            sub_id = data.get("subscription")
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                uid = (sub.get("metadata") or {}).get("firebase_uid")
                if uid:
                    _set_user_plan(uid, plan="prime", sub_id=sub_id,
                                   status_txt=sub.get("status", "active"),
                                   current_period_end=sub.get("current_period_end"),
                                   customer_id=sub.get("customer"))
        elif etype == "invoice.payment_failed":
            sub_id = data.get("subscription")
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                uid = (sub.get("metadata") or {}).get("firebase_uid")
                if uid:
                    _set_user_plan(uid, plan="prime", sub_id=sub_id,
                                   status_txt=sub.get("status", "past_due"),
                                   current_period_end=sub.get("current_period_end"),
                                   customer_id=sub.get("customer"))
    except Exception:
        pass
    return HttpResponse(status=200)
