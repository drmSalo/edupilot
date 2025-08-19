# chunking.py
from __future__ import annotations
from typing import List, Optional

def split_into_chunks(text: str, max_tokens: int = 1400, model_hint: Optional[str] = None) -> List[str]:
    """
    Superschnell: keine Tokenisierung, nur ~4 chars/token Heuristik.
    Kleinere Chunks -> schnellere Einzelcalls.
    """
    if not text:
        return []
    approx_chars = max_tokens * 3
    return [text[i : i + approx_chars] for i in range(0, len(text), approx_chars)]
