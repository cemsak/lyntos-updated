"""
Portfolio schema meta wrapper
"""
from datetime import datetime


def add_schema_meta(data: dict, name: str = "lyntos_portfolio", version: str = "2.1") -> dict:
    """Portfolio response'a schema meta ekle"""
    return {
        "schema": {
            "name": name,
            "version": version,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "trust_level": "tier1"
        },
        "data": data
    }


def get_schema_meta(name: str, version: str = "1.0") -> dict:
    """Standalone schema meta olustur"""
    return {
        "name": name,
        "version": version,
        "generated_at": datetime.utcnow().isoformat() + "Z"
    }
