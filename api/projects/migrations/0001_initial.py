from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="OllamaSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("base_url", models.URLField(default="http://localhost:11434")),
                ("model", models.CharField(blank=True, max_length=160)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="Project",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160, unique=True)),
                ("source_filename", models.CharField(blank=True, max_length=255)),
                ("source_text", models.TextField(blank=True)),
                ("page_count", models.PositiveIntegerField(default=0)),
                ("summary", models.JSONField(blank=True, default=list)),
                ("cards", models.JSONField(blank=True, default=list)),
                ("quiz", models.JSONField(blank=True, default=list)),
                ("model_used", models.CharField(blank=True, max_length=160)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
    ]
