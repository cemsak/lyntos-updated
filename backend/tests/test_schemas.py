"""
Schema Validation Tests
Virgosol Standard: Complete coverage on all data models and constraints
"""
import pytest
from datetime import datetime

from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus, ActionStatus
)
from schemas.brief import (
    CLevelBrief, BriefSlide, SlideType, ContentSource,
    KPIMetric, RiskHighlight
)
from schemas.dossier import (
    FullDossier, DossierSection, DossierSectionType,
    DossierFinding, FindingSeverityLevel
)
from schemas.evidence_bundle import EvidenceBundleManifest, BundleSummary


class TestFeedScope:
    """FeedScope model tests"""

    def test_create_valid_scope(self):
        scope = FeedScope("SMMM-1", "CLIENT-1", "2024-Q1")
        assert scope.smmm_id == "SMMM-1"
        assert scope.client_id == "CLIENT-1"
        assert scope.period == "2024-Q1"

    def test_scope_periods(self):
        """Test various period formats"""
        periods = ["2024-Q1", "2024-Q2", "2024-01", "2024-12"]
        for period in periods:
            scope = FeedScope("SMMM-1", "CLIENT-1", period)
            assert scope.period == period


class TestFeedImpact:
    """FeedImpact model tests"""

    def test_empty_impact(self):
        impact = FeedImpact()
        assert impact.amount_try is None
        assert impact.pct is None
        assert impact.points is None

    def test_full_impact(self):
        impact = FeedImpact(amount_try=100000.0, pct=15.5, points=10)
        d = impact.to_dict()
        assert d["amount_try"] == 100000.0
        assert d["pct"] == 15.5
        assert d["points"] == 10

    def test_partial_impact_to_dict(self):
        """to_dict should only include non-None values"""
        impact = FeedImpact(amount_try=50000.0)
        d = impact.to_dict()
        assert "amount_try" in d
        assert d.get("pct") is None
        assert d.get("points") is None

    def test_impact_with_zero(self):
        """Zero is different from None"""
        impact = FeedImpact(amount_try=0.0, points=0)
        d = impact.to_dict()
        assert d["amount_try"] == 0.0
        assert d["points"] == 0


class TestEvidenceRef:
    """EvidenceRef model tests"""

    def test_default_status_is_missing(self):
        ev = EvidenceRef("EVD-1", "mizan", "Test")
        assert ev.status == EvidenceStatus.MISSING

    def test_all_statuses(self):
        for status in EvidenceStatus:
            ev = EvidenceRef("EVD-1", "mizan", "Test", status=status)
            assert ev.status == status

    def test_to_dict(self):
        ev = EvidenceRef(
            ref_id="EVD-1",
            source_type="mizan",
            description="Test Evidence",
            status=EvidenceStatus.AVAILABLE,
            account_code="191",
            file_path="test.xlsx"
        )
        d = ev.to_dict()
        assert d["ref_id"] == "EVD-1"
        assert d["status"] == "available"
        assert d["account_code"] == "191"

    def test_evidence_source_types(self):
        """Test common source types"""
        source_types = ["mizan", "beyan", "e-fatura", "banka", "ba-bs", "mevzuat"]
        for src in source_types:
            ev = EvidenceRef("EVD-1", src, f"Test {src}")
            assert ev.source_type == src


class TestFeedAction:
    """FeedAction model tests"""

    def test_default_status_is_pending(self):
        action = FeedAction("ACT-1", "Test action")
        assert action.status == ActionStatus.PENDING

    def test_default_priority_is_1(self):
        action = FeedAction("ACT-1", "Test action")
        assert action.priority == 1

    def test_all_action_statuses(self):
        for status in ActionStatus:
            action = FeedAction("ACT-1", "Test", status=status)
            assert action.status == status

    def test_to_dict(self):
        action = FeedAction(
            action_id="ACT-1",
            description="Upload document",
            responsible="SMMM",
            priority=2,
            related_evidence=["EVD-1", "EVD-2"]
        )
        d = action.to_dict()
        assert d["action_id"] == "ACT-1"
        assert d["responsible"] == "SMMM"
        assert len(d["related_evidence"]) == 2


class TestFeedItem:
    """FeedItem model tests"""

    def test_requires_evidence_refs(self, sample_scope, action_pending):
        with pytest.raises(ValueError, match="evidence_refs cannot be empty"):
            FeedItem(
                id="FEED-1",
                scope=sample_scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(),
                title="Test",
                summary="Test",
                why="Test",
                evidence_refs=[],
                actions=[action_pending]
            )

    def test_requires_actions(self, sample_scope, evidence_available):
        with pytest.raises(ValueError, match="actions cannot be empty"):
            FeedItem(
                id="FEED-1",
                scope=sample_scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(),
                title="Test",
                summary="Test",
                why="Test",
                evidence_refs=[evidence_available],
                actions=[]
            )

    def test_requires_why(self, sample_scope, evidence_available, action_pending):
        with pytest.raises(ValueError, match="why cannot be empty"):
            FeedItem(
                id="FEED-1",
                scope=sample_scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(),
                title="Test",
                summary="Test",
                why="",
                evidence_refs=[evidence_available],
                actions=[action_pending]
            )

    def test_score_range_0_100_valid(self, sample_scope, evidence_available, action_pending):
        """Valid scores should work"""
        for score in [0, 50, 100]:
            item = FeedItem(
                id="FEED-1",
                scope=sample_scope,
                category=FeedCategory.VDK,
                severity=FeedSeverity.HIGH,
                score=score,
                impact=FeedImpact(),
                title="Test",
                summary="Test",
                why="Test why",
                evidence_refs=[evidence_available],
                actions=[action_pending]
            )
            assert item.score == score

    def test_score_range_0_100_invalid(self, sample_scope, evidence_available, action_pending):
        """Invalid scores should fail"""
        for score in [-1, 101, 150]:
            with pytest.raises(ValueError, match="score must be 0-100"):
                FeedItem(
                    id="FEED-1",
                    scope=sample_scope,
                    category=FeedCategory.VDK,
                    severity=FeedSeverity.HIGH,
                    score=score,
                    impact=FeedImpact(),
                    title="Test",
                    summary="Test",
                    why="Test why",
                    evidence_refs=[evidence_available],
                    actions=[action_pending]
                )

    def test_has_complete_evidence(self, feed_item_critical, feed_item_high):
        # Critical has one missing evidence
        assert not feed_item_critical.has_complete_evidence()
        # High has all available
        assert feed_item_high.has_complete_evidence()

    def test_get_missing_evidence(self, feed_item_critical):
        missing = feed_item_critical.get_missing_evidence()
        assert len(missing) == 1
        assert missing[0].status == EvidenceStatus.MISSING

    def test_get_pending_actions(self, feed_item_critical):
        pending = feed_item_critical.get_pending_actions()
        assert len(pending) == 1
        assert pending[0].status == ActionStatus.PENDING

    def test_generate_id_uniqueness(self):
        id1 = FeedItem.generate_id()
        id2 = FeedItem.generate_id()
        assert id1.startswith("FEED-")
        assert id1 != id2  # Unique

    def test_all_categories(self, sample_scope, evidence_available, action_pending):
        for category in FeedCategory:
            item = FeedItem(
                id=f"FEED-{category.value}",
                scope=sample_scope,
                category=category,
                severity=FeedSeverity.MEDIUM,
                score=50,
                impact=FeedImpact(),
                title=f"Test {category.value}",
                summary="Test",
                why="Test why",
                evidence_refs=[evidence_available],
                actions=[action_pending]
            )
            assert item.category == category

    def test_all_severities(self, sample_scope, evidence_available, action_pending):
        for severity in FeedSeverity:
            item = FeedItem(
                id=f"FEED-{severity.value}",
                scope=sample_scope,
                category=FeedCategory.VDK,
                severity=severity,
                score=50,
                impact=FeedImpact(),
                title=f"Test {severity.value}",
                summary="Test",
                why="Test why",
                evidence_refs=[evidence_available],
                actions=[action_pending]
            )
            assert item.severity == severity

    def test_to_dict_full(self, feed_item_critical):
        d = feed_item_critical.to_dict()
        assert "id" in d
        assert "scope" in d
        assert "category" in d
        assert "severity" in d
        assert "evidence_refs" in d
        assert "actions" in d
        assert isinstance(d["evidence_refs"], list)


class TestBriefSlide:
    """BriefSlide model tests"""

    def test_create_slide(self):
        slide = BriefSlide(
            slide_number=1,
            slide_type=SlideType.PERIOD_SUMMARY,
            title="Test Slide",
            content={"key": "value"}
        )
        assert slide.slide_number == 1
        assert slide.source == ContentSource.SYSTEM

    def test_all_slide_types(self):
        for i, slide_type in enumerate(SlideType, 1):
            slide = BriefSlide(i, slide_type, f"Slide {i}", {})
            assert slide.slide_type == slide_type

    def test_slide_to_dict(self):
        slide = BriefSlide(
            slide_number=1,
            slide_type=SlideType.PERIOD_SUMMARY,
            title="Test",
            content={"data": 123}
        )
        d = slide.to_dict()
        assert d["slide_number"] == 1
        assert d["title"] == "Test"
        assert "content" in d


class TestCLevelBrief:
    """CLevelBrief model tests"""

    def test_max_5_slides(self):
        slides = [BriefSlide(i, SlideType.PERIOD_SUMMARY, f"S{i}", {}) for i in range(6)]
        with pytest.raises(ValueError, match="more than 5 slides"):
            CLevelBrief(
                brief_id="TEST",
                smmm_id="SMMM-1",
                client_id="CLIENT-1",
                period="2024-Q1",
                generated_at=datetime.now(),
                slides=slides
            )

    def test_requires_at_least_1_slide(self):
        with pytest.raises(ValueError, match="at least 1 slide"):
            CLevelBrief(
                brief_id="TEST",
                smmm_id="SMMM-1",
                client_id="CLIENT-1",
                period="2024-Q1",
                generated_at=datetime.now(),
                slides=[]
            )

    def test_valid_brief(self):
        slides = [
            BriefSlide(1, SlideType.PERIOD_SUMMARY, "Summary", {}),
            BriefSlide(2, SlideType.SMMM_SIGNATURE, "Signature", {})
        ]
        brief = CLevelBrief(
            brief_id="TEST-BRIEF",
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            generated_at=datetime.now(),
            slides=slides
        )
        assert brief.brief_id == "TEST-BRIEF"
        assert len(brief.slides) == 2

    def test_generate_id(self):
        id1 = CLevelBrief.generate_id("CLIENT-1", "2024-Q1")
        assert id1.startswith("BRIEF-")
        assert "CLIENT-1"[:8] in id1


class TestDossierFinding:
    """DossierFinding model tests"""

    def test_requires_evidence(self):
        with pytest.raises(ValueError, match="evidence_refs cannot be empty"):
            DossierFinding(
                finding_id="FND-1",
                title="Test",
                description="Test",
                severity=FindingSeverityLevel.HIGH,
                impact_description="Test",
                evidence_refs=[]
            )

    def test_valid_finding(self):
        finding = DossierFinding(
            finding_id="FND-1",
            title="Test Finding",
            description="Test description",
            severity=FindingSeverityLevel.CRITICAL,
            impact_description="125,000 TL risk",
            evidence_refs=["EVD-001", "EVD-002"]
        )
        assert finding.finding_id == "FND-1"
        assert len(finding.evidence_refs) == 2

    def test_ai_enhanced_label(self):
        finding = DossierFinding(
            finding_id="FND-1",
            title="Test",
            description="Original",
            severity=FindingSeverityLevel.HIGH,
            impact_description="Test",
            evidence_refs=["EVD-1"],
            ai_enhanced_description="AI improved version"
        )
        d = finding.to_dict()
        assert "ai_enhanced_description" in d
        # ai_label is a string message when AI enhanced
        assert d.get("ai_label") is not None

    def test_all_severity_levels(self):
        for level in FindingSeverityLevel:
            finding = DossierFinding(
                finding_id=f"FND-{level.value}",
                title="Test",
                description="Test",
                severity=level,
                impact_description="Test",
                evidence_refs=["EVD-1"]
            )
            assert finding.severity == level


class TestDossierSection:
    """DossierSection model tests"""

    def test_create_section(self):
        section = DossierSection(
            section_number=1,
            section_type=DossierSectionType.EXECUTIVE_SUMMARY,
            title="Executive Summary",
            content={"summary": "Test"}
        )
        assert section.section_number == 1
        assert section.section_type == DossierSectionType.EXECUTIVE_SUMMARY

    def test_all_section_types(self):
        for i, section_type in enumerate(DossierSectionType, 1):
            section = DossierSection(i, section_type, f"Section {i}", {})
            assert section.section_type == section_type


class TestFullDossier:
    """FullDossier model tests"""

    def test_max_6_sections(self):
        sections = [
            DossierSection(i, DossierSectionType.EXECUTIVE_SUMMARY, f"S{i}", {})
            for i in range(7)
        ]
        with pytest.raises(ValueError, match="more than 6 sections"):
            FullDossier(
                dossier_id="TEST",
                smmm_id="SMMM-1",
                client_id="CLIENT-1",
                period="2024-Q1",
                sections=sections
            )

    def test_valid_dossier(self):
        sections = [
            DossierSection(1, DossierSectionType.EXECUTIVE_SUMMARY, "Summary", {}),
            DossierSection(2, DossierSectionType.SMMM_SIGNATURE, "Signature", {})
        ]
        dossier = FullDossier(
            dossier_id="DOSSIER-TEST",
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            sections=sections
        )
        assert dossier.dossier_id == "DOSSIER-TEST"
        assert len(dossier.sections) == 2

    def test_generate_id(self):
        id1 = FullDossier.generate_id("CLIENT-1", "2024-Q1")
        assert id1.startswith("DOSSIER-")


class TestEvidenceBundleManifest:
    """EvidenceBundleManifest model tests"""

    def test_create_manifest(self):
        summary = BundleSummary(
            total_evidence=5,
            available_evidence=3,
            missing_evidence=2,
            completion_rate=60.0,
            critical_items=1,
            high_items=2,
            total_actions=3,
            pending_actions=2
        )
        manifest = EvidenceBundleManifest(
            bundle_id="BUNDLE-TEST",
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            generated_at=datetime.now(),
            summary=summary,
            evidence_list=[],
            action_items=[],
            source_feed_ids=["FEED-1", "FEED-2"]
        )
        assert manifest.bundle_id == "BUNDLE-TEST"
        assert manifest.summary.completion_rate == 60.0

    def test_bundle_summary_calculation(self):
        summary = BundleSummary(
            total_evidence=10,
            available_evidence=8,
            missing_evidence=2,
            completion_rate=80.0,
            critical_items=1,
            high_items=3,
            total_actions=5,
            pending_actions=3
        )
        d = summary.to_dict()
        assert d["total_evidence"] == 10
        assert d["completion_rate"] == 80.0


class TestKPIMetric:
    """KPIMetric model tests"""

    def test_create_kpi(self):
        kpi = KPIMetric(
            name="Toplam Risk",
            value="125.000 TL",
            trend="up"
        )
        assert kpi.name == "Toplam Risk"
        assert kpi.value == "125.000 TL"
        assert kpi.trend == "up"

    def test_kpi_to_dict(self):
        kpi = KPIMetric(
            name="Test",
            value="100%"
        )
        d = kpi.to_dict()
        assert d["name"] == "Test"
        assert d["value"] == "100%"


class TestRiskHighlight:
    """RiskHighlight model tests"""

    def test_create_risk_highlight(self):
        risk = RiskHighlight(
            title="KDV Uyumsuzlugu",
            impact="125.000 TL",
            why="KDV tutarsizligi",
            action="Beyanname kontrol edin",
            evidence_refs=["EVD-1"],
            source_feed_id="FEED-1",
            severity=FeedSeverity.CRITICAL
        )
        assert risk.title == "KDV Uyumsuzlugu"
        assert risk.severity == FeedSeverity.CRITICAL

    def test_risk_highlight_to_dict(self):
        risk = RiskHighlight(
            title="Test Risk",
            impact="50.000 TL",
            why="Test reason",
            action="Test action",
            evidence_refs=["EVD-1"],
            source_feed_id="FEED-1",
            severity=FeedSeverity.HIGH
        )
        d = risk.to_dict()
        assert d["title"] == "Test Risk"
        assert d["impact"] == "50.000 TL"
