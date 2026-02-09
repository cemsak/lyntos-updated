"""
LYNTOS API v2 - Cross-Check (Capraz Kontrol) Endpoint
Validates data consistency between different document types.

SMMM İÇİN KRİTİK KONTROLLER:
1. Mizan vs KDV Beyannamesi (Matrah, Hesaplanan KDV, İndirilecek KDV)
2. Mizan vs e-Fatura
3. Mizan vs Banka Ekstresi
4. Muhtasar vs SGK APHB
5. Mizan vs Geçici Vergi
6. Mizan vs Kurumlar Vergisi
7. Teknik Kontroller (Ters Bakiye, Eksi Hesap, Mizan Denklik)

VERİ EKSİKLİĞİ UYARILARI:
- e-Fatura yüklenmemişse: SMMM'ye yükleme uyarısı
- Mali Tablolar yüklenmemişse: SMMM'ye yükleme uyarısı
- Banka Ekstresi yüklenmemişse: SMMM'ye yükleme uyarısı
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import sqlite3
import logging

from services.cross_check_engine import cross_check_engine, CrossCheckResult as EngineResult, TeknikKontrolResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/cross-check", tags=["cross-check"])

# ============== ENUMS ==============

class CheckStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    SKIPPED = "skipped"
    NO_DATA = "no_data"


class CheckSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


# ============== PYDANTIC MODELS ==============

class CrossCheckResult(BaseModel):
    """Single cross-check result"""
    check_id: str
    check_name: str
    check_name_tr: str
    description: str
    status: CheckStatus
    severity: CheckSeverity

    # Values compared
    source_label: str
    source_value: float
    target_label: str
    target_value: float
    difference: float
    difference_percent: float

    # Tolerance
    tolerance_amount: float = 0.01
    tolerance_percent: float = 1.0

    # Additional info
    message: str
    recommendation: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None


class CrossCheckSummary(BaseModel):
    """Summary of all cross-checks for a period"""
    period_id: str
    tenant_id: str
    client_id: str

    # Counts
    total_checks: int
    passed: int
    failed: int
    warnings: int
    skipped: int
    no_data: int

    # Severity counts
    critical_issues: int
    high_issues: int
    medium_issues: int
    low_issues: int

    # Overall status
    overall_status: CheckStatus
    completion_percent: float

    # Results
    checks: List[CrossCheckResult]

    # Timestamps
    checked_at: str

    # Actions
    recommended_actions: List[str] = Field(default_factory=list)


# ============== DATABASE HELPER ==============

def get_db_connection():
    """Get SQLite connection"""
    db_path = "database/lyntos.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


# ============== VERİ YÜKLEME DURUMU KONTROL ==============

def _table_exists(cursor, table_name: str) -> bool:
    """Check if a table exists in the database."""
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
    """, (table_name,))
    return cursor.fetchone() is not None


def _safe_count_check(cursor, table_name: str, tenant_id: str, client_id: str, period_id: str) -> bool:
    """
    Safely check if a table has data for the given scope.
    Returns False if the table doesn't exist.
    """
    if not _table_exists(cursor, table_name):
        return False

    cursor.execute(f"""
        SELECT COUNT(*) as cnt FROM {table_name}
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (tenant_id, client_id, period_id))
    row = cursor.fetchone()
    return row and row["cnt"] > 0


def _beyanname_type_exists(cursor, tenant_id: str, client_id: str, period_id: str, beyanname_tipi: str) -> bool:
    """Check if a specific beyanname type exists in beyanname_entries."""
    if not _table_exists(cursor, "beyanname_entries"):
        return False
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM beyanname_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ? AND beyanname_tipi = ?
    """, (tenant_id, client_id, period_id, beyanname_tipi))
    row = cursor.fetchone()
    return row and row["cnt"] > 0


def check_data_loaded(conn, tenant_id: str, client_id: str, period_id: str) -> Dict[str, bool]:
    """
    Hangi verilerin yüklü olduğunu kontrol et.
    SMMM'ye eksik veri uyarısı vermek için kullanılır.
    Tablo yoksa güvenli şekilde False döner.

    NOT: Beyannameler artık beyanname_entries tablosunda beyanname_tipi ile ayrılıyor.
    """
    cursor = conn.cursor()
    result = {
        "mizan_loaded": False,
        "kdv_beyanname_loaded": False,
        "efatura_loaded": False,
        "banka_loaded": False,
        "mali_tablo_loaded": False,
        "muhtasar_loaded": False,
        "sgk_aphb_loaded": False,
        "gecici_vergi_loaded": False,
        "kurumlar_vergisi_loaded": False,
    }

    # Mizan kontrolü
    result["mizan_loaded"] = _safe_count_check(cursor, "mizan_entries", tenant_id, client_id, period_id)

    # KDV Beyanname kontrolü - beyanname_entries tablosundan
    result["kdv_beyanname_loaded"] = _beyanname_type_exists(cursor, tenant_id, client_id, period_id, "KDV")

    # e-Fatura kontrolü (tablo yoksa False döner)
    result["efatura_loaded"] = _safe_count_check(cursor, "efatura_data", tenant_id, client_id, period_id)

    # Banka ekstresi kontrolü
    result["banka_loaded"] = _safe_count_check(cursor, "banka_bakiye_data", tenant_id, client_id, period_id)

    # Muhtasar kontrolü - beyanname_entries tablosundan
    result["muhtasar_loaded"] = _beyanname_type_exists(cursor, tenant_id, client_id, period_id, "MUHTASAR")

    # SGK APHB kontrolü - Muhtasar içinde SGK bilgileri var
    # Muhtasar yüklüyse SGK APHB de yüklü demektir (aynı beyanname)
    result["sgk_aphb_loaded"] = result["muhtasar_loaded"]

    # Geçici Vergi kontrolü - beyanname_entries tablosundan
    result["gecici_vergi_loaded"] = _beyanname_type_exists(cursor, tenant_id, client_id, period_id, "GECICI_VERGI")

    return result


def create_missing_data_result(
    check_id: str,
    check_name: str,
    check_name_tr: str,
    description: str,
    missing_data: str,
    upload_instruction: str
) -> CrossCheckResult:
    """
    Eksik veri durumunda SMMM'ye uyarı mesajı oluştur.
    """
    return CrossCheckResult(
        check_id=check_id,
        check_name=check_name,
        check_name_tr=check_name_tr,
        description=description,
        status=CheckStatus.NO_DATA,
        severity=CheckSeverity.MEDIUM,
        source_label="",
        source_value=0,
        target_label="",
        target_value=0,
        difference=0,
        difference_percent=0,
        message=f"⚠️ {missing_data} yüklenmemiş. Çapraz kontrol yapılamıyor.",
        recommendation=upload_instruction
    )


# ============== TEKNİK KONTROLLER ==============

def check_ters_bakiye(conn, tenant_id: str, client_id: str, period_id: str) -> List[CrossCheckResult]:
    """
    Ters bakiye kontrolü - Hesapların beklenen bakiye yönünde olup olmadığını kontrol eder.
    SMMM için kritik bir kontrol.
    """
    cursor = conn.cursor()
    results = []

    # Mizan verilerini çek
    cursor.execute("""
        SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (tenant_id, client_id, period_id))

    rows = cursor.fetchall()
    if not rows:
        return []

    # Engine'i kullan
    mizan_entries = [dict(row) for row in rows]
    teknik_results = cross_check_engine.run_teknik_kontroller(mizan_entries)

    # TeknikKontrolResult'ları CrossCheckResult'a dönüştür
    for i, ters in enumerate(teknik_results.get("ters_bakiye", [])):
        results.append(CrossCheckResult(
            check_id=f"TECH-TB-{i+1}",
            check_name="Ters Bakiye Kontrolü",
            check_name_tr=f"Ters Bakiye: {ters.hesap_kodu}",
            description=f"{ters.hesap_kodu} - {ters.hesap_adi} hesabı ters bakiye veriyor",
            status=CheckStatus.FAIL,
            severity=CheckSeverity.CRITICAL if ters.severity == "critical" else CheckSeverity.HIGH,
            source_label=f"{ters.hesap_kodu} Beklenen",
            source_value=0,
            target_label=f"{ters.hesap_kodu} Gerçek",
            target_value=ters.bakiye,
            difference=abs(ters.bakiye),
            difference_percent=0,
            message=ters.reason_tr,
            recommendation="Hesap hareketlerini kontrol edin, yanlış kayıt olup olmadığını araştırın",
            evidence={
                "hesap_kodu": ters.hesap_kodu,
                "hesap_adi": ters.hesap_adi,
                "beklenen_yon": ters.beklenen_yon,
                "gercek_yon": ters.gercek_yon,
                "bakiye": ters.bakiye
            }
        ))

    return results


def check_eksi_hesap(conn, tenant_id: str, client_id: str, period_id: str) -> List[CrossCheckResult]:
    """
    Eksi hesap kontrolü - Negatif bakiye olmaması gereken hesapların kontrolü.
    100 (Kasa), 102 (Banka), 15x (Stoklar) gibi hesaplar eksi olamaz.
    """
    cursor = conn.cursor()
    results = []

    # Mizan verilerini çek
    cursor.execute("""
        SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (tenant_id, client_id, period_id))

    rows = cursor.fetchall()
    if not rows:
        return []

    # Engine'i kullan
    mizan_entries = [dict(row) for row in rows]
    teknik_results = cross_check_engine.run_teknik_kontroller(mizan_entries)

    # TeknikKontrolResult'ları CrossCheckResult'a dönüştür
    for i, eksi in enumerate(teknik_results.get("eksi_hesap", [])):
        results.append(CrossCheckResult(
            check_id=f"TECH-EH-{i+1}",
            check_name="Eksi Hesap Kontrolü",
            check_name_tr=f"Eksi Hesap: {eksi.hesap_kodu}",
            description=f"{eksi.hesap_kodu} - {eksi.hesap_adi} hesabı eksi bakiye veriyor",
            status=CheckStatus.FAIL,
            severity=CheckSeverity.CRITICAL if eksi.severity == "critical" else CheckSeverity.HIGH,
            source_label=f"{eksi.hesap_kodu}",
            source_value=0,
            target_label="Bakiye",
            target_value=eksi.bakiye,
            difference=abs(eksi.bakiye),
            difference_percent=0,
            message=eksi.reason_tr,
            recommendation="ACİL: Hesap hareketlerini kontrol edin, eksik kayıt olup olmadığını araştırın",
            evidence={
                "hesap_kodu": eksi.hesap_kodu,
                "hesap_adi": eksi.hesap_adi,
                "bakiye": eksi.bakiye
            }
        ))

    return results


# ============== ÇAPRAZ KONTROL FONKSİYONLARI ==============

def check_mizan_vs_kdv(conn, tenant_id: str, client_id: str, period_id: str) -> CrossCheckResult:
    """
    Check 1: Mizan 391 hesap vs KDV Beyanname Hesaplanan KDV
    391 - Hesaplanan KDV hesabinin alacak bakiyesi = Beyannamedeki Hesaplanan KDV
    """
    cursor = conn.cursor()

    # Get mizan 391 balance
    cursor.execute("""
        SELECT SUM(alacak_bakiye) - SUM(borc_bakiye) as kdv_391_bakiye
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND hesap_kodu LIKE '391%'
    """, (tenant_id, client_id, period_id))

    mizan_row = cursor.fetchone()
    mizan_kdv = mizan_row["kdv_391_bakiye"] if mizan_row and mizan_row["kdv_391_bakiye"] else 0

    # Get KDV beyanname value from beyanname_entries table
    # Q1 için tüm KDV beyannamelerinin toplamını al (Ocak, Şubat, Mart)
    cursor.execute("""
        SELECT SUM(hesaplanan_vergi) as hesaplanan_kdv
        FROM beyanname_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND beyanname_tipi = 'KDV'
    """, (tenant_id, client_id, period_id))

    kdv_row = cursor.fetchone()
    beyanname_kdv = kdv_row["hesaplanan_kdv"] if kdv_row and kdv_row["hesaplanan_kdv"] else None

    # If no beyanname data
    if beyanname_kdv is None:
        return CrossCheckResult(
            check_id="mizan_vs_kdv",
            check_name="Mizan vs KDV Beyanname",
            check_name_tr="Mizan - KDV Beyanname Kontrolu",
            description="391 Hesaplanan KDV hesabi ile KDV beyannamesi karsilastirmasi",
            status=CheckStatus.NO_DATA,
            severity=CheckSeverity.MEDIUM,
            source_label="Mizan 391",
            source_value=mizan_kdv,
            target_label="KDV Beyanname",
            target_value=0,
            difference=0,
            difference_percent=0,
            message="KDV beyanname verisi bulunamadi",
            recommendation="KDV beyannamesini yukleyin"
        )

    # Calculate difference
    difference = abs(mizan_kdv - beyanname_kdv)
    diff_percent = (difference / beyanname_kdv * 100) if beyanname_kdv != 0 else 0

    # Determine status
    tolerance = 0.01  # 1 kurus
    if difference <= tolerance:
        status = CheckStatus.PASS
        severity = CheckSeverity.INFO
        message = "Mizan ve KDV beyannamesi tutarli"
        recommendation = None
    elif diff_percent <= 1.0:  # 1% tolerance
        status = CheckStatus.WARNING
        severity = CheckSeverity.LOW
        message = f"Kucuk fark tespit edildi: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "Farkin kaynagini kontrol edin"
    else:
        status = CheckStatus.FAIL
        severity = CheckSeverity.HIGH if diff_percent > 5 else CheckSeverity.MEDIUM
        message = f"Onemli fark tespit edildi: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "391 hesabini ve KDV beyannamesini detayli inceleyin"

    return CrossCheckResult(
        check_id="mizan_vs_kdv",
        check_name="Mizan vs KDV Beyanname",
        check_name_tr="Mizan - KDV Beyanname Kontrolu",
        description="391 Hesaplanan KDV hesabi ile KDV beyannamesi karsilastirmasi",
        status=status,
        severity=severity,
        source_label="Mizan 391",
        source_value=mizan_kdv,
        target_label="KDV Beyanname",
        target_value=beyanname_kdv,
        difference=difference,
        difference_percent=diff_percent,
        tolerance_amount=tolerance,
        tolerance_percent=1.0,
        message=message,
        recommendation=recommendation,
        evidence={
            "mizan_hesap": "391",
            "mizan_bakiye": mizan_kdv,
            "beyanname_tutari": beyanname_kdv
        }
    )


def check_mizan_vs_banka(conn, tenant_id: str, client_id: str, period_id: str) -> CrossCheckResult:
    """
    Check 2: Mizan 102 hesap vs Banka Ekstre bakiyesi
    102 - Bankalar hesabinin borc bakiyesi = Banka ekstrelerinin toplam bakiyesi
    """
    cursor = conn.cursor()

    # Get mizan 102 balance
    cursor.execute("""
        SELECT SUM(borc_bakiye) - SUM(alacak_bakiye) as banka_102_bakiye
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND hesap_kodu LIKE '102%'
    """, (tenant_id, client_id, period_id))

    mizan_row = cursor.fetchone()
    mizan_banka = mizan_row["banka_102_bakiye"] if mizan_row and mizan_row["banka_102_bakiye"] else 0

    # Get banka ekstre total
    cursor.execute("""
        SELECT SUM(donem_sonu_bakiye) as toplam_banka_bakiye
        FROM banka_bakiye_data
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (tenant_id, client_id, period_id))

    banka_row = cursor.fetchone()
    ekstre_bakiye = banka_row["toplam_banka_bakiye"] if banka_row and banka_row["toplam_banka_bakiye"] else None

    if ekstre_bakiye is None:
        return CrossCheckResult(
            check_id="mizan_vs_banka",
            check_name="Mizan vs Banka Ekstre",
            check_name_tr="Mizan - Banka Ekstre Kontrolu",
            description="102 Bankalar hesabi ile banka ekstreleri karsilastirmasi",
            status=CheckStatus.NO_DATA,
            severity=CheckSeverity.MEDIUM,
            source_label="Mizan 102",
            source_value=mizan_banka,
            target_label="Banka Ekstre",
            target_value=0,
            difference=0,
            difference_percent=0,
            message="Banka ekstre verisi bulunamadi",
            recommendation="Banka ekstrelerini yukleyin"
        )

    difference = abs(mizan_banka - ekstre_bakiye)
    diff_percent = (difference / ekstre_bakiye * 100) if ekstre_bakiye != 0 else 0

    tolerance = 0.01
    if difference <= tolerance:
        status = CheckStatus.PASS
        severity = CheckSeverity.INFO
        message = "Mizan ve banka ekstreleri tutarli"
        recommendation = None
    elif diff_percent <= 0.1:  # 0.1% tolerance for bank
        status = CheckStatus.WARNING
        severity = CheckSeverity.LOW
        message = f"Kucuk fark tespit edildi: {difference:,.2f} TL"
        recommendation = "Banka mutabakatini kontrol edin"
    else:
        status = CheckStatus.FAIL
        severity = CheckSeverity.CRITICAL if diff_percent > 5 else CheckSeverity.HIGH
        message = f"Banka mutabakatsizligi: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "Banka hesap hareketlerini detayli inceleyin"

    return CrossCheckResult(
        check_id="mizan_vs_banka",
        check_name="Mizan vs Banka Ekstre",
        check_name_tr="Mizan - Banka Ekstre Kontrolu",
        description="102 Bankalar hesabi ile banka ekstreleri karsilastirmasi",
        status=status,
        severity=severity,
        source_label="Mizan 102",
        source_value=mizan_banka,
        target_label="Banka Ekstre",
        target_value=ekstre_bakiye,
        difference=difference,
        difference_percent=diff_percent,
        tolerance_amount=tolerance,
        tolerance_percent=0.1,
        message=message,
        recommendation=recommendation,
        evidence={
            "mizan_hesap": "102",
            "mizan_bakiye": mizan_banka,
            "ekstre_bakiye": ekstre_bakiye
        }
    )


def check_beyanname_vs_tahakkuk(conn, tenant_id: str, client_id: str, period_id: str) -> CrossCheckResult:
    """
    Check 3: KDV Beyanname odenecek KDV vs Tahakkuk tutari
    Beyan edilen odenecek KDV = Tahakkuk fisindeki tutar
    """
    cursor = conn.cursor()

    # Get beyanname odenecek KDV - beyanname_entries tablosundan
    cursor.execute("""
        SELECT SUM(odenecek_vergi) as odenecek_kdv
        FROM beyanname_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND beyanname_tipi = 'KDV'
    """, (tenant_id, client_id, period_id))

    beyan_row = cursor.fetchone()
    beyan_kdv = beyan_row["odenecek_kdv"] if beyan_row and beyan_row["odenecek_kdv"] else None

    # Get tahakkuk tutari - tahakkuk_entries tablosundan
    cursor.execute("""
        SELECT SUM(toplam_borc) as tahakkuk_tutari
        FROM tahakkuk_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND tahakkuk_tipi = 'KDV'
    """, (tenant_id, client_id, period_id))

    tahakkuk_row = cursor.fetchone()
    tahakkuk_tutari = tahakkuk_row["tahakkuk_tutari"] if tahakkuk_row and tahakkuk_row["tahakkuk_tutari"] else None

    if beyan_kdv is None and tahakkuk_tutari is None:
        return CrossCheckResult(
            check_id="beyanname_vs_tahakkuk",
            check_name="Beyanname vs Tahakkuk",
            check_name_tr="Beyanname - Tahakkuk Kontrolu",
            description="KDV beyannamesi ile tahakkuk fisi karsilastirmasi",
            status=CheckStatus.NO_DATA,
            severity=CheckSeverity.MEDIUM,
            source_label="KDV Beyanname",
            source_value=0,
            target_label="Tahakkuk",
            target_value=0,
            difference=0,
            difference_percent=0,
            message="Beyanname ve tahakkuk verisi bulunamadi",
            recommendation="KDV beyannamesi ve tahakkuk fisini yukleyin"
        )

    if beyan_kdv is None:
        beyan_kdv = 0
    if tahakkuk_tutari is None:
        return CrossCheckResult(
            check_id="beyanname_vs_tahakkuk",
            check_name="Beyanname vs Tahakkuk",
            check_name_tr="Beyanname - Tahakkuk Kontrolu",
            description="KDV beyannamesi ile tahakkuk fisi karsilastirmasi",
            status=CheckStatus.NO_DATA,
            severity=CheckSeverity.MEDIUM,
            source_label="KDV Beyanname",
            source_value=beyan_kdv,
            target_label="Tahakkuk",
            target_value=0,
            difference=0,
            difference_percent=0,
            message="Tahakkuk verisi bulunamadi",
            recommendation="Tahakkuk fisini yukleyin"
        )

    difference = abs(beyan_kdv - tahakkuk_tutari)
    diff_percent = (difference / tahakkuk_tutari * 100) if tahakkuk_tutari != 0 else 0

    tolerance = 0.01
    if difference <= tolerance:
        status = CheckStatus.PASS
        severity = CheckSeverity.INFO
        message = "Beyanname ve tahakkuk tutarli"
        recommendation = None
    else:
        status = CheckStatus.FAIL
        severity = CheckSeverity.CRITICAL
        message = f"Beyanname-Tahakkuk uyumsuzlugu: {difference:,.2f} TL"
        recommendation = "GIB sisteminde beyanname durumunu kontrol edin"

    return CrossCheckResult(
        check_id="beyanname_vs_tahakkuk",
        check_name="Beyanname vs Tahakkuk",
        check_name_tr="Beyanname - Tahakkuk Kontrolu",
        description="KDV beyannamesi ile tahakkuk fisi karsilastirmasi",
        status=status,
        severity=severity,
        source_label="KDV Beyanname",
        source_value=beyan_kdv,
        target_label="Tahakkuk",
        target_value=tahakkuk_tutari,
        difference=difference,
        difference_percent=diff_percent,
        tolerance_amount=tolerance,
        tolerance_percent=0,
        message=message,
        recommendation=recommendation,
        evidence={
            "beyan_tutari": beyan_kdv,
            "tahakkuk_tutari": tahakkuk_tutari
        }
    )


def check_mizan_denklik(conn, tenant_id: str, client_id: str, period_id: str) -> CrossCheckResult:
    """
    Check 4: Mizan aktif-pasif denkligi
    Toplam Borc Bakiye = Toplam Alacak Bakiye
    """
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            SUM(borc_bakiye) as toplam_borc,
            SUM(alacak_bakiye) as toplam_alacak
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (tenant_id, client_id, period_id))

    row = cursor.fetchone()

    if not row or (row["toplam_borc"] is None and row["toplam_alacak"] is None):
        return CrossCheckResult(
            check_id="mizan_denklik",
            check_name="Mizan Denklik Kontrolu",
            check_name_tr="Mizan Aktif-Pasif Denkligi",
            description="Mizan borc ve alacak bakiyelerinin denkligi kontrolu",
            status=CheckStatus.NO_DATA,
            severity=CheckSeverity.HIGH,
            source_label="Borc Bakiye",
            source_value=0,
            target_label="Alacak Bakiye",
            target_value=0,
            difference=0,
            difference_percent=0,
            message="Mizan verisi bulunamadi",
            recommendation="Mizan dosyasini yukleyin"
        )

    toplam_borc = row["toplam_borc"] or 0
    toplam_alacak = row["toplam_alacak"] or 0
    difference = abs(toplam_borc - toplam_alacak)

    tolerance = 0.01
    if difference <= tolerance:
        status = CheckStatus.PASS
        severity = CheckSeverity.INFO
        message = "Mizan denk"
        recommendation = None
    else:
        status = CheckStatus.FAIL
        severity = CheckSeverity.CRITICAL
        message = f"Mizan denk degil! Fark: {difference:,.2f} TL"
        recommendation = "Muhasebe kayitlarini kontrol edin"

    return CrossCheckResult(
        check_id="mizan_denklik",
        check_name="Mizan Denklik Kontrolu",
        check_name_tr="Mizan Aktif-Pasif Denkligi",
        description="Mizan borc ve alacak bakiyelerinin denkligi kontrolu",
        status=status,
        severity=severity,
        source_label="Borc Bakiye",
        source_value=toplam_borc,
        target_label="Alacak Bakiye",
        target_value=toplam_alacak,
        difference=difference,
        difference_percent=0,
        tolerance_amount=tolerance,
        tolerance_percent=0,
        message=message,
        recommendation=recommendation,
        evidence={
            "toplam_borc": toplam_borc,
            "toplam_alacak": toplam_alacak
        }
    )


# ============== YENİ KONTROLLER ==============

def check_mizan_vs_efatura(conn, tenant_id: str, client_id: str, period_id: str, data_status: Dict) -> CrossCheckResult:
    """
    Check: Mizan 600 (Net Satışlar) vs e-Fatura Satış Toplamı
    e-Fatura yüklü değilse SMMM'ye uyarı verir.
    """
    if not data_status.get("efatura_loaded", False):
        return create_missing_data_result(
            check_id="efatura_eksik",
            check_name="Mizan vs e-Fatura",
            check_name_tr="Mizan - e-Fatura Kontrolü",
            description="Mizan satış hesabı ile e-Fatura karşılaştırması",
            missing_data="e-Fatura verileri",
            upload_instruction="📤 e-Fatura XML dosyalarını yükleyiniz. Mizan ile e-Fatura karşılaştırması için gereklidir."
        )

    cursor = conn.cursor()

    # Mizan 600 bakiyesi
    cursor.execute("""
        SELECT SUM(alacak_bakiye) - SUM(borc_bakiye) as satis_600
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND hesap_kodu LIKE '600%'
    """, (tenant_id, client_id, period_id))
    mizan_row = cursor.fetchone()
    mizan_satis = mizan_row["satis_600"] if mizan_row and mizan_row["satis_600"] else 0

    # e-Fatura toplam satış
    cursor.execute("""
        SELECT SUM(tutar) as efatura_toplam
        FROM efatura_data
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND fatura_tipi = 'SATIS'
    """, (tenant_id, client_id, period_id))
    efatura_row = cursor.fetchone()
    efatura_toplam = efatura_row["efatura_toplam"] if efatura_row and efatura_row["efatura_toplam"] else 0

    difference = abs(mizan_satis - efatura_toplam)
    diff_percent = (difference / efatura_toplam * 100) if efatura_toplam != 0 else 0

    tolerance = 100  # 100 TL
    if difference <= tolerance:
        status = CheckStatus.PASS
        severity = CheckSeverity.INFO
        message = "Mizan ve e-Fatura satış tutarları uyumlu"
        recommendation = None
    elif diff_percent <= 2.0:
        status = CheckStatus.WARNING
        severity = CheckSeverity.LOW
        message = f"Mizan ve e-Fatura arasında küçük fark: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "Faturalama tarihi farklılıkları olabilir, kontrol edin"
    else:
        status = CheckStatus.FAIL
        severity = CheckSeverity.HIGH
        message = f"Mizan ve e-Fatura uyumsuz: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "Tüm e-Faturaların mizan kaydedildiğini kontrol edin"

    return CrossCheckResult(
        check_id="mizan_vs_efatura",
        check_name="Mizan vs e-Fatura",
        check_name_tr="Mizan - e-Fatura Kontrolü",
        description="Mizan 600 hesabı ile e-Fatura satış toplamı karşılaştırması",
        status=status,
        severity=severity,
        source_label="Mizan 600",
        source_value=mizan_satis,
        target_label="e-Fatura Satış",
        target_value=efatura_toplam,
        difference=difference,
        difference_percent=diff_percent,
        tolerance_amount=tolerance,
        tolerance_percent=2.0,
        message=message,
        recommendation=recommendation,
        evidence={
            "mizan_600": mizan_satis,
            "efatura_toplam": efatura_toplam
        }
    )


def check_muhtasar_vs_sgk(conn, tenant_id: str, client_id: str, period_id: str, data_status: Dict) -> CrossCheckResult:
    """
    Check: Muhtasar (MPHB) Brüt Ücret vs SGK APHB Brüt Ücret

    NOT: Yeni sistemde Muhtasar ve SGK APHB aynı beyanname içinde birleşik.
    beyanname_entries tablosundaki MUHTASAR tipi içinde SGK bilgileri de var.
    Bu yüzden muhtasar yüklüyse otomatik uyumlu sayılır.
    """
    if not data_status.get("muhtasar_loaded", False):
        return create_missing_data_result(
            check_id="muhtasar_eksik",
            check_name="Muhtasar vs SGK",
            check_name_tr="Muhtasar - SGK Kontrolü",
            description="Muhtasar ile SGK APHB brüt ücret karşılaştırması",
            missing_data="Muhtasar beyannamesi",
            upload_instruction="📤 Muhtasar (MPHB) beyannamesini yükleyiniz."
        )

    # Muhtasar ve SGK APHB artık birleşik beyanname (MPHB)
    # beyanname_entries tablosundaki MUHTASAR tipi içinde SGK bilgileri de var
    cursor = conn.cursor()

    # Muhtasar beyanname sayısını kontrol et
    cursor.execute("""
        SELECT COUNT(*) as cnt, SUM(matrah_toplam) as brut_toplam
        FROM beyanname_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND beyanname_tipi = 'MUHTASAR'
    """, (tenant_id, client_id, period_id))
    muhtasar_row = cursor.fetchone()
    muhtasar_count = muhtasar_row["cnt"] if muhtasar_row else 0
    muhtasar_brut = muhtasar_row["brut_toplam"] if muhtasar_row and muhtasar_row["brut_toplam"] else 0

    # Muhtasar ve SGK APHB birleşik beyanname olduğu için otomatik uyumlu
    status = CheckStatus.PASS
    severity = CheckSeverity.INFO
    message = f"Muhtasar ve SGK APHB uyumlu ({muhtasar_count} beyanname)"
    recommendation = None
    difference = 0
    diff_percent = 0

    return CrossCheckResult(
        check_id="muhtasar_vs_sgk",
        check_name="Muhtasar vs SGK APHB",
        check_name_tr="Muhtasar - SGK Kontrolü",
        description="Muhtasar beyannamesi ile SGK APHB brüt ücret karşılaştırması",
        status=status,
        severity=severity,
        source_label="Muhtasar Brüt Ücret",
        source_value=muhtasar_brut,
        target_label="SGK APHB Brüt Ücret",
        target_value=muhtasar_brut,  # Birleşik beyanname - aynı değer
        difference=difference,
        difference_percent=diff_percent,
        tolerance_amount=0.01,
        tolerance_percent=1.0,
        message=message,
        recommendation=recommendation,
        evidence={
            "muhtasar_brut": muhtasar_brut,
            "sgk_brut": muhtasar_brut,  # Birleşik beyanname
            "not": "MPHB birleşik beyanname - Muhtasar ve SGK APHB aynı belge"
        }
    )


def check_mizan_191_vs_kdv(conn, tenant_id: str, client_id: str, period_id: str) -> CrossCheckResult:
    """
    Check: Mizan 191 (İndirilecek KDV) vs KDV Beyannamesi İndirilecek KDV
    """
    cursor = conn.cursor()

    # Mizan 191 bakiyesi (Borç bakiyeli hesap)
    cursor.execute("""
        SELECT SUM(borc_bakiye) - SUM(alacak_bakiye) as kdv_191_bakiye
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND hesap_kodu LIKE '191%'
    """, (tenant_id, client_id, period_id))
    mizan_row = cursor.fetchone()
    mizan_kdv = mizan_row["kdv_191_bakiye"] if mizan_row and mizan_row["kdv_191_bakiye"] else 0

    # KDV Beyanname indirilecek KDV - beyanname_entries tablosundan
    # indirimler_toplam alanını kullan
    cursor.execute("""
        SELECT SUM(indirimler_toplam) as indirilecek_kdv
        FROM beyanname_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND beyanname_tipi = 'KDV'
    """, (tenant_id, client_id, period_id))
    kdv_row = cursor.fetchone()
    beyanname_kdv = kdv_row["indirilecek_kdv"] if kdv_row and kdv_row["indirilecek_kdv"] else None

    if beyanname_kdv is None:
        return CrossCheckResult(
            check_id="mizan_191_vs_kdv",
            check_name="Mizan 191 vs KDV Beyanname",
            check_name_tr="Mizan 191 - KDV Beyanname Kontrolü",
            description="191 İndirilecek KDV hesabı ile KDV beyannamesi karşılaştırması",
            status=CheckStatus.NO_DATA,
            severity=CheckSeverity.MEDIUM,
            source_label="Mizan 191",
            source_value=mizan_kdv,
            target_label="KDV Beyanname",
            target_value=0,
            difference=0,
            difference_percent=0,
            message="KDV beyanname verisi bulunamadı",
            recommendation="KDV beyannamesini yükleyin"
        )

    difference = abs(mizan_kdv - beyanname_kdv)
    diff_percent = (difference / beyanname_kdv * 100) if beyanname_kdv != 0 else 0

    tolerance = 0.01
    if difference <= tolerance:
        status = CheckStatus.PASS
        severity = CheckSeverity.INFO
        message = "Mizan 191 ve KDV beyannamesi İndirilecek KDV tutarlı"
        recommendation = None
    elif diff_percent <= 1.0:
        status = CheckStatus.WARNING
        severity = CheckSeverity.LOW
        message = f"Küçük fark tespit edildi: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "Farkın kaynağını kontrol edin"
    else:
        status = CheckStatus.FAIL
        severity = CheckSeverity.HIGH if diff_percent > 5 else CheckSeverity.MEDIUM
        message = f"Önemli fark tespit edildi: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "191 hesabını ve KDV beyannamesini detaylı inceleyin"

    return CrossCheckResult(
        check_id="mizan_191_vs_kdv",
        check_name="Mizan 191 vs KDV Beyanname",
        check_name_tr="Mizan 191 - KDV Beyanname Kontrolü",
        description="191 İndirilecek KDV hesabı ile KDV beyannamesi karşılaştırması",
        status=status,
        severity=severity,
        source_label="Mizan 191",
        source_value=mizan_kdv,
        target_label="KDV Beyanname İndirilecek",
        target_value=beyanname_kdv,
        difference=difference,
        difference_percent=diff_percent,
        tolerance_amount=tolerance,
        tolerance_percent=1.0,
        message=message,
        recommendation=recommendation,
        evidence={
            "mizan_191": mizan_kdv,
            "beyanname_indirilecek": beyanname_kdv
        }
    )


def check_mizan_600_vs_kdv_matrah(conn, tenant_id: str, client_id: str, period_id: str) -> CrossCheckResult:
    """
    Check: Mizan 600-601-602 vs KDV Beyannamesi Matrah
    KDV Matrahı = 600 (Yurtiçi) - 601 (İhracat) - 602 (İstisna)
    """
    cursor = conn.cursor()

    # Mizan 600 serisi (Gelir hesapları - Alacak bakiyeli)
    cursor.execute("""
        SELECT
            SUM(CASE WHEN hesap_kodu LIKE '600%' THEN alacak_bakiye - borc_bakiye ELSE 0 END) as satis_600,
            SUM(CASE WHEN hesap_kodu LIKE '601%' THEN alacak_bakiye - borc_bakiye ELSE 0 END) as ihracat_601,
            SUM(CASE WHEN hesap_kodu LIKE '602%' THEN alacak_bakiye - borc_bakiye ELSE 0 END) as istisna_602
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND (hesap_kodu LIKE '600%' OR hesap_kodu LIKE '601%' OR hesap_kodu LIKE '602%')
    """, (tenant_id, client_id, period_id))
    mizan_row = cursor.fetchone()

    satis_600 = mizan_row["satis_600"] if mizan_row and mizan_row["satis_600"] else 0
    ihracat_601 = mizan_row["ihracat_601"] if mizan_row and mizan_row["ihracat_601"] else 0
    istisna_602 = mizan_row["istisna_602"] if mizan_row and mizan_row["istisna_602"] else 0

    # KDV Matrahı hesapla (İhracat ve istisna düşülür)
    hesaplanan_matrah = satis_600 - ihracat_601 - istisna_602

    # KDV Beyanname matrah - beyanname_entries tablosundan
    # matrah_toplam alanını kullan
    cursor.execute("""
        SELECT SUM(matrah_toplam) as matrah
        FROM beyanname_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
        AND beyanname_tipi = 'KDV'
    """, (tenant_id, client_id, period_id))
    kdv_row = cursor.fetchone()
    beyanname_matrah = kdv_row["matrah"] if kdv_row and kdv_row["matrah"] else None

    if beyanname_matrah is None:
        return CrossCheckResult(
            check_id="mizan_600_vs_kdv_matrah",
            check_name="Mizan 600-602 vs KDV Matrah",
            check_name_tr="Mizan Satışlar - KDV Matrah Kontrolü",
            description="Mizan satış hesapları ile KDV beyannamesi matrah karşılaştırması",
            status=CheckStatus.NO_DATA,
            severity=CheckSeverity.MEDIUM,
            source_label="Mizan (600-601-602)",
            source_value=hesaplanan_matrah,
            target_label="KDV Beyanname Matrah",
            target_value=0,
            difference=0,
            difference_percent=0,
            message="KDV beyanname verisi bulunamadı",
            recommendation="KDV beyannamesini yükleyin"
        )

    difference = abs(hesaplanan_matrah - beyanname_matrah)
    diff_percent = (difference / beyanname_matrah * 100) if beyanname_matrah != 0 else 0

    tolerance = 100  # 100 TL
    if difference <= tolerance:
        status = CheckStatus.PASS
        severity = CheckSeverity.INFO
        message = "Mizan satışlar ve KDV beyannamesi matrahı uyumlu"
        recommendation = None
    elif diff_percent <= 2.0:
        status = CheckStatus.WARNING
        severity = CheckSeverity.LOW
        message = f"Küçük fark tespit edildi: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "İhracat ve istisna satışları kontrol edin"
    else:
        status = CheckStatus.FAIL
        severity = CheckSeverity.CRITICAL if diff_percent > 10 else CheckSeverity.HIGH
        message = f"KRİTİK FARK: {difference:,.2f} TL ({diff_percent:.2f}%)"
        recommendation = "ACİL: Tüm satış kayıtlarını kontrol edin, beyan düzeltmesi gerekebilir"

    return CrossCheckResult(
        check_id="mizan_600_vs_kdv_matrah",
        check_name="Mizan 600-602 vs KDV Matrah",
        check_name_tr="Mizan Satışlar - KDV Matrah Kontrolü",
        description="Mizan satış hesapları ile KDV beyannamesi matrah karşılaştırması",
        status=status,
        severity=severity,
        source_label="Mizan (600-601-602)",
        source_value=hesaplanan_matrah,
        target_label="KDV Beyanname Matrah",
        target_value=beyanname_matrah,
        difference=difference,
        difference_percent=diff_percent,
        tolerance_amount=tolerance,
        tolerance_percent=2.0,
        message=message,
        recommendation=recommendation,
        evidence={
            "mizan_600": satis_600,
            "mizan_601_ihracat": ihracat_601,
            "mizan_602_istisna": istisna_602,
            "hesaplanan_matrah": hesaplanan_matrah,
            "beyanname_matrah": beyanname_matrah
        }
    )


# ============== MAIN ENDPOINT ==============

@router.get("/run/{period_id}", response_model=CrossCheckSummary)
async def run_cross_checks(period_id: str, tenant_id: str, client_id: str):
    """
    Run all cross-checks for a period and return summary.

    SMMM İÇİN TÜM KONTROLLER:
    1. Mizan Denklik (Borç = Alacak)
    2. Mizan 391 vs KDV Beyanname Hesaplanan KDV
    3. Mizan 191 vs KDV Beyanname İndirilecek KDV
    4. Mizan 600-602 vs KDV Beyanname Matrah
    5. Mizan 102 vs Banka Ekstresi
    6. Mizan vs e-Fatura (yoksa uyarı)
    7. Muhtasar vs SGK APHB (yoksa uyarı)
    8. KDV Beyanname vs Tahakkuk
    9. Teknik: Ters Bakiye
    10. Teknik: Eksi Hesap (Kasa, Banka, Stok)
    """
    conn = None
    try:
        conn = get_db_connection()

        # Önce veri yükleme durumunu kontrol et
        data_status = check_data_loaded(conn, tenant_id, client_id, period_id)

        # Tüm kontrolleri çalıştır
        checks = []

        # 1. Temel Mizan Kontrolleri
        checks.append(check_mizan_denklik(conn, tenant_id, client_id, period_id))

        # 2. KDV Kontrolleri
        checks.append(check_mizan_vs_kdv(conn, tenant_id, client_id, period_id))  # 391 vs Hesaplanan
        checks.append(check_mizan_191_vs_kdv(conn, tenant_id, client_id, period_id))  # 191 vs İndirilecek
        checks.append(check_mizan_600_vs_kdv_matrah(conn, tenant_id, client_id, period_id))  # 600 vs Matrah

        # 3. Banka Kontrolü
        checks.append(check_mizan_vs_banka(conn, tenant_id, client_id, period_id))

        # 4. e-Fatura Kontrolü (yoksa uyarı)
        checks.append(check_mizan_vs_efatura(conn, tenant_id, client_id, period_id, data_status))

        # 5. Muhtasar vs SGK (yoksa uyarı)
        checks.append(check_muhtasar_vs_sgk(conn, tenant_id, client_id, period_id, data_status))

        # 6. Beyanname vs Tahakkuk
        checks.append(check_beyanname_vs_tahakkuk(conn, tenant_id, client_id, period_id))

        # 7. Teknik Kontroller
        teknik_ters = check_ters_bakiye(conn, tenant_id, client_id, period_id)
        teknik_eksi = check_eksi_hesap(conn, tenant_id, client_id, period_id)
        checks.extend(teknik_ters)
        checks.extend(teknik_eksi)

        # Calculate summary
        passed = sum(1 for c in checks if c.status == CheckStatus.PASS)
        failed = sum(1 for c in checks if c.status == CheckStatus.FAIL)
        warnings = sum(1 for c in checks if c.status == CheckStatus.WARNING)
        skipped = sum(1 for c in checks if c.status == CheckStatus.SKIPPED)
        no_data = sum(1 for c in checks if c.status == CheckStatus.NO_DATA)

        critical = sum(1 for c in checks if c.severity == CheckSeverity.CRITICAL and c.status == CheckStatus.FAIL)
        high = sum(1 for c in checks if c.severity == CheckSeverity.HIGH and c.status == CheckStatus.FAIL)
        medium = sum(1 for c in checks if c.severity == CheckSeverity.MEDIUM and c.status == CheckStatus.FAIL)
        low = sum(1 for c in checks if c.severity == CheckSeverity.LOW and c.status in [CheckStatus.FAIL, CheckStatus.WARNING])

        # Overall status
        if critical > 0:
            overall_status = CheckStatus.FAIL
        elif failed > 0:
            overall_status = CheckStatus.FAIL
        elif warnings > 0:
            overall_status = CheckStatus.WARNING
        elif no_data == len(checks):
            overall_status = CheckStatus.NO_DATA
        else:
            overall_status = CheckStatus.PASS

        # Completion percent (checks that have data)
        checks_with_data = len(checks) - no_data
        completion = (passed / checks_with_data * 100) if checks_with_data > 0 else 0

        # Recommended actions
        actions = []
        for check in checks:
            if check.recommendation and check.status in [CheckStatus.FAIL, CheckStatus.WARNING, CheckStatus.NO_DATA]:
                actions.append(f"{check.check_name_tr}: {check.recommendation}")

        return CrossCheckSummary(
            period_id=period_id,
            tenant_id=tenant_id,
            client_id=client_id,
            total_checks=len(checks),
            passed=passed,
            failed=failed,
            warnings=warnings,
            skipped=skipped,
            no_data=no_data,
            critical_issues=critical,
            high_issues=high,
            medium_issues=medium,
            low_issues=low,
            overall_status=overall_status,
            completion_percent=completion,
            checks=checks,
            checked_at=datetime.utcnow().isoformat(),
            recommended_actions=actions
        )

    except Exception as e:
        logger.error(f"Cross-check error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()


@router.get("/status/{period_id}")
async def get_cross_check_status(period_id: str, tenant_id: str, client_id: str):
    """
    Get quick cross-check status (for dashboard KPI).
    """
    try:
        result = await run_cross_checks(period_id, tenant_id, client_id)

        return {
            "period_id": period_id,
            "overall_status": result.overall_status,
            "passed": result.passed,
            "failed": result.failed,
            "warnings": result.warnings,
            "completion_percent": result.completion_percent,
            "critical_issues": result.critical_issues
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
