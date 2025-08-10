# ai.py
import os
import json
import json5
import re
from typing import List, Dict, Any
from datetime import datetime
from openai import OpenAI

# OpenAI-Key aus ENV
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in environment")

client = OpenAI(api_key=OPENAI_API_KEY)


def is_complex_topic(text: str) -> bool:
    prompt = (
        "Answer only with 'yes' or 'no'. "
        "Is the following text highly complex or technical (e.g., related to math, law, computer science, medicine, statistics)?\n\n"
        f"{text[:3000]}"
    )
    resp = client.chat.completions.create(
        model="gpt-5-nano-2025-08-07",
        messages=[{"role": "user", "content": prompt}],
    )
    answer = (resp.choices[0].message.content or "").strip().lower()
    return "yes" in answer


def sanitize_gpt_response(raw: str) -> List[Dict[str, Any]]:
    raw = re.sub(r",\s*([\]}])", r"\1", raw.strip())
    raw = raw.replace("\\\\", "\\")  # LaTeX backslash fix

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = json5.loads(raw)

    if not isinstance(parsed, list):
        raise ValueError("Expected a list of topic objects.")

    valid_topics = []
    for topic in parsed:
        title = (topic.get("title") or "").strip()
        date = (topic.get("date") or datetime.utcnow().strftime("%Y-%m-%d"))[:10]
        sections = topic.get("sections", []) or []

        clean_sections = []
        for s in sections:
            if not (isinstance(s, dict) and s.get("heading") and s.get("type") and s.get("content")):
                continue
            clean_sections.append(
                {
                    "heading": (s["heading"] or "").strip(),
                    "type": s["type"],
                    "content": s["content"],
                }
            )

        if clean_sections:
            valid_topics.append(
                {
                    "title": title,
                    "date": date,
                    "sections": clean_sections,
                }
            )

    return valid_topics


def call_openai(chunks: List[str], model="gpt-5-nano-2025-08-07", debug=False):
    all_topics: List[Dict[str, Any]] = []
    total_tokens = 0

    for i, chunk in enumerate(chunks):
        summary_prompt = (
            "Read the following study content carefully. Identify all major topics or sections (e.g., chapter titles, headings, or topic labels) "
            "and write a separate structured JSON summary for each. Focus only on the most important and exam-relevant concepts per topic. "
            "You may explain key ideas in your own words if helpful. Use LaTeX only for mathematical, scientific, or technical formulas—not for plain text.\n\n"
            "Respond in the same language the input text is written in.\n\n"
            "Use this exact JSON structure for each topic:\n"
            "{\n"
            '  "title": "string",\n'
            '  "date": "YYYY-MM-DD",\n'
            '  "sections": [\n'
            '    { "heading": "string", "type": "text", "content": "string" },\n'
            '    { "heading": "string", "type": "list", "content": ["item1", "item2"] },\n'
            '    { "heading": "string", "type": "latex", "content": "LaTeX math/physics expression" }\n'
            "  ]\n"
            "}\n\n"
            "Return a minified JSON array. No markdown. No explanations. No comments.\n\n"
            f"{chunk}"
        )
        content = ""
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": summary_prompt}],
            )
            content = (response.choices[0].message.content or "").strip()
            usage = getattr(response, "usage", None)
            if usage and getattr(usage, "total_tokens", None) is not None:
                total_tokens += int(usage.total_tokens)

            if debug:
                print(f"\n=== GPT CHUNK {i+1} ===\n{content}\n========================")

            topics = sanitize_gpt_response(content)
            all_topics.extend(topics)

        except Exception as e:
            # Log minimal, keine harten Abbrüche; fahre mit den restlichen Chunks fort
            if debug:
                print(f"[ERROR] Chunk {i+1}: {e}")
                try:
                    with open(f"gpt_summary_error_chunk_{i+1}.log", "w", encoding="utf-8") as f:
                        f.write(f"Exception: {e}\n\nGPT Content:\n{content}")
                except Exception:
                    pass
            continue

    return all_topics, total_tokens


def _merge_sections_text(summary: List[Dict[str, Any]]) -> str:
    merged = []
    for s in summary:
        content = s.get("content")
        if isinstance(content, list):
            merged.append("\n".join(str(x) for x in content))
        elif content is not None:
            merged.append(str(content))
    return "\n".join(merged)


def generate_study_cards_json_from_summary(summary, model="gpt-5-nano-2025-08-07", debug=False):
    merged_text = _merge_sections_text(summary)
    prompt = (
        "Based on the following study content, create 5 exam-relevant flashcards. "
        "Each flashcard must contain a 'question' and a concise 'answer'. "
        "Return only valid JSON as an array of objects. Use this exact format:\n\n"
        '[\n'
        '  { "question": "string", "answer": "string" },\n'
        '  ...\n'
        ']\n\n'
        "No explanations. No markdown. No comments.\n\n"
        f"{merged_text}"
    )

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    content = (response.choices[0].message.content or "").strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return json5.loads(content)
    except Exception:
        return []


def generate_quiz_from_summary(summary, model="gpt-5-nano-2025-08-07", debug=False):
    merged_text = _merge_sections_text(summary)
    prompt = (
        "Based on the following study content, generate 5 multiple choice quiz questions. "
        "Each question must have 4 options and one correct answer. "
        "Use the following JSON format:\n\n"
        '[\n'
        '  {\n'
        '    "question": "string",\n'
        '    "options": ["A", "B", "C", "D"],\n'
        '    "correct_answer": "A"\n'
        '  },\n'
        '  ...\n'
        ']\n\n'
        "No explanations. No markdown. No comments.\n\n"
        f"{merged_text}"
    )

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    content = (response.choices[0].message.content or "").strip()

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return json5.loads(content)
    except Exception:
        return []
