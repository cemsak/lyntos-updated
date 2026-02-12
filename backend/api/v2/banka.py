"""
LYNTOS API v2 - Banka Hareketleri Endpoint
bank_transactions tablosundan veri çeker.
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

router = APIRouter(prefix="/api/v2/banka", tags=["banka"])


class BankaHesap(BaseModel):
    banka_adi: str
    hesap_kodu: str
    islem_sayisi: int
    toplam_giris: float
    toplam_cikis: float
    son_bakiye: float


class HesaplarResponse(BaseModel):
    hesaplar: List[BankaHesap]
    total: int


class BankaIslem(BaseModel):
    id: int
    banka_adi: Optional[str]
    hesap_kodu: str
    tarih: str
    aciklama: Optional[str]
    tutar: float
    bakiye: float
    islem_tipi: Optional[str]


class IslemlerResponse(BaseModel):
    islemler: List[BankaIslem]
    total: int
    page: int
    pages: int
    ozet: dict


@router.get("/hesaplar", response_model=HesaplarResponse)
async def get_banka_hesaplar(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token),
):
    """
    Banka hesaplarının listesini getir.

    MAXİM DÜZELTME: Banka adı NULL ise Mizan'dan hesap adını çek.
    Mükellefin aynı bankada birden fazla hesabı olabilir (döviz, yatırım, kredi, POS vb.)
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Önce Mizan'dan 102.xx hesap adlarını al (banka adı olarak kullanılacak)
            cursor.execute("""
                SELECT hesap_kodu, hesap_adi
                FROM mizan_entries
                WHERE client_id = ? AND period_id = ? AND hesap_kodu LIKE '102.%'
            """, [client_id, period_id])

            mizan_banka_adlari = {}
            for row in cursor.fetchall():
                mizan_banka_adlari[row[0]] = row[1]

            # Hesapları grupla
            cursor.execute("""
                SELECT
                    banka_adi,
                    hesap_kodu,
                    COUNT(*) as islem_sayisi,
                    SUM(CASE WHEN tutar > 0 THEN tutar ELSE 0 END) as toplam_giris,
                    SUM(CASE WHEN tutar < 0 THEN ABS(tutar) ELSE 0 END) as toplam_cikis,
                    (SELECT bakiye FROM bank_transactions bt2
                     WHERE bt2.client_id = bt.client_id
                     AND bt2.period_id = bt.period_id
                     AND bt2.hesap_kodu = bt.hesap_kodu
                     ORDER BY substr(bt2.tarih, 7, 4) || substr(bt2.tarih, 4, 2) || substr(bt2.tarih, 1, 2) DESC,
                              bt2.id ASC
                     LIMIT 1) as son_bakiye
                FROM bank_transactions bt
                WHERE client_id = ? AND period_id = ?
                GROUP BY hesap_kodu, banka_adi
                ORDER BY hesap_kodu
            """, [client_id, period_id])

            hesaplar = []
            for row in cursor.fetchall():
                hesap_kodu = row[1] or ''
                # Banka adı: önce bank_transactions'tan, yoksa Mizan'dan al
                banka_adi = row[0]
                if not banka_adi or banka_adi == 'None':
                    # Mizan'dan banka adını al
                    banka_adi = mizan_banka_adlari.get(hesap_kodu, 'Bilinmeyen Banka')

                hesaplar.append(BankaHesap(
                    banka_adi=banka_adi,
                    hesap_kodu=hesap_kodu,
                    islem_sayisi=row[2] or 0,
                    toplam_giris=row[3] or 0,
                    toplam_cikis=row[4] or 0,
                    son_bakiye=row[5] or 0
                ))

            return HesaplarResponse(
                hesaplar=hesaplar,
                total=len(hesaplar)
            )

    except Exception as e:
        logger.error(f"Banka hesaplar error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/islemler", response_model=IslemlerResponse)
async def get_banka_islemler(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    banka: Optional[str] = Query(None, description="Banka adı filtresi"),
    hesap_kodu: Optional[str] = Query(None, description="Hesap kodu filtresi"),
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    page_size: int = Query(50, ge=1, le=500, description="Sayfa başına kayıt"),
    user: dict = Depends(verify_token),
):
    """
    Banka işlemlerini getir.
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            offset = (page - 1) * page_size

            # Base query
            base_where = "client_id = ? AND period_id = ?"
            params = [client_id, period_id]

            # Filtreler
            if banka:
                base_where += " AND (banka_adi = ? OR banka_adi IS NULL)"
                params.append(banka)

            if hesap_kodu:
                base_where += " AND hesap_kodu = ?"
                params.append(hesap_kodu)

            # Toplam kayıt sayısı
            cursor.execute(f"""
                SELECT COUNT(*) FROM bank_transactions
                WHERE {base_where}
            """, params)
            total = cursor.fetchone()[0]

            pages = (total + page_size - 1) // page_size if total > 0 else 1

            # Özet bilgiler
            cursor.execute(f"""
                SELECT
                    SUM(CASE WHEN tutar > 0 THEN tutar ELSE 0 END) as toplam_giris,
                    SUM(CASE WHEN tutar < 0 THEN ABS(tutar) ELSE 0 END) as toplam_cikis,
                    COUNT(*) as islem_sayisi
                FROM bank_transactions
                WHERE {base_where}
            """, params)
            ozet_row = cursor.fetchone()
            ozet = {
                "toplam_giris": ozet_row[0] or 0,
                "toplam_cikis": ozet_row[1] or 0,
                "islem_sayisi": ozet_row[2] or 0
            }

            # İşlemleri çek
            cursor.execute(f"""
                SELECT
                    id, banka_adi, hesap_kodu, tarih, aciklama,
                    tutar, bakiye, islem_tipi
                FROM bank_transactions
                WHERE {base_where}
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            """, params + [page_size, offset])

            islemler = []
            for row in cursor.fetchall():
                islemler.append(BankaIslem(
                    id=row[0],
                    banka_adi=row[1],
                    hesap_kodu=row[2] or '',
                    tarih=row[3] or '',
                    aciklama=row[4],
                    tutar=row[5] or 0,
                    bakiye=row[6] or 0,
                    islem_tipi=row[7]
                ))

            return IslemlerResponse(
                islemler=islemler,
                total=total,
                page=page,
                pages=pages,
                ozet=ozet
            )

    except Exception as e:
        logger.error(f"Banka islemler error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "banka-v2"}
