"""Small client for Ollama's native local API. No cloud SDK is used."""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class OllamaError(RuntimeError):
    pass


def normalize_base_url(value: str) -> str:
    value = (value or "").strip().rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Enter a valid Ollama HTTP(S) URL.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("The Ollama URL cannot contain credentials, a query, or a fragment.")
    return value


def _request(base_url: str, path: str, payload: dict[str, Any] | None = None, timeout: int = 180):
    url = f"{normalize_base_url(base_url)}{path}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("error")
        except Exception:
            detail = None
        raise OllamaError(detail or f"Ollama returned HTTP {exc.code}.") from exc
    except (URLError, TimeoutError) as exc:
        raise OllamaError(
            f"Could not reach Ollama at {base_url}. Make sure Ollama is running."
        ) from exc
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise OllamaError("Ollama returned an invalid response.") from exc


def list_models(base_url: str) -> list[dict[str, Any]]:
    response = _request(base_url, "/api/tags", timeout=10)
    models = response.get("models", [])
    return [
        {
            "name": item.get("name") or item.get("model"),
            "size": item.get("size", 0),
            "details": item.get("details", {}),
        }
        for item in models
        if item.get("name") or item.get("model")
    ]


def _chat(base_url: str, model: str, prompt: str, schema: dict[str, Any]) -> Any:
    if not model.strip():
        raise OllamaError("Choose an installed Ollama model first.")
    response = _request(
        base_url,
        "/api/chat",
        {
            "model": model,
            "stream": False,
            "format": schema,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a careful study assistant. Use only the supplied source. "
                        "Never invent facts. Match the source language. Return the requested JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "options": {"temperature": 0.2},
        },
    )
    raw = response.get("message", {}).get("content", "")
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError) as exc:
        raise OllamaError("The model did not return valid structured JSON. Try another model.") from exc


SECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "topics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "sections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "heading": {"type": "string"},
                                "content": {"type": "string"},
                            },
                            "required": ["heading", "content"],
                        },
                    },
                },
                "required": ["title", "sections"],
            },
        }
    },
    "required": ["topics"],
}

CARD_SCHEMA = {
    "type": "object",
    "properties": {
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"question": {"type": "string"}, "answer": {"type": "string"}},
                "required": ["question", "answer"],
            },
        }
    },
    "required": ["cards"],
}

QUIZ_SCHEMA = {
    "type": "object",
    "properties": {
        "quiz": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 4},
                    "correct_answer": {"type": "string"},
                    "explanation": {"type": "string"},
                },
                "required": ["question", "options", "correct_answer", "explanation"],
            },
        }
    },
    "required": ["quiz"],
}


def _chunks(text: str, size: int = 12_000) -> list[str]:
    """Split on paragraph boundaries while keeping prompts reasonable for local models."""
    paragraphs = [part.strip() for part in text.split("\n\n") if part.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if current and len(current) + len(paragraph) + 2 > size:
            chunks.append(current)
            current = ""
        while len(paragraph) > size:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(paragraph[:size])
            paragraph = paragraph[size:]
        current = f"{current}\n\n{paragraph}".strip()
    if current:
        chunks.append(current)
    return chunks


def summarize(base_url: str, model: str, text: str, detail: str) -> list[dict[str, Any]]:
    targets = {"brief": "2-3", "balanced": "4-6", "detailed": "7-10"}
    target = targets.get(detail, targets["balanced"])
    topics: list[dict[str, Any]] = []
    for index, chunk in enumerate(_chunks(text), start=1):
        data = _chat(
            base_url,
            model,
            f"Create an exam-focused study summary with roughly {target} sections for source part "
            f"{index}. Preserve essential definitions, relationships, formulas, dates, and caveats.\n\nSOURCE:\n{chunk}",
            SECTION_SCHEMA,
        )
        topics.extend(data.get("topics", []))
    return topics


def _summary_text(summary: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for topic in summary:
        lines.append(str(topic.get("title", "")))
        for section in topic.get("sections", []):
            lines.append(f"{section.get('heading', '')}: {section.get('content', '')}")
    return "\n".join(lines)


def make_cards(base_url: str, model: str, summary: list[dict[str, Any]]) -> list[dict[str, str]]:
    data = _chat(
        base_url,
        model,
        "Create 15 concise flashcards covering the most exam-relevant ideas. Avoid duplicates.\n\n"
        + _summary_text(summary),
        CARD_SCHEMA,
    )
    return data.get("cards", [])


def make_quiz(base_url: str, model: str, summary: list[dict[str, Any]]) -> list[dict[str, Any]]:
    data = _chat(
        base_url,
        model,
        "Create 10 challenging multiple-choice questions. Each correct_answer must exactly match one option.\n\n"
        + _summary_text(summary),
        QUIZ_SCHEMA,
    )
    return data.get("quiz", [])
