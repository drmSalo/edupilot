from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=160, unique=True)
    source_filename = models.CharField(max_length=255, blank=True)
    source_text = models.TextField(blank=True)
    page_count = models.PositiveIntegerField(default=0)
    summary = models.JSONField(default=list, blank=True)
    cards = models.JSONField(default=list, blank=True)
    quiz = models.JSONField(default=list, blank=True)
    model_used = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class OllamaSettings(models.Model):
    base_url = models.URLField(default="http://localhost:11434")
    model = models.CharField(max_length=160, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def load(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
