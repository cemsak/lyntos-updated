"""
LYNTOS Beyannameler API

KDV, Muhtasar, Geçici Vergi Beyannameleri ve Tahakkuk endpoint'leri.
Q1 2025 - Gerçek PDF verilerinden parse edilmiş data.
"""

from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Optional
import sqlite3
import logging

from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger(__name__)

DB_PATH = "backend/database/lyntos.db"


def get_db():
    """Database connection helper"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ============================================================================
# KDV BEYANNAME API
# ============================================================================

@router.get("/beyanname/kdv")
async def get_kdv_beyanname(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem (YYYY-QN veya YYYY-MM)"),
    user: dict = Depends(verify_token)
):
    """
    KDV Beyanname verilerini getir

    Q1 2025 için 3 aylık KDV beyanname verisi döner:
    - Ocak, Şubat, Mart
    - Matrah, Hesaplanan KDV, İndirilecek KDV, Ödenecek/Devreden
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        if period and '-Q' in period:
            # Çeyrek bazlı (2025-Q1 -> Ocak, Şubat, Mart)
            cursor.execute("""
                SELECT * FROM kdv_beyanname
                WHERE client_id = ? AND period_id = ?
                ORDER BY donem_ay
            """, (client_id, period))
        elif period:
            # Aylık
            cursor.execute("""
                SELECT * FROM kdv_beyanname
                WHERE client_id = ? AND donem = ?
            """, (client_id, period))
        else:
            # Tümü
            cursor.execute("""
                SELECT * FROM kdv_beyanname
                WHERE client_id = ?
                ORDER BY donem_yil DESC, donem_ay DESC
                LIMIT 200
            """, (client_id,))

        rows = [dict(row) for row in cursor.fetchall()]

        # Özet hesapla
        toplam_matrah = sum(r.get('matrah', 0) or 0 for r in rows)
        toplam_hesaplanan = sum(r.get('hesaplanan_kdv', 0) or 0 for r in rows)
        toplam_indirilecek = sum(r.get('indirilecek_kdv', 0) or 0 for r in rows)
        son_devreden = rows[-1].get('devreden_kdv', 0) if rows else 0

        # raw_text'i kaldır (çok uzun)
        for r in rows:
            r.pop('raw_text', None)

        return {
            "status": "success",
            "data": {
                "beyannameler": rows,
                "ozet": {
                    "toplam_matrah": toplam_matrah,
                    "toplam_hesaplanan_kdv": toplam_hesaplanan,
                    "toplam_indirilecek_kdv": toplam_indirilecek,
                    "son_devreden_kdv": son_devreden,
                    "donem_sayisi": len(rows)
                }
            }
        }

    except Exception as e:
        logger.error(f"KDV beyanname error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# MUHTASAR BEYANNAME API
# ============================================================================

@router.get("/beyanname/muhtasar")
async def get_muhtasar_beyanname(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem"),
    user: dict = Depends(verify_token)
):
    """
    Muhtasar Beyanname verilerini getir

    Aylık stopaj beyannameleri:
    - Gelir vergisi kesintisi
    - Damga vergisi
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        if period and '-Q' in period:
            cursor.execute("""
                SELECT * FROM muhtasar_beyanname
                WHERE client_id = ? AND period_id = ?
                ORDER BY donem_ay
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT * FROM muhtasar_beyanname
                WHERE client_id = ?
                ORDER BY donem_yil DESC, donem_ay DESC
                LIMIT 200
            """, (client_id,))

        rows = [dict(row) for row in cursor.fetchall()]

        # Özet
        toplam_vergi = sum(r.get('toplam_vergi', 0) or 0 for r in rows)
        toplam_gelir_v = sum(r.get('gelir_vergisi', 0) or 0 for r in rows)
        toplam_damga_v = sum(r.get('damga_vergisi', 0) or 0 for r in rows)

        for r in rows:
            r.pop('raw_text', None)

        return {
            "status": "success",
            "data": {
                "beyannameler": rows,
                "ozet": {
                    "toplam_vergi": toplam_vergi,
                    "toplam_gelir_vergisi": toplam_gelir_v,
                    "toplam_damga_vergisi": toplam_damga_v,
                    "donem_sayisi": len(rows)
                }
            }
        }

    except Exception as e:
        logger.error(f"Muhtasar beyanname error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# GEÇİCİ VERGİ BEYANNAME API
# ============================================================================

@router.get("/beyanname/gecici-vergi")
async def get_gecici_vergi_beyanname(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem (YYYY-QN)"),
    user: dict = Depends(verify_token)
):
    """
    Geçici Vergi Beyanname verilerini getir

    Çeyreklik kurumlar vergisi ön ödemesi:
    - Ticari kar
    - Mali kar (matrah)
    - Hesaplanan vergi
    - Ödenecek vergi
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        if period:
            cursor.execute("""
                SELECT * FROM gecici_vergi_beyanname
                WHERE client_id = ? AND (period_id = ? OR donem = ?)
                ORDER BY donem_ceyrek
            """, (client_id, period, period))
        else:
            cursor.execute("""
                SELECT * FROM gecici_vergi_beyanname
                WHERE client_id = ?
                ORDER BY donem_yil DESC, donem_ceyrek DESC
                LIMIT 200
            """, (client_id,))

        rows = [dict(row) for row in cursor.fetchall()]

        for r in rows:
            r.pop('raw_text', None)

        return {
            "status": "success",
            "data": {
                "beyannameler": rows,
                "ozet": {
                    "toplam_odenecek": sum(r.get('odenecek_vergi', 0) or 0 for r in rows),
                    "donem_sayisi": len(rows)
                }
            }
        }

    except Exception as e:
        logger.error(f"Geçici vergi beyanname error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# TAHAKKUK API
# ============================================================================

@router.get("/tahakkuk")
async def get_tahakkuk(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem"),
    beyanname_turu: str = Query(None, description="Beyanname türü filtresi"),
    user: dict = Depends(verify_token)
):
    """
    Tahakkuk (vergi borcu) verilerini getir

    Her beyanname için oluşan vergi borcu:
    - Tahakkuk no
    - Vade tarihi
    - Vergi tutarı
    - Toplam borç
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        conditions = ["client_id = ?"]
        params = [client_id]

        if period:
            conditions.append("period_id = ?")
            params.append(period)

        if beyanname_turu:
            conditions.append("beyanname_turu = ?")
            params.append(beyanname_turu)

        where = " AND ".join(conditions)

        cursor.execute(f"""
            SELECT * FROM tahakkuk
            WHERE {where}
            ORDER BY vade_tarihi, beyanname_turu
            LIMIT 1000
        """, params)

        rows = [dict(row) for row in cursor.fetchall()]

        # Özet
        toplam_borc = sum(r.get('toplam_borc', 0) or 0 for r in rows)

        for r in rows:
            r.pop('raw_text', None)

        return {
            "status": "success",
            "data": {
                "tahakkuklar": rows,
                "ozet": {
                    "toplam_borc": toplam_borc,
                    "kayit_sayisi": len(rows),
                    "tur_dagilimi": {}
                }
            }
        }

    except Exception as e:
        logger.error(f"Tahakkuk error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# BEYANNAME ÖZET API (Dashboard için)
# ============================================================================

@router.get("/beyanname/ozet")
async def get_beyanname_ozet(
    client_id: str = Query(..., description="Müşteri ID"),
    period_id: str = Query(..., description="Dönem (YYYY-QN)"),
    user: dict = Depends(verify_token)
):
    """
    Tüm beyannamelerin DETAYLI bilgisi (Q1 özet sayfası için)

    Döndürür:
    - kdv: Liste halinde tüm KDV beyannameleri
    - muhtasar: Liste halinde tüm muhtasar beyannameleri
    - gecici_vergi: Liste halinde geçici vergi beyannameleri
    - tahakkuk: Liste halinde tüm tahakkuklar
    - banka_islem_sayisi, yevmiye_sayisi, kebir_sayisi, mizan_sayisi
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # KDV Beyannameleri (detaylı liste)
        cursor.execute("""
            SELECT donem, matrah, hesaplanan_kdv, indirilecek_kdv, odenecek_kdv, devreden_kdv
            FROM kdv_beyanname
            WHERE client_id = ? AND period_id = ?
            ORDER BY donem_ay
        """, (client_id, period_id))
        kdv_list = [dict(row) for row in cursor.fetchall()]

        # Muhtasar Beyannameleri (detaylı liste)
        cursor.execute("""
            SELECT donem, toplam_vergi, calisan_sayisi, gelir_vergisi, damga_vergisi
            FROM muhtasar_beyanname
            WHERE client_id = ? AND period_id = ?
            ORDER BY donem_ay
        """, (client_id, period_id))
        muhtasar_list = [dict(row) for row in cursor.fetchall()]

        # Geçici Vergi Beyannameleri
        cursor.execute("""
            SELECT donem, matrah, ticari_kar, hesaplanan_vergi, odenecek_vergi, mahsup_edilen
            FROM gecici_vergi_beyanname
            WHERE client_id = ? AND period_id = ?
            ORDER BY donem_ceyrek
        """, (client_id, period_id))
        gecici_list = [dict(row) for row in cursor.fetchall()]

        # Tahakkuklar (detaylı liste)
        cursor.execute("""
            SELECT beyanname_turu, donem, toplam_borc, vergi_tutari, gecikme_zammi, vade_tarihi
            FROM tahakkuk
            WHERE client_id = ? AND period_id = ?
            ORDER BY vade_tarihi
        """, (client_id, period_id))
        tahakkuk_list = [dict(row) for row in cursor.fetchall()]

        # Banka işlem sayısı
        cursor.execute("SELECT COUNT(*) FROM banka_islemler WHERE client_id = ? AND period_id = ?", (client_id, period_id))
        banka_count = cursor.fetchone()[0] or 0

        # Yevmiye sayısı
        cursor.execute("SELECT COUNT(*) FROM yevmiye_excel_entries WHERE client_id = ? AND period_id = ?", (client_id, period_id))
        yevmiye_count = cursor.fetchone()[0] or 0

        # Kebir sayısı
        cursor.execute("SELECT COUNT(*) FROM kebir_excel_entries WHERE client_id = ? AND period_id = ?", (client_id, period_id))
        kebir_count = cursor.fetchone()[0] or 0

        # Mizan sayısı
        cursor.execute("SELECT COUNT(*) FROM mizan_entries WHERE client_id = ? AND period_id = ?", (client_id, period_id))
        mizan_count = cursor.fetchone()[0] or 0

        return {
            "kdv": kdv_list,
            "muhtasar": muhtasar_list,
            "gecici_vergi": gecici_list,
            "tahakkuk": tahakkuk_list,
            "banka_islem_sayisi": banka_count,
            "yevmiye_sayisi": yevmiye_count,
            "kebir_sayisi": kebir_count,
            "mizan_sayisi": mizan_count
        }

    except Exception as e:
        logger.error(f"Beyanname özet error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
