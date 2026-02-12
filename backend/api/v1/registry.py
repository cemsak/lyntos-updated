"""
LYNTOS Trade Registry API Routes
Sprint T1 - Ticaret Sicili Entegrasyonu
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import uuid
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection

router = APIRouter(prefix="/registry", tags=["Registry"])


# ============================================
# PYDANTIC MODELS
# ============================================

class CompanyCreate(BaseModel):
    tax_number: str
    company_name: str
    company_type: Optional[str] = "ltd"
    trade_registry_number: Optional[str] = None
    trade_registry_office: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    current_capital: Optional[float] = None
    nace_code: Optional[str] = None


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    address: Optional[str] = None
    current_capital: Optional[float] = None
    status: Optional[str] = None


class ClientPortfolioCreate(BaseModel):
    smmm_id: str
    tax_number: str
    company_name: Optional[str] = None
    relationship_type: Optional[str] = "accounting"
    notes: Optional[str] = None
    alert_preferences: Optional[dict] = None


class TTSGSearchRequest(BaseModel):
    query: str
    city: Optional[str] = None
    change_type: Optional[str] = None


# ============================================
# COMPANY REGISTRY ENDPOINTS
# ============================================

@router.get("/companies")
async def list_companies(
    city: Optional[str] = None,
    status: Optional[str] = None,
    company_type: Optional[str] = None,
    is_tracked: Optional[bool] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    """List registered companies"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM company_registry WHERE 1=1"
        params = []

        if city:
            query += " AND (city LIKE ? OR district LIKE ?)"
            params.extend([f"%{city}%", f"%{city}%"])
        if status:
            query += " AND status = ?"
            params.append(status)
        if company_type:
            query += " AND company_type = ?"
            params.append(company_type)
        if is_tracked is not None:
            query += " AND is_tracked = ?"
            params.append(1 if is_tracked else 0)

        query += " ORDER BY company_name LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        results = cursor.fetchall()

        companies = [dict(row) for row in results]

        return {
            "count": len(companies),
            "limit": limit,
            "offset": offset,
            "companies": companies
        }


@router.get("/companies/{tax_number}")
async def get_company(tax_number: str):
    """Get company by tax number"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM company_registry WHERE tax_number = ?",
            [tax_number]
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Company with tax number '{tax_number}' not found")

        company = dict(result)

        # Get recent changes
        cursor.execute("""
            SELECT * FROM company_changes
            WHERE tax_number = ?
            ORDER BY detected_at DESC
            LIMIT 10
        """, [tax_number])

        changes = cursor.fetchall()
        company["recent_changes"] = [dict(row) for row in changes]

        return company


@router.post("/companies")
async def create_company(data: CompanyCreate):
    """Create new company record"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Check if exists
        cursor.execute(
            "SELECT id FROM company_registry WHERE tax_number = ?",
            [data.tax_number]
        )

        if cursor.fetchone():
            raise HTTPException(status_code=400, detail=f"Company with tax number '{data.tax_number}' already exists")

        company_id = str(uuid.uuid4())

        cursor.execute("""
            INSERT INTO company_registry
            (id, tax_number, trade_registry_number, company_name, company_type,
             trade_registry_office, city, district, address, current_capital,
             nace_code, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
        """, [
            company_id,
            data.tax_number,
            data.trade_registry_number,
            data.company_name,
            data.company_type,
            data.trade_registry_office,
            data.city,
            data.district,
            data.address,
            data.current_capital,
            data.nace_code
        ])
        conn.commit()

        return {"status": "created", "id": company_id, "tax_number": data.tax_number}


@router.put("/companies/{tax_number}")
async def update_company(tax_number: str, data: CompanyUpdate):
    """Update company information"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Check exists
        cursor.execute(
            "SELECT id FROM company_registry WHERE tax_number = ?",
            [tax_number]
        )

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Company not found")

        # Build update query dynamically
        updates = []
        params = []

        if data.company_name:
            updates.append("company_name = ?")
            params.append(data.company_name)
        if data.address:
            updates.append("address = ?")
            params.append(data.address)
        if data.current_capital is not None:
            updates.append("current_capital = ?")
            params.append(data.current_capital)
        if data.status:
            updates.append("status = ?")
            params.append(data.status)

        updates.append("updated_at = datetime('now')")

        if updates:
            query = f"UPDATE company_registry SET {', '.join(updates)} WHERE tax_number = ?"
            params.append(tax_number)
            cursor.execute(query, params)
            conn.commit()

        return {"status": "updated", "tax_number": tax_number}


@router.post("/companies/{tax_number}/track")
async def track_company(tax_number: str, smmm_id: str = "default"):
    """Start tracking a company"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE company_registry
            SET is_tracked = 1, tracked_by = ?, updated_at = datetime('now')
            WHERE tax_number = ?
        """, [smmm_id, tax_number])
        conn.commit()

        return {"status": "tracking", "tax_number": tax_number, "tracked_by": smmm_id}


@router.delete("/companies/{tax_number}/track")
async def untrack_company(tax_number: str):
    """Stop tracking a company"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE company_registry
            SET is_tracked = 0, tracked_by = NULL, updated_at = datetime('now')
            WHERE tax_number = ?
        """, [tax_number])
        conn.commit()

        return {"status": "untracked", "tax_number": tax_number}


# ============================================
# COMPANY CHANGES ENDPOINTS
# ============================================

@router.get("/changes")
async def list_changes(
    city: Optional[str] = None,
    change_type: Optional[str] = None,
    since: Optional[str] = None,
    reviewed: Optional[bool] = None,
    limit: int = Query(50, le=200),
):
    """List recent company changes"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM company_changes WHERE 1=1"
        params = []

        if change_type:
            query += " AND change_type = ?"
            params.append(change_type)
        if reviewed is not None:
            query += " AND reviewed = ?"
            params.append(1 if reviewed else 0)
        if since:
            query += " AND detected_at >= ?"
            params.append(since)

        query += " ORDER BY detected_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        results = cursor.fetchall()

        return {
            "count": len(results),
            "changes": [dict(row) for row in results]
        }


@router.get("/changes/stats")
async def get_change_stats():
    """Get change statistics"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Last 30 days
        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

        cursor.execute("""
            SELECT change_type, COUNT(*) as count
            FROM company_changes
            WHERE detected_at >= ?
            GROUP BY change_type
        """, [thirty_days_ago])

        by_type = {row['change_type']: row['count'] for row in cursor.fetchall()}

        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN reviewed = 0 THEN 1 ELSE 0 END) as unreviewed
            FROM company_changes
            WHERE detected_at >= ?
        """, [thirty_days_ago])

        totals = cursor.fetchone()

        return {
            "total_30_days": totals['total'] or 0,
            "unreviewed": totals['unreviewed'] or 0,
            "by_type": by_type
        }


@router.post("/changes/{change_id}/review")
async def review_change(change_id: str, reviewed_by: str = "system"):
    """Mark a change as reviewed"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE company_changes
            SET reviewed = 1, reviewed_by = ?, reviewed_at = datetime('now')
            WHERE id = ?
        """, [reviewed_by, change_id])
        conn.commit()

        return {"status": "reviewed", "change_id": change_id}


# ============================================
# CLIENT PORTFOLIO ENDPOINTS
# ============================================

@router.get("/portfolio/{smmm_id}")
async def get_portfolio(smmm_id: str, active_only: bool = True):
    """Get SMMM client portfolio"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM client_portfolio WHERE smmm_id = ?"
        params = [smmm_id]

        if active_only:
            query += " AND is_active = 1"

        query += " LIMIT 500"

        cursor.execute(query, params)
        results = cursor.fetchall()

        clients = []
        for row in results:
            client = dict(row)

            # Get company details
            cursor.execute(
                "SELECT * FROM company_registry WHERE tax_number = ?",
                [client["tax_number"]]
            )
            company = cursor.fetchone()

            if company:
                client["company_details"] = dict(company)

            clients.append(client)

        return {
            "smmm_id": smmm_id,
            "client_count": len(clients),
            "clients": clients
        }


@router.post("/portfolio")
async def add_to_portfolio(data: ClientPortfolioCreate):
    """Add client to SMMM portfolio"""
    with get_connection() as conn:
        cursor = conn.cursor()

        portfolio_id = str(uuid.uuid4())

        # Check if company exists
        cursor.execute(
            "SELECT id FROM company_registry WHERE tax_number = ?",
            [data.tax_number]
        )
        existing = cursor.fetchone()

        company_id = None
        if existing:
            company_id = existing['id']
        elif data.company_name:
            # Create company record
            company_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO company_registry
                (id, tax_number, company_name, is_tracked, tracked_by, source)
                VALUES (?, ?, ?, 1, ?, 'portfolio')
            """, [company_id, data.tax_number, data.company_name, data.smmm_id])

        # Add to portfolio
        cursor.execute("""
            INSERT INTO client_portfolio
            (id, smmm_id, company_id, tax_number, company_name, relationship_type,
             notes, alert_preferences, start_date, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'), 1)
        """, [
            portfolio_id,
            data.smmm_id,
            company_id,
            data.tax_number,
            data.company_name,
            data.relationship_type,
            data.notes,
            json.dumps(data.alert_preferences or {})
        ])
        conn.commit()

        return {"status": "added", "portfolio_id": portfolio_id}


@router.delete("/portfolio/{portfolio_id}")
async def remove_from_portfolio(portfolio_id: str):
    """Remove client from portfolio"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE client_portfolio
            SET is_active = 0, end_date = date('now'), updated_at = datetime('now')
            WHERE id = ?
        """, [portfolio_id])
        conn.commit()

        return {"status": "removed", "portfolio_id": portfolio_id}


# ============================================
# TTSG SEARCH ENDPOINTS
# ============================================

@router.post("/ttsg/search")
async def search_ttsg(request: TTSGSearchRequest):
    """Search TTSG"""
    from services.ttsg_scraper import TTSGScraper

    scraper = TTSGScraper(demo_mode=False)  # Demo mode for now

    if request.city:
        results = scraper.search_by_city(request.city, request.change_type)
    else:
        results = scraper.search_by_company_name(request.query)

    return {
        "query": request.query,
        "city": request.city,
        "result_count": len(results),
        "results": results
    }


@router.post("/ttsg/scrape-pilot")
async def scrape_pilot_region(region: str = "Alanya"):
    """Scrape pilot region for TTSG updates"""
    from services.ttsg_scraper import TTSGScraper

    scraper = TTSGScraper(demo_mode=False)
    results = scraper.scrape_for_pilot_region(region)

    return {
        "region": region,
        "scraped_at": datetime.utcnow().isoformat() + 'Z',
        "summary": {
            "new_companies": len(results.get("new_companies", [])),
            "capital_changes": len(results.get("capital_changes", [])),
            "liquidations": len(results.get("liquidations", [])),
        },
        "results": results
    }


@router.get("/ttsg/daily")
async def get_daily_ttsg():
    """Get today's TTSG gazette"""
    from services.ttsg_scraper import TTSGScraper

    scraper = TTSGScraper(demo_mode=False)
    results = scraper.get_daily_gazette()

    return {
        "date": date.today().isoformat(),
        "count": len(results),
        "items": results
    }


# ============================================
# TRADE REGISTRY OFFICES
# ============================================

@router.get("/offices")
async def list_offices(city: Optional[str] = None, pilot_only: bool = False):
    """List trade registry offices"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM trade_registry_offices WHERE is_active = 1"
        params = []

        if city:
            query += " AND city LIKE ?"
            params.append(f"%{city}%")
        if pilot_only:
            query += " AND is_pilot = 1"

        cursor.execute(query, params)
        results = cursor.fetchall()

        return {
            "count": len(results),
            "offices": [dict(row) for row in results]
        }


@router.get("/offices/{office_code}")
async def get_office(office_code: str):
    """Get trade registry office by code"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM trade_registry_offices WHERE office_code = ?",
            [office_code]
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail=f"Office '{office_code}' not found")

        return dict(result)
