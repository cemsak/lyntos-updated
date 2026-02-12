"""
LYNTOS Reports API
==================
/api/v2/reports/* endpoints
Profesyonel PDF rapor üretimi ve yönetimi.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
import logging

from middleware.auth import verify_token, check_client_access
from services.report_generator import ReportGenerator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])

generator = ReportGenerator()


# ═══════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════

class GenerateReportRequest(BaseModel):
    report_type: str = Field(..., description="Rapor tipi (mizan-analiz, vdk-risk, vb.)")
    format: str = Field(default="pdf", description="Çıktı formatı (pdf)")
    client_id: str = Field(..., description="Müşteri ID")
    period: str = Field(..., description="Dönem (2026-Q1 vb.)")
    smmm_id: Optional[str] = Field(default=None, description="Deprecated: token'dan alınır (VT-10)")


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

VALID_REPORT_TYPES = [
    "mizan-analiz", "vdk-risk", "finansal-oran",
    "yeniden-degerleme", "kurumlar-vergi", "kanit-paketi",
]


@router.post("/generate")
async def generate_report(req: GenerateReportRequest, user: dict = Depends(verify_token)):
    """PDF rapor üret"""
    await check_client_access(user, req.client_id)
    smmm_id = user["id"]
    if req.report_type not in VALID_REPORT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz rapor tipi: {req.report_type}. Geçerli tipler: {', '.join(VALID_REPORT_TYPES)}"
        )

    try:
        result = generator.generate(
            report_type=req.report_type,
            client_id=req.client_id,
            period_id=req.period,
            smmm_id=smmm_id,
            report_format=req.format,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Report generation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rapor üretim hatası: {str(e)}")


@router.get("/list")
async def list_reports(
    client_id: Optional[str] = Query(default=None),
    period: Optional[str] = Query(default=None),
    limit: int = Query(100, ge=1, le=500, description="Max rapor sayısı (VT-8)"),
    offset: int = Query(0, ge=0, description="Sayfa offset"),
    user: dict = Depends(verify_token),
):
    """Üretilmiş rapor listesi"""
    try:
        data = generator.list_reports(client_id, period)
        total = len(data)
        paginated = data[offset:offset + limit]
        return {"success": True, "data": paginated, "count": len(paginated), "total": total}
    except Exception as e:
        logger.error(f"list_reports error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{report_id}")
async def download_report(report_id: str, user: dict = Depends(verify_token)):
    """Rapor dosyasını indir"""
    file_path = generator.get_report_path(report_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Rapor dosyası bulunamadı")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=file_path.split("/")[-1],
    )
