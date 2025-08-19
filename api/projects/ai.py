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

    snippet = (text or "")[:1500]

    try:
        resp = client.chat.completions.create(
            model="gpt-5-nano-2025-08-07",
            messages=[
                {"role": "system", "content": "Answer only 'True' or 'False'."},
                {"role": "user", "content": f"Is this text complex (math, law, algorithms, dense)?\n\n{snippet}"}
            ],
            max_tokens=1,
            temperature=0,
        )
        answer = resp.choices[0].message.content.strip().lower()
        if "complex" in answer:
            return "gpt-5-mini-2025-08-07"
        return "gpt-5-nano-2025-08-07"
    except Exception as e:
        # Fallback: wenn API nicht klappt, default nano
        return "gpt-5-nano-2025-08-07"


def choose_model_for_summary(plan: str, text: str, page_count: int) -> str:
    if plan == BASIC:
        return "gpt-5-nano-2025-08-07"
    # PRIME: bei längeren oder komplexen Inhalten das stärkere Modell
    if _is_complex_topic_cheap(text):
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
            "Read the following study content and produce a JSON array of topics. Write only the most relevant topics for exams. Answer only in the same langauge as the input"
            "Each topic has a 'title' and 'sections' with "
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
        topics = _parse_json_array_fast(content) 
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
