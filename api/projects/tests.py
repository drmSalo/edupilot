from unittest.mock import patch
from pathlib import Path

import pymupdf
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import OllamaSettings, Project


class ProjectApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_is_anonymous_and_local(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["storage"], "sqlite")

    def test_create_list_rename_and_delete_project(self):
        created = self.client.post("/api/projects/", {"name": "Biology"}, format="json")
        self.assertEqual(created.status_code, 201)
        project_id = created.json()["id"]
        self.assertEqual(len(self.client.get("/api/projects/").json()), 1)
        renamed = self.client.patch(f"/api/projects/{project_id}/", {"name": "Genetics"}, format="json")
        self.assertEqual(renamed.json()["name"], "Genetics")
        self.assertEqual(self.client.delete(f"/api/projects/{project_id}/").status_code, 204)

    def test_duplicate_names_are_rejected(self):
        Project.objects.create(name="Physics")
        response = self.client.post("/api/projects/", {"name": "Physics"}, format="json")
        self.assertEqual(response.status_code, 409)

    def test_settings_validate_url(self):
        response = self.client.put("/api/settings/ollama/", {"base_url": "file:///tmp/nope"}, format="json")
        self.assertEqual(response.status_code, 400)

    @patch("projects.views.ai.summarize")
    def test_pdf_is_extracted_but_not_saved_as_a_file(self, summarize):
        summarize.return_value = [{"title": "Mechanics", "sections": []}]
        settings = OllamaSettings.load()
        settings.model = "gemma3:4b"
        settings.save()
        project = Project.objects.create(name="Physics")
        document = pymupdf.open()
        page = document.new_page()
        page.insert_text((72, 72), "Force equals mass times acceleration.")
        upload = SimpleUploadedFile("lecture.pdf", document.tobytes(), content_type="application/pdf")
        document.close()

        response = self.client.post(
            f"/api/projects/{project.pk}/summary/",
            {"detail": "balanced", "file": upload},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        project.refresh_from_db()
        self.assertIn("Force equals mass times acceleration", project.source_text)
        self.assertEqual(project.source_filename, "lecture.pdf")
        self.assertFalse((Path(__file__).parent / "lecture.pdf").exists())

    @patch("projects.views.ai.summarize")
    def test_summary_uses_saved_source_and_local_settings(self, summarize):
        summarize.return_value = [{"title": "Cells", "sections": []}]
        settings = OllamaSettings.load()
        settings.model = "gemma3:4b"
        settings.save()
        project = Project.objects.create(name="Biology", source_text="Cells contain organelles.")
        response = self.client.post(f"/api/projects/{project.pk}/summary/", {"detail": "brief"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["model_used"], "gemma3:4b")
        summarize.assert_called_once()
