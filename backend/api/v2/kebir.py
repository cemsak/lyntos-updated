"""
LYNTOS API v2 - Defteri Kebir Endpoint
E-Defter entries'den kebir verilerini çeker.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from middleware.auth import verify_token, check_client_access
from database.db import get_connection
from utils.period_utils import get_period_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/kebir", tags=["kebir"])


class HesapOzet(BaseModel):
    hesap_kodu: str
    hesap_adi: Optional[str]
    hareket_sayisi: int
    toplam_borc: float
    toplam_alacak: float


class HesapListResponse(BaseModel):
    hesaplar: List[HesapOzet]
    total: int


class KebirEntry(BaseModel):
    id: int
    kebir_hesap: str
    kebir_hesap_adi: Optional[str]
    tarih: str
    madde_no: Optional[str]
    fis_no: Optional[str]
    hesap_kodu: str
    hesap_adi: Optional[str]
    aciklama: Optional[str]
    borc: float
    alacak: float
    bakiye: float
    bakiye_turu: str


class KebirHareketResponse(BaseModel):
    entries: List[KebirEntry]
    total: int
    page: int
    pages: int


@router.get("/hesap-listesi", response_model=HesapListResponse)
async def get_hesap_listesi(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    search: Optional[str] = Query(None, description="Arama terimi"),
    user: dict = Depends(verify_token),
):
    """
    Kebir hesap listesini getir.

    E-defter entries tablosundan defter_tipi='K' veya 'KB' olan kayıtları gruplar.
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Base query - kebir kayıtları (K ve KB tipi)
            base_where = "client_id = ? AND period_id = ? AND defter_tipi IN ('K', 'KB')"
            params = [client_id, period_id]

            # Search varsa ekle
            if search:
                base_where += " AND (hesap_kodu LIKE ? OR hesap_adi LIKE ?)"
                search_param = f"%{search}%"
                params.extend([search_param, search_param])

            # Hesapları grupla - sadece hesap_kodu ile grupla, hesap_adi'yi MAX ile al
            # (aynı hesap kodu farklı isimlerle gelebilir: "İndirilecek KDV" vs "İNDİRİLECEK KDV")
            cursor.execute(f"""
                SELECT
                    hesap_kodu,
                    MAX(hesap_adi) as hesap_adi,
                    COUNT(*) as hareket_sayisi,
                    SUM(CASE WHEN borc_alacak IN ('B', 'D') THEN tutar ELSE 0 END) as toplam_borc,
                    SUM(CASE WHEN borc_alacak IN ('A', 'C') THEN tutar ELSE 0 END) as toplam_alacak
                FROM edefter_entries
                WHERE {base_where}
                GROUP BY hesap_kodu
                ORDER BY hesap_kodu
            """, params)

            hesaplar = []
            for row in cursor.fetchall():
                hesaplar.append(HesapOzet(
                    hesap_kodu=row[0] or '',
                    hesap_adi=row[1],
                    hareket_sayisi=row[2] or 0,
                    toplam_borc=row[3] or 0,
                    toplam_alacak=row[4] or 0
                ))

            return HesapListResponse(
                hesaplar=hesaplar,
                total=len(hesaplar)
            )

    except Exception as e:
        logger.error(f"Kebir hesap listesi error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hesap/{hesap_kodu}", response_model=KebirHareketResponse)
async def get_hesap_hareketleri(
    hesap_kodu: str,
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    page_size: int = Query(100, ge=1, le=500, description="Sayfa başına kayıt"),
    user: dict = Depends(verify_token),
):
    """
    Belirli bir hesabın kebir hareketlerini getir.
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            offset = (page - 1) * page_size

            # Hesap kodu ile eşleşen kayıtları bul
            base_where = """
                client_id = ? AND period_id = ?
                AND defter_tipi IN ('K', 'KB')
                AND hesap_kodu LIKE ?
            """
            hesap_pattern = f"{hesap_kodu}%"
            params = [client_id, period_id, hesap_pattern]

            # Toplam kayıt sayısı
            cursor.execute(f"""
                SELECT COUNT(*) FROM edefter_entries
                WHERE {base_where}
            """, params)
            total = cursor.fetchone()[0]

            pages = (total + page_size - 1) // page_size if total > 0 else 1

            # Hareketleri çek
            cursor.execute(f"""
                SELECT
                    id, hesap_kodu, hesap_adi, tarih,
                    fis_no, fis_no as madde_no,
                    hesap_kodu, hesap_adi, fis_aciklama,
                    CASE WHEN borc_alacak IN ('B', 'D') THEN tutar ELSE 0 END as borc,
                    CASE WHEN borc_alacak IN ('A', 'C') THEN tutar ELSE 0 END as alacak,
                    tutar as bakiye,
                    CASE WHEN borc_alacak IN ('B', 'D') THEN 'B' ELSE 'A' END as bakiye_turu
                FROM edefter_entries
                WHERE {base_where}
                ORDER BY tarih, fis_no
                LIMIT ? OFFSET ?
            """, params + [page_size, offset])

            # Running balance hesapla
            entries = []
            running_balance = 0
            for row in cursor.fetchall():
                borc = row[9] or 0
                alacak = row[10] or 0
                running_balance += borc - alacak

                entries.append(KebirEntry(
                    id=row[0],
                    kebir_hesap=row[1] or '',
                    kebir_hesap_adi=row[2],
                    tarih=row[3] or '',
                    madde_no=row[5],
                    fis_no=row[4],
                    hesap_kodu=row[6] or '',
                    hesap_adi=row[7],
                    aciklama=row[8],
                    borc=borc,
                    alacak=alacak,
                    bakiye=abs(running_balance),
                    bakiye_turu='B' if running_balance >= 0 else 'A'
                ))

            return KebirHareketResponse(
                entries=entries,
                total=total,
                page=page,
                pages=pages
            )

    except Exception as e:
        logger.error(f"Kebir hareketleri error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "kebir-v2"}
