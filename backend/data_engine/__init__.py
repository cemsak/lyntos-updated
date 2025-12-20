from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

from .loader import (
    load_all_for_client_period,
    load_client_data,
)
from .beyanname_parser import parse_beyanname_for_client
from .tahakkuk_parser import parse_tahakkuk_for_client
from .mizan_parser import parse_mizan_for_client
from .banka_parser import parse_banka_for_client
from .edefter_parser import parse_edefter_for_client


# Geriye dönük uyumluluk için eski isim
def load_data_for_firma_period(
    base_dir: Path,
    smmm_id: str,
    firma_id: str,
    period: str,
):
    """
    Eski kodların kullandığı isim. Yeni yapıda load_all_for_client_period ile aynıdır.
    """
    return load_all_for_client_period(
        base_dir=base_dir,
        smmm_id=smmm_id,
        firma_id=firma_id,
        period=period,
    )


__all__ = [
    "load_all_for_client_period",
    "load_client_data",
    "load_data_for_firma_period",
    "parse_beyanname_for_client",
    "parse_tahakkuk_for_client",
    "parse_mizan_for_client",
    "parse_banka_for_client",
    "parse_edefter_for_client",
]
