"""
PII Guard — KVKK-uyumlu PII maskeleme

VKN, firma adı, sektör bilgileri gibi kişisel/ticari verilerin
AI API'lerine gönderilmeden önce maskelenmesini sağlar.
"""

import re
from typing import Optional


# VKN pattern: 10 veya 11 haneli sayı (TC Kimlik No veya Vergi Kimlik No)
_VKN_PATTERN = re.compile(r'\b(\d{10,11})\b')

# Maskeleme counter (anonimleştirme tutarlılığı için)
_MASK_MAP: dict[str, str] = {}
_COUNTER = 0


def mask_vkn(vkn: Optional[str]) -> str:
    """VKN'yi maskeler: '1234567890' → '123****890'"""
    if not vkn or len(vkn) < 6:
        return vkn or "N/A"
    return f"{vkn[:3]}****{vkn[-3:]}"


def mask_company_name(name: Optional[str]) -> str:
    """Firma adını anonim koda çevirir"""
    if not name:
        return "MUKELLEF"
    global _COUNTER
    if name not in _MASK_MAP:
        _COUNTER += 1
        _MASK_MAP[name] = f"MUKELLEF_{chr(64 + _COUNTER)}"  # A, B, C...
    return _MASK_MAP[name]


def sanitize_text(text: str, vkn: Optional[str] = None, company_name: Optional[str] = None) -> str:
    """Metin içindeki PII'leri maskeler"""
    if not text:
        return text

    result = text

    # Belirli VKN varsa onu maskele
    if vkn and len(vkn) >= 6:
        result = result.replace(vkn, mask_vkn(vkn))

    # Belirli firma adı varsa onu maskele
    if company_name:
        result = result.replace(company_name, mask_company_name(company_name))

    # Genel VKN pattern'ini maskele (10-11 haneli sayılar)
    result = _VKN_PATTERN.sub(lambda m: mask_vkn(m.group(1)), result)

    return result


def sanitize_mukellef_context(mukellef: dict) -> dict:
    """Mükellef bilgilerini AI'a göndermeden önce maskeler"""
    if not mukellef:
        return mukellef

    masked = dict(mukellef)
    vkn = mukellef.get("vkn")
    name = mukellef.get("ad")

    if vkn:
        masked["vkn"] = mask_vkn(vkn)
    if name:
        masked["ad"] = mask_company_name(name)
    # Vergi dairesi de PII olabilir
    if "vergi_dairesi" in masked:
        masked["vergi_dairesi"] = "VD_***"

    return masked


def reset_mask_map():
    """Test ve session sıfırlama için"""
    global _MASK_MAP, _COUNTER
    _MASK_MAP = {}
    _COUNTER = 0
