"""
VERGUS Tax Strategist API
IS-2 - LYNTOS V2

Endpoints:
POST /api/v1/vergus/analyze - Analyze client for tax optimization opportunities
GET  /api/v1/vergus/analyze - Mizan bazli otomatik analiz (GET versiyonu)
GET  /api/v1/vergus/strategies - Get all available strategies
GET  /api/v1/vergus/strategies/{strategy_id} - Get specific strategy details
GET  /api/v1/vergus/tax-rates - Get current tax rates
GET  /api/v1/vergus/asgari-kv - Get minimum corporate tax info
GET  /api/v1/vergus/quick-check/{client_id} - Quick check (top 3)
"""

from fastapi import APIRouter, HTTPException, Query, Header
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import sqlite3
from pathlib import Path
from dataclasses import asdict

from services.tax_strategist import get_tax_strategist

router = APIRouter(prefix="/vergus", tags=["vergus"])

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


class FinancialDataInput(BaseModel):
    """Input model for financial data"""
    toplam_hasilat: float = 0
    ihracat_hasilat: float = 0
    kv_matrahi: float = 0
    hesaplanan_kv: float = 0
    personel_sayisi: int = 0
    arge_personel: int = 0
    ortalama_maas: float = 22104  # Default to minimum wage
    sektor: str = ""
    uretim_faaliyeti: bool = False
    sanayi_sicil: bool = False
    teknokent: bool = False
    teknokent_kazanc: float = 0
    arge_merkezi: bool = False
    yatirim_plani: bool = False
    istirak_temettu: float = 0
    yurt_disi_hizmet: float = 0


class AnalyzeRequest(BaseModel):
    """Request model for tax analysis"""
    client_id: str
    period: str = "2025-Q1"
    financial_data: Optional[FinancialDataInput] = None
    nace_code: Optional[str] = None


def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def get_client_info(client_id: str) -> Optional[Dict]:
    """Get client info from database"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, tax_id, nace_code, sector
            FROM clients
            WHERE id = ?
        """, (client_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


@router.post("/analyze")
async def analyze_tax_opportunities(
    request: AnalyzeRequest,
    authorization: str = Header(None)
):
    """
    Analyze client financial data and identify tax optimization opportunities.
    Mizan'dan otomatik mali profil cikarimi + NACE bazli strateji filtreleme.
    """
    # Get client info
    client_info = get_client_info(request.client_id)
    if not client_info:
        raise HTTPException(status_code=404, detail="Musteri bulunamadi")

    strategist = get_tax_strategist()

    # NACE kodu: request > client DB
    nace_code = request.nace_code or client_info.get("nace_code", "")

    # Mali veri kaynagi: manuel gonderilmisse onu kullan, yoksa mizan'dan cikar
    if request.financial_data:
        financial_data = request.financial_data.dict()
        financial_data["veri_kaynagi"] = "manuel"
    else:
        # Mizan bazli otomatik cikarim
        financial_data = strategist.auto_extract_financial_data(
            request.client_id, request.period
        )

    # Run analysis with NACE code
    result = strategist.analyze(
        client_id=request.client_id,
        client_name=client_info.get("name", request.client_id),
        period=request.period,
        financial_data=financial_data,
        nace_code=nace_code
    )

    # Convert dataclass to dict for JSON serialization
    opportunities = []
    for opp in result.opportunities:
        opportunities.append({
            "strategy_id": opp.strategy_id,
            "strategy_name": opp.strategy_name,
            "category": opp.category,
            "priority": opp.priority,
            "difficulty": opp.difficulty,
            "legal_basis": opp.legal_basis,
            "description": opp.description,
            "potential_saving": opp.potential_saving,
            "calculation_details": opp.calculation_details,
            "conditions": opp.conditions,
            "actions": opp.actions,
            "risk_level": opp.risk_level,
            "warnings": opp.warnings,
            "status_2025": opp.status_2025
        })

    return {
        "client_id": result.client_id,
        "client_name": result.client_name,
        "period": result.period,
        "nace_code": nace_code,
        "profile": result.profile,
        "opportunities": opportunities,
        "total_potential_saving": result.total_potential_saving,
        "summary": result.summary
    }


@router.get("/analyze")
async def analyze_tax_opportunities_get(
    client_id: str = Query(..., description="Client ID"),
    period: str = Query("2025-Q1", description="Period (e.g. 2025-Q1)"),
    nace_code: Optional[str] = Query(None, description="NACE kodu (opsiyonel)"),
    authorization: str = Header(None)
):
    """
    GET versiyonu: Mizan'dan otomatik mali profil cikarimi ile vergi analizi.
    Manuel veri gondermeye gerek yok - mizan verisi otomatik kullanilir.
    """
    client_info = get_client_info(client_id)
    if not client_info:
        raise HTTPException(status_code=404, detail="Musteri bulunamadi")

    strategist = get_tax_strategist()
    nace = nace_code or client_info.get("nace_code", "")

    # Mizan'dan otomatik cikarim
    financial_data = strategist.auto_extract_financial_data(client_id, period)

    result = strategist.analyze(
        client_id=client_id,
        client_name=client_info.get("name", client_id),
        period=period,
        financial_data=financial_data,
        nace_code=nace
    )

    opportunities = []
    for opp in result.opportunities:
        opportunities.append({
            "strategy_id": opp.strategy_id,
            "strategy_name": opp.strategy_name,
            "category": opp.category,
            "priority": opp.priority,
            "difficulty": opp.difficulty,
            "legal_basis": opp.legal_basis,
            "description": opp.description,
            "potential_saving": opp.potential_saving,
            "calculation_details": opp.calculation_details,
            "conditions": opp.conditions,
            "actions": opp.actions,
            "risk_level": opp.risk_level,
            "warnings": opp.warnings,
            "status_2025": opp.status_2025
        })

    return {
        "client_id": result.client_id,
        "client_name": result.client_name,
        "period": result.period,
        "nace_code": nace,
        "profile": result.profile,
        "opportunities": opportunities,
        "total_potential_saving": result.total_potential_saving,
        "summary": result.summary
    }


@router.get("/strategies")
async def get_all_strategies(
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    authorization: str = Header(None)
):
    """
    Get all available tax optimization strategies

    Query params:
        category: Filter by category (KURUMLAR_VERGISI, AR_GE, SGK, etc.)
        priority: Filter by priority (high, medium, low)
        difficulty: Filter by difficulty (low, medium, high)
    """
    strategist = get_tax_strategist()
    strategies = strategist.get_all_strategies()

    # Apply filters
    if category:
        strategies = [s for s in strategies if s.get("category") == category]
    if priority:
        strategies = [s for s in strategies if s.get("priority") == priority]
    if difficulty:
        strategies = [s for s in strategies if s.get("difficulty") == difficulty]

    return {
        "total": len(strategies),
        "strategies": strategies
    }


@router.get("/strategies/{strategy_id}")
async def get_strategy_detail(
    strategy_id: str,
    authorization: str = Header(None)
):
    """Get details of a specific strategy"""
    strategist = get_tax_strategist()
    strategy = strategist.get_strategy_by_id(strategy_id)

    if not strategy:
        raise HTTPException(status_code=404, detail="Strateji bulunamadi")

    return strategy


@router.get("/tax-rates")
async def get_tax_rates(authorization: str = Header(None)):
    """Get current tax rates for 2025"""
    strategist = get_tax_strategist()
    return strategist.get_tax_rates()


@router.get("/asgari-kv")
async def get_asgari_kv_info(authorization: str = Header(None)):
    """Get minimum corporate tax (Asgari KV) information for 2025"""
    strategist = get_tax_strategist()
    return strategist.get_asgari_kv_info()


@router.get("/categories")
async def get_strategy_categories(authorization: str = Header(None)):
    """Get all strategy categories"""
    strategist = get_tax_strategist()
    strategies = strategist.get_all_strategies()

    categories = {}
    for strategy in strategies:
        cat = strategy.get("category", "DIGER")
        if cat not in categories:
            categories[cat] = {
                "code": cat,
                "count": 0,
                "strategies": []
            }
        categories[cat]["count"] += 1
        categories[cat]["strategies"].append(strategy.get("id"))

    return {
        "categories": list(categories.values())
    }


@router.get("/quick-check/{client_id}")
async def quick_tax_check(
    client_id: str,
    period: str = Query("2025-Q1", description="Tax period"),
    authorization: str = Header(None)
):
    """
    Quick tax optimization check for a client.
    Returns top 3 opportunities. Mizan'dan otomatik cikarim.
    """
    client_info = get_client_info(client_id)
    if not client_info:
        raise HTTPException(status_code=404, detail="Musteri bulunamadi")

    strategist = get_tax_strategist()
    nace_code = client_info.get("nace_code", "")

    # Mizan'dan otomatik cikarim
    financial_data = strategist.auto_extract_financial_data(client_id, period)

    result = strategist.analyze(
        client_id=client_id,
        client_name=client_info.get("name", client_id),
        period=period,
        financial_data=financial_data,
        nace_code=nace_code
    )

    top_opportunities = []
    for opp in result.opportunities[:3]:
        top_opportunities.append({
            "strategy_id": opp.strategy_id,
            "strategy_name": opp.strategy_name,
            "priority": opp.priority,
            "potential_saving": opp.potential_saving,
            "legal_basis": opp.legal_basis
        })

    return {
        "client_id": client_id,
        "client_name": client_info.get("name", client_id),
        "period": period,
        "nace_code": nace_code,
        "quick_summary": {
            "toplam_firsat": len(result.opportunities),
            "toplam_potansiyel_tasarruf": result.total_potential_saving,
            "kv_orani": result.summary.get("kv_orani", 0.25),
            "asgari_kv_kontrolu": result.summary.get("asgari_kv_kontrolu", {}),
            "veri_kaynagi": result.summary.get("veri_kaynagi", "bilinmiyor"),
            "top_opportunities": top_opportunities
        }
    }
