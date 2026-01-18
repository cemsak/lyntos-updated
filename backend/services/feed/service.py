"""
Feed Service
Manages feed items for LYNTOS cockpit
LYNTOS Anayasa: Evidence-gated, Explainability Contract
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus, ActionStatus
)


class FeedService:
    """
    Feed Service - manages feed items

    Note: In production, this would connect to database.
    For V1, we use in-memory storage. Data is added via add_feed_item().
    """

    def __init__(self):
        self._feed_items: Dict[str, List[FeedItem]] = {}  # key: "{client_id}:{period}"

    def _get_key(self, client_id: str, period: str) -> str:
        return f"{client_id}:{period}"

    def get_feed_items(
        self,
        smmm_id: str,
        client_id: str,
        period: str,
        severity_filter: Optional[List[FeedSeverity]] = None,
        category_filter: Optional[List[FeedCategory]] = None
    ) -> List[FeedItem]:
        """
        Get feed items for a specific client/period

        Args:
            smmm_id: SMMM identifier
            client_id: Client (mukellef) identifier
            period: Period (e.g., "2024-Q1")
            severity_filter: Optional filter by severity levels
            category_filter: Optional filter by categories

        Returns:
            List of FeedItem objects
        """
        key = self._get_key(client_id, period)
        items = self._feed_items.get(key, [])

        # Apply filters
        if severity_filter:
            items = [i for i in items if i.severity in severity_filter]
        if category_filter:
            items = [i for i in items if i.category in category_filter]

        # Sort by severity (CRITICAL first) then by score (descending)
        severity_order = {
            FeedSeverity.CRITICAL: 0,
            FeedSeverity.HIGH: 1,
            FeedSeverity.MEDIUM: 2,
            FeedSeverity.LOW: 3,
            FeedSeverity.INFO: 4
        }
        items.sort(key=lambda x: (severity_order[x.severity], -x.score))

        return items

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
        """Add a feed item"""
        key = self._get_key(item.scope.client_id, item.scope.period)
        if key not in self._feed_items:
            self._feed_items[key] = []
        self._feed_items[key].append(item)
        return item


# Singleton
_feed_service: Optional[FeedService] = None


def get_feed_service() -> FeedService:
    global _feed_service
    if _feed_service is None:
        _feed_service = FeedService()
    return _feed_service
