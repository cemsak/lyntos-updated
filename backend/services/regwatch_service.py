"""
LYNTOS RegWatch Service - Phase 1 (S3)
Always-Current mevzuat monitoring service

Features:
- Fetch from Tier 1 official sources only
- Hash-based change detection
- Conservative impact mapping
- Manual review queue
"""

import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Literal
from dataclasses import dataclass

from .regwatch_sources import (
    OFFICIAL_SOURCES,
    get_enabled_sources,
    validate_source_for_regwatch
)


@dataclass
class DocumentRecord:
    """Mevzuat dokumani kaydi"""
    doc_id: str
    source_name: str
    doc_type: Literal["kanun", "teblig", "sirkuler", "karar", "other"]
    title_tr: str
    publication_date: str  # ISO 8601
    content_hash: str  # SHA-256
    version: int
    url: str
    fetched_at: str  # ISO 8601
    category: List[str]  # ["VUK", "KV", "KDV"]


@dataclass
class ChangeRecord:
    """Degisiklik kaydi"""
    change_id: str
    detected_at: str  # ISO 8601
    change_type: Literal["new", "modified", "deprecated"]
    doc_id: str
    old_hash: Optional[str]
    new_hash: str
    diff_summary: Dict
    review_status: Literal["pending", "confirmed", "false_positive", "dismissed"]
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]


class RegWatchService:
    """
    RegWatch core service.

    Phase 1 (S3):
    - Bootstrap: Fetch sources
    - Hash calculation
    - Change detection
    - Conservative impact map
    """

    def __init__(self):
        self.enabled_sources = get_enabled_sources()

    @staticmethod
    def calculate_hash(content: str) -> str:
        """
        Calculate SHA-256 hash of content.

        Args:
            content: Document content (text)

        Returns:
            str: Hex digest of SHA-256 hash
        """
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    async def fetch_from_source(
        self,
        source_name: str,
        dry_run: bool = False
    ) -> Dict:
        """
        Fetch documents from a Tier 1 source.

        Args:
            source_name: Source identifier (e.g., "resmi_gazete")
            dry_run: If True, don't save to DB

        Returns:
            dict: Fetch result with documents and metadata
        """
        # Validate source
        validation = validate_source_for_regwatch(source_name)
        if not validation["valid"]:
            return {
                "status": "error",
                "reason": validation["reason"],
                "action": validation["action"]
            }

        source = OFFICIAL_SOURCES[source_name]

        # TODO: Implement actual fetching based on source.method
        # For now: return mock structure

        result = {
            "status": "success",
            "source_name": source.name,
            "method": source.method,
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "documents": [],  # TODO: Populate with actual docs
            "errors": []
        }

        # Mock document (TODO: Replace with real fetch)
        if not dry_run:
            mock_doc = {
                "doc_id": f"{source_name}_mock_001",
                "source_name": source.name,
                "doc_type": "teblig",
                "title_tr": f"Mock document from {source.name}",
                "publication_date": "2026-01-01",
                "content_hash": self.calculate_hash("mock content"),
                "version": 1,
                "url": source.url,
                "fetched_at": result["fetched_at"],
                "category": ["VUK"]
            }
            result["documents"].append(mock_doc)

        return result

    async def detect_changes(
        self,
        new_documents: List[DocumentRecord],
        existing_documents: List[DocumentRecord]
    ) -> List[ChangeRecord]:
        """
        Detect changes between new and existing documents.

        Args:
            new_documents: Newly fetched documents
            existing_documents: Documents from DB

        Returns:
            list: Change records
        """
        changes = []
        existing_by_id = {doc.doc_id: doc for doc in existing_documents}

        for new_doc in new_documents:
            if new_doc.doc_id not in existing_by_id:
                # New document
                change = ChangeRecord(
                    change_id=f"CHG_{new_doc.doc_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                    detected_at=datetime.utcnow().isoformat() + "Z",
                    change_type="new",
                    doc_id=new_doc.doc_id,
                    old_hash=None,
                    new_hash=new_doc.content_hash,
                    diff_summary={
                        "type": "new_document",
                        "title": new_doc.title_tr,
                        "category": new_doc.category
                    },
                    review_status="pending",
                    reviewed_by=None,
                    reviewed_at=None
                )
                changes.append(change)

            else:
                # Existing document - check if modified
                existing_doc = existing_by_id[new_doc.doc_id]
                if new_doc.content_hash != existing_doc.content_hash:
                    change = ChangeRecord(
                        change_id=f"CHG_{new_doc.doc_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                        detected_at=datetime.utcnow().isoformat() + "Z",
                        change_type="modified",
                        doc_id=new_doc.doc_id,
                        old_hash=existing_doc.content_hash,
                        new_hash=new_doc.content_hash,
                        diff_summary={
                            "type": "content_modified",
                            "title": new_doc.title_tr,
                            "old_version": existing_doc.version,
                            "new_version": new_doc.version
                        },
                        review_status="pending",
                        reviewed_by=None,
                        reviewed_at=None
                    )
                    changes.append(change)

        return changes

    async def generate_impact_map(
        self,
        change: ChangeRecord
    ) -> Dict:
        """
        Generate impact map for a change (Phase 1: Conservative).

        Args:
            change: Change record

        Returns:
            dict: Impact map
        """
        # Phase 1: Rule-based keyword matching (conservative)

        RULE_KEYWORDS = {
            "VUK": ["vergi usul", "defter", "belge", "muhafaza", "kayit"],
            "KV": ["kurumlar vergisi", "mali kar", "ticari kar", "matrah"],
            "KDV": ["katma deger", "iade", "indirim", "tevkifat"],
            "TTK": ["ticaret kanunu", "sicil", "bilanco"]
        }

        # Extract text from change
        change_text = str(change.diff_summary.get("title", "")).lower()

        affected_rules = []
        for category, keywords in RULE_KEYWORDS.items():
            if any(kw in change_text for kw in keywords):
                affected_rules.append({
                    "rule_id": f"RULE_{category}",
                    "rule_name": category,
                    "impact_type": "related",  # Conservative: "related" not "direct"
                    "confidence": 0.5  # Low confidence, requires review
                })

        impact_map = {
            "impact_id": f"IMP_{change.change_id}",
            "change_id": change.change_id,
            "affected_rules": affected_rules,
            "affected_kpis": [],  # TODO: Map rules -> KPIs
            "client_impact": {
                "affected_clients_count": 0,  # TODO: Calculate
                "urgency": "this_month"  # Conservative default
            },
            "confidence": 0.5,  # Phase 1: Low confidence
            "requires_manual_review": True
        }

        return impact_map

    async def run_check(self, days_back: int = 7) -> Dict:
        """
        Run RegWatch check (main workflow).

        Args:
            days_back: How many days back to check

        Returns:
            dict: Check result
        """
        result = {
            "check_id": f"CHECK_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "started_at": datetime.utcnow().isoformat() + "Z",
            "days_back": days_back,
            "sources_checked": [],
            "new_documents": 0,
            "changes_detected": 0,
            "errors": []
        }

        # Fetch from each enabled source
        for source_name, source in self.enabled_sources.items():
            try:
                fetch_result = await self.fetch_from_source(source_name)

                if fetch_result["status"] == "success":
                    result["sources_checked"].append({
                        "source": source.name,
                        "status": "success",
                        "documents": len(fetch_result["documents"])
                    })
                    result["new_documents"] += len(fetch_result["documents"])
                else:
                    result["errors"].append({
                        "source": source.name,
                        "error": fetch_result["reason"]
                    })

            except Exception as e:
                result["errors"].append({
                    "source": source_name,
                    "error": str(e)
                })

        result["completed_at"] = datetime.utcnow().isoformat() + "Z"
        result["status"] = "completed" if not result["errors"] else "completed_with_errors"

        return result


# Singleton instance
regwatch_service = RegWatchService()


# CLI Test
if __name__ == "__main__":
    import asyncio

    async def main():
        print("LYNTOS RegWatch Service - Test")
        print("=" * 50)

        # Test hash calculation
        test_content = "Test mevzuat content"
        hash_result = RegWatchService.calculate_hash(test_content)
        print(f"\nHash test: {hash_result[:16]}...")

        # Test run_check
        print("\nRunning check (7 days)...")
        result = await regwatch_service.run_check(days_back=7)

        print(f"\nCheck ID: {result['check_id']}")
        print(f"Status: {result['status']}")
        print(f"Sources checked: {len(result['sources_checked'])}")
        print(f"New documents: {result['new_documents']}")

        if result['sources_checked']:
            print("\nSources:")
            for src in result['sources_checked']:
                print(f"  - {src['source']}: {src['documents']} docs")

        if result['errors']:
            print("\nErrors:")
            for err in result['errors']:
                print(f"  - {err['source']}: {err['error']}")

    asyncio.run(main())
