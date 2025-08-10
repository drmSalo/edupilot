import tiktoken

def split_into_chunks(text, max_tokens=2000):
    enc = tiktoken.encoding_for_model("gpt-5-nano-2025-08-07")
    tokens = enc.encode(text)
    
    chunks = []
    for i in range(0, len(tokens), max_tokens):
        chunk = tokens[i:i + max_tokens]
        chunks.append(enc.decode(chunk))
    return chunks
