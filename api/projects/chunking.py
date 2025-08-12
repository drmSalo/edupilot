# chunking.py
from __future__ import annotations
from typing import List, Optional

def _try_tiktoken_encode(text: str, model_hint: Optional[str]) -> Optional[tuple]:
    try:
        import tiktoken
        enc = tiktoken.encoding_for_model(model_hint or "gpt-5-nano-2025-08-07")
        tokens = enc.encode(text)
        return enc, tokens
    except Exception:
        return None

def split_into_chunks(text: str, max_tokens: int = 2000, model_hint: Optional[str] = None) -> List[str]:
    """
    Bevorzugt tiktoken. Fallback: naive Char-Splits ~ 4 chars/token Heuristik.
    """
    if not text:
        return []

    res = _try_tiktoken_encode(text, model_hint)
    if res:
        enc, tokens = res
        chunks = []
        for i in range(0, len(tokens), max_tokens):
            chunk_tokens = tokens[i : i + max_tokens]
            chunks.append(enc.decode(chunk_tokens))
        return chunks

    # Fallback: konservativ ~ 4 chars / Token
    approx_chars = max_tokens * 4
    chunks = []
    for i in range(0, len(text), approx_chars):
        chunks.append(text[i : i + approx_chars])
    return chunks
