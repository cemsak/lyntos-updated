"""
LYNTOS API v2 - Tahakkuk Endpoint
tahakkuk_data tablosundan veri çeker.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from middleware.auth import verify_token, check_client_access
from utils.period_utils import get_period_db
from pydantic import BaseModel
from typing import List, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/beyanname", tags=["tahakkuk"])


class Tahakkuk(BaseModel):
    id: int
    period_id: str
    vergi_turu: Optional[str]
    tahakkuk_tutari: float
    gecikme_faizi: float
    gecikme_zammi: float
    toplam_borc: float
    source_file: Optional[str]
    tahakkuk_tarihi: Optional[str]


class TahakkukOzet(BaseModel):
    toplam_borc: float
    kayit_sayisi: int


class TahakkukResponse(BaseModel):
    tahakkuklar: List[Tahakkuk]
    ozet: TahakkukOzet


@router.get("/tahakkuk", response_model=TahakkukResponse)
async def get_tahakkuk(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    Tahakkuk (vergi borçları) verilerini getir.
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Tahakkukları çek
            cursor.execute("""
                SELECT
                    id, period_id, vergi_turu,
                    COALESCE(tahakkuk_tutari, 0) as tahakkuk_tutari,
                    COALESCE(gecikme_faizi, 0) as gecikme_faizi,
                    COALESCE(gecikme_zammi, 0) as gecikme_zammi,
                    COALESCE(toplam_borc, 0) as toplam_borc,
                    source_file,
                    tahakkuk_tarihi
                FROM tahakkuk_data
                WHERE client_id = ? AND period_id = ?
                ORDER BY vergi_turu, id
            """, [client_id, period_id])

            tahakkuklar = []
            for row in cursor.fetchall():
                tahakkuklar.append(Tahakkuk(
                    id=row[0],
                    period_id=row[1] or '',
                    vergi_turu=row[2],
                    tahakkuk_tutari=row[3] or 0,
                    gecikme_faizi=row[4] or 0,
                    gecikme_zammi=row[5] or 0,
                    toplam_borc=row[6] or 0,
                    source_file=row[7],
                    tahakkuk_tarihi=row[8]
                ))

            # Özet hesapla
            toplam_borc = sum(t.toplam_borc for t in tahakkuklar)

            ozet = TahakkukOzet(
                toplam_borc=toplam_borc,
                kayit_sayisi=len(tahakkuklar)
            )

            return TahakkukResponse(
                tahakkuklar=tahakkuklar,
                ozet=ozet
            )

    except Exception as e:
        logger.error(f"Tahakkuk error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tahakkuk/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "tahakkuk-v2"}
