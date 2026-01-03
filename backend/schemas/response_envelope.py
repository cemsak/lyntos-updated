"""
ResponseEnvelope Standard

Tum API response'lari icin standart zarf yapisi.
"""

from typing import Any, List, Optional, Dict
from datetime import datetime
import uuid


def _iso_utc() -> str:
    """UTC timestamp"""
    return datetime.utcnow().isoformat() + "Z"


def wrap_response(
    endpoint_name: str,
    data: Any,
    smmm_id: str = "SYSTEM",
    client_id: str = "SYSTEM",
    period: str = "N/A",
    errors: Optional[List[Dict]] = None,
    warnings: Optional[List[Dict]] = None,
    trust_level: str = "tier1",
    version: str = "v2.0"
) -> Dict:
    """
    Wrap data in ResponseEnvelope

    Args:
        endpoint_name: API endpoint adi (e.g., "quarterly_tax")
        data: Response data
        smmm_id: SMMM ID
        client_id: Musteri ID
        period: Donem (e.g., "2025-Q2")
        errors: Hata listesi (optional)
        warnings: Uyari listesi (optional)
        trust_level: Guvenilirlik seviyesi ("tier1", "tier2", "tier3")
        version: Schema versiyon

    Returns:
        ResponseEnvelope dict
    """
    return {
        "schema": {
            "name": endpoint_name,
            "version": version,
            "generated_at": _iso_utc()
        },
        "meta": {
            "smmm_id": smmm_id,
            "client_id": client_id,
            "period": period,
            "request_id": str(uuid.uuid4()),
            "trust_level": trust_level
        },
        "data": data,
        "errors": errors or [],
        "warnings": warnings or []
    }


def wrap_error(
    endpoint_name: str,
    error_code: str,
    error_message: str,
    smmm_id: str = "SYSTEM",
    client_id: str = "SYSTEM",
    period: str = "N/A"
) -> Dict:
    """
    Wrap error in ResponseEnvelope

    Args:
        endpoint_name: API endpoint adi
        error_code: Hata kodu (e.g., "E001", "VALIDATION_ERROR")
        error_message: Hata mesaji
        smmm_id: SMMM ID
        client_id: Musteri ID
        period: Donem

    Returns:
        ResponseEnvelope dict with error
    """
    return {
        "schema": {
            "name": endpoint_name,
            "version": "v2.0",
            "generated_at": _iso_utc()
        },
        "meta": {
            "smmm_id": smmm_id,
            "client_id": client_id,
            "period": period,
            "request_id": str(uuid.uuid4()),
            "trust_level": "error"
        },
        "data": None,
        "errors": [
            {
                "code": error_code,
                "message": error_message
            }
        ],
        "warnings": []
    }
