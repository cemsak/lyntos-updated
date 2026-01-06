"""
LYNTOS VDK Validation API Endpoint
POST /api/v2/validate/vdk

Sprint 5.3: Upload -> VDK Validation Integration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

# Import VDK engine
import sys
from pathlib import Path

# Add parent to path for imports
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from risk_model.vdk_kurgan_engine import get_vdk_engine

router = APIRouter(prefix="/api/v2/validate", tags=["VDK Validation"])


class TaxpayerDataRequest(BaseModel):
    """Request body matching frontend TaxpayerData interface"""
    vkn: str = "UNKNOWN"
    period: str = "UNKNOWN"

    # Mizan-derived data
    kasa_bakiye: float = 0
    banka_bilanco: float = 0
    alicilar: float = 0
    ortaklardan_alacak: float = 0
    stoklar: float = 0
    devreden_kdv: float = 0
    indirilecek_kdv: float = 0
    saticilar: float = 0
    ortaklara_borc: float = 0
    sermaye: float = 0
    gecmis_yil_karlari: float = 0
    gecmis_yil_zararlari: float = 0

    # Income statement
    net_satislar: float = 0
    satilan_mal_maliyeti: float = 0
    faaliyet_giderleri: float = 0

    # Calculated fields
    aktif_toplam: float = 0
    pasif_toplam: float = 0
    ozsermaye: float = 0
    brut_kar: float = 0
    brut_kar_marji: float = 0
    cari_oran: float = 0

    # External data (optional)
    banka_fiili: Optional[float] = None
    ba_toplam: Optional[float] = None
    bs_toplam: Optional[float] = None
    gelir_beyan: Optional[float] = None
    sektor_kar_marji_avg: Optional[float] = None

    # History flags
    vtr_tespiti_var: bool = False
    iliskili_kisi_var: bool = False
    sbk_raporu_var: bool = False
    ardisik_zarar_yili: int = 0
    gecmis_inceleme_sayisi: int = 0
    gecmis_ceza_sayisi: int = 0


class VdkCriterionResponse(BaseModel):
    """Single criterion result"""
    id: str
    code: str
    name_tr: str
    status: str
    severity: str
    score: float
    detail_tr: str
    recommendation_tr: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    legal_refs: Optional[List[str]] = None


class VdkAssessmentResponse(BaseModel):
    """Complete VDK assessment response"""
    vkn: str
    period: str
    assessed_at: str
    criteria: List[VdkCriterionResponse]
    total_score: float
    max_score: float
    risk_level: str
    summary_tr: str


@router.post("/vdk", response_model=VdkAssessmentResponse)
async def validate_vdk(data: TaxpayerDataRequest) -> VdkAssessmentResponse:
    """
    Validate taxpayer data against VDK KURGAN + RAM criteria (25 rules)

    Returns comprehensive risk assessment with:
    - 13 KURGAN criteria (HMB Sahte Belge)
    - 12 RAM criteria (VDK Risk Analizi Modeli)
    """
    try:
        # Get VDK engine singleton
        engine = get_vdk_engine()

        # Map frontend request to backend format
        backend_data = {
            # Mizan data
            'kasa_bakiye': data.kasa_bakiye,
            'aktif_toplam': data.aktif_toplam,
            'ortaklardan_alacak': data.ortaklardan_alacak,
            'ortaklara_borc': data.ortaklara_borc,
            'ozsermaye': data.ozsermaye,
            'banka_bilanco': data.banka_bilanco,
            'banka_fiili': data.banka_fiili if data.banka_fiili is not None else data.banka_bilanco,

            # Income statement
            'net_satislar': data.net_satislar,
            'faaliyet_giderleri': data.faaliyet_giderleri,
            'brut_kar_marji': data.brut_kar_marji,
            'gelir_beyan': data.gelir_beyan if data.gelir_beyan is not None else data.net_satislar,

            # KDV
            'devreden_kdv': data.devreden_kdv,

            # Ba-Bs
            'ba_toplam': data.ba_toplam if data.ba_toplam is not None else 0,
            'bs_toplam': data.bs_toplam if data.bs_toplam is not None else 0,

            # Ratios
            'cari_oran': data.cari_oran,

            # Sector comparison
            'sektor_kar_marji_avg': data.sektor_kar_marji_avg if data.sektor_kar_marji_avg is not None else 0.15,

            # Flags
            'vtr_tespiti_var': data.vtr_tespiti_var,
            'iliskili_kisi_var': data.iliskili_kisi_var,
            'sbk_raporu_var': data.sbk_raporu_var,
            'ardisik_zarar_yili': data.ardisik_zarar_yili,
            'gecmis_inceleme_sayisi': data.gecmis_inceleme_sayisi,
            'gecmis_ceza_sayisi': data.gecmis_ceza_sayisi,

            # External data (defaults)
            'sahte_belge_duzenleyici_sayisi': 0,
        }

        # Run VDK evaluation
        assessment = engine.evaluate_all(backend_data, vkn=data.vkn, period=data.period)

        # Convert to response format
        result = engine.to_dict(assessment)

        return VdkAssessmentResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"VDK validation failed: {str(e)}"
        )


@router.get("/vdk/health")
async def vdk_health():
    """Health check for VDK validation endpoint"""
    try:
        engine = get_vdk_engine()
        return {
            "status": "ok",
            "rules_loaded": len(engine.rules),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
