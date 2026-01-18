"""
LYNTOS API v2 - Cross-Check (Capraz Kontrol) Endpoint
Validates data consistency between different document types.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import sqlite3
import logging

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


# ============== CHECK FUNCTIONS ==============

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

    # Get KDV beyanname value
    cursor.execute("""
        SELECT hesaplanan_kdv
        FROM kdv_beyanname_data
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
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

    # Get beyanname odenecek KDV
    cursor.execute("""
        SELECT odenecek_kdv
        FROM kdv_beyanname_data
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (tenant_id, client_id, period_id))

    beyan_row = cursor.fetchone()
    beyan_kdv = beyan_row["odenecek_kdv"] if beyan_row and beyan_row["odenecek_kdv"] else None

    # Get tahakkuk tutari
    cursor.execute("""
        SELECT tahakkuk_tutari
        FROM tahakkuk_data
        WHERE tenant_id = ? AND client_id = ? AND period_id = ? AND vergi_turu = 'KDV'
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


# ============== MAIN ENDPOINT ==============

@router.get("/run/{period_id}", response_model=CrossCheckSummary)
async def run_cross_checks(period_id: str, tenant_id: str, client_id: str):
    """
    Run all cross-checks for a period and return summary.
    """
    conn = None
    try:
        conn = get_db_connection()

        # Run all checks
        checks = [
            check_mizan_denklik(conn, tenant_id, client_id, period_id),
            check_mizan_vs_kdv(conn, tenant_id, client_id, period_id),
            check_mizan_vs_banka(conn, tenant_id, client_id, period_id),
            check_beyanname_vs_tahakkuk(conn, tenant_id, client_id, period_id),
        ]

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
