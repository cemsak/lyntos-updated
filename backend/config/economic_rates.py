"""
Ekonomik oranlar konfigürasyonu.

Hardcoded faiz/enflasyon/kur oranları yerine JSON dosyasından yüklenir.
TCMB PPK kararı, TÜİK enflasyon, 6183 sayılı kanun gecikme zammı vb.

NOT: kurgan_calculator.py'deki CEZA_ORANLARI burada DEĞİLDİR.
O oranlar VUK madde 112 gecikme faizi (%1.8/ay) olup farklı yasal dayanağı vardır.
Bu dosyadaki gecikme_zammi_aylik ise 6183 sayılı kanun gecikme zammıdır (%4.4/ay).
"""

import json
import time
from pathlib import Path
from typing import Dict, Any

_CONFIG_PATH = Path(__file__).parent / "economic_rates.json"
_cache: Dict[str, Any] = {}
_cache_time: float = 0
_CACHE_TTL = 60  # seconds


def _load() -> Dict[str, Any]:
    global _cache, _cache_time
    now = time.time()
    if _cache and (now - _cache_time) < _CACHE_TTL:
        return _cache
    with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
        _cache = json.load(f)
    _cache_time = now
    return _cache


def get_economic_rates() -> Dict[str, Any]:
    """Tüm ekonomik oranları döndürür (meta + faiz + döviz fallback)."""
    return _load()


def get_faiz_oranlari() -> Dict[str, float]:
    """Faiz ve enflasyon oranlarını döndürür."""
    return _load()["faiz_oranlari"]


def get_doviz_fallback() -> Dict[str, float]:
    """TCMB bağlantısı kurulamazsa kullanılacak döviz kurlarını döndürür."""
    return _load()["doviz_fallback"]


def get_son_guncelleme() -> str:
    """Son güncelleme tarihini döndürür (örn: '2026-01-15')."""
    return _load()["meta"]["son_guncelleme"]
