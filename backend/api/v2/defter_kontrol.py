# -*- coding: utf-8 -*-
"""
LYNTOS API v2 - Defter Kontrol Endpoints
========================================

Tavsiye Mektubu 2 - Yevmiye-Kebir-Mizan Kontrol Sistemi

Endpoints:
- GET /api/v2/defter-kontrol/full - Tüm kontrolleri çalıştır
- GET /api/v2/defter-kontrol/balance - Sadece denge kontrolleri (C1, C4)
- GET /api/v2/defter-kontrol/reconciliation - Sadece mutabakat kontrolleri (C2, C3)
- GET /api/v2/defter-kontrol/summary - Hızlı özet

Author: Claude
Date: 2026-01-25
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from utils.period_utils import get_period_db
from middleware.auth import verify_token, check_client_access
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from pathlib import Path
import logging

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.cross_check_service import CrossCheckService, CheckSeverity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/defter-kontrol", tags=["defter-kontrol"])

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


def get_cross_check_service() -> CrossCheckService:
    """CrossCheckService factory"""
    return CrossCheckService(DB_PATH)


# =============================================================================
# RESPONSE MODELS
# =============================================================================

class CheckResultModel(BaseModel):
    """Tek kontrol sonucu"""
    check_type: str
    check_name: str
    severity: str
    passed: bool
    message: str
    details: Dict[str, Any]


class AccountComparisonModel(BaseModel):
    """Hesap karşılaştırma detayı"""
    hesap_kodu: str
    hesap_adi: Optional[str]
    source_borc: float
    source_alacak: float
    target_borc: float
    target_alacak: float
    borc_fark: float
    alacak_fark: float
    durum: str


class SummaryModel(BaseModel):
    """Özet bilgiler"""
    total_checks: int
    passed_checks: int
    warning_checks: int
    error_checks: int
    critical_checks: int
    overall_status: str


class FullReportResponse(BaseModel):
    """Tam cross-check raporu"""
    client_id: str
    period_id: str
    generated_at: str
    balance_checks: List[CheckResultModel]
    reconciliation_checks: List[CheckResultModel]
    yevmiye_kebir_details: List[AccountComparisonModel]
    kebir_mizan_details: List[AccountComparisonModel]
    summary: SummaryModel


class QuickSummaryResponse(BaseModel):
    """Hızlı özet response"""
    client_id: str
    period_id: str
    overall_status: str
    checks: List[Dict[str, Any]]
    message: str


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/full", response_model=FullReportResponse)
async def get_full_defter_kontrol(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    TAM DEFTER KONTROL RAPORU

    Tavsiye Mektubu 2 - Yevmiye-Kebir-Mizan Kontrol Algoritması

    Tüm 4 kontrolü çalıştırır:
    - C1: Yevmiye Denge Kontrolü (Borç = Alacak)
    - C2: Yevmiye ↔ Kebir Mutabakatı (hesap bazında)
    - C3: Kebir ↔ Mizan Mutabakatı (hesap bazında)
    - C4: Mizan Denge Kontrolü (Borç = Alacak)

    Hesap bazlı detayları içerir.
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        report = service.run_full_cross_check(client_id, period_id)
        return report.to_dict()

    except Exception as e:
        logger.error(f"Full defter kontrol error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/balance")
async def get_balance_checks(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    DENGE KONTROLLERİ (C1, C4)

    - C1: Yevmiye toplam borç = toplam alacak
    - C4: Mizan toplam borç = toplam alacak

    Bu kontroller defterlerin kendi içinde tutarlılığını kontrol eder.
    Çift taraflı kayıt sistemi (double-entry) gereği borç ve alacak eşit olmalıdır.
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        results = service.run_balance_checks(client_id, period_id)

        return {
            "client_id": client_id,
            "period_id": period_id,
            "check_type": "balance",
            "checks": [r.to_dict() for r in results],
            "all_passed": all(r.passed for r in results)
        }

    except Exception as e:
        logger.error(f"Balance check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reconciliation")
async def get_reconciliation_checks(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    include_details: bool = Query(False, description="Hesap detaylarını dahil et"),
    user: dict = Depends(verify_token)
):
    """
    MUTABAKAT KONTROLLERİ (C2, C3)

    - C2: Yevmiye hesap toplamları = Kebir hesap toplamları
    - C3: Kebir hesap toplamları = Mizan hesap toplamları

    Bu kontroller defterler arası tutarlılığı kontrol eder.

    include_details=true ile hesap bazında karşılaştırma detayları alınabilir.

    NOT: Karşılaştırma NET BAKİYE üzerinden değil, BORÇ ve ALACAK TOPLAMLARI
    üzerinden ayrı ayrı yapılır (Tavsiye Mektubu 2 prensibi).
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        conn = service._get_connection()

        # C2: Yevmiye ↔ Kebir
        c2_result, c2_comparisons = service.check_c2_yevmiye_kebir(conn, client_id, period_id)

        # C3: Kebir ↔ Mizan
        c3_result, c3_comparisons = service.check_c3_kebir_mizan(conn, client_id, period_id)

        conn.close()

        response = {
            "client_id": client_id,
            "period_id": period_id,
            "check_type": "reconciliation",
            "checks": [c2_result.to_dict(), c3_result.to_dict()],
            "all_passed": c2_result.passed and c3_result.passed
        }

        if include_details:
            # Sadece farkı olan hesapları döndür
            response["yevmiye_kebir_diffs"] = [
                c.to_dict() for c in c2_comparisons if c.durum != "OK"
            ]
            response["kebir_mizan_diffs"] = [
                c.to_dict() for c in c3_comparisons if c.durum != "OK"
            ]

        return response

    except Exception as e:
        logger.error(f"Reconciliation check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=QuickSummaryResponse)
async def get_quick_summary(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    HIZLI ÖZET

    Tüm kontrollerin kısa özeti. Dashboard için idealdir.
    Detay içermez, sadece pass/fail durumları döner.
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        report = service.run_full_cross_check(client_id, period_id)

        # Basit özet oluştur
        all_checks = report.balance_checks + report.reconciliation_checks
        checks_summary = []

        for check in all_checks:
            status_emoji = {
                "OK": "✅",
                "WARNING": "⚠️",
                "ERROR": "❌",
                "CRITICAL": "🚨"
            }.get(check.severity.value, "❓")

            checks_summary.append({
                "code": check.check_type.value,
                "name": check.check_name,
                "status": check.severity.value,
                "emoji": status_emoji,
                "passed": check.passed,
                "message": check.message
            })

        # Genel mesaj
        if report.overall_status == "PASS":
            message = "Tüm defter kontrolleri başarılı ✓"
        elif report.overall_status == "WARNING":
            message = f"{report.warning_checks} uyarı var, kontrol edilmeli"
        elif report.overall_status == "FAIL":
            message = f"{report.error_checks} hata tespit edildi!"
        else:  # CRITICAL
            message = f"KRİTİK: {report.critical_checks} temel muhasebe kuralı ihlali!"

        return QuickSummaryResponse(
            client_id=client_id,
            period_id=period_id,
            overall_status=report.overall_status,
            checks=checks_summary,
            message=message
        )

    except Exception as e:
        logger.error(f"Quick summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/c1")
async def get_c1_yevmiye_balance(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    C1: YEVMİYE DENGE KONTROLÜ

    Muhasebe Kuralı: Çift taraflı kayıt sistemi gereği,
    her yevmiye fişinde ve toplamda Borç = Alacak olmalıdır.

    Bu kontrol:
    - Toplam borç ve alacak tutarlarını karşılaştırır
    - Dengesiz fişlerin listesini döner

    Dengesiz fiş = Bir fişte borç toplamı ≠ alacak toplamı
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        conn = service._get_connection()
        result, details = service.check_c1_yevmiye_balance(conn, client_id, period_id)
        conn.close()

        return {
            "client_id": client_id,
            "period_id": period_id,
            "check": result.to_dict(),
            "dengesiz_fisler": details.get("dengesiz_fisler", [])
        }

    except Exception as e:
        logger.error(f"C1 check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/c2")
async def get_c2_yevmiye_kebir(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    only_diffs: bool = Query(True, description="Sadece farkı olanları göster"),
    user: dict = Depends(verify_token)
):
    """
    C2: YEVMİYE ↔ KEBİR MUTABAKATI

    Muhasebe Kuralı: Yevmiye defterindeki her hesabın toplam borç/alacak tutarı,
    Kebir defterindeki aynı hesabın toplam borç/alacak tutarına eşit olmalıdır.

    Karşılaştırma:
    - Yevmiye'deki toplam borç = Kebir'deki toplam borç (her hesap için)
    - Yevmiye'deki toplam alacak = Kebir'deki toplam alacak (her hesap için)

    NOT: Net bakiye değil, borç ve alacak AYRI AYRI karşılaştırılır!
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        conn = service._get_connection()
        result, comparisons = service.check_c2_yevmiye_kebir(conn, client_id, period_id)
        conn.close()

        if only_diffs:
            comparisons = [c for c in comparisons if c.durum != "OK"]

        return {
            "client_id": client_id,
            "period_id": period_id,
            "check": result.to_dict(),
            "comparisons": [c.to_dict() for c in comparisons],
            "comparison_count": len(comparisons)
        }

    except Exception as e:
        logger.error(f"C2 check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/c3")
async def get_c3_kebir_mizan(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    only_diffs: bool = Query(True, description="Sadece farkı olanları göster"),
    user: dict = Depends(verify_token)
):
    """
    C3: KEBİR ↔ MİZAN MUTABAKATI

    Muhasebe Kuralı: Kebir defterindeki her hesabın toplam borç/alacak tutarı,
    Mizan'daki aynı hesabın borç/alacak bakiyesine eşit olmalıdır.

    Karşılaştırma:
    - Kebir'deki toplam borç = Mizan'daki borç bakiyesi (her hesap için)
    - Kebir'deki toplam alacak = Mizan'daki alacak bakiyesi (her hesap için)

    NOT: Mizan'da çok seviyeli hesaplar var (ana hesap → alt hesap).
    Sadece YAPRAK HESAPLAR karşılaştırılır (çift sayımı önlemek için).
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        conn = service._get_connection()
        result, comparisons = service.check_c3_kebir_mizan(conn, client_id, period_id)
        conn.close()

        if only_diffs:
            comparisons = [c for c in comparisons if c.durum != "OK"]

        return {
            "client_id": client_id,
            "period_id": period_id,
            "check": result.to_dict(),
            "comparisons": [c.to_dict() for c in comparisons],
            "comparison_count": len(comparisons)
        }

    except Exception as e:
        logger.error(f"C3 check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/c4")
async def get_c4_mizan_balance(
    client_id: str = Query(..., description="Mükellef ID"),
    period_id: str = Depends(get_period_db),
    user: dict = Depends(verify_token)
):
    """
    C4: MİZAN DENGE KONTROLÜ

    Muhasebe Kuralı: Mizan, tüm hesapların dönem sonu bakiyelerini içerir.
    Çift taraflı kayıt sistemi gereği toplam borç ve alacak eşit olmalıdır.

    Toplam: Tüm borç bakiyeleri = Tüm alacak bakiyeleri

    NOT: Sadece YAPRAK HESAPLAR sayılır (çift sayımı önlemek için).
    Ana hesaplar (100, 101 vs.) alt hesaplarının toplamını içerdiğinden
    sadece en alt seviye hesaplar (100.01.001 gibi) toplanır.
    """
    await check_client_access(user, client_id)
    try:
        service = get_cross_check_service()
        conn = service._get_connection()
        result, details = service.check_c4_mizan_balance(conn, client_id, period_id)
        conn.close()

        return {
            "client_id": client_id,
            "period_id": period_id,
            "check": result.to_dict()
        }

    except Exception as e:
        logger.error(f"C4 check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "defter-kontrol-v2", "version": "2.0"}
