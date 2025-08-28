from django.urls import path
from .views import (
    create_checkout_session,
    create_portal_session,
    stripe_webhook,
    sync_checkout_session,
)

urlpatterns = [
    path("stripe/create-checkout-session/", create_checkout_session, name="stripe-create-checkout-session"),
    path("stripe/create-portal-session/",  create_portal_session,  name="stripe-create-portal-session"),
    path("stripe/webhook/",                stripe_webhook,         name="stripe-webhook"),
    path("stripe/sync-checkout-session/",  sync_checkout_session,  name="stripe-sync-checkout-session"),
]