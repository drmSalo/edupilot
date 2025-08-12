# ai.py
from __future__ import annotations

import os
import json
import json5
import re
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone

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
# JSON-Sanitizing & Parsing (fehlertolerant)
# ---------------------------
_JSON_TRAIL_COMMA = re.compile(r",\s*([\]}])")

def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()

def _extract_json_array(raw: str) -> Optional[str]:
    """
    Extrahiert die erste balancierte JSON-Array-Sequenz.
    Robust gegen Vor-/Nach-Text oder Markdown.
    """
    s = _strip_code_fences(raw)
    start = s.find("[")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(s)):
        ch = s[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    return s[start : i + 1]
    return None

def _json5_then_json(s: str):
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        return json5.loads(s)

# --- LaTeX Normalisierung (robuster) ---
_LATEX_DOLLARS   = re.compile(r"^\s*\$\$\s*|\s*\$\$\s*$")
_LATEX_BRACKETS  = re.compile(r"^\s*\\\[\s*|\s*\\\]\s*$")
_LATEX_VEC_SPACE = re.compile(r"(\\vec)\s+([A-Za-z0-9])")
_NEWLINES        = re.compile(r"(?:\r\n|\r|\n)+")
_ZWSP_LIKE       = re.compile(r"[\u200B-\u200D\u2060]")  # zero-width chars
_WS_MULTI        = re.compile(r"[ \t\f\v\u00A0]+")

# bekannte LaTeX-Operator-Tokens (ohne führenden Backslash)
_OP_TOKENS = (
    "odot","oplus","ominus","otimes","cdot","times","cup","cap",
    "land","lor","implies","iff","leq","geq","neq","in","notin",
    "subset","subseteq","supset","supseteq","forall","exists"
)
# Unicode-Mapping -> LaTeX
_UNICODE_MAP = {
    "⊕": r"\oplus", "⊙": r"\odot", "⊗": r"\otimes", "·": r"\cdot", "×": r"\times",
    "∈": r"\in", "∉": r"\notin", "≤": r"\leq", "≥": r"\geq", "≠": r"\neq",
    "∪": r"\cup", "∩": r"\cap", "⊂": r"\subset", "⊆": r"\subseteq",
    "⊃": r"\supset", "⊇": r"\supseteq", "∧": r"\land", "∨": r"\lor",
    "⇒": r"\implies", "⇔": r"\iff",
}

# Regex: fehlender Backslash vor bekannten Tokens
_TOKENS_RE = re.compile(rf"(?<!\\)\b({'|'.join(_OP_TOKENS)})\b")

# Spaces um Binäroperatoren sicherstellen
_BINOPS_RE = re.compile(
    r"(?P<L>[A-Za-z0-9}\)])\s*(?P<op>\\(?:odot|oplus|ominus|otimes|cdot|times|cup|cap|land|lor|implies|iff))\s*(?P<R>[A-Za-z0-9({\\])"
)

def _normalize_latex(s: str) -> str:
    if not isinstance(s, str):
        return s

    # 1) harte Artefakte
    s = s.replace("\u000b", "\\")                 # vertical tab -> backslash
    s = _ZWSP_LIKE.sub("", s)                     # zero-width entfernen

    # 2) Delimiter entfernen (wir rendern Block separat)
    s = _LATEX_DOLLARS.sub("", s)
    s = _LATEX_BRACKETS.sub("", s)

    # 3) Unicode-Operatoren/Zeichen normalisieren
    s = s.replace("−", "-")                       # Unicode minus -> ASCII
    for ch, rep in _UNICODE_MAP.items():
        if ch in s:
            s = s.replace(ch, rep)

    # 4) Zeilenumbrüche glätten, echte \\ schützen
    s = s.replace(r"\\", "<<<BR>>>")
    s = _NEWLINES.sub(" ", s)
    s = s.replace("<<<BR>>>", r"\\")              # echte LaTeX-Zeilenumbrüche zurück

    # 5) fehlende Backslashes vor bekannten Tokens ergänzen
    #    (odot, oplus, leq, geq, in, forall, exists, …)
    s = _TOKENS_RE.sub(r"\\\1", s)

    # 5a) Sonderfall exists! (eindeutiges Existenzquantor)
    s = re.sub(r"(?<!\\)\bexists!\b", r"\\exists!", s)

    # 5b) 'colon' -> ':' (kommt oft aus OCR/Copy)
    s = re.sub(r"\bcolon\b", ":", s)

    # 5c) \mathbbR / mathbbR / \mathbb R -> \mathbb{R}
    s = re.sub(r"(?<!\\)mathbb\s*([A-Za-z])\b", r"\\mathbb{\1}", s)
    s = re.sub(r"\\mathbb\s*([A-Za-z])\b", r"\\mathbb{\1}", s)

    # 6) \vec x -> \vec{x}
    s = _LATEX_VEC_SPACE.sub(r"\1{\2}", s)

    # 7) Variable + Zahl(en) -> Hochzahl (x 2 -> x^{2}, x -1 -> x^{-1})
    #    konservativ, nur Buchstabe gefolgt von optionalem Minus und Ziffern
    s = re.sub(r"([A-Za-z])\s+(-?[0-9]+)\b", r"\1^{\2}", s)

    # 8) Leerzeichen um Binäroperatoren normalisieren
    for _ in range(2):
        s = _BINOPS_RE.sub(r"\g<L> \g<op> \g<R>", s)

    # 9) Mehrfach-Spaces reduzieren
    s = _WS_MULTI.sub(" ", s).strip()
    return s


def _coerce_topics(raw: str) -> List[Dict[str, Any]]:
    """
    Toleranter Parser: entfernt Fences/Trailing Commas, extrahiert Array,
    nutzt json5-Fallback und normalisiert Sections inkl. LaTeX.
    """
    if not raw:
        return []

    s = _strip_code_fences(raw)
    s = _JSON_TRAIL_COMMA.sub(r"\1", s)
    # WICHTIG: keine globale Backslash-Manipulation!

    try:
        parsed = _json5_then_json(s)
    except Exception:
        arr = _extract_json_array(s)
        if not arr:
            raise
        parsed = _json5_then_json(_JSON_TRAIL_COMMA.sub(r"\1", arr))

    if not isinstance(parsed, list):
        raise ValueError("Expected a JSON array of topic objects.")

    out: List[Dict[str, Any]] = []
    for t in parsed:
        if not isinstance(t, dict):
            continue
        title = (t.get("title") or "").strip()
        date = (t.get("date") or _utc_date())[:10]
        sections = t.get("sections", []) or []
        clean = []
        for sct in sections:
            if not isinstance(sct, dict):
                continue
            heading = (sct.get("heading") or "").strip()
            typ = sct.get("type")
            content = sct.get("content")
            if heading and typ in {"text", "list", "latex"} and content is not None:
                if typ == "latex" and isinstance(content, str):
                    content = _normalize_latex(content)
                clean.append({"heading": heading, "type": typ, "content": content})
        if clean:
            out.append({"title": title, "date": date, "sections": clean})
    return out


# ---------------------------
# OpenAI Calls (mit Retry & Timeouts)
# ---------------------------
def _chat_complete(model: str, messages: List[Dict[str, str]], timeout: float = 30.0):
    """
    Stabiler Chat-Call mit Backoff-Retries.
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


def call_openai_on_chunks(
    chunks: List[str], model: str, debug: bool = False
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Ruft das Modell chunkweise auf, parst tolerant und macht bei kaputtem JSON
    einen automatischen Reformat-Retry.
    """
    all_topics: List[Dict[str, Any]] = []
    total_tokens = 0

    system_msg = {
        "role": "system",
        "content": (
            "You are a strict formatter. Respond with a MINIFIED JSON ARRAY only. "
            "No markdown, no prose, no trailing commas. "
            "For sections with type \"latex\", output RAW LaTeX WITHOUT $$, \\[, \\], or code fences. "
            "Use LaTeX only for formulas."
        ),
    }

    def _reformat_json_array(bad_content: str) -> List[Dict[str, Any]]:
        reform_prompt = (
            "Reformat the following into a STRICT, VALID JSON array that matches the schema:\n"
            '[{"title":"string","date":"YYYY-MM-DD","sections":['
            '{"heading":"string","type":"text","content":"string"},'
            '{"heading":"string","type":"list","content":["item"]},'
            '{"heading":"string","type":"latex","content":"RAW LaTeX without $$ or \\\\[\\\\]"}]}]\n'
            "Output JSON only. No markdown, no comments.\n\n"
            f"{bad_content}"
        )
        resp2 = _chat_complete(
            model=model,
            messages=[system_msg, {"role": "user", "content": reform_prompt}],
            timeout=45.0,
        )
        fixed = (resp2.choices[0].message.content or "").strip()
        return _coerce_topics(fixed)

    for i, chunk in enumerate(chunks):
        summary_prompt = (
            "Read the following study content and produce a JSON array of topics. "
            "Schema:\n"
            '{"title":"string","date":"YYYY-MM-DD","sections":['
            '{"heading":"string","type":"text","content":"string"},'
            '{"heading":"string","type":"list","content":["item"]},'
            '{"heading":"string","type":"latex","content":"RAW LaTeX without $$ or \\\\[\\\\]"}]}\n'
            "Return MINIFIED JSON ARRAY only. No markdown. No comments.\n\n"
            f"{chunk}"
        )
        resp = _chat_complete(
            model=model,
            messages=[system_msg, {"role": "user", "content": summary_prompt}],
            timeout=60.0,
        )
        content = (resp.choices[0].message.content or "").strip()
        usage = getattr(resp, "usage", None)
        if usage and getattr(usage, "total_tokens", None) is not None:
            total_tokens += int(usage.total_tokens)

        try:
            topics = _coerce_topics(content)
        except Exception:
            topics = _reformat_json_array(content)

        if topics:
            all_topics.extend(topics)

        if debug:
            print(f"[chunk {i+1}] topics_added={len(topics)} total={len(all_topics)}")

    return all_topics, total_tokens


# ---------------------------
# Utility: Sections mergen
# ---------------------------
def _merge_sections_text(summary: List[Dict[str, Any]]) -> str:
    """
    Merged Content für Cards/Quiz. LaTeX-Sections werden als Inline markiert,
    damit das Modell Kontext behält, ohne Blockumgebungen zu erzeugen.
    """
    merged: List[str] = []
    for s in summary:
        content = s.get("content")
        typ = s.get("type")
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
    system_msg = {
        "role": "system",
        "content": "Respond with JSON only. No markdown. No comments."
    }
    resp = _chat_complete(model=model, messages=[system_msg, {"role": "user", "content": prompt}], timeout=timeout)
    raw = (resp.choices[0].message.content or "").strip()
    # tolerant parse
    try:
        return json.loads(_strip_code_fences(_JSON_TRAIL_COMMA.sub(r"\1", raw)))
    except json.JSONDecodeError:
        return json5.loads(_strip_code_fences(_JSON_TRAIL_COMMA.sub(r"\1", raw)))


# ---------------------------
# Karten & Quiz (mit Reformat-Fallback)
# ---------------------------
def generate_study_cards_json_from_summary(summary, model="gpt-5-nano-2025-08-07", debug: bool = False):
    merged_text = _merge_sections_text(summary)
    prompt = (
        "Create 5 flashcards as a JSON array of objects with fields 'question' and 'answer'. "
        'Return only: [{"question":"string","answer":"string"}]\n\n'
        f"{merged_text}"
    )
    try:
        data = _chat_json_array(model=model, prompt=prompt, timeout=45.0)
        if not isinstance(data, list):
            raise ValueError("Not an array")
        out = []
        for it in data:
            q = (it.get("question") or "").strip()
            a = (it.get("answer") or "").strip()
            if q and a:
                out.append({"question": q, "answer": a})
        if out:
            return out
        raise ValueError("Empty after validation")
    except Exception:
        # Reformat-Fallback (billig & robust)
        reform = (
            "Reformat to a STRICT JSON array of objects with shape "
            '[{"question":"string","answer":"string"}]. Output JSON only.\n\n'
            f"{merged_text}"
        )
        try:
            fixed = _chat_json_array(model=model, prompt=reform, timeout=45.0)
            return fixed if isinstance(fixed, list) else []
        except Exception:
            return []


def generate_quiz_from_summary(summary, model="gpt-5-nano-2025-08-07", debug: bool = False):
    merged_text = _merge_sections_text(summary)
    prompt = (
        "Generate 5 multiple choice questions as JSON. Each item has 'question', "
        "'options' (array of 4 strings), and 'correct_answer' (one of the options). "
        'Return only: [{"question":"...","options":["A","B","C","D"],"correct_answer":"A"}]\n\n'
        f"{merged_text}"
    )
    try:
        data = _chat_json_array(model=model, prompt=prompt, timeout=60.0)
        if not isinstance(data, list):
            raise ValueError("Not an array")
        out = []
        for it in data:
            q = (it.get("question") or "").strip()
            opts = it.get("options") or []
            ca = (it.get("correct_answer") or "").strip()
            if q and isinstance(opts, list) and len(opts) == 4 and ca in opts:
                out.append({"question": q, "options": opts, "correct_answer": ca})
        if out:
            return out
        raise ValueError("Empty after validation")
    except Exception:
        # Reformat-Fallback
        reform = (
            "Reformat to a STRICT JSON array with items of shape "
            '{"question":"string","options":["A","B","C","D"],"correct_answer":"one of options"}. '
            "Output JSON only.\n\n"
            f"{merged_text}"
        )
        try:
            fixed = _chat_json_array(model=model, prompt=reform, timeout=60.0)
            # nicht nochmal validieren – Frontend kann anzeigen
            return fixed if isinstance(fixed, list) else []
        except Exception:
            return []
