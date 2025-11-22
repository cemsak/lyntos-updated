# Placeholder risk model definition
from pydantic import BaseModel
from typing import Optional

class RiskRequest(BaseModel):
    company_id: str
    nace_code: Optional[str] = None
    turnover: Optional[float] = None
    cash_flow_volatility: Optional[float] = None

class RiskResponse(BaseModel):
    score: int
    level: str
