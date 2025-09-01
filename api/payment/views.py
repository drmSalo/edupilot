# payment/views.py
from __future__ import annotations

import json
import logging
from typing import Literal, Optional, Dict

import stripe
from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from firebase_admin import firestore
from api.settings import db  # Firestore Admin Client

log = logging.getLogger(__name__)

# ========= Stripe Config =========
REQUIRED = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
for name in REQUIRED:
    if not getattr(settings, name, None):
        raise RuntimeError(f"{name} not configured")

stripe.api_key = settings.STRIPE_SECRET_KEY

# Preis→Plan Mapping (Passe deine Price-IDs an!)
# Lege in settings z.B. STRIPE_PRICE_ID_BASIC, STRIPE_PRICE_ID_PRIME(_YEARLY) an.
PRICE_TO_PLAN: Dict[str, Literal["basic", "prime"]] = {}
if getattr(settings, "STRIPE_PRICE_ID_BASIC", None):
    PRICE_TO_PLAN[settings.STRIPE_PRICE_ID_BASIC] = "basic"
if getattr(settings, "STRIPE_PRICE_ID_PRIME", None):
    PRICE_TO_PLAN[settings.STRIPE_PRICE_ID_PRIME] = "prime"
if getattr(settings, "STRIPE_PRICE_ID_PRIME_YEARLY", None):
    PRICE_TO_PLAN[settings.STRIPE_PRICE_ID_PRIME_YEARLY] = "prime"

# Limits je Plan (zentral, einheitlich)
LIMITS_BY_PLAN = {
    "basic": {"pdfMonthlyLimit": 30, "cardsRegenMonthlyLimit": 0, "quizRegenMonthlyLimit": 0},
    "prime": {"pdfMonthlyLimit": 180, "cardsRegenMonthlyLimit": 5, "quizRegenMonthlyLimit": 5},
}

# ========= Firestore Helpers =========
def _user_ref(uid: str):
    return db.collection("users").document(uid)

def _get_uid_by_customer(customer_id: str) -> Optional[str]:
    qs = (
        db.collection("users")
        .where("stripeCustomerId", "==", customer_id)
        .limit(1)
        .stream()
    )
    for doc in qs:
        return doc.to_dict().get("uid") or doc.id
    return None

def _ensure_customer(uid: str, email: Optional[str]) -> str:
    ref = _user_ref(uid)
    snap = ref.get()
    data = snap.to_dict() or {}
    if data.get("stripeCustomerId"):
        return data["stripeCustomerId"]
    customer = stripe.Customer.create(email=email or None, metadata={"firebase_uid": uid})
    ref.set({"stripeCustomerId": customer.id}, merge=True)
    return customer.id

def _limits_for(plan: Literal["basic", "prime"]) -> dict:
    return LIMITS_BY_PLAN[plan]

def _ensure_month_rollover(doc: dict) -> dict:
    """Optional: Zähler resetten, wenn neuer Monat erkannt wird (YYYY-MM)."""
    try:
        from datetime import datetime
        now_month = datetime.utcnow().strftime("%Y-%m")
        patch = {}
        if doc.get("monthlyRegenMonth") != now_month:
            patch.update({
                "monthlyCardsRegen": 0,
                "monthlyQuizRegen": 0,
                "monthlyRegenMonth": now_month,
            })
        if doc.get("monthlyUploadsMonth") != now_month:
            patch.update({
                "monthlyUploads": 0,
                "monthlyUploadsMonth": now_month,
            })
        return patch
    except Exception:
        return {}

def _set_user_plan(
    uid: str,
    *,
    plan: Literal["basic", "prime"],
    subscription_id: Optional[str],
    status_txt: str,
    current_period_end: Optional[int],
    customer_id: Optional[str] = None,
):
    ref = _user_ref(uid)
    base_doc = ref.get().to_dict() or {}
    rollover = _ensure_month_rollover(base_doc)

    limits = _limits_for(plan)

    update = {
        "subscription": plan,           # halte sync: subscription == plan
        "plan": plan,
        "planStatus": status_txt,       # trialing, active, past_due, canceled...
        "stripeSubscriptionId": subscription_id,
        "limits": limits,
        "monthlyLimit": limits["pdfMonthlyLimit"],  # falls du das Feld noch nutzt
        **rollover,
    }
    if current_period_end:
        update["planCurrentPeriodEnd"] = firestore.Timestamp.from_seconds(current_period_end)
    if customer_id:
        update["stripeCustomerId"] = customer_id

    ref.set(update, merge=True)

def _resolve_plan_from_subscription(sub: dict) -> Optional[Literal["basic", "prime"]]:
    try:
        items = sub.get("items", {}).get("data", []) or []
        if not items:
            return None
        price_id = items[0].get("price", {}).get("id")
        return PRICE_TO_PLAN.get(price_id)
    except Exception:
        return None

# ========= API Views =========
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Erzeuge Stripe Checkout-Session für Abo (Standard: prime)."""
    uid = request.user.username
    try:
        body = json.loads(request.body or "{}")
    except Exception:
        body = {}

    # Frontend URLs
    frontend = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:5173")
    success_url = body.get("success_url") or f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = body.get("cancel_url") or f"{frontend}/plans"

    # Welchen Preis nutzen? (Erlaube clientseitige Wahl – optional)
    price_id = body.get("price_id") or getattr(settings, "STRIPE_PRICE_ID_PRIME", None)
    if not price_id:
        return JsonResponse({"error": "No price configured."}, status=500)

    user_email = getattr(getattr(request, "user", None), "email", None)
    try:
        customer_id = _ensure_customer(uid, user_email)
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            client_reference_id=uid,
            line_items=[{"price": price_id, "quantity": 1}],
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
        return JsonResponse({"checkout_url": session.url, "session_id": session.id}, status=200)
    except Exception as e:
        log.exception("create_checkout_session failed")
        return JsonResponse({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_portal_session(request):
    """Kunden-Portal (Kündigen/Upgrade/PaymentMethod)."""
    uid = request.user.username
    try:
        body = json.loads(request.body or "{}")
    except Exception:
        body = {}
    # Fallback: Settings-Seite im Frontend
    frontend = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:5173")
    return_url = body.get("return_url") or f"{frontend}/settings"

    try:
        user_data = _user_ref(uid).get().to_dict() or {}
        customer_id = user_data.get("stripeCustomerId")
        if not customer_id:
            return JsonResponse({"error": "No Stripe customer found."}, status=404)
        portal = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
        return JsonResponse({"portal_url": portal.url}, status=200)
    except Exception as e:
        log.exception("create_portal_session failed")
        return JsonResponse({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sync_checkout_session(request):
    """
    Client-Poll nach Checkout: liest Session & Subscription, setzt Plan serverseitig.
    (Nur Komfort – die Wahrheit kommt weiterhin über den Webhook.)
    """
    try:
        body = json.loads(request.body or "{}")
        session_id = body.get("session_id")
        if not session_id:
            return JsonResponse({"error": "Missing session_id"}, status=400)

        session = stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
        sub = session.get("subscription")
        if not sub:
            return JsonResponse({"ok": True, "plan": "basic"}, status=200)

        # UID: metadata → client_reference_id → eingeloggter User
        uid = (session.get("metadata") or {}).get("firebase_uid") \
              or session.get("client_reference_id") \
              or getattr(getattr(request, "user", None), "username", None)
        if not uid:
            return JsonResponse({"error": "Could not resolve user from session."}, status=400)

        plan = _resolve_plan_from_subscription(sub) or "basic"
        status_txt = sub.get("status", "active")
        cpe = sub.get("current_period_end")
        sub_id = sub.get("id")
        customer_id = session.get("customer")

        _set_user_plan(
            uid,
            plan=plan,
            subscription_id=sub_id,
            status_txt=status_txt,
            current_period_end=cpe,
            customer_id=customer_id,
        )
        return JsonResponse({"ok": True, "plan": plan, "status": status_txt}, status=200)
    except Exception as e:
        log.exception("sync_checkout_session failed")
        return JsonResponse({"error": str(e)}, status=500)

# ========= Stripe Webhook =========
@csrf_exempt
def stripe_webhook(request: HttpRequest):
    """
    WICHTIG: View MUSS den RAW-Body verwenden (kein DRF-Parser).
    Stelle sicher, dass in urls.py KEIN globaler JSON-Parser vorgeschaltet ist.
    """
    secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    if not secret:
        log.error("STRIPE_WEBHOOK_SECRET missing")
        return HttpResponse(status=500)

    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=secret)
    except Exception as e:
        log.warning("Stripe signature verification failed: %s", e)
        return HttpResponse(status=400)

    etype = event.get("type")
    data = event.get("data", {}).get("object", {}) or {}
    log.info("Stripe webhook: %s", etype)

    try:
        if etype == "checkout.session.completed":
            uid = (data.get("metadata") or {}).get("firebase_uid") or data.get("client_reference_id")
            sub_id = data.get("subscription")
            customer_id = data.get("customer")
            if not uid and customer_id:
                uid = _get_uid_by_customer(customer_id)

            if uid and sub_id:
                sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price"])
                plan = _resolve_plan_from_subscription(sub) or "basic"
                _set_user_plan(
                    uid,
                    plan=plan,
                    subscription_id=sub.get("id"),
                    status_txt=sub.get("status", "active"),
                    current_period_end=sub.get("current_period_end"),
                    customer_id=customer_id,
                )

        elif etype in ("customer.subscription.created", "customer.subscription.updated"):
            sub = data
            customer_id = sub.get("customer")
            uid = (sub.get("metadata") or {}).get("firebase_uid")
            if not uid and customer_id:
                uid = _get_uid_by_customer(customer_id)

            if uid:
                plan = _resolve_plan_from_subscription(sub) or "basic"
                _set_user_plan(
                    uid,
                    plan=plan,
                    subscription_id=sub.get("id"),
                    status_txt=sub.get("status", "active"),
                    current_period_end=sub.get("current_period_end"),
                    customer_id=customer_id,
                )

        elif etype == "customer.subscription.deleted":
            sub = data
            customer_id = sub.get("customer")
            uid = (sub.get("metadata") or {}).get("firebase_uid")
            if not uid and customer_id:
                uid = _get_uid_by_customer(customer_id)

            if uid:
                _set_user_plan(
                    uid,
                    plan="basic",
                    subscription_id=sub.get("id"),
                    status_txt="canceled",
                    current_period_end=None,
                    customer_id=customer_id,
                )

        elif etype == "invoice.payment_succeeded":
            sub_id = data.get("subscription")
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price"])
                customer_id = sub.get("customer")
                uid = (sub.get("metadata") or {}).get("firebase_uid") or _get_uid_by_customer(customer_id)
                if uid:
                    plan = _resolve_plan_from_subscription(sub) or "basic"
                    _set_user_plan(
                        uid,
                        plan=plan,
                        subscription_id=sub.get("id"),
                        status_txt=sub.get("status", "active"),
                        current_period_end=sub.get("current_period_end"),
                        customer_id=customer_id,
                    )

        elif etype == "invoice.payment_failed":
            sub_id = data.get("subscription")
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price"])
                customer_id = sub.get("customer")
                uid = (sub.get("metadata") or {}).get("firebase_uid") or _get_uid_by_customer(customer_id)
                if uid:
                    plan = _resolve_plan_from_subscription(sub) or "basic"
                    _set_user_plan(
                        uid,
                        plan=plan,  # Plan bleibt, Status wechselt auf past_due
                        subscription_id=sub.get("id"),
                        status_txt="past_due",
                        current_period_end=sub.get("current_period_end"),
                        customer_id=customer_id,
                    )

    except Exception as e:
        # Stripe erwartet 2xx um keinen Retry-Sturm auszulösen, aber wir loggen.
        log.exception("stripe_webhook handler error: %s", e)

    return HttpResponse(status=200)
