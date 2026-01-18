"""
Tenant & Taxpayer Management API
Lists taxpayers (mükellef) and periods (dönem) for SMMM offices

LYNTOS Enterprise - Multi-tenant SMMM Platform

Sprint 4: Now uses real database data instead of hardcoded demo data
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from middleware.auth import verify_token
from pathlib import Path
import sqlite3

router = APIRouter(prefix="/tenants", tags=["tenants"])

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


class Taxpayer(BaseModel):
    id: str
    name: str
    vkn: str  # Vergi Kimlik No (masked)
    active: bool = True


class Period(BaseModel):
    id: str
    label: str
    status: str  # active, closed, draft


class TaxpayerListResponse(BaseModel):
    schema_name: str = "taxpayer_list"
    version: str = "1.0"
    data: dict


class PeriodListResponse(BaseModel):
    schema_name: str = "period_list"
    version: str = "1.0"
    data: dict


def mask_vkn(tax_id: str) -> str:
    """Mask VKN for display (show first 3 and last 2 digits)"""
    if not tax_id or len(tax_id) < 5:
        return tax_id or "***"
    return f"{tax_id[:3]}****{tax_id[-2:]}"


def get_period_label(period_code: str) -> str:
    """Generate Turkish period label from code"""
    if not period_code or "-Q" not in period_code.upper():
        return period_code

    parts = period_code.upper().split("-Q")
    year = parts[0]
    quarter = int(parts[1])

    quarter_labels = {
        1: "Ocak-Mart",
        2: "Nisan-Haziran",
        3: "Temmuz-Eylül",
        4: "Ekim-Aralık"
    }

    month_range = quarter_labels.get(quarter, "")
    return f"{year} Q{quarter} ({month_range})"


@router.get("/{tenant_id}/taxpayers")
async def list_taxpayers(tenant_id: str, user: dict = Depends(verify_token)):
    """
    List all taxpayers (mükellef) for a tenant (SMMM office)

    Reads from clients table in database.
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Get clients for this SMMM (tenant)
        cursor.execute("""
            SELECT id, name, tax_id
            FROM clients
            WHERE smmm_id = ? OR smmm_id IS NULL
            ORDER BY name
        """, (tenant_id,))

        rows = cursor.fetchall()

        taxpayers = [
            {
                "id": row["id"],
                "name": row["name"],
                "vkn": mask_vkn(row["tax_id"]),
                "active": True
            }
            for row in rows
        ]

        return {
            "schema": {"name": "taxpayer_list", "version": "1.0"},
            "data": {"taxpayers": taxpayers}
        }

    finally:
        conn.close()


@router.get("/{tenant_id}/taxpayers/{taxpayer_id}/periods")
async def list_periods(tenant_id: str, taxpayer_id: str, user: dict = Depends(verify_token)):
    """
    List available periods for a taxpayer

    Reads from periods table in database.
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Verify taxpayer exists
        cursor.execute("SELECT id FROM clients WHERE id = ?", (taxpayer_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Mükellef bulunamadı: {taxpayer_id}")

        # Get periods for this client
        cursor.execute("""
            SELECT id, period_code, start_date, end_date, status
            FROM periods
            WHERE client_id = ?
            ORDER BY start_date DESC
        """, (taxpayer_id,))

        rows = cursor.fetchall()

        periods = [
            {
                "id": row["period_code"] or row["id"],
                "label": get_period_label(row["period_code"] or row["id"]),
                "status": row["status"] or "active"
            }
            for row in rows
        ]

        return {
            "schema": {"name": "period_list", "version": "1.0"},
            "data": {"periods": periods, "taxpayer_id": taxpayer_id}
        }

    finally:
        conn.close()
