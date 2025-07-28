from openai import OpenAI
import os
import json
import json5
from datetime import datetime
import re
from typing import List, Dict, Any
from api.settings import db

# Init OpenAI client
client = OpenAI(api_key="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")




def is_complex_topic(text: str) -> bool:
    prompt = (
        "Answer only with 'yes' or 'no'. "
        "Is the following text highly complex or technical (e.g., related to math, law, computer science, medicine, statistics)?\n\n"
        f"{text[:3000]}"
    )
    resp = client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=[{"role": "user", "content": prompt}]
    )
    answer = resp.choices[0].message.content.strip().lower()
    return "yes" in answer

def sanitize_gpt_response(raw: str) -> List[Dict[str, Any]]:
    raw = re.sub(r",\s*([\]}])", r"\1", raw.strip())
    raw = raw.replace('\\\\', '\\')  # LaTeX fix

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = json5.loads(raw)

    if not isinstance(parsed, list):
        raise ValueError("Expected a list of topic objects.")

    valid_topics = []
    for topic in parsed:
        title = topic.get("title", "").strip()
        date = topic.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
        sections = topic.get("sections", [])

        clean_sections = []
        for s in sections:
            if not s.get("heading") or not s.get("type") or not s.get("content"):
                continue
            clean_sections.append({
                "heading": s["heading"].strip(),
                "type": s["type"],
                "content": s["content"]
            })

        if clean_sections:
            valid_topics.append({
                "title": title,
                "date": date,
                "sections": clean_sections
            })

    return valid_topics

def call_openai(chunks: List[str], model="gpt-4.1-nano", debug=False):
    all_topics = []
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
            '  ]\n'
            "}\n\n"
            "Return a minified JSON array. No markdown. No explanations. No comments.\n\n"
            f"{chunk}"
        )

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": summary_prompt}]
            )
            content = response.choices[0].message.content.strip()
            total_tokens += response.usage.total_tokens

            if debug:
                print(f"\n=== GPT CHUNK {i+1} ===\n{content}\n========================")

            topics = sanitize_gpt_response(content)
            all_topics.extend(topics)

        except Exception as e:
            print(f"[ERROR] Failed to generate or parse summary JSON for chunk {i+1}: {e}")
            with open(f"gpt_summary_error_chunk_{i+1}.log", "w", encoding="utf-8") as f:
                f.write(f"Exception: {e}\n\nGPT Content:\n{content}")
            continue

    return all_topics, total_tokens



def generate_study_cards_json_from_summary(summary, model="gpt-4.1-nano", debug=False):
    """
    Creates flashcards from structured summary.
    Expects summary to be a list of sections: [{ heading, type, content }]
    """
    merged_text = ""
    for section in summary:
        content = section.get("content")
        if isinstance(content, list):
            merged_text += "\n".join(content) + "\n"
        else:
            merged_text += content + "\n"

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

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.choices[0].message.content.strip()
        if debug:
            print("=== FLASHCARDS ===")
            print(content)

        return json.loads(content)

    except json.JSONDecodeError:
        return json5.loads(content)
    except Exception as e:
        print(f"[ERROR] Flashcard generation failed: {e}")
        return []

def generate_quiz_from_summary(summary, model="gpt-4.1-nano", debug=False):
    """
    Creates multiple choice questions from structured summary.
    Returns list of { question, options, correct_answer }
    """
    merged_text = ""
    for section in summary:
        content = section.get("content")
        if isinstance(content, list):
            merged_text += "\n".join(content) + "\n"
        else:
            merged_text += content + "\n"

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

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.choices[0].message.content.strip()
        if debug:
            print("=== QUIZ ===")
            print(content)

        return json.loads(content)

    except json.JSONDecodeError:
        return json5.loads(content)
    except Exception as e:
        print(f"[ERROR] Quiz generation failed: {e}")
        return []


def generate_cards_for_user(uid: str, project_name: str, model="gpt-4.1-nano"):
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        return {"error": "User not found"}

    user_data = user_doc.to_dict()
    if user_data.get("subscription") != "prime":
        return {"error": "Only prime users can generate study cards"}

    project_ref = user_ref.collection("projects").document(project_name)
    project_doc = project_ref.get()

    if not project_doc.exists:
        return {"error": "Project not found"}

    structured = project_doc.to_dict().get("structured")
    if not structured:
        return {"error": "No summary found"}

    flat_sections = []
    for topic in structured:
        flat_sections.extend(topic.get("sections", []))

    cards = generate_study_cards_json_from_summary(flat_sections, model=model)
    project_ref.update({"cards": cards})

    return {"status": "success", "count": len(cards)}

def generate_quiz_for_user(uid: str, project_name: str, model="gpt-4.1-nano"):
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        return {"error": "User not found"}

    user_data = user_doc.to_dict()
    if user_data.get("subscription") != "prime":
        return {"error": "Only prime users can generate quizzes"}

    project_ref = user_ref.collection("projects").document(project_name)
    project_doc = project_ref.get()

    if not project_doc.exists:
        return {"error": "Project not found"}

    structured = project_doc.to_dict().get("structured")
    if not structured:
        return {"error": "No summary found"}

    flat_sections = []
    for topic in structured:
        flat_sections.extend(topic.get("sections", []))

    quiz = generate_quiz_from_summary(flat_sections, model=model)
    project_ref.update({"quiz": quiz})

    return {"status": "success", "count": len(quiz)}



# Optional: Save to Firestore
def save_summary_to_firestore(uid: str, project_name: str, topics: list):
    doc_ref = db.collection("users").document(uid).collection("projects").document(project_name)
    flat_sections = []
    for topic in topics:
        flat_sections.extend(topic["sections"])
    doc_ref.set({
        "structured": topics,
        "flatSections": flat_sections
    })