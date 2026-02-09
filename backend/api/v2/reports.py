"""
LYNTOS Reports API
==================
/api/v2/reports/* endpoints
Profesyonel PDF rapor üretimi ve yönetimi.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
import logging

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
    smmm_id: Optional[str] = Field(default="", description="SMMM ID")


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

VALID_REPORT_TYPES = [
    "mizan-analiz", "vdk-risk", "finansal-oran",
    "yeniden-degerleme", "kurumlar-vergi", "kanit-paketi",
]


@router.post("/generate")
async def generate_report(req: GenerateReportRequest):
    """PDF rapor üret"""
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
            smmm_id=req.smmm_id or "",
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
):
    """Üretilmiş rapor listesi"""
    try:
        data = generator.list_reports(client_id, period)
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"list_reports error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{report_id}")
async def download_report(report_id: str):
    """Rapor dosyasını indir"""
    file_path = generator.get_report_path(report_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Rapor dosyası bulunamadı")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=file_path.split("/")[-1],
    )
