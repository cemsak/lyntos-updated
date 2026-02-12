"""
LYNTOS Defterler API

Yevmiye Defteri, Defteri Kebir ve Banka Hareketleri API endpoints.

FAZ 1 - Gerçek veriyi dashboard'a taşıma
"""

from fastapi import APIRouter, Query, Depends, HTTPException
from typing import Optional, List
import sqlite3
from datetime import datetime
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
# YEVMİYE DEFTERİ API
# ============================================================================

@router.get("/yevmiye/list")
async def get_yevmiye_list(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(..., description="Dönem (YYYY-QN)"),
    source: str = Query("all", description="Kaynak: xml, excel, all"),
    page: int = Query(1, ge=1, description="Sayfa numarası"),
    page_size: int = Query(50, ge=1, le=500, description="Sayfa başına kayıt"),
    user: dict = Depends(verify_token)
):
    """
    Yevmiye defteri kayıtlarını listele

    Returns:
        - entries: Yevmiye kayıtları
        - total: Toplam kayıt sayısı
        - page: Mevcut sayfa
        - pages: Toplam sayfa sayısı
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        offset = (page - 1) * page_size
        entries = []
        total = 0

        if source in ["xml", "all"]:
            # XML kaynaklı yevmiye
            cursor.execute("""
                SELECT
                    id, entry_number, entry_date, entry_comment,
                    total_debit, total_credit, source_file, 'xml' as source_type
                FROM yevmiye_entries
                WHERE client_id = ?
                ORDER BY entry_date DESC, entry_number DESC
                LIMIT ? OFFSET ?
            """, (client_id, page_size, offset))
            entries.extend([dict(row) for row in cursor.fetchall()])

            cursor.execute("SELECT COUNT(*) FROM yevmiye_entries WHERE client_id = ?", (client_id,))
            total += cursor.fetchone()[0]

        if source in ["excel", "all"]:
            # Excel kaynaklı yevmiye
            cursor.execute("""
                SELECT
                    id, madde_no as entry_number, tarih as entry_date, aciklama as entry_comment,
                    borc as total_debit, alacak as total_credit, source_file, 'excel' as source_type
                FROM yevmiye_excel_entries
                WHERE client_id = ?
                ORDER BY tarih DESC, madde_no DESC
                LIMIT ? OFFSET ?
            """, (client_id, page_size, offset))
            entries.extend([dict(row) for row in cursor.fetchall()])

            cursor.execute("SELECT COUNT(*) FROM yevmiye_excel_entries WHERE client_id = ?", (client_id,))
            total += cursor.fetchone()[0]

        pages = (total + page_size - 1) // page_size

        return {
            "status": "success",
            "data": {
                "entries": entries,
                "total": total,
                "page": page,
                "pages": pages,
                "page_size": page_size
            }
        }

    except Exception as e:
        logger.error(f"Yevmiye list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/yevmiye/{entry_id}")
async def get_yevmiye_detail(
    entry_id: int,
    source: str = Query("xml", description="Kaynak: xml veya excel"),
    user: dict = Depends(verify_token)
):
    """
    Tek yevmiye kaydının detayını getir (fiş satırları dahil)
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        if source == "xml":
            # Ana kayıt
            cursor.execute("""
                SELECT * FROM yevmiye_entries WHERE id = ?
            """, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                raise HTTPException(status_code=404, detail="Yevmiye kaydı bulunamadı")

            entry_dict = dict(entry)

            # Detay satırları
            cursor.execute("""
                SELECT * FROM yevmiye_details
                WHERE entry_id = ?
                ORDER BY id
            """, (entry_id,))
            details = [dict(row) for row in cursor.fetchall()]
            entry_dict["details"] = details

            return {"status": "success", "data": entry_dict}

        else:
            # Excel kaydı
            cursor.execute("""
                SELECT * FROM yevmiye_excel_entries WHERE id = ?
            """, (entry_id,))
            entry = cursor.fetchone()

            if not entry:
                raise HTTPException(status_code=404, detail="Yevmiye kaydı bulunamadı")

            return {"status": "success", "data": dict(entry)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Yevmiye detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/yevmiye/search")
async def search_yevmiye(
    client_id: str = Query(..., description="Müşteri ID"),
    q: str = Query(None, description="Arama terimi (fiş no, açıklama)"),
    tarih_bas: str = Query(None, description="Başlangıç tarihi (YYYY-MM-DD)"),
    tarih_bit: str = Query(None, description="Bitiş tarihi (YYYY-MM-DD)"),
    min_tutar: float = Query(None, description="Minimum tutar"),
    max_tutar: float = Query(None, description="Maksimum tutar"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    user: dict = Depends(verify_token)
):
    """
    Yevmiye defterinde arama
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        conditions = ["client_id = ?"]
        params = [client_id]

        if q:
            conditions.append("(entry_number LIKE ? OR entry_comment LIKE ?)")
            params.extend([f"%{q}%", f"%{q}%"])

        if tarih_bas:
            conditions.append("entry_date >= ?")
            params.append(tarih_bas)

        if tarih_bit:
            conditions.append("entry_date <= ?")
            params.append(tarih_bit)

        if min_tutar is not None:
            conditions.append("(total_debit >= ? OR total_credit >= ?)")
            params.extend([min_tutar, min_tutar])

        if max_tutar is not None:
            conditions.append("(total_debit <= ? OR total_credit <= ?)")
            params.extend([max_tutar, max_tutar])

        where_clause = " AND ".join(conditions)
        offset = (page - 1) * page_size

        cursor.execute(f"""
            SELECT * FROM yevmiye_entries
            WHERE {where_clause}
            ORDER BY entry_date DESC
            LIMIT ? OFFSET ?
        """, params + [page_size, offset])

        entries = [dict(row) for row in cursor.fetchall()]

        cursor.execute(f"SELECT COUNT(*) FROM yevmiye_entries WHERE {where_clause}", params)
        total = cursor.fetchone()[0]

        return {
            "status": "success",
            "data": {
                "entries": entries,
                "total": total,
                "page": page,
                "pages": (total + page_size - 1) // page_size
            }
        }

    except Exception as e:
        logger.error(f"Yevmiye search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# DEFTERİ KEBİR API
# ============================================================================

@router.get("/kebir/list")
async def get_kebir_list(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(..., description="Dönem (YYYY-QN)"),
    source: str = Query("all", description="Kaynak: xml, excel, all"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    user: dict = Depends(verify_token)
):
    """
    Defteri Kebir kayıtlarını listele
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        offset = (page - 1) * page_size
        entries = []
        total = 0

        if source in ["xml", "all"]:
            cursor.execute("""
                SELECT
                    id, account_code, account_name, entry_date,
                    debit_amount, credit_amount, balance, source_file, 'xml' as source_type
                FROM kebir_entries
                WHERE client_id = ?
                ORDER BY account_code, entry_date
                LIMIT ? OFFSET ?
            """, (client_id, page_size, offset))
            entries.extend([dict(row) for row in cursor.fetchall()])

            cursor.execute("SELECT COUNT(*) FROM kebir_entries WHERE client_id = ?", (client_id,))
            total += cursor.fetchone()[0]

        if source in ["excel", "all"]:
            cursor.execute("""
                SELECT
                    id, hesap_kodu as account_code, hesap_adi as account_name, tarih as entry_date,
                    borc as debit_amount, alacak as credit_amount, bakiye as balance,
                    source_file, 'excel' as source_type
                FROM kebir_excel_entries
                WHERE client_id = ?
                ORDER BY hesap_kodu, tarih
                LIMIT ? OFFSET ?
            """, (client_id, page_size, offset))
            entries.extend([dict(row) for row in cursor.fetchall()])

            cursor.execute("SELECT COUNT(*) FROM kebir_excel_entries WHERE client_id = ?", (client_id,))
            total += cursor.fetchone()[0]

        return {
            "status": "success",
            "data": {
                "entries": entries,
                "total": total,
                "page": page,
                "pages": (total + page_size - 1) // page_size
            }
        }

    except Exception as e:
        logger.error(f"Kebir list error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/kebir/hesap/{hesap_kodu}")
async def get_kebir_hesap_hareketleri(
    hesap_kodu: str,
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem (YYYY-QN)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    user: dict = Depends(verify_token)
):
    """
    Tek hesabın tüm hareketlerini getir
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        offset = (page - 1) * page_size

        # Excel kaynağından (daha detaylı)
        cursor.execute("""
            SELECT
                id, kebir_hesap, kebir_hesap_adi, tarih, madde_no, fis_no,
                hesap_kodu, hesap_adi, aciklama, borc, alacak, bakiye, bakiye_turu
            FROM kebir_excel_entries
            WHERE client_id = ? AND (kebir_hesap LIKE ? OR hesap_kodu LIKE ?)
            ORDER BY tarih, madde_no
            LIMIT ? OFFSET ?
        """, (client_id, f"{hesap_kodu}%", f"{hesap_kodu}%", page_size, offset))

        entries = [dict(row) for row in cursor.fetchall()]

        cursor.execute("""
            SELECT COUNT(*) FROM kebir_excel_entries
            WHERE client_id = ? AND (kebir_hesap LIKE ? OR hesap_kodu LIKE ?)
        """, (client_id, f"{hesap_kodu}%", f"{hesap_kodu}%"))
        total = cursor.fetchone()[0]

        # Hesap özeti
        cursor.execute("""
            SELECT
                kebir_hesap_adi,
                SUM(borc) as toplam_borc,
                SUM(alacak) as toplam_alacak
            FROM kebir_excel_entries
            WHERE client_id = ? AND kebir_hesap LIKE ?
            GROUP BY kebir_hesap_adi
        """, (client_id, f"{hesap_kodu}%"))

        ozet_row = cursor.fetchone()
        ozet = dict(ozet_row) if ozet_row else {}

        return {
            "status": "success",
            "data": {
                "hesap_kodu": hesap_kodu,
                "ozet": ozet,
                "entries": entries,
                "total": total,
                "page": page,
                "pages": (total + page_size - 1) // page_size
            }
        }

    except Exception as e:
        logger.error(f"Kebir hesap error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/kebir/hesap-listesi")
async def get_kebir_hesap_listesi(
    client_id: str = Query(..., description="Müşteri ID"),
    user: dict = Depends(verify_token)
):
    """
    Tüm hesap kodlarının listesi (özet)
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                kebir_hesap as hesap_kodu,
                kebir_hesap_adi as hesap_adi,
                COUNT(*) as hareket_sayisi,
                SUM(borc) as toplam_borc,
                SUM(alacak) as toplam_alacak
            FROM kebir_excel_entries
            WHERE client_id = ?
            GROUP BY kebir_hesap, kebir_hesap_adi
            ORDER BY kebir_hesap
            LIMIT 5000
        """, (client_id,))

        hesaplar = [dict(row) for row in cursor.fetchall()]

        return {
            "status": "success",
            "data": {
                "hesaplar": hesaplar,
                "total": len(hesaplar)
            }
        }

    except Exception as e:
        logger.error(f"Kebir hesap listesi error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# BANKA HAREKETLERİ API
# ============================================================================

@router.get("/banka/islemler")
async def get_banka_islemler(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem (YYYY-QN)"),
    banka: str = Query(None, description="Banka adı filtresi"),
    hesap_kodu: str = Query(None, description="Hesap kodu filtresi"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    user: dict = Depends(verify_token)
):
    """
    Banka hareketlerini listele
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        conditions = ["client_id = ?"]
        params = [client_id]

        if period:
            conditions.append("period_id = ?")
            params.append(period)

        if banka:
            conditions.append("banka_adi = ?")
            params.append(banka)

        if hesap_kodu:
            conditions.append("hesap_kodu = ?")
            params.append(hesap_kodu)

        where_clause = " AND ".join(conditions)
        offset = (page - 1) * page_size

        cursor.execute(f"""
            SELECT * FROM banka_islemler
            WHERE {where_clause}
            ORDER BY tarih DESC, id DESC
            LIMIT ? OFFSET ?
        """, params + [page_size, offset])

        islemler = [dict(row) for row in cursor.fetchall()]

        cursor.execute(f"SELECT COUNT(*) FROM banka_islemler WHERE {where_clause}", params)
        total = cursor.fetchone()[0]

        # Özet
        cursor.execute(f"""
            SELECT
                SUM(CASE WHEN tutar > 0 THEN tutar ELSE 0 END) as toplam_giris,
                SUM(CASE WHEN tutar < 0 THEN ABS(tutar) ELSE 0 END) as toplam_cikis,
                COUNT(*) as islem_sayisi
            FROM banka_islemler WHERE {where_clause}
        """, params)
        ozet = dict(cursor.fetchone())

        return {
            "status": "success",
            "data": {
                "islemler": islemler,
                "ozet": ozet,
                "total": total,
                "page": page,
                "pages": (total + page_size - 1) // page_size
            }
        }

    except Exception as e:
        logger.error(f"Banka islemler error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/banka/hesaplar")
async def get_banka_hesaplar(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem"),
    user: dict = Depends(verify_token)
):
    """
    Banka hesapları özeti
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT
                banka_adi,
                hesap_kodu,
                COUNT(*) as islem_sayisi,
                SUM(CASE WHEN tutar > 0 THEN tutar ELSE 0 END) as toplam_giris,
                SUM(CASE WHEN tutar < 0 THEN ABS(tutar) ELSE 0 END) as toplam_cikis,
                MAX(bakiye) as son_bakiye
            FROM banka_islemler
            WHERE client_id = ?
            GROUP BY banka_adi, hesap_kodu
            ORDER BY hesap_kodu
            LIMIT 1000
        """, (client_id,))

        hesaplar = [dict(row) for row in cursor.fetchall()]

        return {
            "status": "success",
            "data": {
                "hesaplar": hesaplar,
                "total": len(hesaplar)
            }
        }

    except Exception as e:
        logger.error(f"Banka hesaplar error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/banka/mutabakat")
async def get_banka_mizan_mutabakat(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(..., description="Dönem (YYYY-QN)"),
    user: dict = Depends(verify_token)
):
    """
    Banka - Mizan mutabakatı

    Banka hesaplarındaki bakiye ile mizan 102 hesap bakiyesini karşılaştırır.
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Banka bakiyeleri (son bakiye)
        cursor.execute("""
            SELECT
                hesap_kodu,
                banka_adi,
                MAX(bakiye) as banka_bakiye
            FROM banka_islemler
            WHERE client_id = ?
            GROUP BY hesap_kodu, banka_adi
        """, (client_id,))
        banka_bakiyeleri = {row[0]: {"banka": row[1], "bakiye": row[2]} for row in cursor.fetchall()}

        # Mizan 102 hesapları
        cursor.execute("""
            SELECT
                hesap_kodu,
                hesap_adi,
                borc_bakiye,
                alacak_bakiye,
                (borc_bakiye - alacak_bakiye) as net_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND hesap_kodu LIKE '102%'
            ORDER BY hesap_kodu
        """, (client_id,))

        mutabakat = []
        toplam_fark = 0

        for row in cursor.fetchall():
            hesap_kodu = row[0]
            mizan_bakiye = row[4]

            banka_info = banka_bakiyeleri.get(hesap_kodu, {"banka": "?", "bakiye": 0})
            banka_bakiye = banka_info["bakiye"] or 0

            fark = mizan_bakiye - banka_bakiye
            toplam_fark += abs(fark)

            mutabakat.append({
                "hesap_kodu": hesap_kodu,
                "hesap_adi": row[1],
                "banka_adi": banka_info["banka"],
                "mizan_bakiye": mizan_bakiye,
                "banka_bakiye": banka_bakiye,
                "fark": fark,
                "durum": "OK" if abs(fark) < 0.01 else "FARK VAR"
            })

        return {
            "status": "success",
            "data": {
                "mutabakat": mutabakat,
                "toplam_fark": toplam_fark,
                "ozet": {
                    "toplam_hesap": len(mutabakat),
                    "esit_hesap": sum(1 for m in mutabakat if m["durum"] == "OK"),
                    "farkli_hesap": sum(1 for m in mutabakat if m["durum"] != "OK")
                }
            }
        }

    except Exception as e:
        logger.error(f"Banka mutabakat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# E-DEFTER RAPOR API
# ============================================================================

@router.get("/edefter/rapor")
async def get_edefter_rapor(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem (YYYY-MM)"),
    user: dict = Depends(verify_token)
):
    """
    E-Defter Raporu (DR) bilgilerini getir
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        if period:
            cursor.execute("""
                SELECT * FROM edefter_rapor
                WHERE client_id = ? AND period_id = ?
            """, (client_id, period))
        else:
            cursor.execute("""
                SELECT * FROM edefter_rapor
                WHERE client_id = ?
                ORDER BY period_id
            """, (client_id,))

        raporlar = [dict(row) for row in cursor.fetchall()]

        # raw_xml alanını kısalt (çok uzun)
        for r in raporlar:
            if r.get("raw_xml"):
                r["raw_xml"] = r["raw_xml"][:500] + "..." if len(r["raw_xml"]) > 500 else r["raw_xml"]

        return {
            "status": "success",
            "data": {
                "raporlar": raporlar,
                "total": len(raporlar)
            }
        }

    except Exception as e:
        logger.error(f"E-Defter rapor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# YEVMİYE-KEBİR CROSS-CHECK API
# ============================================================================

@router.get("/defterler/cross-check")
async def get_yevmiye_kebir_cross_check(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem"),
    user: dict = Depends(verify_token)
):
    """
    Yevmiye - Kebir cross-check

    Her hesap için yevmiye ve kebir toplamlarını karşılaştırır.
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Yevmiye'den hesap bazlı toplamlar (Excel)
        cursor.execute("""
            SELECT
                hesap_kodu,
                hesap_adi,
                SUM(borc) as yevmiye_borc,
                SUM(alacak) as yevmiye_alacak
            FROM yevmiye_excel_entries
            WHERE client_id = ?
            GROUP BY hesap_kodu, hesap_adi
            LIMIT 5000
        """, (client_id,))
        yevmiye_toplamlari = {row[0]: {
            "hesap_adi": row[1],
            "borc": row[2] or 0,
            "alacak": row[3] or 0
        } for row in cursor.fetchall()}

        # Kebir'den hesap bazlı toplamlar (Excel)
        cursor.execute("""
            SELECT
                kebir_hesap as hesap_kodu,
                kebir_hesap_adi as hesap_adi,
                SUM(borc) as kebir_borc,
                SUM(alacak) as kebir_alacak
            FROM kebir_excel_entries
            WHERE client_id = ?
            GROUP BY kebir_hesap, kebir_hesap_adi
            LIMIT 5000
        """, (client_id,))
        kebir_toplamlari = {row[0]: {
            "hesap_adi": row[1],
            "borc": row[2] or 0,
            "alacak": row[3] or 0
        } for row in cursor.fetchall()}

        # Tüm hesapları birleştir
        tum_hesaplar = set(yevmiye_toplamlari.keys()) | set(kebir_toplamlari.keys())

        results = []
        toplam_borc_fark = 0
        toplam_alacak_fark = 0

        for hesap_kodu in sorted(tum_hesaplar):
            yev = yevmiye_toplamlari.get(hesap_kodu, {"hesap_adi": "?", "borc": 0, "alacak": 0})
            keb = kebir_toplamlari.get(hesap_kodu, {"hesap_adi": "?", "borc": 0, "alacak": 0})

            borc_fark = (yev["borc"] or 0) - (keb["borc"] or 0)
            alacak_fark = (yev["alacak"] or 0) - (keb["alacak"] or 0)

            toplam_borc_fark += abs(borc_fark)
            toplam_alacak_fark += abs(alacak_fark)

            durum = "OK" if abs(borc_fark) < 0.01 and abs(alacak_fark) < 0.01 else "FARK VAR"

            results.append({
                "hesap_kodu": hesap_kodu,
                "hesap_adi": yev["hesap_adi"] if yev["hesap_adi"] != "?" else keb["hesap_adi"],
                "yevmiye_borc": yev["borc"] or 0,
                "yevmiye_alacak": yev["alacak"] or 0,
                "kebir_borc": keb["borc"] or 0,
                "kebir_alacak": keb["alacak"] or 0,
                "borc_fark": borc_fark,
                "alacak_fark": alacak_fark,
                "durum": durum
            })

        esit_hesap = sum(1 for r in results if r["durum"] == "OK")
        farkli_hesap = len(results) - esit_hesap

        return {
            "status": "success",
            "data": {
                "results": results,
                "ozet": {
                    "toplam_hesap": len(results),
                    "esit_hesap": esit_hesap,
                    "farkli_hesap": farkli_hesap,
                    "toplam_borc_fark": toplam_borc_fark,
                    "toplam_alacak_fark": toplam_alacak_fark
                }
            }
        }

    except Exception as e:
        logger.error(f"Cross-check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================================================
# ÖZET / DASHBOARD API
# ============================================================================

@router.get("/defterler/ozet")
async def get_defterler_ozet(
    client_id: str = Query(..., description="Müşteri ID"),
    period: str = Query(None, description="Dönem"),
    user: dict = Depends(verify_token)
):
    """
    Tüm defterlerin özet bilgisi (dashboard için)
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        ozet = {}

        # Yevmiye özet
        cursor.execute("SELECT COUNT(*) FROM yevmiye_entries WHERE client_id = ?", (client_id,))
        yev_xml = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM yevmiye_excel_entries WHERE client_id = ?", (client_id,))
        yev_excel = cursor.fetchone()[0]
        ozet["yevmiye"] = {"xml": yev_xml, "excel": yev_excel, "toplam": yev_xml + yev_excel}

        # Kebir özet
        cursor.execute("SELECT COUNT(*) FROM kebir_entries WHERE client_id = ?", (client_id,))
        keb_xml = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM kebir_excel_entries WHERE client_id = ?", (client_id,))
        keb_excel = cursor.fetchone()[0]
        ozet["kebir"] = {"xml": keb_xml, "excel": keb_excel, "toplam": keb_xml + keb_excel}

        # Banka özet
        cursor.execute("""
            SELECT COUNT(*),
                   SUM(CASE WHEN tutar > 0 THEN tutar ELSE 0 END),
                   SUM(CASE WHEN tutar < 0 THEN ABS(tutar) ELSE 0 END)
            FROM banka_islemler WHERE client_id = ?
        """, (client_id,))
        row = cursor.fetchone()
        ozet["banka"] = {
            "islem_sayisi": row[0] or 0,
            "toplam_giris": row[1] or 0,
            "toplam_cikis": row[2] or 0
        }

        # E-Defter rapor
        cursor.execute("SELECT COUNT(*) FROM edefter_rapor WHERE client_id = ?", (client_id,))
        ozet["edefter_rapor"] = cursor.fetchone()[0]

        # Berat durumu
        cursor.execute("SELECT COUNT(*) FROM edefter_berats WHERE client_id = ? AND gib_onay = 1", (client_id,))
        ozet["berat_onayli"] = cursor.fetchone()[0]

        return {
            "status": "success",
            "data": ozet
        }

    except Exception as e:
        logger.error(f"Defterler ozet error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
