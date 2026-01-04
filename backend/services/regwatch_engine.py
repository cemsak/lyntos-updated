"""
RegWatch: Mevzuat Izleme Motoru - ACTIVE MODE

Kaynaklar:
- resmigazete.gov.tr (gunluk)
- gib.gov.tr/mevzuat (haftalik)
- mevzuat.gov.tr (haftalik)
- turmob.org.tr (haftalik)

Trust Score: 1.0 (Tier 1 - Resmi Kaynaklar)
"""

from dataclasses import dataclass
from typing import List, Dict, Optional
import json
import logging
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)


@dataclass
class MevzuatChange:
    """Mevzuat degisikligi"""
    id: int
    source: str  # "resmigazete", "gib", "mevzuat", "turmob"
    title: str
    url: str
    published_date: str
    content_hash: str
    impact_rules: List[str]  # Etkilenen rule_id'ler
    change_type: str  # "new", "amendment", "repeal"
    status: str  # "pending", "approved", "rejected"
    trust_score: float = 1.0


class RegWatchEngine:
    """
    Mevzuat izleme motoru - ACTIVE MODE

    BOOTSTRAP MODE: changes = "NA", trust_score = 0.0
    ACTIVE MODE: Real database queries, trust_score = 1.0
    """

    SOURCES = [
        {"id": "resmigazete", "name": "Resmi Gazete", "url": "resmigazete.gov.tr", "frequency": "daily"},
        {"id": "gib", "name": "GIB Mevzuat", "url": "gib.gov.tr/mevzuat", "frequency": "weekly"},
        {"id": "mevzuat", "name": "Mevzuat.gov.tr", "url": "mevzuat.gov.tr", "frequency": "weekly"},
        {"id": "turmob", "name": "TURMOB Sirkuler", "url": "turmob.org.tr", "frequency": "weekly"}
    ]

    def __init__(self, bootstrap_mode: bool = False):
        """
        Initialize RegWatch Engine

        Args:
            bootstrap_mode: If True, return "NA" instead of real counts
        """
        self.bootstrap_mode = bootstrap_mode
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    def check_last_7_days(self) -> Dict:
        """Son 7 gunun degisikliklerini kontrol et"""

        if self.bootstrap_mode:
            return {
                "changes": "NA",
                "status": "BOOTSTRAP",
                "trust_score": 0.0,
                "message": "Sistem baslatma modunda. Scraper calistirilmadi.",
                "sources": [s["url"] for s in self.SOURCES],
                "last_check": datetime.utcnow().isoformat() + "Z",
                "items": []
            }

        # ACTIVE MODE - Query database
        cutoff = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

        with get_connection() as conn:
            cursor = conn.cursor()

            # Get count
            cursor.execute(
                "SELECT COUNT(*) FROM regwatch_events WHERE detected_at >= ?",
                [cutoff]
            )
            count = cursor.fetchone()[0]

            # Get events
            cursor.execute(
                """
                SELECT id, event_type, source, title, canonical_url,
                       published_date, impact_rules, status, detected_at
                FROM regwatch_events
                WHERE detected_at >= ?
                ORDER BY detected_at DESC
                LIMIT 20
                """,
                [cutoff]
            )

            events = []
            for row in cursor.fetchall():
                events.append({
                    'id': row[0],
                    'event_type': row[1],
                    'source': row[2],
                    'title': row[3],
                    'canonical_url': row[4],
                    'published_date': row[5],
                    'impact_rules': json.loads(row[6]) if row[6] else [],
                    'status': row[7],
                    'detected_at': row[8]
                })

        return {
            "changes": count,
            "status": "ACTIVE",
            "trust_score": 1.0,
            "sources": [s["url"] for s in self.SOURCES],
            "last_check": datetime.utcnow().isoformat() + "Z",
            "items": events,
            "pending_count": sum(1 for e in events if e['status'] == 'pending')
        }

    def check_last_30_days(self) -> Dict:
        """Son 30 gunun degisikliklerini kontrol et"""

        if self.bootstrap_mode:
            return {
                "changes": "NA",
                "status": "BOOTSTRAP",
                "trust_score": 0.0,
                "impact_map": [],
                "items": []
            }

        cutoff = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT COUNT(*) FROM regwatch_events WHERE detected_at >= ?",
                [cutoff]
            )
            count = cursor.fetchone()[0]

            # Impact map: which rules are affected most
            cursor.execute(
                """
                SELECT impact_rules FROM regwatch_events
                WHERE detected_at >= ? AND impact_rules IS NOT NULL
                """,
                [cutoff]
            )

            rule_counts = {}
            for row in cursor.fetchall():
                if row[0]:
                    rules = json.loads(row[0])
                    for rule in rules:
                        rule_counts[rule] = rule_counts.get(rule, 0) + 1

            impact_map = [
                {'rule_id': rule, 'impact_count': count}
                for rule, count in sorted(rule_counts.items(), key=lambda x: -x[1])
            ]

        return {
            "changes": count,
            "status": "ACTIVE",
            "trust_score": 1.0,
            "impact_map": impact_map[:10],  # Top 10 impacted rules
            "items": []
        }

    def get_pending_events(self) -> List[Dict]:
        """Get events pending expert approval"""

        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT id, event_type, source, title, canonical_url,
                       published_date, impact_rules, detected_at
                FROM regwatch_events
                WHERE status = 'pending'
                ORDER BY detected_at DESC
                """
            )

            events = []
            for row in cursor.fetchall():
                events.append({
                    'id': row[0],
                    'event_type': row[1],
                    'source': row[2],
                    'title': row[3],
                    'canonical_url': row[4],
                    'published_date': row[5],
                    'impact_rules': json.loads(row[6]) if row[6] else [],
                    'detected_at': row[7]
                })

        return events

    def get_sources(self) -> List[Dict]:
        """Izlenen kaynaklari dondur"""
        return self.SOURCES

    def get_statistics(self) -> Dict:
        """Get RegWatch statistics"""

        with get_connection() as conn:
            cursor = conn.cursor()

            # Total counts by status
            cursor.execute(
                """
                SELECT status, COUNT(*) as count
                FROM regwatch_events
                GROUP BY status
                """
            )
            status_counts = {row[0]: row[1] for row in cursor.fetchall()}

            # Counts by source
            cursor.execute(
                """
                SELECT source, COUNT(*) as count
                FROM regwatch_events
                GROUP BY source
                """
            )
            source_counts = {row[0]: row[1] for row in cursor.fetchall()}

        return {
            "total": sum(status_counts.values()),
            "by_status": status_counts,
            "by_source": source_counts,
            "generated_at": datetime.utcnow().isoformat() + "Z"
        }


# Singleton instance - ACTIVE MODE by default
regwatch_engine = RegWatchEngine(bootstrap_mode=False)
