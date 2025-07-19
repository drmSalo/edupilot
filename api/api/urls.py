from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from api.views import firebase_authenticate  # falls api = Projektname und views dort liegt

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/", include("projects.urls")),

    # Auth API
    path('api/auth/firebase/', firebase_authenticate),

    # Andere App-Routen einbinden
    # path('api/users/', include('users.urls')),  ⬅️ falls du mehr Apps hast
]

# Media files im Dev-Modus serven
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
