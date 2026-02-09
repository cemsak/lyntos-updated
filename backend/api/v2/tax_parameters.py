"""
LYNTOS Tax Parameters API
=========================
/api/v2/tax-parameters/* endpoints
Pratik Bilgiler vergi parametreleri, beyan tarihleri ve hesap makineleri.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
import logging

from services.tax_parameter_service import TaxParameterService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tax-parameters", tags=["TaxParameters"])

service = TaxParameterService()


# ═══════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════

class GecikmeHesapRequest(BaseModel):
    ana_para: float = Field(..., gt=0, description="Ana para tutarı")
    baslangic_tarihi: str = Field(..., description="Vade tarihi (YYYY-MM-DD)")
    bitis_tarihi: str = Field(..., description="Ödeme tarihi (YYYY-MM-DD)")

class KidemTazminatiRequest(BaseModel):
    brut_ucret: float = Field(..., gt=0, description="Aylık brüt ücret")
    ise_giris: str = Field(..., description="İşe giriş tarihi (YYYY-MM-DD)")
    cikis_tarihi: str = Field(..., description="İşten çıkış tarihi (YYYY-MM-DD)")

class IhbarTazminatiRequest(BaseModel):
    brut_ucret: float = Field(..., gt=0, description="Aylık brüt ücret")
    ise_giris: str = Field(..., description="İşe giriş tarihi (YYYY-MM-DD)")
    cikis_tarihi: str = Field(..., description="İşten çıkış tarihi (YYYY-MM-DD)")

class DamgaVergisiRequest(BaseModel):
    tutar: float = Field(..., gt=0, description="Belge tutarı")
    belge_tipi: str = Field(default="sozlesme", description="Belge tipi")

class GelirVergisiRequest(BaseModel):
    yillik_gelir: float = Field(..., gt=0, description="Yıllık brüt gelir")

class BordroRequest(BaseModel):
    brut_ucret: float = Field(..., gt=0, description="Aylık brüt ücret")


# ═══════════════════════════════════════════════════════════
# PARAMETRE SORGULARI
# ═══════════════════════════════════════════════════════════

@router.get("/by-category/{category}")
async def get_by_category(category: str, effective_date: Optional[str] = None):
    """Kategori bazlı parametreleri getir"""
    try:
        data = service.get_by_category(category, effective_date)
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"get_by_category error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/effective")
async def get_effective(ref_date: Optional[str] = None):
    """Bugün geçerli tüm parametreleri getir"""
    try:
        data = service.get_all_effective(ref_date)
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"get_effective error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-key/{param_key}")
async def get_by_key(param_key: str, ref_date: Optional[str] = None):
    """Belirli bir parametre key'i için geçerli değeri getir"""
    try:
        data = service.get_effective(param_key, ref_date)
        if not data:
            raise HTTPException(status_code=404, detail=f"Parametre bulunamadı: {param_key}")
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_by_key error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{param_key}")
async def get_history(param_key: str):
    """Parametre tarihçesini getir"""
    try:
        data = service.get_history(param_key)
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"get_history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════
# DEADLINE SORGULARI
# ═══════════════════════════════════════════════════════════

@router.get("/deadlines/upcoming")
async def get_upcoming_deadlines(limit: int = Query(default=10, ge=1, le=50)):
    """Yaklaşan beyan tarihlerini getir"""
    try:
        data = service.get_upcoming_deadlines(limit)
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"get_upcoming_deadlines error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deadlines")
async def get_deadlines(
    year: int = Query(..., ge=2020, le=2030),
    month: Optional[int] = Query(default=None, ge=1, le=12)
):
    """Ay/yıl bazlı beyan takvimi"""
    try:
        if month:
            data = service.get_deadlines_by_month(year, month)
        else:
            # Tüm yıl
            all_data = []
            for m in range(1, 13):
                all_data.extend(service.get_deadlines_by_month(year, m))
            data = all_data
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"get_deadlines error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════
# HESAP MAKİNELERİ
# ═══════════════════════════════════════════════════════════

@router.post("/calculate/gecikme-faizi")
async def calculate_gecikme(req: GecikmeHesapRequest):
    """Tarih aralıklı gecikme faizi hesaplama (6183 SK Md. 51, VUK Md. 112)"""
    try:
        result = service.calculate_gecikme_faizi(req.ana_para, req.baslangic_tarihi, req.bitis_tarihi)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"calculate_gecikme error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate/kidem-tazminati")
async def calculate_kidem(req: KidemTazminatiRequest):
    """Kıdem tazminatı hesaplama (1475 SK Md. 14)"""
    try:
        result = service.calculate_kidem_tazminati(req.brut_ucret, req.ise_giris, req.cikis_tarihi)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"calculate_kidem error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate/ihbar-tazminati")
async def calculate_ihbar(req: IhbarTazminatiRequest):
    """İhbar tazminatı hesaplama (4857 SK Md. 17)"""
    try:
        result = service.calculate_ihbar_tazminati(req.brut_ucret, req.ise_giris, req.cikis_tarihi)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"calculate_ihbar error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate/damga-vergisi")
async def calculate_damga(req: DamgaVergisiRequest):
    """Damga vergisi hesaplama (488 SK)"""
    try:
        result = service.calculate_damga_vergisi(req.tutar, req.belge_tipi)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"calculate_damga error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate/gelir-vergisi")
async def calculate_gelir_vergisi(req: GelirVergisiRequest):
    """Gelir vergisi hesaplama - dilimli kümülatif (GVK Md. 103)"""
    try:
        result = service.calculate_gelir_vergisi(req.yillik_gelir)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"calculate_gelir_vergisi error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calculate/bordro")
async def calculate_bordro(req: BordroRequest):
    """Bordro hesaplama - SGK + Vergi + Net (5510 SK, GVK, DVK)"""
    try:
        result = service.calculate_bordro(req.brut_ucret)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"calculate_bordro error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
