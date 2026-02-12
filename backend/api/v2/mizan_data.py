"""
LYNTOS API v2 - Mizan Data Endpoint
Reads mizan data from DATABASE (primary) or disk (fallback) and serves to frontend

This endpoint enables Dashboard to display REAL data without manual file upload.
Primary source: database/lyntos.db → mizan_entries table
Fallback source: backend/data/luca/{smmm_id}/{client_id}/{period}/mizan.csv
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from pathlib import Path
import logging
import sqlite3

from middleware.auth import verify_token, check_client_access
from utils.period_utils import get_period_db, normalize_period_db

# Import the mizan parser from data_engine
import sys
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from data_engine.mizan_parser import parse_mizan_for_client
from services.mizan_omurga import MizanOmurgaAnalyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/mizan-data", tags=["mizan-data"])

DATA_DIR = Path(__file__).parent.parent.parent / "data"
DATABASE_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


# ============== DATABASE FUNCTIONS ==============

def get_db_connection():
    """Create a database connection"""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def load_mizan_from_database(client_id: str, period: str) -> Optional[List[Dict]]:
    """
    Load mizan entries from database for given client and period.
    Returns None if no data found.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Query mizan_entries table
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
            logger.info(f"[DB] No mizan entries found for {client_id}/{period}")
            return None

        # Convert to list of dicts
        result = []
        for row in rows:
            result.append({
                'hesap_kodu': row['hesap_kodu'],
                'hesap_adi': row['hesap_adi'],
                'borc': row['borc_toplam'] or 0,
                'alacak': row['alacak_toplam'] or 0,
                'bakiye_borc': row['borc_bakiye'] or 0,
                'bakiye_alacak': row['alacak_bakiye'] or 0,
                'status': 'ok',
                'warnings': []
            })

        logger.info(f"[DB] Loaded {len(result)} mizan entries for {client_id}/{period}")
        return result

    except Exception as e:
        logger.error(f"[DB] Error loading mizan from database: {e}")
        return None


# ============== PYDANTIC MODELS ==============

class MizanHesapResponse(BaseModel):
    """Single mizan account entry"""
    hesap_kodu: str
    hesap_adi: Optional[str] = None
    borc_toplam: float = 0
    alacak_toplam: float = 0
    borc_bakiye: float = 0
    alacak_bakiye: float = 0
    status: str = "ok"
    warnings: List[str] = Field(default_factory=list)


class MizanValidationResponse(BaseModel):
    """Mizan balance validation result"""
    is_balanced: bool
    toplam_borc: float
    toplam_alacak: float
    fark: float
    fark_yuzde: float
    warnings: List[str] = Field(default_factory=list)


class MizanSummaryResponse(BaseModel):
    """Summary of mizan data"""
    aktif_toplam: float = 0  # 1xx + 2xx (Borç bakiye)
    pasif_toplam: float = 0  # 3xx + 4xx + 5xx (Alacak bakiye)
    ozsermaye: float = 0     # 5xx
    yabanci_kaynak: float = 0  # 3xx + 4xx
    borc_toplam: float = 0
    alacak_toplam: float = 0
    gelir_toplam: float = 0  # 6xx
    gider_toplam: float = 0  # 7xx
    net_kar: float = 0       # 6xx - 7xx


class MizanDataResponse(BaseModel):
    """Complete mizan data response"""
    ok: bool = True
    smmm_id: str
    client_id: str
    period: str
    source_file: str
    row_count: int
    validation: MizanValidationResponse
    summary: MizanSummaryResponse
    accounts: List[MizanHesapResponse]
    # For VDK analysis
    vdk_data: Optional[Dict[str, Any]] = None


class MizanAnalysisResponse(BaseModel):
    """Mizan omurga analysis response"""
    ok: bool = True
    smmm_id: str
    client_id: str
    period: str
    accounts: Dict[str, Any]  # Analysis per account
    summary: Dict[str, Any]   # Overall summary
    analysis: Dict[str, Any]  # Expert analysis metadata


# ============== HELPER FUNCTIONS ==============

def find_period_folder(base_dir: Path, smmm_id: str, client_id: str, period: str) -> Optional[Path]:
    """
    Find the period folder, handling variations like:
    - 2025-Q1
    - 2025-Q1__SMOKETEST_COPY_FROM_Q2
    """
    client_dir = base_dir / "luca" / smmm_id / client_id

    if not client_dir.exists():
        return None

    # Try exact match first
    exact_path = client_dir / period
    if exact_path.exists():
        return exact_path

    # Try with suffix variations
    for folder in client_dir.iterdir():
        if folder.is_dir() and folder.name.startswith(period):
            return folder

    return None


def calculate_summary(accounts: List[Dict]) -> MizanSummaryResponse:
    """Calculate financial summary from mizan accounts"""

    # Initialize totals
    aktif_toplam = 0.0  # 1xx, 2xx
    pasif_toplam = 0.0  # 3xx, 4xx, 5xx
    ozsermaye = 0.0     # 5xx
    yabanci_kaynak = 0.0  # 3xx, 4xx
    gelir_toplam = 0.0  # 6xx
    gider_toplam = 0.0  # 7xx
    borc_toplam = 0.0
    alacak_toplam = 0.0

    for acc in accounts:
        kod = acc.get('hesap_kodu', '')
        borc = acc.get('borc', 0) or acc.get('bakiye_borc', 0) or 0
        alacak = acc.get('alacak', 0) or acc.get('bakiye_alacak', 0) or 0

        borc_toplam += acc.get('borc', 0) or 0
        alacak_toplam += acc.get('alacak', 0) or 0

        if kod.startswith('1') or kod.startswith('2'):
            aktif_toplam += borc - alacak
        elif kod.startswith('3') or kod.startswith('4'):
            yabanci_kaynak += alacak - borc
        elif kod.startswith('5'):
            ozsermaye += alacak - borc
        elif kod.startswith('6'):
            gelir_toplam += alacak - borc
        elif kod.startswith('7'):
            gider_toplam += borc - alacak

    pasif_toplam = ozsermaye + yabanci_kaynak
    net_kar = gelir_toplam - gider_toplam

    return MizanSummaryResponse(
        aktif_toplam=round(aktif_toplam, 2),
        pasif_toplam=round(pasif_toplam, 2),
        ozsermaye=round(ozsermaye, 2),
        yabanci_kaynak=round(yabanci_kaynak, 2),
        borc_toplam=round(borc_toplam, 2),
        alacak_toplam=round(alacak_toplam, 2),
        gelir_toplam=round(gelir_toplam, 2),
        gider_toplam=round(gider_toplam, 2),
        net_kar=round(net_kar, 2)
    )


def extract_vdk_data(accounts: List[Dict], summary: MizanSummaryResponse) -> Dict[str, Any]:
    """Extract data needed for VDK risk analysis"""

    # Helper to get account balance by code prefix
    def get_balance(prefix: str, is_borc: bool = True) -> float:
        total = 0.0
        for acc in accounts:
            kod = acc.get('hesap_kodu', '')
            if kod.startswith(prefix):
                borc = acc.get('bakiye_borc', 0) or 0
                alacak = acc.get('bakiye_alacak', 0) or 0
                if is_borc:
                    total += borc - alacak
                else:
                    total += alacak - borc
        return total

    # Extract key values for VDK criteria
    kasa_bakiye = get_balance('100', True)  # Kasa (Borç bakiye)
    banka_bilanco = get_balance('102', True)  # Bankalar
    alicilar = get_balance('120', True)  # Alıcılar
    ortaklardan_alacak = get_balance('131', True)  # Ortaklardan Alacaklar
    stoklar = get_balance('15', True)  # Stoklar (150-159)
    devreden_kdv = get_balance('190', True)  # Devreden KDV
    indirilecek_kdv = get_balance('191', True)  # İndirilecek KDV
    saticilar = get_balance('320', False)  # Satıcılar (Alacak bakiye)
    ortaklara_borc = get_balance('331', False)  # Ortaklara Borçlar
    sermaye = get_balance('500', False)  # Sermaye
    gecmis_yil_karlari = get_balance('570', False)  # Geçmiş Yıl Karları
    gecmis_yil_zararlari = get_balance('580', True)  # Geçmiş Yıl Zararları

    # Income statement items
    net_satislar = get_balance('600', False) - get_balance('610', False)  # Net satışlar
    satilan_mal_maliyeti = get_balance('620', True) + get_balance('621', True)
    faaliyet_giderleri = get_balance('63', True) + get_balance('66', True) + get_balance('67', True)

    # Calculate ratios
    aktif_toplam = summary.aktif_toplam
    ozsermaye = summary.ozsermaye
    brut_kar = net_satislar - satilan_mal_maliyeti
    brut_kar_marji = (brut_kar / net_satislar * 100) if net_satislar > 0 else 0

    # Cari oran (Current ratio)
    donen_varliklar = get_balance('1', True)
    kvyk = get_balance('3', False)  # Kısa vadeli yabancı kaynaklar
    cari_oran = (donen_varliklar / kvyk) if kvyk > 0 else 0

    return {
        'kasa_bakiye': kasa_bakiye,
        'banka_bilanco': banka_bilanco,
        'alicilar': alicilar,
        'ortaklardan_alacak': ortaklardan_alacak,
        'stoklar': stoklar,
        'devreden_kdv': devreden_kdv,
        'indirilecek_kdv': indirilecek_kdv,
        'saticilar': saticilar,
        'ortaklara_borc': ortaklara_borc,
        'sermaye': sermaye,
        'gecmis_yil_karlari': gecmis_yil_karlari,
        'gecmis_yil_zararlari': gecmis_yil_zararlari,
        'net_satislar': net_satislar,
        'satilan_mal_maliyeti': satilan_mal_maliyeti,
        'faaliyet_giderleri': faaliyet_giderleri,
        'aktif_toplam': aktif_toplam,
        'pasif_toplam': summary.pasif_toplam,
        'ozsermaye': ozsermaye,
        'brut_kar': brut_kar,
        'brut_kar_marji': brut_kar_marji,
        'cari_oran': cari_oran,
    }


# ============== ENDPOINTS ==============

@router.get("/check")
async def check_mizan_exists(
    client_id: str = Query(...),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token),
):
    """
    Lightweight check: does mizan data exist in DB for given client+period?
    Returns { exists: bool, count: int }
    """
    await check_client_access(user, client_id)
    from database.db import get_connection
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) as cnt FROM mizan_entries WHERE client_id = ? AND period_id = ?",
                (client_id, period_id),
            )
            row = cursor.fetchone()
            cnt = row["cnt"] if row else 0
            return {"exists": cnt > 0, "count": cnt}
    except Exception as e:
        logger.error(f"check_mizan_exists error: {e}")
        return {"exists": False, "count": 0}


@router.get("/available")
async def list_available_data(user: dict = Depends(verify_token)):
    """
    List all available SMMM/Client/Period combinations with mizan data on disk.
    This helps frontend discover what data is available without manual upload.
    """
    smmm_id = user["id"]
    available = []
    luca_dir = DATA_DIR / "luca"

    if not luca_dir.exists():
        return {"available": [], "count": 0}

    # KRİTİK: Sadece bu SMMM'ye ait dizini tara (VT-10 güvenlik düzeltmesi)
    # Diğer SMMM'lerin dizinlerini listelememeli
    smmm_dir = luca_dir / smmm_id
    if not smmm_dir.exists() or not smmm_dir.is_dir():
        return {"available": [], "count": 0}

    for client_dir in smmm_dir.iterdir():
        if not client_dir.is_dir():
            continue
        client_id = client_dir.name

        for period_dir in client_dir.iterdir():
            if not period_dir.is_dir():
                continue

            mizan_path = period_dir / "mizan.csv"
            if mizan_path.exists():
                # Extract period code from folder name
                period_code = period_dir.name.split('__')[0]  # Handle "2025-Q1__SMOKETEST..."

                available.append({
                    "smmm_id": smmm_id,
                    "client_id": client_id,
                    "period": period_code,
                    "folder": period_dir.name,
                    "mizan_size": mizan_path.stat().st_size,
                    "has_beyanname": (period_dir / "beyanname").exists(),
                    "has_tahakkuk": (period_dir / "tahakkuk").exists(),
                })

    return {
        "available": available,
        "count": len(available)
    }


@router.get("/load/{smmm_id}/{client_id}/{period}", response_model=MizanDataResponse)
async def load_mizan_data(
    smmm_id: str,
    client_id: str,
    period: str,
    include_accounts: bool = Query(True, description="Include full account list"),
    limit: int = Query(5000, ge=1, le=10000, description="Max account sayısı (VT-8 pagination)"),
    offset: int = Query(0, ge=0, description="Sayfa offset"),
    user: dict = Depends(verify_token),
):
    """
    Load mizan data for a specific SMMM/Client/Period.

    This is the main endpoint for Dashboard to get REAL mizan data
    without requiring manual file upload.

    Data source priority:
    1. Database (mizan_entries table) - uses client_id directly
    2. Disk fallback - searches for matching folder
    """
    period = normalize_period_db(period)

    await check_client_access(user, client_id)
    # Use authenticated user's id as smmm_id (path param kept for backward compat)
    smmm_id = user["id"]

    rows = None
    source_file = "database"
    validation_data = {}

    # PRIORITY 1: Try loading from database first
    logger.info(f"[LOAD] Trying database for {client_id}/{period}")
    rows = load_mizan_from_database(client_id, period)

    if rows:
        logger.info(f"[LOAD] Loaded {len(rows)} rows from DATABASE")
        # Calculate validation from DB data
        toplam_borc = sum(r.get('borc', 0) or 0 for r in rows)
        toplam_alacak = sum(r.get('alacak', 0) or 0 for r in rows)
        fark = abs(toplam_borc - toplam_alacak)
        fark_yuzde = (fark / max(toplam_borc, toplam_alacak) * 100) if max(toplam_borc, toplam_alacak) > 0 else 0
        validation_data = {
            'is_balanced': fark < 1.0,  # Allow small rounding errors
            'toplam_borc': toplam_borc,
            'toplam_alacak': toplam_alacak,
            'fark': fark,
            'fark_yuzde': fark_yuzde,
            'warnings': []
        }
    else:
        # PRIORITY 2: Fallback to disk
        logger.info(f"[LOAD] Database empty, trying disk for {smmm_id}/{client_id}/{period}")
        period_dir = find_period_folder(DATA_DIR, smmm_id, client_id, period)

        if not period_dir:
            raise HTTPException(
                status_code=404,
                detail=f"Mizan verisi bulunamadı: {client_id}/{period} (database ve disk kontrol edildi)"
            )

        mizan_path = period_dir / "mizan.csv"
        if not mizan_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"mizan.csv dosyası bulunamadı: {period_dir}"
            )

        try:
            # Parse mizan using data_engine
            result = parse_mizan_for_client(DATA_DIR, smmm_id, client_id, period_dir.name)
            rows = result.get('rows', [])
            validation_data = result.get('validation', {})
            source_file = mizan_path.name
            logger.info(f"[LOAD] Loaded {len(rows)} rows from DISK")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Disk okuma hatası: {str(e)}")

    try:

        # Build validation response
        validation = MizanValidationResponse(
            is_balanced=validation_data.get('is_balanced', False),
            toplam_borc=validation_data.get('toplam_borc', 0),
            toplam_alacak=validation_data.get('toplam_alacak', 0),
            fark=validation_data.get('fark', 0),
            fark_yuzde=validation_data.get('fark_yuzde', 0),
            warnings=validation_data.get('warnings', [])
        )

        # Build accounts list
        accounts = []
        for row in rows:
            accounts.append(MizanHesapResponse(
                hesap_kodu=row.get('hesap_kodu', ''),
                hesap_adi=row.get('hesap_adi'),
                borc_toplam=row.get('borc', 0),
                alacak_toplam=row.get('alacak', 0),
                borc_bakiye=row.get('bakiye_borc', 0),
                alacak_bakiye=row.get('bakiye_alacak', 0),
                status=row.get('status', 'ok'),
                warnings=row.get('warnings', [])
            ))

        # Calculate summary
        summary = calculate_summary(rows)

        # Extract VDK data
        vdk_data = extract_vdk_data(rows, summary)

        # VT-8: Pagination uygula
        total_accounts = len(accounts)
        paginated_accounts = accounts[offset:offset + limit] if include_accounts else []

        return MizanDataResponse(
            ok=True,
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            source_file=source_file,
            row_count=len(rows),
            validation=validation,
            summary=summary,
            accounts=paginated_accounts,
            vdk_data=vdk_data
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Mizan parse error: {e}")
        raise HTTPException(status_code=500, detail=f"Mizan okuma hatası: {str(e)}")


@router.get("/analyze/{smmm_id}/{client_id}/{period}")
async def analyze_mizan(smmm_id: str, client_id: str, period: str, user: dict = Depends(verify_token)):
    """
    Run mizan omurga (backbone) analysis on the data.

    Returns VDK-based risk analysis for 20 critical accounts:
    - 100 Kasa, 102 Bankalar, 120 Alıcılar, 131 Ortaklar Cari
    - 150 Stoklar, 153 Ticari Mallar, 191 İndirilecek KDV
    - 320 Satıcılar, 360 Ödenecek Vergi, 400 Sermaye, 590 Dönem Karı
    - 600 Satışlar, 620 İadeler, 770 Genel Yönetim Giderleri
    - etc.

    Data source priority:
    1. Database (mizan_entries table) - uses client_id directly
    2. Disk fallback - searches for matching folder
    """
    period = normalize_period_db(period)

    await check_client_access(user, client_id)
    # Use authenticated user's id as smmm_id (path param kept for backward compat)
    smmm_id = user["id"]

    rows = None
    source = "unknown"

    # PRIORITY 1: Try loading from database first
    logger.info(f"[ANALYZE] Trying database for {client_id}/{period}")
    rows = load_mizan_from_database(client_id, period)

    if rows:
        source = "database"
        logger.info(f"[ANALYZE] Loaded {len(rows)} rows from DATABASE")
    else:
        # PRIORITY 2: Fallback to disk
        logger.info(f"[ANALYZE] Database empty, trying disk for {smmm_id}/{client_id}/{period}")
        period_dir = find_period_folder(DATA_DIR, smmm_id, client_id, period)

        if period_dir:
            try:
                result = parse_mizan_for_client(DATA_DIR, smmm_id, client_id, period_dir.name)
                rows = result.get('rows', [])
                source = "disk"
                logger.info(f"[ANALYZE] Loaded {len(rows)} rows from DISK")
            except Exception as e:
                logger.warning(f"[ANALYZE] Disk fallback failed: {e}")

    # If no data from either source
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Mizan verisi bulunamadı: {client_id}/{period} (database ve disk kontrol edildi)"
        )

    # ════════════════════════════════════════════════════════════════════════════
    # DENGE KONTROLÜ İÇİN TOPLAM BORÇ/ALACAK HESAPLA
    # Frontend bu değerleri doğrudan kullanacak
    # ════════════════════════════════════════════════════════════════════════════
    toplam_borc = 0.0
    toplam_alacak = 0.0
    for row in rows:
        toplam_borc += row.get('borc', 0) or 0
        toplam_alacak += row.get('alacak', 0) or 0

    fark = abs(toplam_borc - toplam_alacak)
    denge_ok = fark < 1.0  # 1 TL'den az fark kabul edilir

    logger.info(f"[ANALYZE] Denge Kontrolü: Borç={toplam_borc:,.2f}, Alacak={toplam_alacak:,.2f}, Fark={fark:,.2f}, OK={denge_ok}")

    try:

        # Build mizan_data dict for analyzer (code -> balance)
        # LYNTOS FIX: Hem 3-digit hem de tam hesap kodlarını sakla
        mizan_data = {}
        mizan_data_detailed = {}  # Detaylı hesap kodları için

        for row in rows:
            kod = row.get('hesap_kodu', '')
            # ════════════════════════════════════════════════════════════════════════
            # KRİTİK FIX: bakiye_borc/bakiye_alacak için 0 geçerli bir değerdir!
            # Python'da "0 or X" ifadesi X döndürür çünkü 0 falsy'dir.
            # Bu yüzden None kontrolü yapmalıyız, 0 kontrolü DEĞİL.
            # ════════════════════════════════════════════════════════════════════════
            bakiye_borc = row.get('bakiye_borc')
            bakiye_alacak = row.get('bakiye_alacak')
            borc = bakiye_borc if bakiye_borc is not None else (row.get('borc', 0) or 0)
            alacak = bakiye_alacak if bakiye_alacak is not None else (row.get('alacak', 0) or 0)

            # Detaylı kod sakla
            if kod:
                # ════════════════════════════════════════════════════════════════
                # TEKDÜZEN HESAP PLANI KURALLARI:
                # ════════════════════════════════════════════════════════════════
                # 1xx, 2xx = Aktif hesaplar → Borç bakiye normal
                # 3xx, 4xx = Pasif hesaplar → Alacak bakiye normal
                # 5xx = Özkaynaklar → Alacak bakiye normal
                # 6xx = Gelirler → Alacak bakiye normal
                # 62x = Satış Maliyetleri → BORÇ bakiye (GİDER hesabı!)
                # 7xx = Giderler → Borç bakiye normal
                # ════════════════════════════════════════════════════════════════
                if kod.startswith('62'):
                    # 62x SMM grubu - GİDER hesabı, BORÇ bakiye verir
                    mizan_data_detailed[kod] = borc
                elif kod.startswith(('1', '2', '7')):
                    mizan_data_detailed[kod] = borc - alacak
                else:
                    mizan_data_detailed[kod] = alacak - borc

            # 3-digit kod için agrege et
            if len(kod) >= 3:
                kod_3 = kod[:3]
                if kod_3 not in mizan_data:
                    mizan_data[kod_3] = 0

                # 62x grubu özel işlem - GİDER hesabı
                if kod.startswith('62'):
                    mizan_data[kod_3] += borc
                elif kod_3.startswith(('1', '2', '7')):
                    mizan_data[kod_3] += borc - alacak
                else:
                    mizan_data[kod_3] += alacak - borc

        # ════════════════════════════════════════════════════════════════════════
        # TEKDÜZEN HESAP PLANI - NET SATIŞLAR HESAPLAMA
        # ════════════════════════════════════════════════════════════════════════
        # 600 Yurt İçi Satışlar (+)
        # 601 Yurt Dışı Satışlar (+)
        # 602 Diğer Gelirler (+)
        # 610 Satıştan İadeler (-)
        # 611 Satış İskontoları (-)
        # 612 Diğer İndirimler (-)
        # ════════════════════════════════════════════════════════════════════════
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
        ciro = brut_satislar - satis_indirimleri  # Net Satışlar

        # ════════════════════════════════════════════════════════════════════════
        # SATIŞ MALİYETLERİ (SMM) HESAPLAMA
        # ════════════════════════════════════════════════════════════════════════
        # 620 Satılan Mamüller Maliyeti (-)
        # 621 Satılan Ticari Mallar Maliyeti (-)
        # 622 Satılan Hizmet Maliyeti (-)
        # 623 Diğer Satışların Maliyeti (-)
        # NOT: 7xx maliyet hesapları da olabilir, bunları da dahil et
        # ════════════════════════════════════════════════════════════════════════
        smm = (
            mizan_data.get('620', 0) +
            mizan_data.get('621', 0) +
            mizan_data.get('622', 0) +
            mizan_data.get('623', 0)
        )

        # Eğer 62x grubu boşsa, 7xx maliyet hesaplarından hesapla
        if smm == 0:
            smm = (
                mizan_data.get('710', 0) +  # Direkt İlk Madde
                mizan_data.get('720', 0) +  # Direkt İşçilik
                mizan_data.get('730', 0) +  # Genel Üretim Giderleri
                mizan_data.get('740', 0) +  # Hizmet Üretim Maliyeti
                mizan_data.get('750', 0) +  # Araştırma Geliştirme
                mizan_data.get('760', 0) +  # Pazarlama Satış Dağıtım
                mizan_data.get('770', 0) +  # Genel Yönetim Giderleri
                mizan_data.get('780', 0)    # Finansman Giderleri
            )

        # ════════════════════════════════════════════════════════════════════════
        # BİLANÇO KALEMLERİ - ORAN ANALİZİ İÇİN
        # ════════════════════════════════════════════════════════════════════════
        donen_varliklar = sum(v for k, v in mizan_data.items() if k.startswith('1'))
        duran_varliklar = sum(v for k, v in mizan_data.items() if k.startswith('2'))
        toplam_aktif = donen_varliklar + duran_varliklar

        kvyk = sum(v for k, v in mizan_data.items() if k.startswith('3'))  # Kısa Vadeli Yabancı Kaynaklar
        uvyk = sum(v for k, v in mizan_data.items() if k.startswith('4'))  # Uzun Vadeli Yabancı Kaynaklar
        ozkaynaklar = sum(v for k, v in mizan_data.items() if k.startswith('5'))

        stoklar = sum(v for k, v in mizan_data.items() if k.startswith('15'))
        alicilar = mizan_data.get('120', 0)
        kasa = mizan_data.get('100', 0)
        bankalar = mizan_data.get('102', 0)
        hazir_degerler = kasa + bankalar

        # Özkaynaklar ve ratio hesaplamaları için extended data ekle
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

        logger.info(f"[ANALYZE] Finansal Veriler: Ciro={ciro:,.2f}, SMM={smm:,.2f}, Özkaynaklar={ozkaynaklar:,.2f}")

        # Run analysis
        analyzer = MizanOmurgaAnalyzer(mizan_data, ciro, period)
        analysis_result = analyzer.analyze_all()

        # ════════════════════════════════════════════════════════════════════════
        # FRONTEND İÇİN GENİŞLETİLMİŞ RESPONSE
        # ════════════════════════════════════════════════════════════════════════
        return {
            "ok": True,
            "smmm_id": smmm_id,
            "client_id": client_id,
            "period": period,
            "accounts": analysis_result.get('accounts', {}),
            "summary": analysis_result.get('summary', {}),
            "analysis": analysis_result.get('analysis', {}),
            # YENİ: Finansal oranlar (backend'de hesaplanmış)
            "finansal_oranlar": analysis_result.get('finansal_oranlar', {}),
            # YENİ: Denge kontrolü için gerçek toplam değerler
            "totals": {
                "toplam_borc": round(toplam_borc, 2),
                "toplam_alacak": round(toplam_alacak, 2),
                "fark": round(fark, 2),
                "denge_ok": denge_ok,
            },
            # YENİ: Hesap detayları (borç/alacak bilgisiyle)
            "hesap_detaylari": [
                {
                    "hesap_kodu": row.get('hesap_kodu', ''),
                    "hesap_adi": row.get('hesap_adi', ''),
                    "borc": row.get('borc', 0) or 0,
                    "alacak": row.get('alacak', 0) or 0,
                    "bakiye_borc": row.get('bakiye_borc', 0) or 0,
                    "bakiye_alacak": row.get('bakiye_alacak', 0) or 0,
                }
                for row in rows
            ],
        }

    except Exception as e:
        logger.error(f"Mizan analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analiz hatası: {str(e)}")


@router.get("/account/{smmm_id}/{client_id}/{period}/{hesap_kodu}")
async def get_account_detail(smmm_id: str, client_id: str, period: str, hesap_kodu: str, user: dict = Depends(verify_token)):
    """
    Get detailed information for a specific account code.
    Useful for drill-down from Dashboard panels.
    """
    period = normalize_period_db(period)

    await check_client_access(user, client_id)
    # Use authenticated user's id as smmm_id (path param kept for backward compat)
    smmm_id = user["id"]

    period_dir = find_period_folder(DATA_DIR, smmm_id, client_id, period)

    if not period_dir:
        raise HTTPException(status_code=404, detail="Mizan verisi bulunamadı")

    try:
        result = parse_mizan_for_client(DATA_DIR, smmm_id, client_id, period_dir.name)
        rows = result.get('rows', [])

        # Find matching accounts (exact or prefix match)
        matching = [
            row for row in rows
            if row.get('hesap_kodu', '').startswith(hesap_kodu)
        ]

        if not matching:
            raise HTTPException(
                status_code=404,
                detail=f"Hesap bulunamadı: {hesap_kodu}"
            )

        # Calculate totals for matched accounts
        toplam_borc = sum(r.get('borc', 0) or 0 for r in matching)
        toplam_alacak = sum(r.get('alacak', 0) or 0 for r in matching)
        toplam_borc_bakiye = sum(r.get('bakiye_borc', 0) or 0 for r in matching)
        toplam_alacak_bakiye = sum(r.get('bakiye_alacak', 0) or 0 for r in matching)

        return {
            "hesap_kodu": hesap_kodu,
            "match_count": len(matching),
            "toplam_borc": toplam_borc,
            "toplam_alacak": toplam_alacak,
            "borc_bakiye": toplam_borc_bakiye,
            "alacak_bakiye": toplam_alacak_bakiye,
            "net_bakiye": toplam_borc_bakiye - toplam_alacak_bakiye,
            "alt_hesaplar": [
                {
                    "hesap_kodu": r.get('hesap_kodu'),
                    "hesap_adi": r.get('hesap_adi'),
                    "borc_bakiye": r.get('bakiye_borc', 0),
                    "alacak_bakiye": r.get('bakiye_alacak', 0),
                }
                for r in matching[:50]  # Limit to 50 sub-accounts
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
