from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

from data_engine.beyanname_parser import parse_beyanname_for_client
from data_engine.tahakkuk_parser import parse_tahakkuk_for_client
from data_engine.mizan_parser import parse_mizan_for_client
from data_engine.banka_parser import parse_banka_for_client
from data_engine.edefter_parser import parse_edefter_for_client


class ClientPeriodData(TypedDict):
    """
    Tek bir SMMM / mükellef / dönem kombinasyonu için
    Lyntos'un ham veri havuzu.
    """
    beyanname: List[Dict[str, Any]]
    tahakkuk: List[Dict[str, Any]]
    mizan: List[Dict[str, Any]]
    banka: List[Dict[str, Any]]
    edefter: List[Dict[str, Any]]


def load_all_for_client_period(
    base_dir: Path,
    smmm_id: str,
    client_id: Optional[str] = None,
    firma_id: Optional[str] = None,
    period: str = "",
) -> ClientPeriodData:
    """
    data/<kaynak>/<SMMM>/<MÜKELLEF>/<DÖNEM> yapısına göre tüm verileri yükler.

    Örn:
      base_dir = backend/data
      smmm_id  = "HKOZKAN"
      client_id / firma_id = "OZKAN_KIRTASIYE"
      period   = "2025-Q2"

    NOT:
    - Yeni kod için: client_id kullan (risk_model v1_engine böyle çağırıyor)
    - Eski kod / testler için: firma_id kullanılabiliyor.
    """
    base_dir = Path(base_dir)

    # En az bir tanesi dolu olmalı
    if client_id is None and firma_id is None:
        raise ValueError(
            "load_all_for_client_period: 'client_id' veya 'firma_id' parametresinden en az biri verilmelidir."
        )

    # Eski kod firma_id gönderiyorsa, onu client_id gibi kullan
    if client_id is None:
        client_id = firma_id

    # Bundan sonra client_id kesinlikle dolu
    assert client_id is not None

    # Parser fonksiyonlarını POZİSYONEL argümanla çağırıyoruz.
    # Imza: parse_xxx_for_client(base_dir, smmm_id, <firma_id/client_id>, period)
    beyanname = parse_beyanname_for_client(
        base_dir,
        smmm_id,
        client_id,
        period,
    )

    tahakkuk = parse_tahakkuk_for_client(
        base_dir,
        smmm_id,
        client_id,
        period,
    )

    mizan = parse_mizan_for_client(
        base_dir,
        smmm_id,
        client_id,
        period,
    )

    banka = parse_banka_for_client(
        base_dir,
        smmm_id,
        client_id,
        period,
    )

    edefter = parse_edefter_for_client(
        base_dir,
        smmm_id,
        client_id,
        period,
    )

    return {
        "beyanname": beyanname,
        "tahakkuk": tahakkuk,
        "mizan": mizan,
        "banka": banka,
        "edefter": edefter,
    }


def load_client_data(
    base_dir: Path,
    smmm_id: str,
    firma_id: str,
    period: str,
) -> ClientPeriodData:
    """
    Geriye dönük uyumluluk için alias.
    Eski isim: load_client_data
    Yeni standart: load_all_for_client_period
    """
    return load_all_for_client_period(
        base_dir=base_dir,
        smmm_id=smmm_id,
        firma_id=firma_id,
        period=period,
    )
