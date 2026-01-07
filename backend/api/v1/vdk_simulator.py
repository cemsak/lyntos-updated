"""
VDK Simulator API
Sprint 8.0 - LYNTOS V2

POST /api/v1/vdk-simulator/analyze
GET /api/v1/vdk-simulator/rules
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import sqlite3
from pathlib import Path

from services.kurgan_simulator import get_kurgan_simulator

router = APIRouter(prefix="/vdk-simulator", tags=["vdk-simulator"])

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


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
            SELECT id, name, vkn, nace_code, sector
            FROM clients
            WHERE id = ?
        """, (client_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def get_nace_info(nace_code: str) -> Optional[Dict]:
    """Get NACE code info from database"""
    if not nace_code:
        return None

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT code, description_tr, sector_group, risk_profile
            FROM nace_codes
            WHERE code = ?
        """, (nace_code,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None
    finally:
        conn.close()


def get_tax_certificates(client_id: str) -> list:
    """Get tax certificates for trend analysis"""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT year, kv_matrah, kv_paid, nace_code
            FROM tax_certificates
            WHERE client_id = ?
            ORDER BY year DESC
            LIMIT 3
        """, (client_id,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_mizan_data(client_id: str, period: str = None) -> Dict[str, float]:
    """
    Get trial balance data for client

    This is a placeholder that returns demo data.
    In production, this would query the mizan table.
    """
    # For now, return demo data based on client_id
    # In production, query actual mizan data

    demo_data = {
        "OZKAN_KIRTASIYE": {
            "100": 1250000,    # Kasa - yuksek
            "102": 850000,     # Banka
            "120": 450000,     # Alicilar
            "121": 50000,      # Alacak senetleri
            "128": 35000,      # Supheli alacak
            "129": -35000,     # Karsilik
            "131": 3200000,    # Ortaklardan alacak - yuksek
            "150": 280000,     # Stok
            "151": 50000,      # Yarı mamul
            "250": 500000,     # Binalar
            "253": 200000,     # Tesis makina
            "254": 150000,     # Tasitlar
            "257": -400000,    # Birikmis amortisman
            "320": 180000,     # Saticilar
            "331": 50000,      # Ortaklara borclar
            "500": 1000000,    # Sermaye
            "501": 200000,     # Odenmis sermaye
            "600": 5000000,    # Yurtici satislar
            "620": 1800000,    # SMM
            "621": 500000,     # Ticari mal maliyeti
        },
        "DEFAULT": {
            "100": 50000,
            "102": 300000,
            "120": 200000,
            "131": 100000,
            "150": 150000,
            "250": 300000,
            "257": -150000,
            "320": 100000,
            "500": 500000,
            "620": 800000,
        }
    }

    return demo_data.get(client_id, demo_data["DEFAULT"])


@router.post("/analyze")
async def analyze_client(
    client_id: str = Query(..., description="Client ID"),
    period: Optional[str] = Query(None, description="Analysis period (e.g., 2024/Q4)")
):
    """
    Run VDK simulation for a client

    Returns KURGAN analysis with:
    - Triggered alarms
    - Inspector questions
    - Required documents
    """

    # Get client info
    client = get_client_info(client_id)
    if not client:
        # Use client_id as name if not found in DB
        client = {
            "id": client_id,
            "name": client_id.replace("_", " ").title(),
            "vkn": None,
            "nace_code": None,
            "sector": None
        }

    # Get NACE info
    sector_group = None
    nace_code = client.get("nace_code")

    if nace_code:
        nace_info = get_nace_info(nace_code)
        if nace_info:
            sector_group = nace_info.get("sector_group")

    # Get mizan data
    mizan_data = get_mizan_data(client_id, period)

    # Get tax certificates for trend analysis
    tax_certs = get_tax_certificates(client_id)

    # TODO: Get risky suppliers from cross-check module
    risky_suppliers = []

    # Run simulation
    simulator = get_kurgan_simulator()
    result = simulator.simulate(
        client_id=client_id,
        client_name=client.get("name", client_id),
        period=period or "2024/Q4",
        nace_code=nace_code,
        sector_group=sector_group,
        mizan_data=mizan_data,
        tax_certificates=tax_certs,
        risky_suppliers=risky_suppliers
    )

    return {
        "success": True,
        "data": result.to_dict()
    }


@router.get("/rules")
async def get_rules():
    """Get all KURGAN rules for documentation"""

    simulator = get_kurgan_simulator()
    rules_summary = simulator.get_rules_summary()

    return {
        "success": True,
        "data": {
            "rules": rules_summary,
            "total": len(rules_summary)
        }
    }


@router.get("/demo")
async def run_demo():
    """Run demo simulation with sample data"""

    # Demo mizan data with some triggers
    demo_mizan = {
        "100": 1250000,    # Kasa - yuksek (triggers K-09)
        "102": 850000,
        "120": 450000,
        "128": 35000,
        "129": -35000,
        "131": 3200000,    # Ortaklardan alacak - yuksek (triggers K-15)
        "150": 280000,
        "250": 500000,
        "257": -400000,
        "320": 180000,
        "500": 1000000,
        "620": 1800000,
    }

    # Demo tax certificates with decline (triggers TREND-MATRAH)
    demo_certs = [
        {"year": 2024, "kv_matrah": "850000"},
        {"year": 2023, "kv_matrah": "1300000"},
    ]

    simulator = get_kurgan_simulator()
    result = simulator.simulate(
        client_id="DEMO_CLIENT",
        client_name="Demo Mükellef A.Ş.",
        period="2024/Q4",
        nace_code="47.62",
        sector_group="Perakende Ticaret",
        mizan_data=demo_mizan,
        tax_certificates=demo_certs,
        risky_suppliers=[]
    )

    return {
        "success": True,
        "data": result.to_dict(),
        "note": "Bu demo simulasyonudur. Gercek veri degil."
    }
