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
            SELECT id, name, tax_id as vkn, nace_code, sector
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


def get_mizan_data(client_id: str, period: str = None, tenant_id: str = None) -> Dict[str, float]:
    """
    Get trial balance data for client from database.

    Returns mizan data grouped by 3-digit account codes.
    Uses only true leaf accounts to avoid double counting.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Normalize period format: "2024/Q4" -> "2024-Q4"
        normalized_period = period.replace("/", "-") if period else None

        # Önce tenant_id'yi bul (eğer verilmemişse)
        if not tenant_id:
            cursor.execute("""
                SELECT DISTINCT tenant_id FROM mizan_entries WHERE client_id = ? LIMIT 1
            """, (client_id,))
            row = cursor.fetchone()
            tenant_id = row['tenant_id'] if row else 'HKOZKAN'

        # Query mizan entries
        if normalized_period:
            cursor.execute("""
                SELECT hesap_kodu, borc_bakiye, alacak_bakiye
                FROM mizan_entries
                WHERE tenant_id = ? AND client_id = ? AND period_id = ?
                ORDER BY hesap_kodu
            """, (tenant_id, client_id, normalized_period))
        else:
            # Get latest period if not specified
            cursor.execute("""
                SELECT hesap_kodu, borc_bakiye, alacak_bakiye
                FROM mizan_entries
                WHERE tenant_id = ? AND client_id = ?
                ORDER BY period_id DESC, hesap_kodu
            """, (tenant_id, client_id,))

        rows = cursor.fetchall()

        if not rows:
            # Return empty dict if no data
            return {}

        # Build accounts dict
        accounts = {}
        for row in rows:
            kod = row['hesap_kodu']
            accounts[kod] = {
                'borc': row['borc_bakiye'] or 0,
                'alacak': row['alacak_bakiye'] or 0
            }

        # Find true leaf accounts (no children)
        code_set = set(accounts.keys())

        def is_true_leaf(kod: str) -> bool:
            for other in code_set:
                if other != kod and other.startswith(kod + "."):
                    return False
                if other != kod and other.startswith(kod) and len(other) > len(kod):
                    if "." not in kod and "." not in other:
                        return False
            return True

        # Calculate net balances for 3-digit account groups
        mizan_data: Dict[str, float] = {}

        for kod, vals in accounts.items():
            if not is_true_leaf(kod):
                continue

            borc = vals['borc']
            alacak = vals['alacak']

            # Get 3-digit prefix
            kod_prefix = kod[:3] if len(kod) >= 3 else kod

            # Initialize if not exists
            if kod_prefix not in mizan_data:
                mizan_data[kod_prefix] = 0

            # Calculate net balance based on account type
            # Assets (1xx, 2xx): Debit balance positive
            # Liabilities (3xx, 4xx, 5xx): Credit balance positive
            # Income (6xx): Credit balance positive
            if kod_prefix[0] in ['1', '2']:
                mizan_data[kod_prefix] += borc - alacak
            elif kod_prefix[0] in ['3', '4', '5', '6']:
                mizan_data[kod_prefix] += alacak - borc
            else:
                # For expense accounts (7xx), debit is positive
                mizan_data[kod_prefix] += borc - alacak

        return mizan_data

    except Exception as e:
        print(f"[VDK] Error getting mizan data: {e}")
        return {}
    finally:
        conn.close()


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

    # EVDS sektör verileri (sector_average için)
    _sector_avgs = {}
    if nace_code:
        try:
            from services.tcmb_evds_service import get_sector_data_for_nace
            _sector_avgs = get_sector_data_for_nace(nace_code) or {}
        except Exception:
            pass

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
        risky_suppliers=risky_suppliers,
        sector_averages=_sector_avgs
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


# /demo ENDPOINT DEVRE DIŞI BIRAKILDI
# Sebep: Mock/demo veri SMMM'leri yanıltabilir, Maliye cezası riski
# Tarih: 2026-01-26
#
# @router.get("/demo")
# async def run_demo():
#     """DEVRE DIŞI - Demo simulation with sample data"""
#     pass
#
# Eski kod güvenlik nedeniyle kaldırıldı.
# VDK simülasyonu sadece gerçek müşteri verisiyle çalışmalıdır.
