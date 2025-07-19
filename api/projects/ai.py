from openai import OpenAI
import os
import json
from datetime import datetime

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

def call_openai(chunks, model="gpt-4.1-nano", plan="basic"):
    structured_summary = {
        "title": "AI Study Summary",
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "sections": []
    }

    cards = []
    quiz = []
    total_tokens = 0

    for chunk in chunks:
        summary_prompt = (
            "Analyze the following study material and extract a structured educational summary as a JSON object. "
            "Use this exact format:\n\n"
            "{\n"
            '  "title": "string",\n'
            '  "date": "YYYY-MM-DD",\n'
            '  "sections": [\n'
            '    { "heading": "string", "type": "text", "content": "string" },\n'
            '    { "heading": "string", "type": "list", "content": ["item1", "item2", "..."] },\n'
            '    { "heading": "string", "type": "code", "content": "code block" }\n'
            "  ]\n"
            "}\n\n"
            "Respond ONLY with the JSON. Do not explain anything. Use today's date for the 'date' field.\n\n"
            f"{chunk}"
        )

        summary_resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": summary_prompt}]
        )
        total_tokens += summary_resp.usage.total_tokens
        content = summary_resp.choices[0].message.content.strip()

        try:
            json_start = content.index("{")
            json_data = json.loads(content[json_start:])
            structured_summary["sections"].extend(json_data.get("sections", []))
        except Exception as e:
            print(f"Failed to parse JSON from chunk: {e}")
            continue

        if plan == "prime":
            # Flashcards
            cards_resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": f"Create 5 flashcards from the following text:\n\n{chunk}"}]
            )
            cards.append(cards_resp.choices[0].message.content.strip())
            total_tokens += cards_resp.usage.total_tokens

            # Quiz
            quiz_resp = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": f"Create 5 quiz questions from the following text:\n\n{chunk}"}]
            )
            quiz.append(quiz_resp.choices[0].message.content.strip())
            total_tokens += quiz_resp.usage.total_tokens

    return structured_summary, cards, quiz, total_tokens
