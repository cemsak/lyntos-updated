"""
LYNTOS API v2 - E-Defter Rapor Endpoint
E-Defter entries tablosundan özet rapor oluşturur.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from middleware.auth import verify_token, check_client_access
from utils.period_utils import get_period_db, get_period_db_optional
from typing import Optional
import logging

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/edefter", tags=["edefter"])


@router.get("/rapor")
async def get_edefter_rapor(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: Optional[str] = Depends(get_period_db_optional),
    user: dict = Depends(verify_token)
):
    """
    E-Defter Raporu - edefter_entries tablosundan özet bilgiler.

    Döner:
    - VKN, Dönem bilgileri
    - Toplam fiş sayısı
    - Toplam borç/alacak tutarları
    - Hesap bazlı özet
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Mükellef bilgilerini clients tablosundan çek
            cursor.execute("""
                SELECT name, tax_id FROM clients WHERE id = ?
            """, (client_id,))
            client_row = cursor.fetchone()
            client_info = {
                "unvan": client_row["name"] if client_row else None,
                "vkn": client_row["tax_id"] if client_row else None
            }

            # Period_id direkt kullan - veritabanında 2025-Q1 formatında
            # borc_alacak değerleri: D=Debit(Borç), C=Credit(Alacak)
            if period_id:
                cursor.execute("""
                    SELECT
                        vkn,
                        period_id as donem,
                        defter_tipi,
                        COUNT(DISTINCT fis_no) as fis_sayisi,
                        SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END) as toplam_borc,
                        SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END) as toplam_alacak,
                        COUNT(*) as satir_sayisi
                    FROM edefter_entries
                    WHERE client_id = ? AND period_id = ?
                    GROUP BY vkn, period_id, defter_tipi
                    ORDER BY period_id
                """, (client_id, period_id))
            else:
                cursor.execute("""
                    SELECT
                        vkn,
                        period_id as donem,
                        defter_tipi,
                        COUNT(DISTINCT fis_no) as fis_sayisi,
                        SUM(CASE WHEN borc_alacak = 'D' THEN tutar ELSE 0 END) as toplam_borc,
                        SUM(CASE WHEN borc_alacak = 'C' THEN tutar ELSE 0 END) as toplam_alacak,
                        COUNT(*) as satir_sayisi
                    FROM edefter_entries
                    WHERE client_id = ?
                    GROUP BY vkn, period_id, defter_tipi
                    ORDER BY period_id
                """, (client_id,))

            rows = cursor.fetchall()
            raporlar = []

            for row in rows:
                r = dict(row)
                raporlar.append({
                    "vkn": client_info["vkn"],  # Mükellef tablosundan
                    "unvan": client_info["unvan"],  # Mükellef tablosundan
                    "donem": r.get("donem"),
                    "defter_tipi": r.get("defter_tipi"),
                    "fis_sayisi": r.get("fis_sayisi", 0),
                    "satir_sayisi": r.get("satir_sayisi", 0),
                    "toplam_borc": r.get("toplam_borc", 0) or 0,
                    "toplam_alacak": r.get("toplam_alacak", 0) or 0
                })

            # Toplam hesapla
            toplam_borc = sum(r.get('toplam_borc', 0) or 0 for r in raporlar)
            toplam_alacak = sum(r.get('toplam_alacak', 0) or 0 for r in raporlar)
            toplam_fis = sum(r.get('fis_sayisi', 0) or 0 for r in raporlar)

            return {
                "client_id": client_id,
                "period_id": period_id,
                "client_info": client_info,  # Mükellef bilgileri
                "raporlar": raporlar,
                "total": len(raporlar),
                "summary": {
                    "toplam_borc": toplam_borc,
                    "toplam_alacak": toplam_alacak,
                    "toplam_fis": toplam_fis,
                    "fark": abs(toplam_borc - toplam_alacak)
                }
            }

    except Exception as e:
        logger.error(f"E-Defter rapor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/detay")
async def get_edefter_detay(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    fis_no: str = Query(None, description="Fiş No filtresi"),
    hesap_kodu: str = Query(None, description="Hesap kodu filtresi"),
    limit: int = Query(100, description="Maksimum kayıt sayısı"),
    offset: int = Query(0, description="Başlangıç offset"),
    user: dict = Depends(verify_token)
):
    """
    E-Defter Detay - Fiş bazlı detaylı kayıtlar.
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    fis_no, satir_no, tarih, fis_aciklama,
                    hesap_kodu, hesap_adi,
                    tutar, borc_alacak,
                    belge_no, belge_tarihi, aciklama
                FROM edefter_entries
                WHERE client_id = ? AND period_id = ?
            """
            params = [client_id, period_id]

            if fis_no:
                query += " AND fis_no = ?"
                params.append(fis_no)

            if hesap_kodu:
                query += " AND hesap_kodu LIKE ?"
                params.append(f"{hesap_kodu}%")

            query += " ORDER BY tarih, fis_no, satir_no LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            rows = cursor.fetchall()

            entries = []
            for row in rows:
                entries.append(dict(row))

            # Toplam sayı
            count_query = """
                SELECT COUNT(*) as total FROM edefter_entries
                WHERE client_id = ? AND period_id = ?
            """
            count_params = [client_id, period_id]
            if fis_no:
                count_query += " AND fis_no = ?"
                count_params.append(fis_no)
            if hesap_kodu:
                count_query += " AND hesap_kodu LIKE ?"
                count_params.append(f"{hesap_kodu}%")

            cursor.execute(count_query, count_params)
            total = cursor.fetchone()["total"]

            return {
                "client_id": client_id,
                "period_id": period_id,
                "entries": entries,
                "total": total,
                "limit": limit,
                "offset": offset
            }

    except Exception as e:
        logger.error(f"E-Defter detay error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "edefter-rapor"}


@router.get("/durum")
async def get_edefter_durum(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    E-Defter Durum - Yevmiye ve Kebir yüklenmiş mi kontrol et.

    Dönem Verileri paneli için kullanılır.
    edefter_entries tablosunda Y, K, YB, KB kayıtları var mı kontrol eder.

    Returns:
        has_yevmiye: bool - Yevmiye defteri (Y) var mı
        has_kebir: bool - Kebir defteri (K) var mı
        has_yevmiye_berat: bool - Yevmiye beratı (YB) var mı
        has_kebir_berat: bool - Kebir beratı (KB) var mı
        yevmiye_satir: int - Yevmiye satır sayısı
        kebir_satir: int - Kebir satır sayısı
    """
    await check_client_access(user, client_id)
    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Hangi defter tipleri var kontrol et
            cursor.execute("""
                SELECT
                    defter_tipi,
                    COUNT(*) as satir_sayisi
                FROM edefter_entries
                WHERE client_id = ? AND period_id = ?
                GROUP BY defter_tipi
            """, (client_id, period_id))

            rows = cursor.fetchall()
            defter_map = {row["defter_tipi"]: row["satir_sayisi"] for row in rows}

            return {
                "client_id": client_id,
                "period_id": period_id,
                "has_yevmiye": "Y" in defter_map,
                "has_kebir": "K" in defter_map,
                "has_yevmiye_berat": "YB" in defter_map,
                "has_kebir_berat": "KB" in defter_map,
                "has_defter_raporu": "DR" in defter_map,
                "yevmiye_satir": defter_map.get("Y", 0),
                "kebir_satir": defter_map.get("K", 0),
                "yevmiye_berat_satir": defter_map.get("YB", 0),
                "kebir_berat_satir": defter_map.get("KB", 0),
                "defter_tipi_list": list(defter_map.keys()),
            }

    except Exception as e:
        logger.error(f"E-Defter durum error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
