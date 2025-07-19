from django.urls import path
from . import views

urlpatterns = [
    path("generate-project/", views.generate_project, name="generate_project"),
]
