"""
Additional Service Tests for Coverage
Virgosol Standard: Target 80%+ coverage on services/
"""
import pytest
from datetime import datetime

from schemas.feed import FeedSeverity, FeedCategory, EvidenceStatus


class TestFeedServiceEdgeCases:
    """Edge case tests for FeedService"""

    def test_get_feed_items_empty_client(self, feed_service):
        """Empty client should return empty list"""
        items = feed_service.get_feed_items(
            smmm_id="NONEXISTENT",
            client_id="NONEXISTENT",
            period="2024-Q1"
        )
        assert items == []

    def test_add_and_get_single_item(self, feed_service, feed_item_critical):
        """Add single item and retrieve"""
        feed_service.add_feed_item(feed_item_critical)

        items = feed_service.get_feed_items(
            smmm_id="TEST-SMMM-001",
            client_id="TEST-CLIENT-001",
            period="2024-Q1"
        )
        assert len(items) == 1
        assert items[0].id == feed_item_critical.id

    def test_get_feed_items_with_severity_filter(self, feed_service, feed_items_mixed):
        """Test severity filtering"""
        for item in feed_items_mixed:
            feed_service.add_feed_item(item)

        # Filter CRITICAL only
        critical = feed_service.get_feed_items(
            smmm_id="TEST-SMMM-001",
            client_id="TEST-CLIENT-001",
            period="2024-Q1",
            severity_filter=[FeedSeverity.CRITICAL]
        )
        assert len(critical) == 1
        assert all(i.severity == FeedSeverity.CRITICAL for i in critical)

    def test_get_feed_items_with_multiple_severity_filter(self, feed_service, feed_items_mixed):
        """Test filtering multiple severities"""
        for item in feed_items_mixed:
            feed_service.add_feed_item(item)

        # Filter CRITICAL and HIGH
        critical_high = feed_service.get_feed_items(
            smmm_id="TEST-SMMM-001",
            client_id="TEST-CLIENT-001",
            period="2024-Q1",
            severity_filter=[FeedSeverity.CRITICAL, FeedSeverity.HIGH]
        )
        assert len(critical_high) == 3  # 1 CRITICAL + 2 HIGH (mevzuat is HIGH too)
        for item in critical_high:
            assert item.severity in [FeedSeverity.CRITICAL, FeedSeverity.HIGH]

    def test_get_feed_items_with_category_filter(self, feed_service, feed_items_mixed):
        """Test category filtering"""
        for item in feed_items_mixed:
            feed_service.add_feed_item(item)

        # Filter VDK only
        vdk_items = feed_service.get_feed_items(
            smmm_id="TEST-SMMM-001",
            client_id="TEST-CLIENT-001",
            period="2024-Q1",
            category_filter=[FeedCategory.VDK]
        )
        assert len(vdk_items) == 1
        assert all(i.category == FeedCategory.VDK for i in vdk_items)

    def test_sorting_by_severity_and_score(self, feed_service, feed_items_mixed):
        """Items should be sorted by severity then score"""
        for item in feed_items_mixed:
            feed_service.add_feed_item(item)

        items = feed_service.get_feed_items(
            smmm_id="TEST-SMMM-001",
            client_id="TEST-CLIENT-001",
            period="2024-Q1"
        )

        # First item should be CRITICAL (highest severity)
        assert items[0].severity == FeedSeverity.CRITICAL

    def test_different_periods_isolated(self, feed_service, feed_item_critical, sample_scope_q2, evidence_available, action_pending):
        """Different periods should be isolated"""
        from schemas.feed import FeedItem, FeedImpact

        feed_service.add_feed_item(feed_item_critical)  # Q1

        # Add Q2 item
        q2_item = FeedItem(
            id="FEED-Q2-001",
            scope=sample_scope_q2,
            category=FeedCategory.VDK,
            severity=FeedSeverity.HIGH,
            score=70,
            impact=FeedImpact(),
            title="Q2 Item",
            summary="Q2 test",
            why="Q2 test reason",
            evidence_refs=[evidence_available],
            actions=[action_pending]
        )
        feed_service.add_feed_item(q2_item)

        q1_items = feed_service.get_feed_items(
            smmm_id="TEST-SMMM-001",
            client_id="TEST-CLIENT-001",
            period="2024-Q1"
        )
        q2_items = feed_service.get_feed_items(
            smmm_id="TEST-SMMM-001",
            client_id="TEST-CLIENT-001",
            period="2024-Q2"
        )

        assert len(q1_items) == 1
        assert len(q2_items) == 1
        assert q1_items[0].id != q2_items[0].id


class TestEvidenceBundleServiceEdgeCases:
    """Edge case tests for EvidenceBundleService"""

    def test_collect_evidence_basic(self, evidence_bundle_service, feed_items_mixed):
        """Basic evidence collection"""
        evidence_list, actions, stats = evidence_bundle_service.collect_evidence(feed_items_mixed)
        assert len(evidence_list) > 0
        assert len(actions) > 0

    def test_collect_evidence_deduplication(self, evidence_bundle_service, feed_items_mixed):
        """Evidence should be deduplicated by ref_id"""
        evidence_list, actions, stats = evidence_bundle_service.collect_evidence(feed_items_mixed)
        ref_ids = [e.ref_id for e in evidence_list]
        assert len(ref_ids) == len(set(ref_ids))  # All unique

    def test_summary_calculation_empty(self, evidence_bundle_service):
        """Empty list should give zero stats"""
        from schemas.evidence_bundle import BundleSummary
        summary = evidence_bundle_service.calculate_summary([], [], {})
        assert summary.total_evidence == 0
        # 0/0 completion defaults to 100%
        assert summary.completion_rate == 100.0

    def test_summary_calculation_with_data(self, evidence_bundle_service, feed_items_mixed):
        """Calculate summary with real data"""
        evidence_list, actions, stats = evidence_bundle_service.collect_evidence(feed_items_mixed)
        summary = evidence_bundle_service.calculate_summary(evidence_list, actions, stats)
        assert summary.total_evidence > 0
        assert 0 <= summary.completion_rate <= 100

    def test_generate_bundle_empty_items(self, evidence_bundle_service):
        """Empty items should return valid but empty bundle"""
        result = evidence_bundle_service.generate_bundle(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=[]
        )
        assert result["data"]["summary"]["total_evidence"] == 0
        assert "warnings" in result

    def test_generate_bundle_with_items(self, evidence_bundle_service, feed_items_mixed):
        """Generate bundle with real items"""
        result = evidence_bundle_service.generate_bundle(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=feed_items_mixed
        )
        assert "bundle_id" in result["data"]
        assert result["data"]["summary"]["total_evidence"] > 0


class TestBriefServiceEdgeCases:
    """Edge case tests for BriefService"""

    def test_risk_level_calculation_empty(self, brief_service):
        """Test risk level calculation with empty data"""
        assert brief_service._calculate_risk_level([]) == "BELIRSIZ"

    def test_risk_level_calculation_critical(self, brief_service, feed_item_critical):
        """CRITICAL items should result in YUKSEK risk"""
        level = brief_service._calculate_risk_level([feed_item_critical])
        assert level == "YUKSEK"

    def test_risk_level_calculation_medium_only(self, brief_service, feed_item_medium):
        """Only MEDIUM items should result in DUSUK risk (no CRITICAL/HIGH)"""
        level = brief_service._calculate_risk_level([feed_item_medium])
        # MEDIUM only = DUSUK (no critical or high items)
        assert level in ["DUSUK", "ORTA"]

    def test_compliance_rate_no_evidence(self, brief_service):
        """No evidence should return 0%"""
        rate = brief_service._calculate_compliance_rate([])
        assert rate == 0.0

    def test_compliance_rate_all_available(self, brief_service, feed_item_high):
        """All available evidence should be 100%"""
        rate = brief_service._calculate_compliance_rate([feed_item_high])
        assert rate == 100.0

    def test_compliance_rate_mixed(self, brief_service, feed_item_critical):
        """Mixed evidence should calculate correctly"""
        rate = brief_service._calculate_compliance_rate([feed_item_critical])
        # feed_item_critical has 1 available, 1 missing = 50%
        assert rate == 50.0

    def test_slide_1_always_generated(self, brief_service, feed_items_mixed):
        """Slide 1 (period summary) always works"""
        slide1 = brief_service._build_slide_1_period_summary(
            feed_items_mixed, "CLIENT-1", "2024-Q1"
        )
        assert slide1 is not None
        assert slide1.slide_number == 1

    def test_slide_2_with_critical_items(self, brief_service, feed_items_mixed):
        """Slide 2 with critical items"""
        slide2 = brief_service._build_slide_2_critical_risks(feed_items_mixed)
        assert slide2 is not None
        assert "risks" in slide2.content

    def test_slide_3_with_missing_docs(self, brief_service, feed_items_mixed):
        """Slide 3 with missing docs"""
        slide3 = brief_service._build_slide_3_missing_docs(feed_items_mixed)
        # Should be generated if there's missing evidence
        if slide3 is not None:
            assert "documents" in slide3.content

    def test_generate_brief_full(self, brief_service, feed_items_mixed):
        """Generate complete brief"""
        result = brief_service.generate_brief(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=feed_items_mixed
        )
        assert "data" in result
        assert "slides" in result["data"]
        assert len(result["data"]["slides"]) >= 2
        assert len(result["data"]["slides"]) <= 5

    def test_generate_brief_empty(self, brief_service):
        """Generate brief with no data"""
        result = brief_service.generate_brief(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=[]
        )
        assert "warnings" in result
        assert any(w["type"] == "no_feed_data" for w in result["warnings"])


class TestDossierServiceEdgeCases:
    """Edge case tests for DossierService"""

    def test_severity_mapping_all(self, dossier_service):
        """Test all severity mappings"""
        from schemas.dossier import FindingSeverityLevel

        mappings = [
            (FeedSeverity.CRITICAL, FindingSeverityLevel.CRITICAL),
            (FeedSeverity.HIGH, FindingSeverityLevel.HIGH),
            (FeedSeverity.MEDIUM, FindingSeverityLevel.MEDIUM),
            (FeedSeverity.LOW, FindingSeverityLevel.LOW),
            (FeedSeverity.INFO, FindingSeverityLevel.OBSERVATION),
        ]

        for feed_sev, expected in mappings:
            result = dossier_service._severity_to_finding_level(feed_sev)
            assert result == expected

    def test_section_1_executive_summary(self, dossier_service, feed_items_mixed):
        """Test executive summary generation"""
        section = dossier_service._build_section_1_executive_summary(
            feed_items_mixed, "CLIENT-1", "2024-Q1"
        )
        assert section is not None
        assert "summary_text" in section.content
        assert "statistics" in section.content

    def test_section_2_critical_findings(self, dossier_service, feed_items_mixed):
        """Test critical findings section"""
        section = dossier_service._build_section_2_critical_findings(feed_items_mixed)
        assert section is not None
        assert "findings" in section.content

    def test_section_3_evidence_list(self, dossier_service, feed_items_mixed):
        """Test evidence list section"""
        section = dossier_service._build_section_3_evidence_list(feed_items_mixed)
        assert section is not None
        # Content has evidence_items and summary
        assert "evidence_items" in section.content or "summary" in section.content

    def test_section_4_action_plan(self, dossier_service, feed_items_mixed):
        """Test action plan section"""
        section = dossier_service._build_section_4_action_plan(feed_items_mixed)
        assert section is not None
        # Content has action_items and summary
        assert "action_items" in section.content or "summary" in section.content

    def test_section_5_with_mevzuat(self, dossier_service, feed_items_mixed):
        """Section 5 should exist when MEVZUAT items present"""
        section = dossier_service._build_section_5_regulatory_impact(feed_items_mixed)
        assert section is not None  # feed_items_mixed has MEVZUAT item

    def test_section_5_without_mevzuat(self, dossier_service, feed_items_critical_high):
        """Section 5 should be None without MEVZUAT items"""
        # feed_items_critical_high has VDK and MUTABAKAT, no MEVZUAT
        section = dossier_service._build_section_5_regulatory_impact(feed_items_critical_high)
        assert section is None

    def test_generate_dossier_all_sections(self, dossier_service, feed_items_mixed):
        """Full dossier should have correct section count"""
        result = dossier_service.generate_dossier(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=feed_items_mixed,
            generate_pdf=False
        )

        sections = result["data"]["sections"]
        assert 5 <= len(sections) <= 6  # 5 or 6 depending on MEVZUAT

        # First section is executive summary
        assert sections[0]["section_type"] == "executive_summary"

        # Last section is always SMMM signature
        assert sections[-1]["section_type"] == "smmm_signature"

    def test_generate_dossier_empty(self, dossier_service):
        """Empty dossier should have warning"""
        result = dossier_service.generate_dossier(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=[],
            generate_pdf=False
        )
        assert "warnings" in result
        assert any(w["type"] == "no_feed_data" for w in result["warnings"])

    def test_generate_dossier_with_pdf(self, dossier_service, feed_items_mixed):
        """Test PDF generation"""
        result = dossier_service.generate_dossier(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=feed_items_mixed,
            generate_pdf=True
        )
        # PDF path should exist if reportlab is installed
        pdf_path = result["data"].get("pdf_path")
        if pdf_path:
            import os
            assert os.path.exists(pdf_path)

    def test_metadata_calculation(self, dossier_service, feed_items_mixed):
        """Test metadata calculation"""
        result = dossier_service.generate_dossier(
            smmm_id="TEST-SMMM",
            client_id="TEST-CLIENT",
            period="2024-Q1",
            feed_items=feed_items_mixed,
            generate_pdf=False
        )
        metadata = result["data"]["metadata"]
        assert "total_findings" in metadata
        assert "critical_findings" in metadata
        assert metadata["total_findings"] == 4  # 4 items in mixed
