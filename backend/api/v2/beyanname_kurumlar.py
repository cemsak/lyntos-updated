"""
LYNTOS API v2 - Kurumlar Vergisi Beyanname Hazirlik Endpoint

Mizan ve beyanname_entries tablosundan kurumlar vergisi icin
gerekli verileri toplar: ticari kar, KKEG, istisnalar, indirimler,
gecmis yil zararlari, odenmis gecici vergi.

Mevzuat: KVK 5520 Md. 6 (matrah), Md. 9 (zarar mahsubu), Md. 11 (KKEG), Md. 32 (oran)
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from middleware.auth import verify_token, check_client_access
from utils.period_utils import normalize_period_db
from pydantic import BaseModel
from typing import Optional
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/beyanname", tags=["beyanname-kurumlar"])


# ─── Response Model ───────────────────────────────────────────────

class KurumlarBeyanneResponse(BaseModel):
    """Kurumlar Vergisi Beyanname hazirlik verileri"""
    ticariKar: float = 0
    kkeg: float = 0
    istisnalar: float = 0
    indirimler: float = 0
    gecmisYilZarar: float = 0
    odenecekGeciciVergi: float = 0
    matrah: float = 0
    hesaplananVergi: float = 0
    vergiOrani: float = 0.25
    overall_status: str = "NO_DATA"
    message: Optional[str] = None


# ─── Endpoint ─────────────────────────────────────────────────────

@router.get("/kurumlar", response_model=KurumlarBeyanneResponse)
async def get_kurumlar_beyanname(
    client_id: str = Query(...),
    period_id: str = Query(...),
    user: dict = Depends(verify_token),
):
    """
    Kurumlar Vergisi beyanname hazirlik verileri.

    Mizan'dan:
    - 690 (Donem Kari): Ticari kar
    - 689 (KKEG iliskili hesaplar): KKEG tahmini
    - 671 (Onceki Donem Gelir/Kar): Potansiyel istisna

    beyanname_entries'den:
    - Gecici vergi toplami (onceki donemlerden)

    tahakkuk_entries'den:
    - Odenmis gecici vergi tutarlari
    """
    period_id = normalize_period_db(period_id)

    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Tenant bilgisi
        tenant_id = user.get("tenant_id") or user.get("id", "default")

        # Client erisim kontrolu
        await check_client_access(user, client_id)

        # 1. Mizan'dan ticari kar (690 Donem Net Kari/Zarari)
        cursor.execute("""
            SELECT
                SUM(CASE WHEN hesap_kodu LIKE '690%' THEN alacak_bakiye - borc_bakiye ELSE 0 END) as donem_kari,
                SUM(CASE WHEN hesap_kodu LIKE '689%' THEN borc_bakiye - alacak_bakiye ELSE 0 END) as kkeg_toplam,
                SUM(CASE WHEN hesap_kodu LIKE '671%' THEN alacak_bakiye - borc_bakiye ELSE 0 END) as onceki_donem_gelir
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        mizan_row = cursor.fetchone()

        if not mizan_row or (mizan_row["donem_kari"] is None and mizan_row["kkeg_toplam"] is None):
            conn.close()
            return KurumlarBeyanneResponse(
                overall_status="NO_DATA",
                message="Bu donem icin mizan verisi bulunamadi. Mizan yukleyerek kurumlar vergisi hesaplatabilirsiniz.",
            )

        ticari_kar = mizan_row["donem_kari"] or 0
        kkeg = max(0, mizan_row["kkeg_toplam"] or 0)
        istisnalar = max(0, mizan_row["onceki_donem_gelir"] or 0)

        # 2. Gecici vergi (tahakkuk tablosundan)
        cursor.execute("""
            SELECT SUM(CAST(tutar AS REAL)) as gecici_vergi_toplam
            FROM tahakkuk_entries
            WHERE client_id = ? AND period_id = ?
            AND LOWER(vergi_turu) LIKE '%gecici%'
        """, (client_id, period_id))
        gecici_row = cursor.fetchone()
        odenmis_gecici = gecici_row["gecici_vergi_toplam"] if gecici_row and gecici_row["gecici_vergi_toplam"] else 0

        conn.close()

        # 3. Matrah hesapla
        indirimler = 0  # R&D vs. — gelecekte genisletilebilir
        gecmis_yil_zarar = 0  # Onceki donemden devir — gelecekte genisletilebilir

        matrah = max(0, ticari_kar + kkeg - istisnalar - indirimler - gecmis_yil_zarar)
        vergi_orani = 0.25
        hesaplanan_vergi = matrah * vergi_orani

        return KurumlarBeyanneResponse(
            ticariKar=round(ticari_kar, 2),
            kkeg=round(kkeg, 2),
            istisnalar=round(istisnalar, 2),
            indirimler=round(indirimler, 2),
            gecmisYilZarar=round(gecmis_yil_zarar, 2),
            odenecekGeciciVergi=round(odenmis_gecici, 2),
            matrah=round(matrah, 2),
            hesaplananVergi=round(hesaplanan_vergi, 2),
            vergiOrani=vergi_orani,
            overall_status="OK",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kurumlar beyanname hatasi: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Kurumlar vergisi verisi alinamadi: {str(e)}")
