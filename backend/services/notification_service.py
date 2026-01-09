"""
VERGUS Notification Service
Sprint R3 - Bildirim oluşturma ve gönderme
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
import uuid

from database.db import get_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NotificationService:
    """Bildirim oluşturma ve yönetim servisi"""

    SEVERITY_ORDER = ['info', 'low', 'medium', 'high', 'critical']

    SEVERITY_COLORS = {
        'info': '#3B82F6',      # Blue
        'low': '#10B981',       # Green
        'medium': '#F59E0B',    # Yellow
        'high': '#F97316',      # Orange
        'critical': '#EF4444',  # Red
    }

    SEVERITY_ICONS = {
        'info': 'ℹ️',
        'low': '📋',
        'medium': '⚠️',
        'high': '🔶',
        'critical': '🚨',
    }

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "vergus@lyntos.com")
        self.email_enabled = bool(self.smtp_user and self.smtp_password)

        if not self.email_enabled:
            logger.warning("Email disabled: SMTP credentials not configured")

    def create_notification(
        self,
        title: str,
        message: str,
        notification_type: str,
        severity: str = "info",
        category: str = "general",
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        source_url: Optional[str] = None,
        target_user: str = "all",
        target_role: str = "all",
        action_required: bool = False,
        action_type: Optional[str] = None,
        action_url: Optional[str] = None,
        expires_in_days: Optional[int] = None,
        send_email: bool = True
    ) -> str:
        """
        Yeni bildirim oluştur

        Returns:
            notification_id
        """
        notification_id = str(uuid.uuid4())
        expires_at = None
        if expires_in_days:
            expires_at = (datetime.utcnow() + timedelta(days=expires_in_days)).isoformat()

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO notifications (
                    id, title, message, notification_type, severity, category,
                    source_type, source_id, source_url, target_user, target_role,
                    action_required, action_type, action_url, expires_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                notification_id, title, message, notification_type, severity, category,
                source_type, source_id, source_url, target_user, target_role,
                1 if action_required else 0, action_type, action_url, expires_at
            ))
            conn.commit()

        logger.info(f"Notification created: {notification_id} - {title}")

        # Email gönder (uygunsa)
        if send_email and self.email_enabled:
            self._queue_email_notifications(notification_id, title, message, severity, target_user)

        return notification_id

    def create_from_ai_analysis(self, analysis: Dict) -> Optional[str]:
        """AI analizinden otomatik bildirim oluştur"""
        severity = analysis.get("severity", "info")

        # Sadece medium+ için bildirim oluştur
        if self.SEVERITY_ORDER.index(severity) < self.SEVERITY_ORDER.index("medium"):
            return None

        title = f"{self.SEVERITY_ICONS.get(severity, '📋')} AI Analiz: {analysis.get('summary', 'Yeni analiz')[:100]}"

        message = f"""
AI tarafından yeni bir analiz yapıldı.

Özet: {analysis.get('summary', '-')}

Detay: {analysis.get('detailed_analysis', '-')[:500]}

Önerilen Aksiyonlar: {analysis.get('action_required', '-')}
"""

        return self.create_notification(
            title=title,
            message=message,
            notification_type="ai_analysis",
            severity=severity,
            category="tax_change" if analysis.get("affected_parameters") else "general",
            source_type="ai_analysis",
            source_id=analysis.get("analysis_id"),
            source_url=f"/v2/vergus/ai/{analysis.get('analysis_id')}",
            action_required=bool(analysis.get("affected_parameters")),
            action_type="review" if analysis.get("affected_parameters") else None,
            action_url=f"/v2/vergus/ai/{analysis.get('analysis_id')}"
        )

    def create_from_company_change(self, change: Dict) -> str:
        """Şirket değişikliğinden bildirim oluştur"""
        change_type = change.get("change_type", "unknown")
        company_name = change.get("company_name", "Bilinmeyen Şirket")

        # Değişiklik tipine göre severity
        severity_map = {
            "liquidation_start": "critical",
            "liquidation_end": "high",
            "merger": "high",
            "demerger": "high",
            "capital_increase": "medium",
            "capital_decrease": "medium",
            "establishment": "low",
            "board_change": "low",
        }
        severity = severity_map.get(change_type, "info")

        # Değişiklik tipine göre başlık
        type_labels = {
            "liquidation_start": "🚨 Tasfiyeye Giriş",
            "liquidation_end": "📦 Tasfiye Sonu",
            "merger": "🤝 Birleşme",
            "demerger": "✂️ Bölünme",
            "capital_increase": "📈 Sermaye Artırımı",
            "capital_decrease": "📉 Sermaye Azaltımı",
            "establishment": "🏗️ Yeni Kuruluş",
            "board_change": "👥 Yönetim Değişikliği",
        }
        type_label = type_labels.get(change_type, f"📋 {change_type}")

        title = f"{type_label}: {company_name}"

        message = f"""
Müşteriniz {company_name} için ticaret sicilinde değişiklik tespit edildi.

Değişiklik: {change_type}
Eski Değer: {change.get('old_value', '-')}
Yeni Değer: {change.get('new_value', '-')}
TTSG Tarihi: {change.get('ttsg_date', '-')}

Lütfen gerekli işlemleri yapınız.
"""

        return self.create_notification(
            title=title,
            message=message,
            notification_type="registry",
            severity=severity,
            category="company_change",
            source_type="company_change",
            source_id=change.get("id"),
            source_url=f"/v2/vergus/registry/{change.get('tax_number')}",
            action_required=severity in ["high", "critical"],
            action_type="review",
            action_url=f"/v2/vergus/registry/{change.get('tax_number')}"
        )

    def create_deadline_reminder(
        self,
        title: str,
        deadline_date: str,
        description: str,
        days_remaining: int,
        target_user: str = "all"
    ) -> str:
        """Deadline hatırlatma bildirimi"""

        if days_remaining <= 7:
            severity = "critical"
            icon = "🚨"
        elif days_remaining <= 30:
            severity = "high"
            icon = "⏰"
        elif days_remaining <= 90:
            severity = "medium"
            icon = "📅"
        else:
            severity = "low"
            icon = "📋"

        full_title = f"{icon} {title} - {days_remaining} gün kaldı"

        message = f"""
{description}

Son Tarih: {deadline_date}
Kalan Süre: {days_remaining} gün

Lütfen gerekli işlemleri zamanında tamamlayınız.
"""

        return self.create_notification(
            title=full_title,
            message=message,
            notification_type="deadline",
            severity=severity,
            category="deadlines",
            target_user=target_user,
            action_required=True,
            action_type="update",
            expires_in_days=days_remaining + 1
        )

    def get_user_notifications(
        self,
        user_id: str,
        include_read: bool = False,
        severity_filter: Optional[str] = None,
        category_filter: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Kullanıcı bildirimlerini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT * FROM notifications
                WHERE (target_user = ? OR target_user = 'all')
                AND is_dismissed = 0
                AND (expires_at IS NULL OR expires_at > datetime('now'))
            """
            params = [user_id]

            if not include_read:
                query += " AND is_read = 0"

            if severity_filter:
                query += " AND severity = ?"
                params.append(severity_filter)

            if category_filter:
                query += " AND category = ?"
                params.append(category_filter)

            # Order by severity (critical first) then by date
            query += """
                ORDER BY
                    CASE severity
                        WHEN 'critical' THEN 5
                        WHEN 'high' THEN 4
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 2
                        ELSE 1
                    END DESC,
                    created_at DESC
                LIMIT ?
            """
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [dict(row) for row in rows]

    def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Bildirimi okundu olarak işaretle"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications
                SET is_read = 1, read_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            """, (notification_id,))
            conn.commit()
        return True

    def mark_all_as_read(self, user_id: str) -> int:
        """Tüm bildirimleri okundu olarak işaretle"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications
                SET is_read = 1, read_at = datetime('now'), updated_at = datetime('now')
                WHERE (target_user = ? OR target_user = 'all')
                AND is_read = 0
            """, (user_id,))
            conn.commit()
            return cursor.rowcount

    def dismiss_notification(self, notification_id: str) -> bool:
        """Bildirimi kaldır"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications
                SET is_dismissed = 1, dismissed_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            """, (notification_id,))
            conn.commit()
        return True

    def complete_action(self, notification_id: str) -> bool:
        """Bildirim aksiyonunu tamamlandı olarak işaretle"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications
                SET action_completed = 1, action_completed_at = datetime('now'), updated_at = datetime('now')
                WHERE id = ?
            """, (notification_id,))
            conn.commit()
        return True

    def get_notification_stats(self, user_id: str) -> Dict:
        """Bildirim istatistikleri"""
        with get_connection() as conn:
            cursor = conn.cursor()

            # Get all active notifications for user
            cursor.execute("""
                SELECT * FROM notifications
                WHERE (target_user = ? OR target_user = 'all')
                AND is_dismissed = 0
                AND (expires_at IS NULL OR expires_at > datetime('now'))
            """, (user_id,))

            all_notifs = cursor.fetchall()

            stats = {
                "total": len(all_notifs),
                "unread": 0,
                "by_severity": {},
                "by_category": {},
                "action_required": 0
            }

            for n in all_notifs:
                n_dict = dict(n)
                if not n_dict.get('is_read'):
                    stats["unread"] += 1

                severity = n_dict.get('severity') or "info"
                stats["by_severity"][severity] = stats["by_severity"].get(severity, 0) + 1

                category = n_dict.get('category') or "general"
                stats["by_category"][category] = stats["by_category"].get(category, 0) + 1

                if n_dict.get('action_required') and not n_dict.get('action_completed'):
                    stats["action_required"] += 1

            return stats

    def get_notification_by_id(self, notification_id: str) -> Optional[Dict]:
        """Belirli bir bildirimi getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notifications WHERE id = ?", (notification_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def _queue_email_notifications(
        self,
        notification_id: str,
        title: str,
        message: str,
        severity: str,
        target_user: str
    ):
        """Email kuyruğuna ekle"""
        with get_connection() as conn:
            cursor = conn.cursor()

            # Hedef kullanıcının email tercihlerini al
            if target_user == "all":
                cursor.execute("""
                    SELECT * FROM notification_preferences
                    WHERE email_enabled = 1
                """)
            else:
                cursor.execute("""
                    SELECT * FROM notification_preferences
                    WHERE user_id = ? AND email_enabled = 1
                """, (target_user,))

            prefs = cursor.fetchall()

            for pref in prefs:
                pref_dict = dict(pref)
                # Severity filtresi
                min_sev = pref_dict.get('min_severity') or "low"
                if self.SEVERITY_ORDER.index(severity) < self.SEVERITY_ORDER.index(min_sev):
                    continue

                email = pref_dict.get('email')
                if not email:
                    continue

                # Kuyruğa ekle
                cursor.execute("""
                    INSERT INTO email_queue (
                        id, notification_id, recipient_email, subject,
                        body_html, body_text, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
                """, (
                    str(uuid.uuid4()),
                    notification_id,
                    email,
                    f"[VERGUS] {title}",
                    self._generate_email_html(title, message, severity),
                    message
                ))

            conn.commit()

    def _generate_email_html(self, title: str, message: str, severity: str) -> str:
        """Email HTML şablonu"""
        color = self.SEVERITY_COLORS.get(severity, "#3B82F6")
        icon = self.SEVERITY_ICONS.get(severity, "📋")

        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: {color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        .button {{ display: inline-block; background: {color}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>{icon} {title}</h2>
        </div>
        <div class="content">
            <p>{message.replace(chr(10), '<br>')}</p>
            <a href="https://lyntos.app/v2/vergus/notifications" class="button">Detayları Gör</a>
        </div>
        <div class="footer">
            <p>Bu email VERGUS bildirim sistemi tarafından gönderilmiştir.</p>
            <p>Bildirim tercihlerinizi değiştirmek için <a href="https://lyntos.app/settings/notifications">buraya tıklayın</a>.</p>
        </div>
    </div>
</body>
</html>
"""

    def process_email_queue(self) -> int:
        """Email kuyruğunu işle"""
        if not self.email_enabled:
            return 0

        sent_count = 0

        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM email_queue
                WHERE status = 'pending' AND attempts < 3
            """)
            pending = cursor.fetchall()

            for email in pending:
                email_dict = dict(email)
                try:
                    self._send_email(
                        email_dict['recipient_email'],
                        email_dict['subject'],
                        email_dict['body_html'],
                        email_dict['body_text']
                    )

                    cursor.execute("""
                        UPDATE email_queue
                        SET status = 'sent', sent_at = datetime('now')
                        WHERE id = ?
                    """, (email_dict['id'],))

                    # Notification'ı da güncelle
                    cursor.execute("""
                        UPDATE notifications
                        SET email_sent = 1, email_sent_at = datetime('now')
                        WHERE id = ?
                    """, (email_dict['notification_id'],))

                    sent_count += 1

                except Exception as e:
                    logger.error(f"Email send failed: {e}")
                    new_attempts = email_dict['attempts'] + 1
                    new_status = "failed" if new_attempts >= 3 else "pending"
                    cursor.execute("""
                        UPDATE email_queue
                        SET attempts = ?, last_attempt_at = datetime('now'),
                            error_message = ?, status = ?
                        WHERE id = ?
                    """, (new_attempts, str(e), new_status, email_dict['id']))

            conn.commit()

        return sent_count

    def _send_email(self, to: str, subject: str, html: str, text: str):
        """SMTP ile email gönder"""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = to

        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.from_email, to, msg.as_string())

    def get_email_queue(self, status: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Email kuyruğunu getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            if status:
                cursor.execute("""
                    SELECT * FROM email_queue
                    WHERE status = ?
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (status, limit))
            else:
                cursor.execute("""
                    SELECT * FROM email_queue
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,))

            rows = cursor.fetchall()
            return [dict(row) for row in rows]


# Singleton instance
notification_service = NotificationService()
