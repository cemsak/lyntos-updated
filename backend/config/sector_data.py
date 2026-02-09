"""
Sektör ortalamaları konfigürasyonu.

TCMB Sektör Bilançoları 2023 + TÜİK + GİB kaynaklı statik veriler.
EVDS API çalışmadığında fallback olarak kullanılır.
"""

import json
import time
from pathlib import Path
from typing import Dict, Any

_CONFIG_PATH = Path(__file__).parent / "sector_averages.json"
_cache: Dict[str, Any] = {}
_cache_time: float = 0
_CACHE_TTL = 300  # 5 minutes


def _load() -> Dict[str, Any]:
    global _cache, _cache_time
    now = time.time()
    if _cache and (now - _cache_time) < _CACHE_TTL:
        return _cache
    with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
        _cache = json.load(f)
    _cache_time = now
    return _cache


def get_static_sector_averages() -> Dict[str, Any]:
    """Tüm sektör ortalamalarını döndürür."""
    return _load()["sectors"]


def get_sector_for_nace(nace_prefix: str) -> Dict[str, Any]:
    """NACE prefix'e göre sektör verisini döndürür, yoksa varsayılan."""
    data = _load()
    return data["sectors"].get(nace_prefix, data["varsayilan"])


def get_static_meta() -> Dict[str, str]:
    """Meta bilgisini döndürür (kaynak, veri_yili, son_guncelleme)."""
    return _load()["meta"]
