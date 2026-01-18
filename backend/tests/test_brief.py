"""
C-Level Brief Service Tests
Tests for D2: Brief generation
NO DUMMY DATA in production - test fixtures only
"""
import pytest
from datetime import datetime

from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus
)
from schemas.brief import (
    CLevelBrief, BriefSlide, SlideType, ContentSource,
    KPIMetric, RiskHighlight
)
from services.brief import BriefService


class TestBriefSlide:
    """Test BriefSlide model"""

    def test_slide_to_dict(self):
        """Test slide serialization"""
        slide = BriefSlide(
            slide_number=1,
            slide_type=SlideType.PERIOD_SUMMARY,
            title="Test Title",
            content={"key": "value"},
            source=ContentSource.SYSTEM
        )

        d = slide.to_dict()
        assert d["slide_number"] == 1
        assert d["slide_type"] == "period_summary"
        assert d["source"] == "system"

    def test_slide_evidence_refs_default(self):
        """Test slide evidence_refs defaults to empty list"""
        slide = BriefSlide(
            slide_number=1,
            slide_type=SlideType.PERIOD_SUMMARY,
            title="Test",
            content={}
        )
        assert slide.evidence_refs == []


class TestCLevelBrief:
    """Test CLevelBrief model"""

    def test_brief_max_5_slides(self):
        """Brief cannot have more than 5 slides"""
        slides = [
            BriefSlide(i, SlideType.PERIOD_SUMMARY, f"Slide {i}", {})
            for i in range(6)
        ]

        with pytest.raises(ValueError, match="cannot have more than 5 slides"):
            CLevelBrief(
                brief_id="TEST",
                smmm_id="SMMM-1",
                client_id="CLIENT-1",
                period="2024-Q1",
                generated_at=datetime.now(),
                slides=slides
            )

    def test_brief_requires_at_least_1_slide(self):
        """Brief must have at least 1 slide"""
        with pytest.raises(ValueError, match="must have at least 1 slide"):
            CLevelBrief(
                brief_id="TEST",
                smmm_id="SMMM-1",
                client_id="CLIENT-1",
                period="2024-Q1",
                generated_at=datetime.now(),
                slides=[]
            )

    def test_valid_brief(self):
        """Valid brief should be created"""
        slides = [
            BriefSlide(1, SlideType.PERIOD_SUMMARY, "Summary", {"kpis": []}),
            BriefSlide(2, SlideType.SMMM_SIGNATURE, "Signature", {})
        ]

        brief = CLevelBrief(
            brief_id="BRIEF-TEST",
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            generated_at=datetime.now(),
            slides=slides
        )

        assert brief.brief_id == "BRIEF-TEST"
        assert len(brief.slides) == 2

    def test_brief_to_dict(self):
        """Test brief serialization"""
        slides = [
            BriefSlide(1, SlideType.PERIOD_SUMMARY, "Summary", {"kpis": []})
        ]

        brief = CLevelBrief(
            brief_id="BRIEF-TEST",
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            generated_at=datetime.now(),
            slides=slides,
            total_risks=2,
            critical_count=1
        )

        d = brief.to_dict()
        assert d["brief_id"] == "BRIEF-TEST"
        assert d["metadata"]["total_risks"] == 2
        assert d["metadata"]["critical_count"] == 1

    def test_brief_generate_id(self):
        """Test brief ID generation"""
        brief_id = CLevelBrief.generate_id("CLIENT-1", "2024-Q1")
        assert brief_id.startswith("BRIEF-")
        assert "CLIENT-1" in brief_id
        assert "2024-Q1" in brief_id


class TestBriefService:
    """Test Brief Service"""

    @pytest.fixture
    def service(self):
        return BriefService()

    @pytest.fixture
    def sample_feed_items(self):
        """Test fixture - NOT production data"""
        scope = FeedScope("SMMM-1", "CLIENT-1", "2024-Q1")
        return [
            FeedItem(
                id="FEED-001",
                scope=scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.CRITICAL,
                score=95,
                impact=FeedImpact(amount_try=125000),
                title="KDV Uyumsuzlugu",
                summary="KDV farki tespit edildi",
                why="191 hesap tutarsiz",
                evidence_refs=[
                    EvidenceRef("EVD-001", "mizan", "Mizan", status=EvidenceStatus.AVAILABLE),
                    EvidenceRef("EVD-002", "beyan", "Beyanname", status=EvidenceStatus.MISSING)
                ],
                actions=[FeedAction("ACT-001", "Beyanname yukle")]
            ),
            FeedItem(
                id="FEED-002",
                scope=scope,
                category=FeedCategory.MUTABAKAT,
                severity=FeedSeverity.HIGH,
                score=82,
                impact=FeedImpact(amount_try=45000),
                title="Banka Mutabakat",
                summary="Banka farki",
                why="3 islem eslesmedi",
                evidence_refs=[
                    EvidenceRef("EVD-003", "banka", "Ekstre", status=EvidenceStatus.AVAILABLE)
                ],
                actions=[FeedAction("ACT-002", "Kontrol et")]
            )
        ]

    def test_calculate_risk_level_critical(self, service, sample_feed_items):
        """Test risk level calculation with critical items"""
        risk = service._calculate_risk_level(sample_feed_items)
        assert risk in ["YUKSEK", "COK YUKSEK"]

    def test_calculate_risk_level_empty(self, service):
        """Test risk level with no items"""
        risk = service._calculate_risk_level([])
        assert risk == "BELIRSIZ"

    def test_calculate_compliance_rate(self, service, sample_feed_items):
        """Test compliance rate calculation"""
        rate = service._calculate_compliance_rate(sample_feed_items)
        # 2 out of 3 evidence available = 66.7%
        assert 60 <= rate <= 70

    def test_calculate_total_impact(self, service, sample_feed_items):
        """Test total impact calculation"""
        total = service._calculate_total_impact(sample_feed_items)
        assert total == 170000  # 125000 + 45000

    def test_build_slide_1_always_included(self, service, sample_feed_items):
        """Slide 1 (Period Summary) should always be included"""
        slide = service._build_slide_1_period_summary(
            sample_feed_items, "CLIENT-1", "2024-Q1"
        )

        assert slide.slide_type == SlideType.PERIOD_SUMMARY
        assert "kpis" in slide.content
        assert len(slide.content["kpis"]) == 3

    def test_build_slide_1_empty_data_message(self, service):
        """Slide 1 should show message when no data"""
        slide = service._build_slide_1_period_summary([], "CLIENT-1", "2024-Q1")

        assert slide.content["message"] is not None
        assert "veri bulunamadi" in slide.content["message"]

    def test_build_slide_2_critical_risks(self, service, sample_feed_items):
        """Slide 2 should show top 2 critical risks"""
        slide = service._build_slide_2_critical_risks(sample_feed_items)

        assert slide is not None
        assert slide.slide_type == SlideType.CRITICAL_RISKS
        assert len(slide.content["risks"]) == 2

    def test_build_slide_2_none_if_no_critical(self, service):
        """Slide 2 should be None if no critical/high items"""
        slide = service._build_slide_2_critical_risks([])
        assert slide is None

    def test_build_slide_3_missing_docs(self, service, sample_feed_items):
        """Slide 3 should show missing documents"""
        slide = service._build_slide_3_missing_docs(sample_feed_items)

        assert slide is not None
        assert slide.slide_type == SlideType.MISSING_DOCS
        assert slide.content["total_missing"] >= 1

    def test_build_slide_3_none_if_no_missing(self, service):
        """Slide 3 should be None if no missing docs"""
        scope = FeedScope("SMMM-1", "CLIENT-1", "2024-Q1")
        items = [
            FeedItem(
                id="FEED-001",
                scope=scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(amount_try=1000),
                title="Test",
                summary="Test",
                why="Test reason",
                evidence_refs=[
                    EvidenceRef("EVD-001", "mizan", "Mizan", status=EvidenceStatus.AVAILABLE)
                ],
                actions=[FeedAction("ACT-001", "Test")]
            )
        ]
        slide = service._build_slide_3_missing_docs(items)
        assert slide is None

    def test_generate_brief_returns_envelope(self, service, sample_feed_items):
        """Test ResponseEnvelope format"""
        result = service.generate_brief(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        assert "schema" in result
        assert result["schema"]["name"] == "CLevelBriefResponse"
        assert "meta" in result
        assert "data" in result
        assert "errors" in result
        assert "warnings" in result

    def test_generate_brief_max_5_slides(self, service, sample_feed_items):
        """Brief should have max 5 slides"""
        result = service.generate_brief(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        assert len(result["data"]["slides"]) <= 5

    def test_generate_brief_empty_feed_warning(self, service):
        """Empty feed should return warning, not dummy data"""
        result = service.generate_brief(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=[]
        )

        # Should still have slides (at least slide 1 and 5)
        assert len(result["data"]["slides"]) >= 2

        # Should have warning about no data
        warnings = result["warnings"]
        assert any(w["type"] == "no_feed_data" for w in warnings)

    def test_slide_5_always_included(self, service, sample_feed_items):
        """Slide 5 (SMMM Signature) should always be included"""
        result = service.generate_brief(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        slides = result["data"]["slides"]
        last_slide = slides[-1]
        assert last_slide["slide_type"] == "smmm_signature"

    def test_slides_renumbered_correctly(self, service, sample_feed_items):
        """Slides should be renumbered 1-N"""
        result = service.generate_brief(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        slides = result["data"]["slides"]
        for i, slide in enumerate(slides, 1):
            assert slide["slide_number"] == i

    def test_missing_evidence_warning(self, service, sample_feed_items):
        """Should warn about missing evidence"""
        result = service.generate_brief(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        warnings = result["warnings"]
        missing_warning = next((w for w in warnings if w["type"] == "missing_evidence"), None)
        assert missing_warning is not None
        assert missing_warning["count"] >= 1

    def test_source_feed_ids_tracked(self, service, sample_feed_items):
        """Source feed IDs should be tracked in brief"""
        result = service.generate_brief(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        source_ids = result["data"]["source"]["feed_ids"]
        assert "FEED-001" in source_ids
        assert "FEED-002" in source_ids
