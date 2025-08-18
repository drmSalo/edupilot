# ai.py
from __future__ import annotations

import os
import json
import json5
import re
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI, APIConnectionError, RateLimitError, APIStatusError

# ---------------------------
# Setup
# ---------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment")
client = OpenAI(api_key=OPENAI_API_KEY)

BASIC = "basic"
PRIME = "prime"

# Parallelität konfigurierbar
OPENAI_CONCURRENCY = int(os.getenv("OPENAI_CONCURRENCY", "4"))  # 4–6 ist sinnvoll


def _utc_date() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


# ---------------------------
# Modelwahl (keine Extra-Roundtrips)
# ---------------------------
def _is_complex_topic_cheap(text: str) -> bool:
    """
    Simple Heuristik zur Komplexität (vermeidet zusätzlichen LLM-Aufruf).
    """
    keywords = (
        "theorem", "алгоритм", "regex", "uml", "доказательство", "eigenvalue",
        "proof", "комплексность", "asymptotic", "derivation", "формула",
        "integral", "gradient", "kernel", "матем", "право", "gesetz", "juris",
        "оптимизац", "statistic", "verteil", "database", "mongodb", "sql", "index",
        "паскаль", "компил", "concurrency", "lock", "deadlock", "hash", "graph",
    )
    t = text.lower()
    hits = sum(1 for k in keywords if k in t)
    return hits >= 2


def choose_model_for_summary(plan: str, text: str, page_count: int) -> str:
    if plan == BASIC:
        return "gpt-5-nano-2025-08-07"
    # PRIME: bei längeren oder komplexen Inhalten das stärkere Modell
    if page_count > 8 or _is_complex_topic_cheap(text):
        return "gpt-5-mini-2025-08-07"
    return "gpt-5-nano-2025-08-07"


# ---------------------------
# Minimaler JSON-Parser (keine Validierung, keine Reparatur)
# ---------------------------
_JSON_TRAIL_COMMA = re.compile(r",\s*([\]}])")

def _strip_code_fences(s: str) -> str:
    s = (s or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()

def _parse_json_array_fast(raw: str):
    """
    Minimal: versucht JSON/JSON5 zu laden. Kein Schema, keine Reparatur.
    Liefert [] bei Fehler.
    """
    s = _strip_code_fences(raw or "")
    # trailing commas tolerant entfernen (billig)
    s = _JSON_TRAIL_COMMA.sub(r"\1", s)
    try:
        data = json.loads(s)
        return data if isinstance(data, list) else []
    except Exception:
        try:
            data = json5.loads(s)
            return data if isinstance(data, list) else []
        except Exception:
            return []


# ---------------------------
# OpenAI Calls (mit Retry & kurzen Timeouts)
# ---------------------------
def _chat_complete(model: str, messages: List[Dict[str, str]], timeout: float = 30.0):
    """
    Stabiler Chat-Call mit Backoff-Retries.
    Keine temperature/max_tokens Params -> maximal kompatibel.
    """
    delay = 0.8
    for attempt in range(4):
        try:
            return client.chat.completions.create(
                model=model,
                messages=messages,
                timeout=timeout,
            )
        except (APIConnectionError, RateLimitError, APIStatusError):
            if attempt == 3:
                raise
            time.sleep(delay)
            delay *= 1.8


# ---------------------------
# Chunk-Verarbeitung (parallel, keine JSON-Validierung/Reformat)
# ---------------------------
def call_openai_on_chunks(
    chunks: List[str], model: str, debug: bool = False
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Ruft das Modell auf mehreren Chunks PARALLEL auf.
    Kein Reformat-/Validierungs-Pass: wenn ein Chunk Mist liefert, wird er als [] verworfen.
    """
    if not chunks:
        return [], 0

    all_topics: List[Dict[str, Any]] = []
    total_tokens = 0

    system_msg = {
        "role": "system",
        "content": "Return ONLY a JSON array. No markdown, no prose."
    }

    def _build_prompt(chunk: str) -> str:
        return (
            "Read the following study content and produce a JSON array of topics. "
            "Each topic has a 'title', 'date' (YYYY-MM-DD), and 'sections' with "
            "items of type 'text' | 'list' | 'latex'. "
            "Return ONLY the JSON array.\n\n"
            f"{chunk}"
        )

    def _process_one(idx: int, chunk: str):
        resp = _chat_complete(
            model=model,
            messages=[system_msg, {"role": "user", "content": _build_prompt(chunk)}],
            timeout=45.0,
        )
        content = (resp.choices[0].message.content or "").strip()
        usage = getattr(resp, "usage", None)
        used = int(getattr(usage, "total_tokens", 0) or 0)
        topics = _parse_json_array_fast(content)  # << keine Validierung
        return idx, topics, used

    workers = min(max(1, OPENAI_CONCURRENCY), len(chunks))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = [ex.submit(_process_one, i, ch) for i, ch in enumerate(chunks)]
        for fut in as_completed(futures):
            idx, topics, used = fut.result()
            total_tokens += used
            if topics:
                # topics ist eine Liste beliebiger Objekte; wir gehen von Dicts aus,
                # validieren aber bewusst NICHT (Speed).
                all_topics.extend(topics)
            if debug:
                print(f"[chunk {idx+1}] topics_added={len(topics)} total={len(all_topics)} used_tokens={used}")

    return all_topics, total_tokens


# ---------------------------
# Utility: Sections mergen (für Cards/Quiz/Summary)
# ---------------------------
def _merge_sections_text(summary: List[Dict[str, Any]]) -> str:
    """
    Merged Content für Cards/Quiz. LaTeX-Sections werden als Inline markiert,
    damit das Modell Kontext behält, ohne Blockumgebungen zu erzeugen.
    """
    merged: List[str] = []
    for s in summary or []:
        content = s.get("content") if isinstance(s, dict) else None
        typ = s.get("type") if isinstance(s, dict) else None
        if isinstance(content, list):
            seg = "\n".join(str(x) for x in content)
        elif content is not None:
            seg = str(content)
        else:
            seg = ""
        if typ == "latex" and seg:
            seg = f"${seg}$"
        merged.append(seg)
    return "\n".join(merged)


def _chat_json_array(model: str, prompt: str, timeout: float = 45.0):
    """
    Einfacher Helper: fragt JSON-Array ab, parst minimal ohne Validierung.
    """
    system_msg = {"role": "system", "content": "Return ONLY a JSON array."}
    resp = _chat_complete(model=model, messages=[system_msg, {"role": "user", "content": prompt}], timeout=timeout)
    raw = (resp.choices[0].message.content or "").strip()
    return _parse_json_array_fast(raw)


# ---------------------------
# Karten & Quiz (ohne Validierung)
# ---------------------------
def generate_study_cards_json_from_summary(summary, model="gpt-5-nano-2025-08-07", debug: bool = False):
    merged_text = _merge_sections_text(summary)
    prompt = (
        "Create 5 flashcards as a JSON array of objects with fields 'question' and 'answer'. "
        "Return ONLY the JSON array.\n\n"
        f"{merged_text}"
    )
    data = _chat_json_array(model=model, prompt=prompt, timeout=45.0)
    return data if isinstance(data, list) else []


def generate_quiz_from_summary(summary, model="gpt-5-nano-2025-08-07", debug: bool = False):
    merged_text = _merge_sections_text(summary)
    prompt = (
        "Generate 5 multiple choice questions as JSON. Each item has 'question', "
        "'options' (array of 4 strings), and 'correct_answer' (one of the options). "
        "Return ONLY the JSON array.\n\n"
        f"{merged_text}"
    )
    data = _chat_json_array(model=model, prompt=prompt, timeout=60.0)
    return data if isinstance(data, list) else []


# ---------------------------
# (Optional) Kompakte Text-Summary aus structured Topics
# ---------------------------
def _collect_sections_from_structured(structured: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sections: List[Dict[str, Any]] = []
    for t in structured or []:
        secs = t.get("sections") if isinstance(t, dict) else None
        if isinstance(secs, list):
            sections.extend(secs)
    return sections

def generate_text_summary_from_structured(
    structured: List[Dict[str, Any]],
    *,
    model: str = "gpt-5-nano-2025-08-07",
    target_words: int = 200,
) -> str:
    """
    Baut eine kompakte, prüfungsorientierte Zusammenfassung (Deutsch) aus structured Topics.
    Kein JSON, daher robust gegenüber Model-Param-Einschränkungen.
    """
    try:
        sections = _collect_sections_from_structured(structured)
        merged = _merge_sections_text(sections)

        system_msg = {
            "role": "system",
            "content": "Du schreibst prägnante, prüfungsorientierte Zusammenfassungen auf Deutsch. Keine Aufzählungen, Fließtext.",
        }
        user_msg = {
            "role": "user",
            "content": (
                f"Erstelle eine kompakte Zusammenfassung ({target_words}–{int(target_words*1.3)} Wörter). "
                "Nur die Kernaussagen, keine Einleitung, kein Fazit, keine Überschriften. "
                "Wenn Formeln vorkommen, kurz erklären (max. 1 Satz pro Formel). "
                "Textbasis:\n\n"
                f"{merged}"
            ),
        }

        resp = _chat_complete(
            model=model,
            messages=[system_msg, user_msg],
            timeout=28.0,
        )
        text = (resp.choices[0].message.content or "").strip()
        text = re.sub(r"\s+\n", "\n", text).strip()
        return text if text else merged[:1200]
    except Exception:
        try:
            sections = _collect_sections_from_structured(structured)
            merged = _merge_sections_text(sections)
            return merged[:1200]
        except Exception:
            return ""
