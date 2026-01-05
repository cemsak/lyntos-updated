"""
Tenant & Taxpayer Management API
Lists taxpayers (mükellef) and periods (dönem) for SMMM offices

LYNTOS Enterprise - Multi-tenant SMMM Platform
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from middleware.auth import verify_token


router = APIRouter(prefix="/tenants", tags=["tenants"])


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


@router.get("/{tenant_id}/taxpayers")
async def list_taxpayers(tenant_id: str, user: dict = Depends(verify_token)):
    """
    List all taxpayers (mükellef) for a tenant (SMMM office)

    For demo purposes, returns hardcoded list. In production,
    this would query the database.
    """
    # Demo data - in production, query from database
    taxpayers = [
        {
            "id": "OZKAN_KIRTASIYE",
            "name": "Özkan Kırtasiye ve Ofis Malz. Ltd. Şti.",
            "vkn": "123****89",
            "active": True
        },
        {
            "id": "DEMO_TICARET",
            "name": "Demo Ticaret A.Ş.",
            "vkn": "987****21",
            "active": True
        },
        {
            "id": "ABC_INSAAT",
            "name": "ABC İnşaat San. Tic. Ltd. Şti.",
            "vkn": "456****78",
            "active": True
        }
    ]

    return {
        "schema": {"name": "taxpayer_list", "version": "1.0"},
        "data": {"taxpayers": taxpayers}
    }


@router.get("/{tenant_id}/taxpayers/{taxpayer_id}/periods")
async def list_periods(tenant_id: str, taxpayer_id: str, user: dict = Depends(verify_token)):
    """
    List available periods for a taxpayer

    Periods are fiscal quarters (Q1-Q4) for each year.
    """
    # Demo data - in production, derive from uploaded documents
    periods = [
        {"id": "2024-Q4", "label": "2024 Q4 (Ekim-Aralık)", "status": "closed"},
        {"id": "2025-Q1", "label": "2025 Q1 (Ocak-Mart)", "status": "closed"},
        {"id": "2025-Q2", "label": "2025 Q2 (Nisan-Haziran)", "status": "active"},
        {"id": "2025-Q3", "label": "2025 Q3 (Temmuz-Eylül)", "status": "draft"},
    ]

    return {
        "schema": {"name": "period_list", "version": "1.0"},
        "data": {"periods": periods, "taxpayer_id": taxpayer_id}
    }
