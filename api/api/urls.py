from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from api.views import firebase_authenticate

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", include("projects.urls")),

    # Firebase to JWT Auth
    path('api/auth/firebase/', firebase_authenticate),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
