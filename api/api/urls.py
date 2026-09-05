from django.urls import include, path

from .views import health


urlpatterns = [
    path("api/health/", health),
    path("api/", include("projects.urls")),
]
