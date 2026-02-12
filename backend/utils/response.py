"""
LYNTOS Standard Response Helper
================================
H-02: Tutarli response envelope (yeni endpoint'ler bunu kullanmali)

Standart envelope: {"success": true, "data": {...}}
Hata envelope:     {"success": false, "error": "...", "detail": "..."}

Frontend api client (api/client.ts) her iki formati da destekler:
- Envelope: data alanini cikarir
- Raw JSON: oldubu gibi doner

Yeni endpoint yazan herkes bu helper'i kullanmali.
"""

from typing import Any, Dict, Optional


def ok(data: Any = None, **extra: Any) -> Dict[str, Any]:
    """
    Basarili yanit envelope'u.

    Kullanim:
        return ok({"rules": rules, "total": len(rules)})
        return ok(user, total=1)
    """
    result: Dict[str, Any] = {"success": True, "data": data}
    if extra:
        result.update(extra)
    return result


def error(message: str, detail: Optional[str] = None, **extra: Any) -> Dict[str, Any]:
    """
    Hata yanit envelope'u.

    Kullanim:
        return error("Kural bulunamadi", detail="R-001 mevcut degil")
    """
    result: Dict[str, Any] = {"success": False, "error": message}
    if detail:
        result["detail"] = detail
    if extra:
        result.update(extra)
    return result
