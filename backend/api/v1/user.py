"""
User & Layout Context API
Provides user, clients, and periods data for the Layout Context

Sprint MOCK-003 - Connect Layout Context to Real APIs
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from middleware.auth import verify_token, get_user_clients, get_client_periods

router = APIRouter(prefix="/user", tags=["user"])


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    title: str
    initials: str


class ClientResponse(BaseModel):
    id: str
    name: str
    shortName: str
    vkn: str
    sector: Optional[str] = None
    naceCode: Optional[str] = None
    riskLevel: str = "belirsiz"
    riskScore: Optional[int] = None
    isFavorite: bool = False


class PeriodResponse(BaseModel):
    id: str
    code: str
    label: str
    description: str
    startDate: str
    endDate: str
    isActive: bool
    isCurrent: bool


def get_initials(name: str) -> str:
    """Extract initials from name"""
    parts = name.split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper() if len(name) >= 2 else name.upper()


def get_title_from_role(role: str) -> str:
    """Map role to Turkish title"""
    titles = {
        "admin": "Sistem Yöneticisi",
        "smmm": "SMMM",
        "viewer": "İzleyici"
    }
    return titles.get(role, role.upper())


def get_short_name(full_name: str) -> str:
    """Extract short name from company name"""
    # Remove common suffixes
    suffixes = [
        "Ltd. Şti.", "Ltd.Şti.", "LTD. ŞTİ.", "LTD.ŞTİ.",
        "A.Ş.", "AŞ", "A.S.", "AS",
        "Tic. Ltd.", "San. Tic.", "San.Tic.",
        "ve Ofis Malzemeleri", "ve Ofis Malz.",
    ]
    short = full_name
    for suffix in suffixes:
        short = short.replace(suffix, "").strip()
    # Take first 2-3 words
    words = short.split()[:3]
    return " ".join(words)


def get_period_label(period_id: str) -> str:
    """Generate period label from ID"""
    # period_id format: "2025-Q1" or "2025-01"
    if "-Q" in period_id:
        year, quarter = period_id.split("-Q")
        return f"{year} Q{quarter}"
    return period_id


def get_period_description(start_date: str, end_date: str) -> str:
    """Generate period description from dates"""
    months_tr = {
        "01": "Ocak", "02": "Şubat", "03": "Mart",
        "04": "Nisan", "05": "Mayıs", "06": "Haziran",
        "07": "Temmuz", "08": "Ağustos", "09": "Eylül",
        "10": "Ekim", "11": "Kasım", "12": "Aralık"
    }
    start_month = start_date[5:7]
    end_month = end_date[5:7]
    year = start_date[:4]
    return f"{months_tr.get(start_month, start_month)} - {months_tr.get(end_month, end_month)} {year}"


@router.get("/me", response_model=UserResponse)
async def get_current_user(user: dict = Depends(verify_token)):
    """
    Get current authenticated user info

    For frontend Layout Context
    """
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        title=get_title_from_role(user["role"]),
        initials=get_initials(user["name"])
    )


@router.get("/me/clients", response_model=List[ClientResponse])
async def get_my_clients(user: dict = Depends(verify_token)):
    """
    Get all clients for the current user

    For frontend Layout Context - client selector
    """
    clients = get_user_clients(user["id"])

    return [
        ClientResponse(
            id=c["id"],
            name=c["name"],
            shortName=get_short_name(c["name"]),
            vkn=c["tax_id"],
            sector=c.get("sector"),
            naceCode=c.get("nace_code"),
            riskLevel="belirsiz",  # TODO: Calculate from risk data
            riskScore=None,
            isFavorite=False
        )
        for c in clients
    ]


@router.get("/clients/{client_id}/periods", response_model=List[PeriodResponse])
async def get_periods_for_client(
    client_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get all periods for a specific client

    For frontend Layout Context - period selector
    """
    # Verify user has access to this client
    clients = get_user_clients(user["id"])
    client_ids = [c["id"] for c in clients]

    if client_id not in client_ids and user["role"] != "admin":
        raise HTTPException(403, f"Access denied to client {client_id}")

    periods = get_client_periods(client_id)

    # Find current period (most recent active)
    current_period_id = None
    for p in periods:
        if p["status"] == "active":
            current_period_id = p["id"]
            break

    return [
        PeriodResponse(
            id=p["id"],
            code=p["id"],  # Use ID as code
            label=get_period_label(p["id"]),
            description=get_period_description(p["start_date"], p["end_date"]),
            startDate=p["start_date"],
            endDate=p["end_date"],
            isActive=p["status"] == "active",
            isCurrent=p["id"] == current_period_id
        )
        for p in periods
    ]
