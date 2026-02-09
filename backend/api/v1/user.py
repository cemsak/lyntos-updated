"""
User & Layout Context API
Provides user, clients, and periods data for the Layout Context

Sprint MOCK-003 - Connect Layout Context to Real APIs
Sprint 8 - Enhanced Period Selection (Year + Quarter/Month)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from middleware.auth import verify_token, get_user_clients, get_client_periods
from database.db import get_connection

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
    year: int
    periodType: str  # "quarter" | "month"
    periodNumber: int  # 1-4 for quarter, 1-12 for month


# Türkçe ay isimleri
MONTHS_TR = {
    1: "Ocak", 2: "Şubat", 3: "Mart",
    4: "Nisan", 5: "Mayıs", 6: "Haziran",
    7: "Temmuz", 8: "Ağustos", 9: "Eylül",
    10: "Ekim", 11: "Kasım", 12: "Aralık"
}

# Çeyrek isimleri
QUARTERS_TR = {
    1: "1. Çeyrek (Ocak-Mart)",
    2: "2. Çeyrek (Nisan-Haziran)",
    3: "3. Çeyrek (Temmuz-Eylül)",
    4: "4. Çeyrek (Ekim-Aralık)"
}


def generate_periods_for_client(client_id: str, start_year: int = 2025) -> List[dict]:
    """
    Belirli bir müşteri için dönemleri oluştur
    2025'ten başlayıp mevcut yıla kadar çeyreklik dönemler oluşturur
    """
    current_date = datetime.now()
    current_year = current_date.year
    current_month = current_date.month
    current_quarter = (current_month - 1) // 3 + 1

    periods = []

    for year in range(start_year, current_year + 1):
        # Her yıl için 4 çeyrek
        for q in range(1, 5):
            # Gelecek dönemleri oluşturma
            if year == current_year and q > current_quarter:
                continue

            quarter_start_month = (q - 1) * 3 + 1
            quarter_end_month = q * 3

            start_date = f"{year}-{quarter_start_month:02d}-01"
            # Çeyrek son günü
            if quarter_end_month in [1, 3, 5, 7, 8, 10, 12]:
                end_day = 31
            elif quarter_end_month in [4, 6, 9, 11]:
                end_day = 30
            else:
                end_day = 28 if year % 4 != 0 else 29
            end_date = f"{year}-{quarter_end_month:02d}-{end_day}"

            period_id = f"{client_id}_{year}_Q{q}"
            period_code = f"{year}-Q{q}"

            # Mevcut dönem mi?
            is_current = (year == current_year and q == current_quarter)
            is_active = (year == current_year and q >= current_quarter - 1) or (year == current_year - 1 and q == 4 and current_quarter == 1)

            periods.append({
                "id": period_id,
                "client_id": client_id,
                "period_code": period_code,
                "start_date": start_date,
                "end_date": end_date,
                "status": "active" if is_active else "closed",
                "year": year,
                "period_type": "quarter",
                "period_number": q,
                "is_current": is_current
            })

    return periods


def ensure_periods_exist(client_id: str) -> None:
    """Dönemler yoksa oluştur"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM periods WHERE client_id = ?", [client_id])
        count = cursor.fetchone()[0]

        if count == 0:
            # Dönemleri oluştur
            periods = generate_periods_for_client(client_id, start_year=2025)
            for p in periods:
                cursor.execute("""
                    INSERT INTO periods (id, client_id, period_code, start_date, end_date, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, [p["id"], p["client_id"], p["period_code"], p["start_date"], p["end_date"], p["status"]])
            conn.commit()


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


def get_periods_with_data(client_id: str) -> set:
    """
    Gerçek veri olan dönemleri bul (mizan_entries veya document_uploads)
    Returns: Set of period_codes that have data (e.g., {'2025-Q1', '2025-Q4'})
    """
    periods_with_data = set()

    with get_connection() as conn:
        cursor = conn.cursor()

        # Mizan verisi olan dönemler
        cursor.execute("""
            SELECT DISTINCT period_id FROM mizan_entries
            WHERE client_id = ?
        """, [client_id])
        for row in cursor.fetchall():
            periods_with_data.add(row[0])

        # Document uploads olan dönemler (period_id kullan)
        cursor.execute("""
            SELECT DISTINCT period_id FROM document_uploads
            WHERE client_id = ? AND is_active = 1
        """, [client_id])
        for row in cursor.fetchall():
            if row[0]:
                periods_with_data.add(row[0])

    return periods_with_data


@router.get("/clients/{client_id}/periods", response_model=List[PeriodResponse])
async def get_periods_for_client(
    client_id: str,
    user: dict = Depends(verify_token)
):
    """
    Get all periods for a specific client

    For frontend Layout Context - period selector
    Dönemler otomatik oluşturulur (2025'ten başlayarak)

    isActive = True ise dönemde GERÇEK VERİ var (mizan, fatura vb.)
    """
    # Verify user has access to this client
    clients = get_user_clients(user["id"])
    client_ids = [c["id"] for c in clients]

    if client_id not in client_ids and user["role"] != "admin":
        raise HTTPException(403, f"Access denied to client {client_id}")

    # Dönemler yoksa otomatik oluştur
    ensure_periods_exist(client_id)

    periods = get_client_periods(client_id)

    # Gerçek veri olan dönemleri bul
    periods_with_data = get_periods_with_data(client_id)

    # Find current period (most recent active)
    current_date = datetime.now()
    current_year = current_date.year
    current_quarter = (current_date.month - 1) // 3 + 1
    current_period_code = f"{current_year}-Q{current_quarter}"

    return [
        PeriodResponse(
            id=p["id"],
            code=p.get("period_code") or p["id"],
            label=get_period_label(p.get("period_code") or p["id"]),
            description=get_period_description(p["start_date"], p["end_date"]),
            startDate=p["start_date"],
            endDate=p["end_date"],
            # isActive = Gerçek veri var mı? (mizan, fatura vb.)
            isActive=(p.get("period_code") or p["id"]) in periods_with_data,
            isCurrent=p.get("period_code") == current_period_code,
            year=int(p["start_date"][:4]),
            periodType="quarter" if "-Q" in (p.get("period_code") or "") else "month",
            periodNumber=int((p.get("period_code") or "").split("-Q")[-1]) if "-Q" in (p.get("period_code") or "") else int(p["start_date"][5:7])
        )
        for p in periods
    ]


@router.get("/clients/{client_id}/available-years")
async def get_available_years(
    client_id: str,
    user: dict = Depends(verify_token)
):
    """
    Mevcut yılları döndür (2025'ten başlayarak)
    Frontend'de yıl seçici için
    """
    current_year = datetime.now().year

    # 2025'ten mevcut yıla kadar
    years = list(range(2025, current_year + 1))

    return {
        "years": years,
        "currentYear": current_year
    }
