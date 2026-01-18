"""Feed Service Tests"""
import pytest
from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus, ActionStatus
)
from services.feed import FeedService


class TestFeedItem:
    """Test FeedItem model"""

    def test_feeditem_requires_evidence(self):
        """FeedItem must have at least 1 evidence_ref (Anayasa)"""
        with pytest.raises(ValueError, match="evidence_refs cannot be empty"):
            FeedItem(
                id="TEST-001",
                scope=FeedScope("SMMM-1", "CLIENT-1", "2024-Q1"),
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(amount_try=1000),
                title="Test",
                summary="Test summary",
                why="Test reason",
                evidence_refs=[],  # Empty - should fail
                actions=[FeedAction("ACT-1", "Test action")]
            )

    def test_feeditem_requires_actions(self):
        """FeedItem must have at least 1 action (Anayasa)"""
        with pytest.raises(ValueError, match="actions cannot be empty"):
            FeedItem(
                id="TEST-001",
                scope=FeedScope("SMMM-1", "CLIENT-1", "2024-Q1"),
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(amount_try=1000),
                title="Test",
                summary="Test summary",
                why="Test reason",
                evidence_refs=[EvidenceRef("EVD-1", "mizan", "Test evidence")],
                actions=[]  # Empty - should fail
            )

    def test_feeditem_requires_why(self):
        """FeedItem must have why field (Explainability)"""
        with pytest.raises(ValueError, match="why cannot be empty"):
            FeedItem(
                id="TEST-001",
                scope=FeedScope("SMMM-1", "CLIENT-1", "2024-Q1"),
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(amount_try=1000),
                title="Test",
                summary="Test summary",
                why="",  # Empty - should fail
                evidence_refs=[EvidenceRef("EVD-1", "mizan", "Test evidence")],
                actions=[FeedAction("ACT-1", "Test action")]
            )

    def test_feeditem_score_range(self):
        """FeedItem score must be 0-100"""
        with pytest.raises(ValueError, match="score must be 0-100"):
            FeedItem(
                id="TEST-001",
                scope=FeedScope("SMMM-1", "CLIENT-1", "2024-Q1"),
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=150,  # Invalid - should fail
                impact=FeedImpact(),
                title="Test",
                summary="Test",
                why="Test reason",
                evidence_refs=[EvidenceRef("EVD-1", "mizan", "Test")],
                actions=[FeedAction("ACT-1", "Test")]
            )

    def test_valid_feeditem(self):
        """Valid FeedItem should be created"""
        item = FeedItem(
            id="TEST-001",
            scope=FeedScope("SMMM-1", "CLIENT-1", "2024-Q1"),
            category=FeedCategory.VDK,
            severity=FeedSeverity.CRITICAL,
            score=95,
            impact=FeedImpact(amount_try=125000, points=15),
            title="KDV Uyumsuzlugu",
            summary="KDV farki tespit edildi",
            why="191 hesap ile beyanname tutarsiz",
            evidence_refs=[
                EvidenceRef("EVD-1", "mizan", "Mizan", status=EvidenceStatus.AVAILABLE),
                EvidenceRef("EVD-2", "beyan", "Beyanname", status=EvidenceStatus.MISSING)
            ],
            actions=[FeedAction("ACT-1", "Beyanname yukle")]
        )

        assert item.id == "TEST-001"
        assert item.severity == FeedSeverity.CRITICAL
        assert not item.has_complete_evidence()
        assert len(item.get_missing_evidence()) == 1

    def test_feeditem_to_dict(self):
        """Test FeedItem serialization to dict"""
        item = FeedItem(
            id="TEST-001",
            scope=FeedScope("SMMM-1", "CLIENT-1", "2024-Q1"),
            category=FeedCategory.VDK,
            severity=FeedSeverity.HIGH,
            score=80,
            impact=FeedImpact(amount_try=1000),
            title="Test",
            summary="Test summary",
            why="Test reason",
            evidence_refs=[EvidenceRef("EVD-1", "mizan", "Test evidence")],
            actions=[FeedAction("ACT-1", "Test action")]
        )

        d = item.to_dict()
        assert d["id"] == "TEST-001"
        assert d["category"] == "VDK"
        assert d["severity"] == "HIGH"
        assert len(d["evidence_refs"]) == 1
        assert len(d["actions"]) == 1


class TestFeedService:
    """Test Feed Service"""

    @pytest.fixture
    def service(self):
        return FeedService()

    @pytest.fixture
    def sample_item(self):
        return FeedItem(
            id="TEST-001",
            scope=FeedScope("SMMM-1", "CLIENT-1", "2024-Q1"),
            category=FeedCategory.VDK,
            severity=FeedSeverity.CRITICAL,
            score=95,
            impact=FeedImpact(amount_try=125000),
            title="Test Item",
            summary="Test summary",
            why="Test reason",
            evidence_refs=[EvidenceRef("EVD-1", "mizan", "Test evidence")],
            actions=[FeedAction("ACT-1", "Test action")]
        )

    @pytest.fixture
    def multiple_items(self):
        """Fixture with multiple items of different severities and categories"""
        scope = FeedScope("SMMM-1", "CLIENT-1", "2024-Q1")
        return [
            FeedItem(
                id="TEST-CRIT-001",
                scope=scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.CRITICAL,
                score=95,
                impact=FeedImpact(amount_try=125000),
                title="Critical VDK Item",
                summary="Critical summary",
                why="Critical reason",
                evidence_refs=[EvidenceRef("EVD-1", "mizan", "Mizan evidence")],
                actions=[FeedAction("ACT-1", "Critical action")]
            ),
            FeedItem(
                id="TEST-HIGH-001",
                scope=scope,
                category=FeedCategory.MUTABAKAT,
                severity=FeedSeverity.HIGH,
                score=82,
                impact=FeedImpact(amount_try=45000),
                title="High Mutabakat Item",
                summary="High summary",
                why="High reason",
                evidence_refs=[EvidenceRef("EVD-2", "banka", "Banka evidence")],
                actions=[FeedAction("ACT-2", "High action")]
            ),
            FeedItem(
                id="TEST-MED-001",
                scope=scope,
                category=FeedCategory.BELGE,
                severity=FeedSeverity.MEDIUM,
                score=65,
                impact=FeedImpact(points=5),
                title="Medium Belge Item",
                summary="Medium summary",
                why="Medium reason",
                evidence_refs=[EvidenceRef("EVD-3", "e-fatura", "E-fatura evidence")],
                actions=[FeedAction("ACT-3", "Medium action")]
            ),
            FeedItem(
                id="TEST-LOW-001",
                scope=scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.LOW,
                score=30,
                impact=FeedImpact(points=2),
                title="Low VDK Item",
                summary="Low summary",
                why="Low reason",
                evidence_refs=[EvidenceRef("EVD-4", "mizan", "Mizan evidence 2")],
                actions=[FeedAction("ACT-4", "Low action")]
            )
        ]

    def test_add_and_get_feed_items(self, service, sample_item):
        """Test adding and retrieving feed items"""
        service.add_feed_item(sample_item)

        items = service.get_feed_items("SMMM-1", "CLIENT-1", "2024-Q1")
        assert len(items) == 1
        assert items[0].id == "TEST-001"

    def test_severity_filter(self, service, multiple_items):
        """Test filtering by severity"""
        for item in multiple_items:
            service.add_feed_item(item)

        critical_only = service.get_feed_items(
            "SMMM-1", "CLIENT-1", "2024-Q1",
            severity_filter=[FeedSeverity.CRITICAL]
        )

        all_items = service.get_feed_items("SMMM-1", "CLIENT-1", "2024-Q1")

        assert len(critical_only) <= len(all_items)
        for item in critical_only:
            assert item.severity == FeedSeverity.CRITICAL

    def test_get_critical_and_high(self, service, multiple_items):
        """Test getting only CRITICAL and HIGH items"""
        for item in multiple_items:
            service.add_feed_item(item)

        items = service.get_critical_and_high("SMMM-1", "CLIENT-1", "2024-Q1")

        assert len(items) == 2  # CRITICAL and HIGH only
        for item in items:
            assert item.severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH]

    def test_category_filter(self, service, multiple_items):
        """Test filtering by category"""
        for item in multiple_items:
            service.add_feed_item(item)

        vdk_only = service.get_feed_items(
            "SMMM-1", "CLIENT-1", "2024-Q1",
            category_filter=[FeedCategory.VDK]
        )

        assert len(vdk_only) == 2  # Two VDK items
        for item in vdk_only:
            assert item.category == FeedCategory.VDK

    def test_sorting_by_severity_and_score(self, service, multiple_items):
        """Test that items are sorted by severity then score"""
        for item in multiple_items:
            service.add_feed_item(item)

        items = service.get_feed_items("SMMM-1", "CLIENT-1", "2024-Q1")

        assert len(items) == 4
        # First item should be CRITICAL (highest severity)
        assert items[0].severity == FeedSeverity.CRITICAL
        # Second should be HIGH
        assert items[1].severity == FeedSeverity.HIGH

    def test_empty_feed_returns_empty_list(self, service):
        """Test that getting items from empty feed returns empty list"""
        items = service.get_feed_items("SMMM-1", "CLIENT-1", "2024-Q1")
        assert items == []
