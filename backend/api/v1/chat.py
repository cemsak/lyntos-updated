"""
VERGUS Chat API Routes
Sprint S3
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
import json

from database.db import get_connection
from services.corporate_chat_agent import corporate_chat_agent
from services.regwatch_chat_agent import regwatch_chat_agent

router = APIRouter(prefix="/chat", tags=["chat"])


# ============================================
# PYDANTIC MODELS
# ============================================

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    user_id: str = "default"


class TTK376Request(BaseModel):
    capital: float
    legal_reserves: float
    equity: float


# ============================================
# CHAT ENDPOINTS
# ============================================

@router.post("/corporate")
async def chat_corporate(request: ChatRequest):
    """Sirketler Hukuku chat"""
    result = corporate_chat_agent.chat(
        message=request.message,
        session_id=request.session_id,
        user_id=request.user_id
    )
    return result


@router.post("/corporate/ttk376")
async def analyze_ttk376_chat(request: TTK376Request):
    """TTK 376 analizi (chat entegreli)"""
    return corporate_chat_agent.analyze_ttk376(
        capital=request.capital,
        legal_reserves=request.legal_reserves,
        equity=request.equity
    )


@router.post("/regwatch")
async def chat_regwatch(request: ChatRequest):
    """Mevzuat Takibi chat"""
    result = regwatch_chat_agent.chat(
        message=request.message,
        session_id=request.session_id,
        user_id=request.user_id
    )
    return result


@router.get("/regwatch/summary")
async def get_tax_summary():
    """Guncel vergi ozeti"""
    return regwatch_chat_agent.get_tax_summary()


@router.get("/regwatch/calendar")
async def get_tax_calendar(month: int = None):
    """Vergi takvimi"""
    from datetime import date
    if month is None:
        month = date.today().month

    calendar = regwatch_chat_agent.TAX_CALENDAR.get(month, [])
    return {
        "month": month,
        "tasks": calendar
    }


@router.post("/sessions")
async def create_session(user_id: str = "default", agent_type: str = "corporate"):
    """Yeni chat session olustur"""
    if agent_type == "corporate":
        session_id = corporate_chat_agent.create_session(user_id)
    elif agent_type == "regwatch":
        session_id = regwatch_chat_agent.create_session(user_id)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown agent type: {agent_type}")

    return {"session_id": session_id, "agent_type": agent_type}


@router.get("/sessions")
async def list_sessions(user_id: str = "default", limit: int = 20):
    """Kullanici chat session'larini listele"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM chat_sessions
            WHERE user_id = ? AND is_active = 1
            ORDER BY last_message_at DESC
            LIMIT ?
        """, (user_id, limit))
        sessions = cursor.fetchall()

        return {
            "count": len(sessions),
            "sessions": [dict(s) for s in sessions]
        }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Session detayi ve mesajlari"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,))
        session = cursor.fetchone()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        cursor.execute("""
            SELECT * FROM chat_messages
            WHERE session_id = ?
            ORDER BY created_at
        """, (session_id,))
        messages = cursor.fetchall()

        return {
            "session": dict(session),
            "messages": [dict(m) for m in messages]
        }


@router.delete("/sessions/{session_id}")
async def close_session(session_id: str):
    """Session'i kapat"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE chat_sessions
            SET is_active = 0, updated_at = datetime('now')
            WHERE id = ?
        """, (session_id,))
        conn.commit()

    return {"status": "closed"}


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50):
    """Chat gecmisi"""
    history = corporate_chat_agent.get_session_history(session_id, limit)
    return {"messages": history}


# ============================================
# STATS
# ============================================

@router.get("/stats")
async def get_chat_stats(user_id: Optional[str] = None):
    """Chat istatistikleri"""
    with get_connection() as conn:
        cursor = conn.cursor()

        if user_id:
            cursor.execute("SELECT * FROM chat_sessions WHERE user_id = ?", (user_id,))
        else:
            cursor.execute("SELECT * FROM chat_sessions")

        sessions = cursor.fetchall()

        total_messages = sum(dict(s).get('message_count') or 0 for s in sessions)
        active_sessions = len([s for s in sessions if dict(s).get('is_active')])

        return {
            "total_sessions": len(sessions),
            "active_sessions": active_sessions,
            "total_messages": total_messages
        }
