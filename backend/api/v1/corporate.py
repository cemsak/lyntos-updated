"""
LYNTOS Corporate Law API Routes
Sprint S1 - Sirketler Hukuku

Endpoints:
- GET /corporate/event-types - List all corporate event types
- GET /corporate/event-types/{event_code} - Get event type details
- GET /corporate/event-types/{event_code}/documents - Get required documents
- POST /corporate/ttk376-analysis - TTK 376 capital loss analysis
- POST /corporate/company-capital - Create company capital record
- GET /corporate/min-capital-requirements - Get 2024 minimum capital requirements
- GET /corporate/gk-quorum-guide - Get general assembly quorum guide
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List
import json
import uuid
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection
from middleware.auth import verify_token

router = APIRouter()


# ============================================
# PYDANTIC MODELS
# ============================================

class TTK376Request(BaseModel):
    """Request model for TTK 376 analysis"""
    capital: float
    legal_reserves: float = 0
    equity: float


class TTK376Response(BaseModel):
    """Response model for TTK 376 analysis"""
    status: str  # 'healthy', 'half_loss', 'twothirds_loss', 'insolvent'
    loss_percentage: float
    half_threshold: float
    twothirds_threshold: float
    recommendation: str
    legal_basis: str = "TTK 376"


class CompanyCapitalCreate(BaseModel):
    """Request model for creating company capital record"""
    company_name: str
    company_type: str  # 'as', 'ltd'
    tax_number: Optional[str] = None
    current_capital: float
    paid_capital: float
    legal_reserves: float = 0
    equity: float


# ============================================
# HELPER FUNCTIONS
# ============================================

def calculate_ttk376_status(capital: float, legal_reserves: float, equity: float) -> dict:
    """Calculate TTK 376 capital loss status"""
    total = capital + legal_reserves
    half_threshold = total * 0.5
    twothirds_threshold = total * (1/3)

    loss_amount = total - equity
    loss_percentage = (loss_amount / total * 100) if total > 0 else 0

    if equity >= half_threshold:
        status = "healthy"
        recommendation = "Sermaye kaybi yok. Islem gerekmez."
    elif equity >= twothirds_threshold:
        status = "half_loss"
        recommendation = (
            "TTK 376/1 - YARI SERMAYE KAYBI\n"
            "Yonetim kurulu derhal genel kurulu toplantiya cagirmali.\n"
            "Durum genel kurula bildirilmeli ve iyilestirme onlemleri sunulmali."
        )
    elif equity > 0:
        status = "twothirds_loss"
        recommendation = (
            "TTK 376/2 - 2/3 SERMAYE KAYBI\n"
            "Genel kurul ACIL toplanmali. Secenekler:\n"
            "A) Sermayenin 1/3'u ile yetinme karari\n"
            "B) Sermayeyi tamamlama (ortaklar odeme yapar)\n"
            "C) Sirketi feshetme\n\n"
            "KARAR ALINMAZSA SIRKET KENDILIĞINDEN SONA ERER!"
        )
    else:
        status = "insolvent"
        recommendation = (
            "TTK 376/3 - BORCA BATIKLIK\n"
            "Yonetim kurulu DERHAL mahkemeye bildirim yapmali!\n"
            "Iflas talebi veya iflasin ertelenmesi talebinde bulunulmali.\n"
            "Erteleme icin iyilestirme projesi gerekli."
        )

    return {
        "status": status,
        "loss_percentage": round(loss_percentage, 2),
        "half_threshold": half_threshold,
        "twothirds_threshold": twothirds_threshold,
        "recommendation": recommendation
    }


# ============================================
# ENDPOINTS
# ============================================

@router.get("/corporate/event-types")
async def get_all_event_types(
    company_type: Optional[str] = Query(None, description="Filter by company type: as, ltd, koop"),
    active_only: bool = Query(True, description="Only show active event types"),
    user: dict = Depends(verify_token)
):
    """
    List all corporate event types (Auth Required)

    Filter by company type: as (anonim sirket), ltd (limited sirket), koop (kooperatif)
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM corporate_event_types"
        params = []

        if active_only:
            query += " WHERE is_active = 1"

        query += " ORDER BY event_code"

        cursor.execute(query, params)
        rows = cursor.fetchall()

        events = []
        for row in rows:
            event = {
                "id": row[0],
                "event_code": row[1],
                "event_name": row[2],
                "company_types": json.loads(row[3]) if row[3] else [],
                "required_documents": json.loads(row[4]) if row[4] else [],
                "gk_quorum": json.loads(row[5]) if row[5] else None,
                "registration_deadline": row[6],
                "legal_basis": row[7],
                "tax_implications": json.loads(row[8]) if row[8] else {},
                "min_capital": row[9],
                "notes": row[10],
                "is_active": bool(row[11])
            }

            # Filter by company type if specified
            if company_type:
                if company_type not in event.get("company_types", []):
                    continue

            events.append(event)

    return {
        "schema": {
            "name": "corporate_event_types",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "count": len(events),
            "event_types": events
        }
    }


@router.get("/corporate/event-types/{event_code}")
async def get_event_type(event_code: str, user: dict = Depends(verify_token)):
    """
    Get details of a specific corporate event type (Auth Required)

    Examples: establishment_as, merger_acquisition, capital_increase
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM corporate_event_types WHERE event_code = ?
        """, [event_code])

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Event type '{event_code}' not found")

        event = {
            "id": row[0],
            "event_code": row[1],
            "event_name": row[2],
            "company_types": json.loads(row[3]) if row[3] else [],
            "required_documents": json.loads(row[4]) if row[4] else [],
            "gk_quorum": json.loads(row[5]) if row[5] else None,
            "registration_deadline": row[6],
            "legal_basis": row[7],
            "tax_implications": json.loads(row[8]) if row[8] else {},
            "min_capital": row[9],
            "notes": row[10],
            "is_active": bool(row[11]),
            "created_at": row[12]
        }

    return {
        "schema": {
            "name": f"corporate_event_type_{event_code}",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": event
    }


@router.get("/corporate/event-types/{event_code}/documents")
async def get_required_documents(event_code: str, user: dict = Depends(verify_token)):
    """
    Get required documents for a specific corporate event type (Auth Required)

    Returns document checklist with legal basis and quorum requirements.
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT event_code, event_name, required_documents, registration_deadline,
                   legal_basis, gk_quorum, tax_implications, notes
            FROM corporate_event_types
            WHERE event_code = ?
        """, [event_code])

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Event type '{event_code}' not found")

    return {
        "schema": {
            "name": f"corporate_documents_{event_code}",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "event_code": row[0],
            "event_name": row[1],
            "required_documents": json.loads(row[2]) if row[2] else [],
            "registration_deadline": row[3],
            "legal_basis": row[4],
            "gk_quorum": json.loads(row[5]) if row[5] else None,
            "tax_implications": json.loads(row[6]) if row[6] else {},
            "notes": row[7]
        }
    }


@router.post("/corporate/ttk376-analysis")
async def analyze_ttk376(request: TTK376Request, user: dict = Depends(verify_token)):
    """
    TTK 376 Capital Loss Analysis (Auth Required)

    Analyzes company's capital status according to Turkish Commercial Code Article 376.

    Parameters:
    - capital: Sirket sermayesi (registered capital)
    - legal_reserves: Kanuni yedek akce
    - equity: Oz varlik (Aktif - Borc)

    Returns:
    - status: healthy, half_loss, twothirds_loss, insolvent
    - recommendation: Required actions
    """
    result = calculate_ttk376_status(
        request.capital,
        request.legal_reserves,
        request.equity
    )

    return {
        "schema": {
            "name": "ttk376_analysis",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "input": {
                "capital": request.capital,
                "legal_reserves": request.legal_reserves,
                "equity": request.equity
            },
            "analysis": {
                "status": result["status"],
                "loss_percentage": result["loss_percentage"],
                "half_threshold": result["half_threshold"],
                "twothirds_threshold": result["twothirds_threshold"],
                "recommendation": result["recommendation"],
                "legal_basis": "TTK 376"
            }
        }
    }


@router.post("/corporate/company-capital")
async def create_company_capital(data: CompanyCapitalCreate, user: dict = Depends(verify_token)):
    """
    Create company capital record (Auth Required)

    Saves company capital status and calculates TTK 376 status.
    """
    # Validate company type
    if data.company_type not in ["as", "ltd"]:
        raise HTTPException(status_code=400, detail="company_type must be 'as' or 'ltd'")

    # Calculate TTK 376 status
    result = calculate_ttk376_status(
        data.current_capital,
        data.legal_reserves,
        data.equity
    )

    with get_connection() as conn:
        cursor = conn.cursor()

        record_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())

        cursor.execute("""
            INSERT INTO company_capital (
                id, company_id, company_name, company_type, tax_number,
                current_capital, paid_capital, legal_reserves, equity,
                ttk376_status, last_calculation_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record_id,
            company_id,
            data.company_name,
            data.company_type,
            data.tax_number,
            data.current_capital,
            data.paid_capital,
            data.legal_reserves,
            data.equity,
            result["status"],
            date.today().isoformat(),
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))

        conn.commit()

    return {
        "status": "created",
        "data": {
            "id": record_id,
            "company_id": company_id,
            "company_name": data.company_name,
            "ttk376_status": result["status"],
            "recommendation": result["recommendation"]
        }
    }


@router.get("/corporate/min-capital-requirements")
async def get_min_capital_requirements(user: dict = Depends(verify_token)):
    """
    Get 2024 minimum capital requirements (Auth Required)

    Returns minimum capital requirements for AS and Ltd companies.
    """
    return {
        "schema": {
            "name": "min_capital_requirements",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "effective_date": "2024-01-01",
            "deadline_for_existing": "2026-12-31",
            "requirements": {
                "as": {
                    "min_capital": 250000,
                    "min_paid_at_registration": 62500,
                    "currency": "TRY",
                    "legal_basis": "TTK 332, CB 7887"
                },
                "as_registered": {
                    "min_capital": 500000,
                    "description": "Kayitli sermaye sistemini kabul eden halka acik olmayan A.S.",
                    "legal_basis": "TTK 332/3"
                },
                "ltd": {
                    "min_capital": 50000,
                    "min_paid_at_registration": 12500,
                    "currency": "TRY",
                    "legal_basis": "TTK 580, CB 7887"
                }
            },
            "notes": [
                "31.12.2026'ya kadar tamamlanmazsa sirket infisah etmis sayilir",
                "Asgari sermaye artiriminda toplanti nisabi aranmaz",
                "Imtiyazli paylar aleyhine karar kullanilamaz",
                "7511 sayili Kanun ile duzenlenmistir"
            ]
        }
    }


@router.get("/corporate/gk-quorum-guide")
async def get_gk_quorum_guide(user: dict = Depends(verify_token)):
    """
    Get general assembly quorum guide (Auth Required)

    Returns meeting and decision quorum requirements for different operations.
    """
    return {
        "schema": {
            "name": "gk_quorum_guide",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "as": {
                "ordinary_decisions": {"meeting": "1/4", "decision": "1/2"},
                "articles_amendment": {"meeting": "1/2", "decision": "2/3"},
                "capital_increase": {"meeting": "1/2", "decision": "2/3"},
                "capital_decrease": {"meeting": "1/2", "decision": "2/3"},
                "merger": {"meeting": "1/2", "decision": "2/3"},
                "demerger": {"meeting": "1/2", "decision": "3/4"},
                "type_change": {"meeting": "1/2", "decision": "2/3"},
                "liquidation": {"meeting": "1/4", "decision": "1/2"},
                "to_partnership": {"meeting": "all", "decision": "unanimous"},
                "min_capital_compliance": {"meeting": "none_required", "decision": "simple_majority"}
            },
            "ltd": {
                "ordinary_decisions": {"meeting": None, "decision": "salt cogunluk"},
                "articles_amendment": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"},
                "capital_increase": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"},
                "capital_decrease": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"},
                "merger": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"},
                "demerger": {"meeting": None, "decision": "3/4 oy + 2/3 sermaye"},
                "type_change": {"meeting": None, "decision": "2/3 oy + salt cogunluk sermaye"},
                "share_transfer": {"meeting": None, "decision": "salt cogunluk oy + salt cogunluk sermaye"},
                "min_capital_compliance": {"meeting": "none_required", "decision": "simple_majority"}
            },
            "legal_basis": "TTK 418, 421, 151, 173, 189, 595",
            "notes": [
                "AS: Toplanti nisabi = sermayenin minimum bu orani temsil edilmeli",
                "AS: Karar nisabi = toplantida mevcut oylarin minimum bu orani",
                "Ltd: Ortaklar kurulunda toplanti nisabi aranmaz (TTK 620)",
                "Ltd: Karar icin gereken oy + sermaye oranlari belirtilmistir"
            ]
        }
    }


@router.get("/corporate/company-capital/{company_id}")
async def get_company_capital(company_id: str, user: dict = Depends(verify_token)):
    """
    Get company capital record (Auth Required)
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM company_capital WHERE company_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, [company_id])

        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Company capital record not found for company_id: {company_id}")

    return {
        "schema": {
            "name": "company_capital",
            "version": "v1.0",
            "generated_at": datetime.now().isoformat() + "Z"
        },
        "data": {
            "id": row[0],
            "company_id": row[1],
            "company_name": row[2],
            "company_type": row[3],
            "tax_number": row[4],
            "current_capital": row[5],
            "registered_capital": row[6],
            "paid_capital": row[7],
            "legal_reserves": row[8],
            "equity": row[9],
            "ttk376_status": row[10],
            "last_calculation_date": row[11],
            "created_at": row[12],
            "updated_at": row[13]
        }
    }
