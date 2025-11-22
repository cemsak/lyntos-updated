# ~/lyntos/backend/services/simple_cache.py
import time
from typing import Any, Dict

_cache: Dict[str, Any] = {}
_expiry: Dict[str, float] = {}

def set_cache(key: str, value: Any, ttl: int = 60):
    """
    key: benzersiz isim (ör. 'luca_mizan_2025Q4')
    value: saklanacak obje (list, dict, vs)
    ttl: saniye cinsinden saklama süresi
    """
    _cache[key] = value
    _expiry[key] = time.time() + ttl

def get_cache(key: str):
    """
    Süresi dolmadıysa RAM'den veriyi döner.
    """
    if key in _cache and _expiry.get(key, 0) > time.time():
        return _cache[key]
    if key in _cache:
        del _cache[key]
    return None

