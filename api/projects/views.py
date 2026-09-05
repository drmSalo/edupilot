from __future__ import annotations

import unicodedata

import pymupdf
from django.db import IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from . import ai
from .models import OllamaSettings, Project


MAX_PDF_BYTES = 50 * 1024 * 1024


def _project_json(project: Project, include_content: bool = True):
    data = {
        "id": project.pk,
        "name": project.name,
        "source_filename": project.source_filename,
        "page_count": project.page_count,
        "model_used": project.model_used,
        "has_summary": bool(project.summary),
        "card_count": len(project.cards or []),
        "quiz_count": len(project.quiz or []),
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }
    if include_content:
        data.update({"summary": project.summary, "cards": project.cards, "quiz": project.quiz})
    return data


def _error(message: str, http_status=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message}, status=http_status)


def _project(project_id: int):
    try:
        return Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return None


@api_view(["GET", "PUT"])
def ollama_settings(request):
    settings = OllamaSettings.load()
    if request.method == "PUT":
        try:
            settings.base_url = ai.normalize_base_url(request.data.get("base_url", settings.base_url))
        except ValueError as exc:
            return _error(str(exc))
        if "model" in request.data:
            settings.model = str(request.data.get("model") or "").strip()[:160]
        settings.save()
    return Response({"base_url": settings.base_url, "model": settings.model})


@api_view(["GET"])
def ollama_models(request):
    settings = OllamaSettings.load()
    try:
        return Response({"models": ai.list_models(settings.base_url)})
    except ai.OllamaError as exc:
        return _error(str(exc), status.HTTP_502_BAD_GATEWAY)


@api_view(["GET", "POST"])
@parser_classes([JSONParser])
def projects(request):
    if request.method == "GET":
        return Response([_project_json(item, include_content=False) for item in Project.objects.all()])

    name = str(request.data.get("name") or "").strip()
    if not name:
        return _error("Project name is required.")
    if len(name) > 160:
        return _error("Project name must be 160 characters or fewer.")
    try:
        project = Project.objects.create(name=name)
    except IntegrityError:
        return _error("A project with this name already exists.", status.HTTP_409_CONFLICT)
    return Response(_project_json(project), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@parser_classes([JSONParser])
def project_detail(request, project_id: int):
    project = _project(project_id)
    if not project:
        return _error("Project not found.", status.HTTP_404_NOT_FOUND)
    if request.method == "DELETE":
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    if request.method == "PATCH":
        name = str(request.data.get("name") or "").strip()
        if not name or len(name) > 160:
            return _error("Enter a project name of 1 to 160 characters.")
        project.name = name
        try:
            project.save(update_fields=["name", "updated_at"])
        except IntegrityError:
            return _error("A project with this name already exists.", status.HTTP_409_CONFLICT)
    return Response(_project_json(project))


def _extract_pdf(upload) -> tuple[str, int]:
    if upload.size > MAX_PDF_BYTES:
        raise ValueError("PDF is larger than the 50 MB local upload limit.")
    if upload.content_type not in {"application/pdf", "application/x-pdf"} and not upload.name.lower().endswith(".pdf"):
        raise ValueError("Upload a PDF file.")
    try:
        content = upload.read()
        with pymupdf.open(stream=content, filetype="pdf") as document:
            page_count = document.page_count
            text = "\n\n".join(page.get_text("text") for page in document)
    except Exception as exc:
        raise ValueError("The PDF could not be read. It may be damaged or encrypted.") from exc
    text = unicodedata.normalize("NFC", text).strip()
    if not text:
        raise ValueError("No selectable text was found. Scanned PDFs need OCR before upload.")
    return text, page_count


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def project_summary(request, project_id: int):
    project = _project(project_id)
    if not project:
        return _error("Project not found.", status.HTTP_404_NOT_FOUND)

    upload = request.FILES.get("file")
    if upload:
        try:
            project.source_text, project.page_count = _extract_pdf(upload)
        except ValueError as exc:
            return _error(str(exc))
        project.source_filename = upload.name[:255]
    if not project.source_text:
        return _error("Choose a PDF before generating a summary.")

    detail = str(request.data.get("detail") or "balanced")
    if detail not in {"brief", "balanced", "detailed"}:
        return _error("Detail must be brief, balanced, or detailed.")
    settings = OllamaSettings.load()
    try:
        project.summary = ai.summarize(settings.base_url, settings.model, project.source_text, detail)
    except ai.OllamaError as exc:
        return _error(str(exc), status.HTTP_502_BAD_GATEWAY)
    project.model_used = settings.model
    project.cards = []
    project.quiz = []
    project.save()
    return Response(_project_json(project))


@api_view(["POST"])
def project_cards(request, project_id: int):
    project = _project(project_id)
    if not project:
        return _error("Project not found.", status.HTTP_404_NOT_FOUND)
    if not project.summary:
        return _error("Generate a summary first.")
    settings = OllamaSettings.load()
    try:
        project.cards = ai.make_cards(settings.base_url, settings.model, project.summary)
    except ai.OllamaError as exc:
        return _error(str(exc), status.HTTP_502_BAD_GATEWAY)
    project.model_used = settings.model
    project.save(update_fields=["cards", "model_used", "updated_at"])
    return Response({"cards": project.cards, "model_used": project.model_used})


@api_view(["POST"])
def project_quiz(request, project_id: int):
    project = _project(project_id)
    if not project:
        return _error("Project not found.", status.HTTP_404_NOT_FOUND)
    if not project.summary:
        return _error("Generate a summary first.")
    settings = OllamaSettings.load()
    try:
        project.quiz = ai.make_quiz(settings.base_url, settings.model, project.summary)
    except ai.OllamaError as exc:
        return _error(str(exc), status.HTTP_502_BAD_GATEWAY)
    project.model_used = settings.model
    project.save(update_fields=["quiz", "model_used", "updated_at"])
    return Response({"quiz": project.quiz, "model_used": project.model_used})
