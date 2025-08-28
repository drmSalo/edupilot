from django.urls import path
from .views import firebase_authenticate, whoami

urlpatterns = [
    path("firebase/", firebase_authenticate),  # POST { id_token }
    path("whoami/", whoami),                  # GET (JWT benötigt)
]