import openai

def call_openai(chunks, model="gpt-3.5-turbo", plan="basic"):
    summary = ""
    cards = []
    quiz = []
    total_tokens = 0

    for chunk in chunks:
        # Summary
        summary_resp = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": f"Summarize the following text:\n\n{chunk}"}]
        )
        summary += summary_resp.choices[0].message.content
        total_tokens += summary_resp.usage.total_tokens

        if plan == "prime":
            # Flashcards
            cards_resp = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": f"Create 5 flashcards from the following text:\n\n{chunk}"}]
            )
            cards.append(cards_resp.choices[0].message.content)
            total_tokens += cards_resp.usage.total_tokens

            # Quiz questions
            quiz_resp = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": f"Create 5 quiz questions from the following text:\n\n{chunk}"}]
            )
            quiz.append(quiz_resp.choices[0].message.content)
            total_tokens += quiz_resp.usage.total_tokens

    return summary, cards, quiz, total_tokens


def is_complex_topic(text: str) -> bool:
    prompt = (
        "Answer only with 'yes' or 'no'. "
        "Is the following text highly complex or technical (e.g., related to math, law, computer science, medicine, statistics)?\n\n"
        f"{text[:3000]}"
    )

    resp = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    answer = resp.choices[0].message.content.strip().lower()
    return "yes" in answer
