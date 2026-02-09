"""
LYNTOS API v2 - Yeniden Değerleme Endpoint

VUK Mükerrer Madde 298/Ç kapsamında ATİK yeniden değerleme hesaplaması.
VUK Geçici 37 ile 2025-2027 arası enflasyon düzeltmesi askıdadır;
bu dönemler için yeniden değerleme pratik araçtır.

Mevzuat: VUK Mük. 298/Ç, VUK Geçici 37
TDHP: 250-255, 257, 522
"""

from fastapi import APIRouter, Query
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v2/yeniden-degerleme",
    tags=["yeniden-degerleme"]
)


@router.get("/hesapla")
async def hesapla_yeniden_degerleme(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem (örn: 2025-Q1)"),
    smmm_id: str = Query(default="HKOZKAN", description="SMMM ID"),
):
    """
    VUK Mük. 298/Ç - Sürekli Yeniden Değerleme Hesaplama

    Mizandaki MDV (250-255) ve Birikmiş Amortisman (257) bakiyelerini
    Yİ-ÜFE katsayısı ile yeniden değerler.

    Muhasebe kaydı önerisi:
    - Borç: 25x / Alacak: 522 (MDV artış)
    - Borç: 522 / Alacak: 257 (amortisman artış)

    Örnek: GET /api/v2/yeniden-degerleme/hesapla?client_id=CLIENT_048_76E7913D&period_id=2025-Q1
    """
    try:
        from services.yeniden_degerleme import hesapla_yeniden_degerleme as _hesapla
        result = _hesapla(client_id, period_id)
        return result
    except Exception as e:
        logger.error(f"Yeniden değerleme hesaplama hatası: {e}")
        return {
            "ok": False,
            "reason_tr": f"Yeniden değerleme hesaplanamadı: {str(e)}",
            "missing_data": None,
            "required_actions": None,
            "mdv_listesi": None,
            "toplam": None,
            "muhasebe_kaydi": None,
        }


@router.get("/durum")
async def yeniden_degerleme_durum(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem (örn: 2025-Q1)"),
):
    """
    Yeniden değerleme ön kontrol: Yİ-ÜFE verisi ve MDV bakiyesi mevcut mu?

    Dönem Sonu İşlemleri sayfasından Step 2'de kullanılır.
    """
    from services.enflasyon_duzeltme import has_tufe_data, has_fixed_asset_dates

    yiufe_mevcut = has_tufe_data()
    mdv_mevcut = has_fixed_asset_dates()

    hazir = yiufe_mevcut and mdv_mevcut
    eksikler = []
    if not yiufe_mevcut:
        eksikler.append("Yİ-ÜFE endeks verisi eksik")
    if not mdv_mevcut:
        eksikler.append("Mizanda MDV (25x) hesabı bulunamadı")

    return {
        "ok": True,
        "hazir": hazir,
        "yiufe_mevcut": yiufe_mevcut,
        "mdv_mevcut": mdv_mevcut,
        "eksikler": eksikler,
        "mevzuat_notu": (
            "VUK Geçici 37 (25.12.2025): 2025-2027 hesap dönemlerinde "
            "enflasyon düzeltmesi YAPILMAYACAK. VUK Mük. 298/Ç kapsamında "
            "sürekli yeniden değerleme uygulanabilir."
        ),
    }
