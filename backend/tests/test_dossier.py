"""
Full Dossier Service Tests
Tests for D3: Dossier generation
NO DUMMY DATA in production - test fixtures only
"""
import pytest
from datetime import datetime

from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus
)
from schemas.dossier import (
    FullDossier, DossierSection, DossierSectionType,
    DossierFinding, FindingSeverityLevel
)
from schemas.brief import ContentSource
from services.dossier import DossierService


class TestDossierFinding:
    """Test DossierFinding model"""

    def test_finding_requires_evidence(self):
        """Finding must have evidence_refs (Anayasa)"""
        with pytest.raises(ValueError, match="evidence_refs cannot be empty"):
            DossierFinding(
                finding_id="FND-001",
                title="Test Finding",
                description="Test description",
                severity=FindingSeverityLevel.HIGH,
                impact_description="Test impact",
                evidence_refs=[]  # Empty - should fail
            )

    def test_valid_finding(self):
        """Valid finding should be created"""
        finding = DossierFinding(
            finding_id="FND-001",
            title="Test Finding",
            description="Test description",
            severity=FindingSeverityLevel.CRITICAL,
            impact_description="125,000 TL risk",
            evidence_refs=["EVD-001", "EVD-002"]
        )

        assert finding.finding_id == "FND-001"
        assert len(finding.evidence_refs) == 2

    def test_finding_to_dict(self):
        """Test finding serialization"""
        finding = DossierFinding(
            finding_id="FND-001",
            title="Test Finding",
            description="Test description",
            severity=FindingSeverityLevel.HIGH,
            impact_description="Test impact",
            evidence_refs=["EVD-001"]
        )

        d = finding.to_dict()
        assert d["finding_id"] == "FND-001"
        assert d["severity"] == "high"


class TestFullDossier:
    """Test FullDossier model"""

    def test_dossier_max_6_sections(self):
        """Dossier cannot have more than 6 sections"""
        sections = [
            DossierSection(i, DossierSectionType.EXECUTIVE_SUMMARY, f"Section {i}", {})
            for i in range(7)
        ]

        with pytest.raises(ValueError, match="cannot have more than 6 sections"):
            FullDossier(
                dossier_id="TEST",
                smmm_id="SMMM-1",
                client_id="CLIENT-1",
                period="2024-Q1",
                sections=sections
            )

    def test_valid_dossier(self):
        """Valid dossier should be created"""
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

    def test_dossier_to_dict(self):
        """Test dossier serialization"""
        sections = [
            DossierSection(1, DossierSectionType.EXECUTIVE_SUMMARY, "Summary", {})
        ]

        dossier = FullDossier(
            dossier_id="DOSSIER-TEST",
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            sections=sections,
            total_findings=5,
            critical_findings=2
        )

        d = dossier.to_dict()
        assert d["dossier_id"] == "DOSSIER-TEST"
        assert d["metadata"]["total_findings"] == 5
        assert d["metadata"]["critical_findings"] == 2

    def test_dossier_generate_id(self):
        """Test dossier ID generation"""
        dossier_id = FullDossier.generate_id("CLIENT-1", "2024-Q1")
        assert dossier_id.startswith("DOSSIER-")
        assert "CLIENT-1" in dossier_id
        assert "2024-Q1" in dossier_id


class TestDossierService:
    """Test Dossier Service"""

    @pytest.fixture
    def service(self, tmp_path):
        return DossierService(output_dir=str(tmp_path))

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
                actions=[FeedAction("ACT-001", "Beyanname yukle", responsible="SMMM")]
            ),
            FeedItem(
                id="FEED-002",
                scope=scope,
                category=FeedCategory.MEVZUAT,
                severity=FeedSeverity.HIGH,
                score=78,
                impact=FeedImpact(points=10),
                title="KDV Oran Degisikligi",
                summary="Yeni KDV oranlari",
                why="7491 sayili Kanun",
                evidence_refs=[
                    EvidenceRef("EVD-003", "mevzuat", "Kanun", status=EvidenceStatus.AVAILABLE)
                ],
                actions=[FeedAction("ACT-002", "Fatura kontrolu")]
            )
        ]

    def test_build_section_1_executive_summary(self, service, sample_feed_items):
        """Test executive summary generation"""
        section = service._build_section_1_executive_summary(
            sample_feed_items, "CLIENT-1", "2024-Q1"
        )

        assert section.section_type == DossierSectionType.EXECUTIVE_SUMMARY
        assert "summary_text" in section.content
        assert "statistics" in section.content
        assert section.content["statistics"]["critical_count"] == 1

    def test_build_section_2_critical_findings(self, service, sample_feed_items):
        """Test critical findings generation"""
        section = service._build_section_2_critical_findings(sample_feed_items)

        assert section.section_type == DossierSectionType.CRITICAL_FINDINGS
        assert len(section.content["findings"]) == 2
        assert section.content["by_severity"]["critical"] == 1

    def test_build_section_3_evidence_list(self, service, sample_feed_items):
        """Test evidence list generation"""
        section = service._build_section_3_evidence_list(sample_feed_items)

        assert section.section_type == DossierSectionType.EVIDENCE_LIST
        # Should deduplicate evidence
        assert section.content["summary"]["total"] == 3
        assert section.content["summary"]["missing"] == 1

    def test_build_section_4_action_plan(self, service, sample_feed_items):
        """Test action plan generation"""
        section = service._build_section_4_action_plan(sample_feed_items)

        assert section.section_type == DossierSectionType.ACTION_PLAN
        assert section.content["summary"]["total"] == 2

    def test_build_section_5_regulatory_optional(self, service, sample_feed_items):
        """Test regulatory section is created when Mevzuat items exist"""
        section = service._build_section_5_regulatory_impact(sample_feed_items)

        # Should exist because we have a MEVZUAT category item
        assert section is not None
        assert section.section_type == DossierSectionType.REGULATORY_IMPACT

    def test_build_section_5_regulatory_none_if_no_items(self, service):
        """Test regulatory section is None when no Mevzuat items"""
        scope = FeedScope("SMMM-1", "CLIENT-1", "2024-Q1")
        items = [
            FeedItem(
                id="FEED-001",
                scope=scope,
                category=FeedCategory.VDK,  # Not MEVZUAT
                severity=FeedSeverity.HIGH,
                score=80,
                impact=FeedImpact(),
                title="Test",
                summary="Test",
                why="Test",
                evidence_refs=[EvidenceRef("EVD-001", "mizan", "Test")],
                actions=[FeedAction("ACT-001", "Test")]
            )
        ]

        section = service._build_section_5_regulatory_impact(items)
        assert section is None

    def test_generate_dossier_returns_envelope(self, service, sample_feed_items):
        """Test ResponseEnvelope format"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=False
        )

        assert "schema" in result
        assert result["schema"]["name"] == "FullDossierResponse"
        assert "meta" in result
        assert "data" in result
        assert "errors" in result
        assert "warnings" in result

    def test_generate_dossier_max_6_sections(self, service, sample_feed_items):
        """Dossier should have max 6 sections"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=False
        )

        assert len(result["data"]["sections"]) <= 6

    def test_generate_dossier_empty_feed_warning(self, service):
        """Empty feed should return warning, not dummy data"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=[],
            generate_pdf=False
        )

        # Should have warning about no data
        warnings = result["warnings"]
        assert any(w["type"] == "no_feed_data" for w in warnings)

    def test_generate_dossier_with_pdf(self, service, sample_feed_items):
        """Test PDF generation"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=True
        )

        pdf_path = result["data"]["pdf_path"]
        if pdf_path:  # Only if reportlab installed
            import os
            assert os.path.exists(pdf_path)

    def test_section_6_always_last(self, service, sample_feed_items):
        """Section 6 (SMMM Signature) should always be last"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=False
        )

        sections = result["data"]["sections"]
        last_section = sections[-1]
        assert last_section["section_type"] == "smmm_signature"

    def test_metadata_calculation(self, service, sample_feed_items):
        """Test metadata is correctly calculated"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=False
        )

        metadata = result["data"]["metadata"]
        assert metadata["total_findings"] == 2
        assert metadata["critical_findings"] == 1
        assert metadata["high_findings"] == 1
        assert metadata["missing_evidence"] == 1

    def test_sections_renumbered(self, service, sample_feed_items):
        """Sections should be renumbered correctly"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=False
        )

        sections = result["data"]["sections"]
        for i, section in enumerate(sections, 1):
            assert section["section_number"] == i

    def test_source_tracking(self, service, sample_feed_items):
        """Test source feed IDs are tracked"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=False,
            bundle_id="BUNDLE-123",
            brief_id="BRIEF-456"
        )

        source = result["data"]["source"]
        assert "FEED-001" in source["feed_ids"]
        assert "FEED-002" in source["feed_ids"]
        assert source["bundle_id"] == "BUNDLE-123"
        assert source["brief_id"] == "BRIEF-456"

    def test_missing_evidence_warning(self, service, sample_feed_items):
        """Should warn about missing evidence"""
        result = service.generate_dossier(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items,
            generate_pdf=False
        )

        warnings = result["warnings"]
        missing_warning = next((w for w in warnings if w["type"] == "missing_evidence"), None)
        assert missing_warning is not None
        assert missing_warning["count"] == 1
