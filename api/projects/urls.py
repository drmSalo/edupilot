
from django.urls import path
from . import views

urlpatterns = [
    path("generate-project/", views.generate_project, name="generate_project"),
    path("generate-study-cards/", views.generate_study_cards, name="generate_study_cards"),
    path("generate-study-quiz/", views.generate_study_quiz, name="generate_study_quiz"),
]
