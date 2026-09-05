from django.urls import path

from . import views


urlpatterns = [
    path("settings/ollama/", views.ollama_settings),
    path("ollama/models/", views.ollama_models),
    path("projects/", views.projects),
    path("projects/<int:project_id>/", views.project_detail),
    path("projects/<int:project_id>/summary/", views.project_summary),
    path("projects/<int:project_id>/cards/", views.project_cards),
    path("projects/<int:project_id>/quiz/", views.project_quiz),
]
