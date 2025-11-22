from fastapi import APIRouter
from ...kurgan_core.risk_model import RiskRequest, RiskResponse
from ...kurgan_core.analyzer import compute_risk

router = APIRouter()

@router.post("/risk", response_model=RiskResponse)
def kurgan_risk(req: RiskRequest):
    result = compute_risk(req.model_dump())
    return RiskResponse(score=result["score"], level=result["level"])
