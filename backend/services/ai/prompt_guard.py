"""
Prompt Guard — AI prompt injection koruması ve input validasyonu

Kullanıcı girdilerini AI provider'lara göndermeden önce kontrol eder:
- Prompt injection pattern tespiti
- Aşırı uzunluk kontrolü
- Tehlikeli karakter/encoding tespiti
"""

import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# Prompt injection pattern'leri (case-insensitive)
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignore\s+(all\s+)?above",
    r"disregard\s+(all\s+)?previous",
    r"forget\s+(all\s+)?previous",
    r"new\s+instructions?\s*:",
    r"system\s*:\s*you\s+are",
    r"you\s+are\s+now\s+a",
    r"act\s+as\s+(a|an)\s+",
    r"pretend\s+(to\s+be|you\s+are)",
    r"jailbreak",
    r"DAN\s+mode",
    r"developer\s+mode",
    r"\bdo\s+anything\s+now\b",
    r"reveal\s+(your\s+)?(system|original)\s+(prompt|instructions)",
    r"print\s+(your\s+)?(system|original)\s+prompt",
    r"show\s+(me\s+)?(your\s+)?(system|original)\s+prompt",
    r"what\s+(are|is)\s+your\s+(system\s+)?prompt",
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]

# Max karakter limiti
MAX_USER_INPUT_LENGTH = 10_000
MAX_SYSTEM_PROMPT_LENGTH = 50_000


def check_prompt_injection(text: str) -> Tuple[bool, str]:
    """
    Prompt injection pattern kontrolü.

    Returns:
        (is_safe, reason) — True ise güvenli, False ise injection şüphesi var
    """
    if not text:
        return True, ""

    for pattern in _COMPILED_PATTERNS:
        match = pattern.search(text)
        if match:
            matched_text = match.group(0)
            logger.warning(f"Prompt injection detected: '{matched_text[:50]}'")
            return False, f"Prompt injection pattern tespit edildi: '{matched_text[:30]}...'"

    return True, ""


def validate_user_input(text: str) -> Tuple[bool, str]:
    """
    Kullanıcı girdisini doğrular (uzunluk + injection).

    Returns:
        (is_valid, error_message)
    """
    if not text or not text.strip():
        return False, "Boş girdi gönderilemez"

    if len(text) > MAX_USER_INPUT_LENGTH:
        logger.warning(f"User input too long: {len(text)} chars (max {MAX_USER_INPUT_LENGTH})")
        return False, f"Girdi çok uzun ({len(text)} karakter, max {MAX_USER_INPUT_LENGTH})"

    is_safe, reason = check_prompt_injection(text)
    if not is_safe:
        return False, reason

    return True, ""


def sanitize_for_prompt(text: str, max_length: int = MAX_USER_INPUT_LENGTH) -> str:
    """
    Metni AI prompt'a eklemek için temizler.
    Injection yoksa orijinal metni döndürür, varsa güvenli versiyonunu döndürür.
    """
    if not text:
        return ""

    # Uzunluk kısıtla
    if len(text) > max_length:
        text = text[:max_length] + "... [kırpıldı]"

    return text
