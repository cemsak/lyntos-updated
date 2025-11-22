import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

MODEL_DEFAULT = os.getenv("OPENAI_MODEL_DEFAULT", "gpt-4.1-mini")
MODEL_PREMIUM = os.getenv("OPENAI_MODEL_PREMIUM", "gpt-4-turbo")

def chat(messages, *, premium=False, **kwargs):
    model = MODEL_PREMIUM if premium else MODEL_DEFAULT
    res = client.chat.completions.create(
        model=model,
        messages=messages,
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
