"""
LYNTOS API v2 - Mizan Analiz Endpoint
IS-7 Oturum 7A: Hesap Kartı + Yatay Analiz + Dikey Analiz

Endpoint'ler:
  GET /api/v2/mizan-analiz/hesap-karti/{client_id}/{period}/{hesap_kodu}
  GET /api/v2/mizan-analiz/yatay/{client_id}/{period}
  GET /api/v2/mizan-analiz/dikey/{client_id}/{period}

Veri Kaynağı: database/lyntos.db → mizan_entries table
Auth: Yok (V2 API)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from pathlib import Path
import logging
import sqlite3

import sys
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from services.mizan_omurga import MizanOmurgaAnalyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/mizan-analiz", tags=["mizan-analiz"])

DATABASE_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


# ============== DATABASE FUNCTIONS ==============

def get_db_connection():
    """Create a database connection"""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def load_mizan_entries(client_id: str, period: str) -> Optional[List[Dict]]:
    """Load mizan entries from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                hesap_kodu,
                hesap_adi,
                borc_toplam,
                alacak_toplam,
                borc_bakiye,
                alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            ORDER BY hesap_kodu
        """, (client_id, period))
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return None

        return [
            {
                'hesap_kodu': row['hesap_kodu'],
                'hesap_adi': row['hesap_adi'],
                'borc': row['borc_toplam'] or 0,
                'alacak': row['alacak_toplam'] or 0,
                'bakiye_borc': row['borc_bakiye'] or 0,
                'bakiye_alacak': row['alacak_bakiye'] or 0,
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"[MIZAN-ANALIZ] DB error: {e}")
        return None


def build_mizan_data(rows: List[Dict]) -> Dict:
    """
    Mizan satırlarından MizanOmurgaAnalyzer için veri dict'i oluştur.
    mizan_data.py analyze endpoint'indeki mantığın aynısı.
    """
    mizan_data = {}

    for row in rows:
        kod = row.get('hesap_kodu', '')
        bakiye_borc = row.get('bakiye_borc')
        bakiye_alacak = row.get('bakiye_alacak')
        borc = bakiye_borc if bakiye_borc is not None else (row.get('borc', 0) or 0)
        alacak = bakiye_alacak if bakiye_alacak is not None else (row.get('alacak', 0) or 0)

        if not kod:
            continue

        # 3-digit aggregation
        if len(kod) >= 3:
            kod_3 = kod[:3]
            if kod_3 not in mizan_data:
                mizan_data[kod_3] = 0

            # 62x SMM grubu - GİDER hesabı
            if kod.startswith('62'):
                mizan_data[kod_3] += borc
            elif kod_3.startswith(('1', '2', '7')):
                mizan_data[kod_3] += borc - alacak
            else:
                mizan_data[kod_3] += alacak - borc

    # Net satışlar
    brut_satislar = (
        mizan_data.get('600', 0) +
        mizan_data.get('601', 0) +
        mizan_data.get('602', 0)
    )
    satis_indirimleri = (
        mizan_data.get('610', 0) +
        mizan_data.get('611', 0) +
        mizan_data.get('612', 0)
    )
    ciro = brut_satislar - satis_indirimleri

    # SMM
    smm = (
        mizan_data.get('620', 0) +
        mizan_data.get('621', 0) +
        mizan_data.get('622', 0) +
        mizan_data.get('623', 0)
    )
    if smm == 0:
        smm = sum(
            mizan_data.get(k, 0)
            for k in ('710', '720', '730', '740', '750', '760', '770', '780')
        )

    # Bilanço kalemleri
    donen_varliklar = sum(v for k, v in mizan_data.items() if k.startswith('1'))
    duran_varliklar = sum(v for k, v in mizan_data.items() if k.startswith('2'))
    toplam_aktif = donen_varliklar + duran_varliklar
    kvyk = sum(v for k, v in mizan_data.items() if k.startswith('3'))
    uvyk = sum(v for k, v in mizan_data.items() if k.startswith('4'))
    ozkaynaklar = sum(v for k, v in mizan_data.items() if k.startswith('5'))
    stoklar = sum(v for k, v in mizan_data.items() if k.startswith('15'))
    alicilar = mizan_data.get('120', 0)
    kasa = mizan_data.get('100', 0)
    bankalar = mizan_data.get('102', 0)
    hazir_degerler = kasa + bankalar

    # Extended data ekle
    mizan_data['_donen_varliklar'] = donen_varliklar
    mizan_data['_duran_varliklar'] = duran_varliklar
    mizan_data['_toplam_aktif'] = toplam_aktif
    mizan_data['_kvyk'] = kvyk
    mizan_data['_uvyk'] = uvyk
    mizan_data['_ozkaynaklar'] = ozkaynaklar
    mizan_data['_stoklar'] = stoklar
    mizan_data['_alicilar'] = alicilar
    mizan_data['_hazir_degerler'] = hazir_degerler
    mizan_data['_ciro'] = ciro
    mizan_data['_smm'] = smm
    mizan_data['_brut_satislar'] = brut_satislar

    return mizan_data


# ============== ENDPOINTS ==============

@router.get("/hesap-karti/{client_id}/{period}/{hesap_kodu}")
async def get_hesap_karti(
    client_id: str,
    period: str,
    hesap_kodu: str,
):
    """
    Hesap Kartı - Tek hesap için detaylı davranış analizi

    SMMM için: Bakiye yönü, ciro oranı, VDK risk, mevzuat referansları,
    alt hesap dağılımı, davranış analizi
    """
    rows = load_mizan_entries(client_id, period)
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Mizan verisi bulunamadı: {client_id}/{period}"
        )

    mizan_data = build_mizan_data(rows)
    ciro = mizan_data.get('_ciro', 0)

    analyzer = MizanOmurgaAnalyzer(mizan_data, ciro, period)
    result = analyzer.hesap_karti(hesap_kodu, rows)

    return {
        "ok": True,
        "client_id": client_id,
        "period": period,
        **result,
    }


@router.get("/yatay/{client_id}/{period}")
async def get_yatay_analiz(
    client_id: str,
    period: str,
    onceki_period: Optional[str] = Query(None, description="Önceki dönem (ör: 2024-Q4). Belirtilmezse otomatik bulunur."),
    esik_yuzde: float = Query(20.0, description="Materiality eşiği (% olarak)"),
):
    """
    Yatay Analiz (Horizontal Analysis)
    Dönemler arası % değişim + neden motoru + materiality threshold

    İki dönem karşılaştırması yapar. Eğer onceki_period belirtilmezse,
    aynı client_id için en yakın önceki dönem otomatik bulunur.
    """
    # Cari dönem
    cari_rows = load_mizan_entries(client_id, period)
    if not cari_rows:
        raise HTTPException(
            status_code=404,
            detail=f"Cari dönem mizan verisi bulunamadı: {client_id}/{period}"
        )

    # Önceki dönem bul
    if not onceki_period:
        onceki_period = _find_previous_period(client_id, period)

    if not onceki_period:
        raise HTTPException(
            status_code=404,
            detail=f"Önceki dönem bulunamadı. Yatay analiz için en az 2 dönem gerekli. onceki_period parametresini belirtin."
        )

    onceki_rows = load_mizan_entries(client_id, onceki_period)
    if not onceki_rows:
        raise HTTPException(
            status_code=404,
            detail=f"Önceki dönem mizan verisi bulunamadı: {client_id}/{onceki_period}"
        )

    # Build mizan data dicts
    cari_mizan = build_mizan_data(cari_rows)
    onceki_mizan = build_mizan_data(onceki_rows)

    cari_ciro = cari_mizan.get('_ciro', 0)
    onceki_ciro = onceki_mizan.get('_ciro', 0)

    analyzer = MizanOmurgaAnalyzer(cari_mizan, cari_ciro, period)
    result = analyzer.yatay_analiz(onceki_mizan, onceki_ciro, esik_yuzde)

    return {
        "ok": True,
        "client_id": client_id,
        "cari_period": period,
        "onceki_period": onceki_period,
        **result,
    }


@router.get("/dikey/{client_id}/{period}")
async def get_dikey_analiz(
    client_id: str,
    period: str,
):
    """
    Dikey Analiz (Vertical / Common-Size Analysis)

    Bilanço: Her kalem / Toplam Aktif × 100
    Gelir Tablosu: Her kalem / Net Satışlar × 100
    """
    rows = load_mizan_entries(client_id, period)
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Mizan verisi bulunamadı: {client_id}/{period}"
        )

    mizan_data = build_mizan_data(rows)
    ciro = mizan_data.get('_ciro', 0)

    analyzer = MizanOmurgaAnalyzer(mizan_data, ciro, period)
    result = analyzer.dikey_analiz()

    return {
        "ok": True,
        "client_id": client_id,
        "period": period,
        **result,
    }


# ============== HELPER FUNCTIONS ==============

def _find_previous_period(client_id: str, current_period: str) -> Optional[str]:
    """
    Aynı client_id için en yakın önceki dönemi bul.
    Period formatı: 2025-Q1, 2024-Q4, vs.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT period_id
            FROM mizan_entries
            WHERE client_id = ? AND period_id < ?
            ORDER BY period_id DESC
            LIMIT 1
        """, (client_id, current_period))
        row = cursor.fetchone()
        conn.close()

        if row:
            return row['period_id']
        return None
    except Exception as e:
        logger.error(f"[MIZAN-ANALIZ] Error finding previous period: {e}")
        return None
