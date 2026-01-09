"""
VERGUS Notification API Routes
Sprint R3 - Alert & Notification System
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid

from database.db import get_connection
from services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ============================================
# PYDANTIC MODELS
# ============================================

class NotificationCreate(BaseModel):
    title: str
    message: str
    notification_type: str = "custom"
    severity: str = "info"
    category: str = "general"
    target_user: str = "all"
    action_required: bool = False
    action_url: Optional[str] = None


class PreferencesUpdate(BaseModel):
    email: Optional[str] = None
    email_enabled: Optional[bool] = None
    dashboard_enabled: Optional[bool] = None
    min_severity: Optional[str] = None
    tax_changes: Optional[bool] = None
    company_changes: Optional[bool] = None
    compliance_alerts: Optional[bool] = None
    deadlines: Optional[bool] = None
    email_frequency: Optional[str] = None


# ============================================
# NOTIFICATION ENDPOINTS
# ============================================

@router.get("")
async def get_notifications(
    user_id: str = Query("default", description="User ID"),
    include_read: bool = False,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """Kullanıcı bildirimlerini getir"""
    notifs = notification_service.get_user_notifications(
        user_id=user_id,
        include_read=include_read,
        severity_filter=severity,
        category_filter=category,
        limit=limit
    )

    return {
        "count": len(notifs),
        "notifications": notifs
    }


@router.get("/stats")
async def get_notification_stats(user_id: str = Query("default")):
    """Bildirim istatistikleri"""
    return notification_service.get_notification_stats(user_id)


@router.get("/{notification_id}")
async def get_notification(notification_id: str):
    """Belirli bir bildirimi getir"""
    result = notification_service.get_notification_by_id(notification_id)

    if not result:
        raise HTTPException(status_code=404, detail="Notification not found")

    return result


@router.post("")
async def create_notification(data: NotificationCreate):
    """Yeni bildirim oluştur"""
    notification_id = notification_service.create_notification(
        title=data.title,
        message=data.message,
        notification_type=data.notification_type,
        severity=data.severity,
        category=data.category,
        target_user=data.target_user,
        action_required=data.action_required,
        action_url=data.action_url
    )

    return {"status": "created", "notification_id": notification_id}


@router.post("/{notification_id}/read")
async def mark_as_read(notification_id: str, user_id: str = Query("default")):
    """Bildirimi okundu olarak işaretle"""
    notification_service.mark_as_read(notification_id, user_id)
    return {"status": "read"}


@router.post("/read-all")
async def mark_all_as_read(user_id: str = Query("default")):
    """Tüm bildirimleri okundu olarak işaretle"""
    count = notification_service.mark_all_as_read(user_id)
    return {"status": "done", "marked_count": count}


@router.post("/{notification_id}/dismiss")
async def dismiss_notification(notification_id: str):
    """Bildirimi kaldır"""
    notification_service.dismiss_notification(notification_id)
    return {"status": "dismissed"}


@router.post("/{notification_id}/action-complete")
async def complete_action(notification_id: str):
    """Bildirim aksiyonunu tamamlandı olarak işaretle"""
    notification_service.complete_action(notification_id)
    return {"status": "completed"}


# ============================================
# PREFERENCES ENDPOINTS
# ============================================

@router.get("/preferences/{user_id}")
async def get_preferences(user_id: str):
    """Kullanıcı bildirim tercihlerini getir"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM notification_preferences WHERE user_id = ?",
            (user_id,)
        )
        result = cursor.fetchone()

        if not result:
            # Varsayılan tercihler döndür
            return {
                "user_id": user_id,
                "email": None,
                "email_enabled": True,
                "dashboard_enabled": True,
                "min_severity": "low",
                "tax_changes": True,
                "company_changes": True,
                "compliance_alerts": True,
                "deadlines": True,
                "system_alerts": True,
                "email_frequency": "instant"
            }

        return dict(result)


@router.put("/preferences/{user_id}")
async def update_preferences(user_id: str, data: PreferencesUpdate):
    """Kullanıcı bildirim tercihlerini güncelle"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM notification_preferences WHERE user_id = ?",
            (user_id,)
        )
        existing = cursor.fetchone()

        update_data = {k: v for k, v in data.model_dump().items() if v is not None}

        if existing:
            # Build update query dynamically
            if update_data:
                set_clause = ", ".join([f"{k} = ?" for k in update_data.keys()])
                set_clause += ", updated_at = datetime('now')"
                values = list(update_data.values()) + [user_id]
                cursor.execute(
                    f"UPDATE notification_preferences SET {set_clause} WHERE user_id = ?",
                    values
                )
        else:
            # Insert new preferences
            columns = ["id", "user_id"] + list(update_data.keys()) + ["created_at"]
            placeholders = ["?"] * len(columns)
            # Use datetime('now') for created_at
            values = [str(uuid.uuid4()), user_id] + list(update_data.values())

            cursor.execute(f"""
                INSERT INTO notification_preferences ({', '.join(columns[:-1])}, created_at)
                VALUES ({', '.join(placeholders[:-1])}, datetime('now'))
            """, values)

        conn.commit()

    return {"status": "updated"}


# ============================================
# EMAIL QUEUE
# ============================================

@router.post("/email/process")
async def process_email_queue():
    """Email kuyruğunu işle (admin)"""
    sent = notification_service.process_email_queue()
    return {"status": "processed", "sent_count": sent}


@router.get("/email/queue")
async def get_email_queue(status: Optional[str] = None, limit: int = 50):
    """Email kuyruğunu görüntüle"""
    emails = notification_service.get_email_queue(status=status, limit=limit)
    return {
        "count": len(emails),
        "emails": emails
    }


# ============================================
# TEST ENDPOINTS
# ============================================

@router.post("/test/create-sample")
async def create_sample_notifications():
    """Test için örnek bildirimler oluştur"""
    samples = [
        {
            "title": "🚨 Kritik: Müşteri şirketi tasfiyeye girdi",
            "message": "ALANYA TURİZM A.Ş. tasfiyeye giriş ilanı TTSG'de yayınlandı.",
            "severity": "critical",
            "category": "company_change"
        },
        {
            "title": "⚠️ KDV Oranı Değişikliği Tespit Edildi",
            "message": "AI analizi sonucu KDV oranında değişiklik tespit edildi. İnceleme gerekli.",
            "severity": "high",
            "category": "tax_change"
        },
        {
            "title": "⏰ Asgari Sermaye Tamamlama - 180 gün kaldı",
            "message": "31.12.2026 tarihine kadar asgari sermaye tamamlanmalı.",
            "severity": "medium",
            "category": "deadlines"
        },
        {
            "title": "📋 Yeni GİB Duyurusu",
            "message": "GİB'den yeni bir duyuru yayınlandı.",
            "severity": "low",
            "category": "tax_change"
        },
        {
            "title": "ℹ️ Sistem Güncellemesi",
            "message": "VERGUS sistemi güncellendi. Yeni özellikler eklendi.",
            "severity": "info",
            "category": "general"
        }
    ]

    created = []
    for sample in samples:
        nid = notification_service.create_notification(
            title=sample["title"],
            message=sample["message"],
            notification_type="test",
            severity=sample["severity"],
            category=sample["category"],
            send_email=False  # Test için email gönderme
        )
        created.append(nid)

    return {"status": "created", "count": len(created), "ids": created}
