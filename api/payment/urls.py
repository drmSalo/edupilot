from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from .views import (
    create_checkout_session,
    create_portal_session,
    stripe_webhook,
    sync_checkout_session,
)

urlpatterns = [
    path("stripe/create-checkout-session/", create_checkout_session, name="stripe-create-checkout-session"),
    path("stripe/create-portal-session/",  create_portal_session,   name="stripe-create-portal-session"),
    # WICHTIG: zusätzlich hier csrf_exempt anwenden
    path("stripe/webhook/", csrf_exempt(stripe_webhook),            name="stripe-webhook"),
    path("stripe/sync-checkout-session/",  sync_checkout_session,   name="stripe-sync-checkout-session"),
]
