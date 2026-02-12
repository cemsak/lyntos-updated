import os
from openai import OpenAI
from services.pii_guard import sanitize_text

# Lazy init — modül import'unda API key yoksa hata vermesin
_client = None
MODEL_DEFAULT = os.getenv("OPENAI_MODEL_DEFAULT", "gpt-4.1-mini")
MODEL_PREMIUM = os.getenv("OPENAI_MODEL_PREMIUM", "gpt-4-turbo")


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""), timeout=30.0)
    return _client


def chat(messages, *, premium=False, **kwargs):
    model = MODEL_PREMIUM if premium else MODEL_DEFAULT
    # PII maskeleme: kullanıcı mesajlarındaki VKN'leri maskele
    sanitized_messages = []
    for msg in messages:
        content = msg.get("content", "")
        sanitized_messages.append({
            **msg,
            "content": sanitize_text(content) if msg.get("role") == "user" else content,
        })
    client = _get_client()
    res = client.chat.completions.create(
        model=model,
        messages=sanitized_messages,
        temperature=kwargs.get("temperature", 0.0),
        max_tokens=kwargs.get("max_tokens", 400),
    )
    return res.choices[0].message.content.strip()

def generate_with_fallback(messages, judge=None):
    out = chat(messages, premium=False)
    low_conf = (len(out) < 120) or ("yeterli veri yok" in out.lower())
    if judge and not low_conf:
        low_conf = not judge(out)
    return chat(messages, premium=True) if low_conf else out
