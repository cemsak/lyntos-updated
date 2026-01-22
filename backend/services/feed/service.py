"""
Feed Service
Manages feed items for LYNTOS cockpit - NOW USES DATABASE
LYNTOS Anayasa: Evidence-gated, Explainability Contract

V2 Refactor: Persistent storage in feed_items table
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import json
import logging

from database.db import get_connection
from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus, ActionStatus
)

logger = logging.getLogger(__name__)


class FeedService:
    """
    Feed Service - manages feed items with DATABASE persistence

    V2: All data stored in feed_items table (no more in-memory loss)
    """

    def add_item(
        self,
        tenant_id: str,
        client_id: str,
        period_id: str,
        item_type: str,
        title: str,
        message: str = None,
        severity: str = "INFO",
        metadata: dict = None
    ) -> int:
        """
        Add a feed item to the database

        Args:
            tenant_id: SMMM identifier
            client_id: Client identifier
            period_id: Period (e.g., "2025-Q2")
            item_type: Type of item ('risk', 'alert', 'info', 'upload', 'system')
            title: Title of the feed item
            message: Optional detailed message
            severity: Severity level ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')
            metadata: Optional JSON metadata

        Returns:
            ID of inserted item
        """
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO feed_items (tenant_id, client_id, period_id, type, title, message, severity, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id,
                client_id,
                period_id,
                item_type,
                title,
                message,
                severity,
                json.dumps(metadata) if metadata else None
            ))
            conn.commit()
            item_id = cursor.lastrowid
            logger.info(f"[FeedService] Added item {item_id}: {title} ({severity})")
            return item_id

    def get_feed(
        self,
        client_id: str,
        period_id: str,
        tenant_id: str = None,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get feed items for a specific client/period

        Args:
            client_id: Client identifier
            period_id: Period (e.g., "2025-Q2")
            tenant_id: Optional SMMM filter
            unread_only: If True, only return unread items
            limit: Max items to return

        Returns:
            List of feed item dicts
        """
        with get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT id, tenant_id, client_id, period_id, type, title, message,
                       severity, is_read, metadata, created_at
                FROM feed_items
                WHERE client_id = ? AND period_id = ?
            """
            params = [client_id, period_id]

            if tenant_id:
                query += " AND tenant_id = ?"
                params.append(tenant_id)

            if unread_only:
                query += " AND is_read = 0"

            # Order by severity (CRITICAL first) then by created_at (newest first)
            query += """
                ORDER BY
                    CASE severity
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        WHEN 'LOW' THEN 4
                        ELSE 5
                    END,
                    created_at DESC
                LIMIT ?
            """
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [dict(row) for row in rows]

    def mark_as_read(self, item_id: int) -> bool:
        """Mark a feed item as read"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE feed_items SET is_read = 1 WHERE id = ?", (item_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_unread_count(self, client_id: str, period_id: str) -> int:
        """Get count of unread items for a client/period"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM feed_items
                WHERE client_id = ? AND period_id = ? AND is_read = 0
            """, (client_id, period_id))
            return cursor.fetchone()[0]

    # Legacy compatibility methods for existing code

    def get_feed_items(
        self,
        smmm_id: str,
        client_id: str,
        period: str,
        severity_filter: Optional[List[FeedSeverity]] = None,
        category_filter: Optional[List[FeedCategory]] = None
    ) -> List[FeedItem]:
        """
        Legacy method - returns FeedItem objects for backward compatibility
        Reads from database and converts to FeedItem schema
        """
        items = self.get_feed(client_id, period, tenant_id=smmm_id)

        # Convert DB rows to FeedItem objects
        feed_items = []
        for row in items:
            try:
                # Map severity string to enum
                severity_map = {
                    'CRITICAL': FeedSeverity.CRITICAL,
                    'HIGH': FeedSeverity.HIGH,
                    'MEDIUM': FeedSeverity.MEDIUM,
                    'LOW': FeedSeverity.LOW,
                    'INFO': FeedSeverity.INFO
                }
                severity = severity_map.get(row.get('severity', 'INFO'), FeedSeverity.INFO)

                # Filter by severity if specified
                if severity_filter and severity not in severity_filter:
                    continue

                # Create EvidenceRef from row data
                evidence_ref = EvidenceRef(
                    ref_id=f"EVID-{row['id']}",
                    source_type="mizan",
                    description=row.get('message', '') or row['title'],
                    status=EvidenceStatus.AVAILABLE,
                    file_path=None,
                    account_code=None,
                    document_date=None,
                    metadata={}
                )

                # Create FeedAction
                action = FeedAction(
                    action_id=f"ACT-{row['id']}",
                    description="Kontrol et ve degerlendir",
                    responsible="SMMM",
                    deadline=None,
                    status=ActionStatus.PENDING,
                    priority=1 if severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH] else 2,
                    related_evidence=[f"EVID-{row['id']}"]
                )

                # Create FeedItem
                feed_item = FeedItem(
                    id=str(row['id']),
                    title=row['title'],
                    summary=row.get('message', '') or '',
                    why=f"VDK Analiz - {row.get('type', 'risk')}",
                    severity=severity,
                    category=FeedCategory.VDK,  # Default category for analysis results
                    score=70 if severity == FeedSeverity.HIGH else 50,
                    scope=FeedScope(
                        smmm_id=row.get('tenant_id', smmm_id),
                        client_id=row['client_id'],
                        period=row['period_id']
                    ),
                    impact=FeedImpact(
                        amount_try=0.0,
                        pct=None,
                        points=None
                    ),
                    evidence_refs=[evidence_ref],
                    actions=[action]
                )
                feed_items.append(feed_item)
            except Exception as e:
                logger.warning(f"[FeedService] Error converting row to FeedItem: {e}")
                continue

        return feed_items

    def get_critical_and_high(
        self,
        smmm_id: str,
        client_id: str,
        period: str
    ) -> List[FeedItem]:
        """Get only CRITICAL and HIGH severity items - used for Evidence Bundle"""
        return self.get_feed_items(
            smmm_id=smmm_id,
            client_id=client_id,
            period=period,
            severity_filter=[FeedSeverity.CRITICAL, FeedSeverity.HIGH]
        )

    def add_feed_item(self, item: FeedItem) -> FeedItem:
        """Legacy method - adds a FeedItem to database"""
        self.add_item(
            tenant_id=item.scope.smmm_id,
            client_id=item.scope.client_id,
            period_id=item.scope.period,
            item_type='risk' if item.severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH] else 'info',
            title=item.title,
            message=item.subtitle,
            severity=item.severity.value if hasattr(item.severity, 'value') else str(item.severity),
            metadata={'score': item.score, 'category': str(item.category)}
        )
        return item


# Singleton
_feed_service: Optional[FeedService] = None


def get_feed_service() -> FeedService:
    global _feed_service
    if _feed_service is None:
        _feed_service = FeedService()
    return _feed_service
