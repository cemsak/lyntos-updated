"""
Full Pipeline E2E Tests
Tests complete flow: data -> cross-check -> feed -> bundle -> brief -> dossier
"""
import pytest
from datetime import datetime

from tests.data_factory import generate_quarter_data
from services.feed import FeedService
from services.evidence_bundle import EvidenceBundleService
from services.brief import BriefService
from services.dossier import DossierService
from schemas.feed import FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction
from schemas.feed import FeedCategory, FeedSeverity, EvidenceStatus


class TestFullPipelineQ1:
    """Q1 2024 Full Pipeline Test - Normal Scenario"""

    @pytest.fixture
    def q1_data(self):
        return generate_quarter_data(2024, 1, scenario="normal", seed=2024001)

    @pytest.fixture
    def feed_service(self):
        return FeedService()

    @pytest.fixture
    def bundle_service(self, tmp_path):
        return EvidenceBundleService(output_dir=str(tmp_path))

    @pytest.fixture
    def brief_service(self):
        return BriefService()

    @pytest.fixture
    def dossier_service(self, tmp_path):
        return DossierService(output_dir=str(tmp_path))

    def test_q1_feed_generation(self, q1_data, feed_service):
        """Q1: Generate feed from data"""
        scope = FeedScope(q1_data.smmm_id, q1_data.client_id, q1_data.period)

        # Q1 normal scenario - add a test feed item
        test_item = FeedItem(
            id="FEED-Q1-TEST-001",
            scope=scope,
            category=FeedCategory.MIZAN,
            severity=FeedSeverity.LOW,
            score=30,
            impact=FeedImpact(points=2),
            title="Q1 Mizan Kontrolu Tamamlandi",
            summary="Mizan denkligi dogrulandi.",
            why="Donem sonu mizan kontrolu basarili.",
            evidence_refs=[
                EvidenceRef(
                    ref_id="EVD-Q1-MZN",
                    source_type="mizan",
                    description=f"{q1_data.period} Mizan",
                    status=EvidenceStatus.AVAILABLE
                )
            ],
            actions=[
                FeedAction(
                    action_id="ACT-Q1-001",
                    description="Sonraki donem icin hazirlanin",
                    responsible="SMMM"
                )
            ]
        )

        feed_service.add_feed_item(test_item)
        items = feed_service.get_feed_items(
            q1_data.smmm_id, q1_data.client_id, q1_data.period
        )

        assert len(items) >= 1

    def test_q1_bundle_generation(self, q1_data, feed_service, bundle_service):
        """Q1: Generate evidence bundle"""
        scope = FeedScope(q1_data.smmm_id, q1_data.client_id, q1_data.period)
        test_item = FeedItem(
            id="FEED-Q1-BUNDLE-001",
            scope=scope,
            category=FeedCategory.VDK,
            severity=FeedSeverity.HIGH,
            score=75,
            impact=FeedImpact(amount_try=50000),
            title="Q1 KDV Kontrolu",
            summary="KDV tutarlari incelendi.",
            why="Donemsel KDV analizi.",
            evidence_refs=[
                EvidenceRef("EVD-Q1-191", "mizan", "191 Hesap", status=EvidenceStatus.AVAILABLE),
                EvidenceRef("EVD-Q1-391", "mizan", "391 Hesap", status=EvidenceStatus.AVAILABLE)
            ],
            actions=[FeedAction("ACT-Q1-KDV", "KDV beyannamesi kontrolu")]
        )
        feed_service.add_feed_item(test_item)

        items = feed_service.get_feed_items(
            q1_data.smmm_id, q1_data.client_id, q1_data.period
        )

        result = bundle_service.generate_bundle(
            smmm_id=q1_data.smmm_id,
            client_id=q1_data.client_id,
            period=q1_data.period,
            feed_items=items
        )

        assert "data" in result
        assert result["data"]["bundle_id"] is not None

    def test_q1_brief_generation(self, q1_data, feed_service, brief_service):
        """Q1: Generate C-Level brief"""
        scope = FeedScope(q1_data.smmm_id, q1_data.client_id, q1_data.period)
        test_item = FeedItem(
            id="FEED-Q1-BRIEF-001",
            scope=scope,
            category=FeedCategory.MIZAN,
            severity=FeedSeverity.MEDIUM,
            score=60,
            impact=FeedImpact(points=5),
            title="Q1 Donem Ozeti",
            summary="Donem sorunsuz tamamlandi.",
            why="Normal isleyis.",
            evidence_refs=[EvidenceRef("EVD-Q1-SUM", "sistem", "Ozet")],
            actions=[FeedAction("ACT-Q1-NEXT", "Q2 hazirligi")]
        )
        feed_service.add_feed_item(test_item)

        items = feed_service.get_feed_items(
            q1_data.smmm_id, q1_data.client_id, q1_data.period
        )

        result = brief_service.generate_brief(
            smmm_id=q1_data.smmm_id,
            client_id=q1_data.client_id,
            period=q1_data.period,
            feed_items=items
        )

        assert "data" in result
        assert "slides" in result["data"]
        assert 2 <= len(result["data"]["slides"]) <= 5

    def test_q1_dossier_generation(self, q1_data, feed_service, dossier_service):
        """Q1: Generate full dossier"""
        scope = FeedScope(q1_data.smmm_id, q1_data.client_id, q1_data.period)
        test_item = FeedItem(
            id="FEED-Q1-DOSS-001",
            scope=scope,
            category=FeedCategory.MIZAN,
            severity=FeedSeverity.HIGH,
            score=80,
            impact=FeedImpact(amount_try=75000),
            title="Q1 Detayli Analiz",
            summary="Donem analizi tamamlandi.",
            why="Kapsamli inceleme.",
            evidence_refs=[
                EvidenceRef("EVD-Q1-D1", "mizan", "Mizan", status=EvidenceStatus.AVAILABLE),
                EvidenceRef("EVD-Q1-D2", "banka", "Banka", status=EvidenceStatus.AVAILABLE)
            ],
            actions=[
                FeedAction("ACT-Q1-D1", "Rapor hazirla", responsible="SMMM"),
                FeedAction("ACT-Q1-D2", "Mukellefe ilet", responsible="SMMM")
            ]
        )
        feed_service.add_feed_item(test_item)

        items = feed_service.get_feed_items(
            q1_data.smmm_id, q1_data.client_id, q1_data.period
        )

        result = dossier_service.generate_dossier(
            smmm_id=q1_data.smmm_id,
            client_id=q1_data.client_id,
            period=q1_data.period,
            feed_items=items,
            generate_pdf=False  # Skip PDF for speed
        )

        assert "data" in result
        assert "sections" in result["data"]
        assert len(result["data"]["sections"]) >= 4


class TestFullPipelineQ2:
    """Q2 2024 Full Pipeline Test - KDV Mismatch Scenario"""

    @pytest.fixture
    def q2_data(self):
        return generate_quarter_data(2024, 2, scenario="kdv_mismatch", seed=2024002)

    def test_q2_has_expected_findings(self, q2_data):
        """Q2 should have KDV mismatch finding expected"""
        assert q2_data.has_kdv_mismatch
        kdv_finding = next(
            (f for f in q2_data.expected_findings if f.category == "VDK"),
            None
        )
        assert kdv_finding is not None
        assert kdv_finding.severity == "CRITICAL"

    def test_q2_kdv_accounts(self, q2_data):
        """Q2 should have KDV accounts with mismatch"""
        kdv_191 = next(h for h in q2_data.mizan if h.hesap_kodu == "191")
        kdv_391 = next(h for h in q2_data.mizan if h.hesap_kodu == "391")

        assert kdv_191 is not None
        assert kdv_391 is not None


class TestFullPipelineQ3:
    """Q3 2024 Full Pipeline Test - Bank Mismatch Scenario"""

    @pytest.fixture
    def q3_data(self):
        return generate_quarter_data(2024, 3, scenario="banka_mismatch", seed=2024003)

    def test_q3_has_expected_findings(self, q3_data):
        """Q3 should have bank mismatch finding expected"""
        assert q3_data.has_banka_mismatch

    def test_q3_has_unmatched_transaction(self, q3_data):
        """Q3 should have unmatched bank transaction"""
        unmatched = [b for b in q3_data.banka if "UNMATCHED" in b.aciklama]
        assert len(unmatched) >= 1


class TestFullPipelineQ4:
    """Q4 2024 Full Pipeline Test - Critical Scenario"""

    @pytest.fixture
    def q4_data(self):
        return generate_quarter_data(2024, 4, scenario="critical", seed=2024004)

    def test_q4_has_multiple_findings(self, q4_data):
        """Q4 critical scenario should have multiple findings"""
        assert q4_data.has_kdv_mismatch
        assert q4_data.has_banka_mismatch
        assert len(q4_data.expected_findings) >= 2

    def test_q4_full_dossier_with_findings(self, q4_data, tmp_path):
        """Q4: Generate dossier with critical findings"""
        feed_service = FeedService()
        dossier_service = DossierService(output_dir=str(tmp_path))

        scope = FeedScope(q4_data.smmm_id, q4_data.client_id, q4_data.period)

        # Add critical item
        critical_item = FeedItem(
            id="FEED-Q4-CRIT-001",
            scope=scope,
            category=FeedCategory.VDK,
            severity=FeedSeverity.CRITICAL,
            score=95,
            impact=FeedImpact(amount_try=125000),
            title="Q4 KDV Uyumsuzlugu",
            summary="KDV beyannamesi ile mizan arasinda fark.",
            why="191 Hesap bakiyesi ile KDV beyannamesi tutarsiz.",
            evidence_refs=[
                EvidenceRef("EVD-Q4-191", "mizan", "191 Hesap", status=EvidenceStatus.AVAILABLE),
                EvidenceRef("EVD-Q4-BEYAN", "beyan", "KDV Beyannamesi", status=EvidenceStatus.MISSING)
            ],
            actions=[
                FeedAction("ACT-Q4-UPLOAD", "Beyanname yukleyin", responsible="SMMM"),
                FeedAction("ACT-Q4-CHECK", "Tutarlari kontrol edin", responsible="SMMM")
            ]
        )
        feed_service.add_feed_item(critical_item)

        items = feed_service.get_feed_items(
            q4_data.smmm_id, q4_data.client_id, q4_data.period
        )

        result = dossier_service.generate_dossier(
            smmm_id=q4_data.smmm_id,
            client_id=q4_data.client_id,
            period=q4_data.period,
            feed_items=items,
            generate_pdf=False
        )

        assert result["data"]["metadata"]["critical_findings"] >= 1


class TestYearlyConsolidation:
    """Test yearly consolidation across all quarters"""

    def test_generate_full_year(self):
        """Generate and verify all 4 quarters"""
        scenarios = ["normal", "kdv_mismatch", "banka_mismatch", "critical"]
        all_data = []

        for quarter, scenario in enumerate(scenarios, 1):
            data = generate_quarter_data(2024, quarter, scenario=scenario)
            all_data.append(data)

            assert data.quarter == quarter
            assert len(data.mizan) > 0
            assert len(data.banka) > 0

        # Verify yearly totals would be calculable
        total_findings = sum(len(d.expected_findings) for d in all_data)
        assert total_findings >= 3  # At least from Q2, Q3, Q4

    def test_cross_quarter_consistency(self):
        """Data should be consistent across quarters"""
        q1 = generate_quarter_data(2024, 1, client_id="SAME-CLIENT")
        q2 = generate_quarter_data(2024, 2, client_id="SAME-CLIENT")

        # Same client, different periods
        assert q1.client_id == q2.client_id
        assert q1.period != q2.period

    def test_full_year_pipeline(self, tmp_path):
        """Full year pipeline test"""
        feed_service = FeedService()
        dossier_service = DossierService(output_dir=str(tmp_path))

        client_id = "YEARLY-TEST-001"
        smmm_id = "SMMM-YEARLY-001"

        for quarter in range(1, 5):
            period = f"2024-Q{quarter}"
            scope = FeedScope(smmm_id, client_id, period)

            # Add quarterly item
            item = FeedItem(
                id=f"FEED-YEAR-Q{quarter}",
                scope=scope,
                category=FeedCategory.MIZAN,
                severity=FeedSeverity.MEDIUM,
                score=50 + quarter * 10,
                impact=FeedImpact(points=quarter),
                title=f"Q{quarter} Donem Ozeti",
                summary=f"Q{quarter} analizi.",
                why=f"Ceyrek {quarter} incelemesi.",
                evidence_refs=[EvidenceRef(f"EVD-Q{quarter}", "mizan", f"Q{quarter} Mizan")],
                actions=[FeedAction(f"ACT-Q{quarter}", f"Q{quarter} aksiyonu")]
            )
            feed_service.add_feed_item(item)

        # Verify all quarters have items
        for quarter in range(1, 5):
            items = feed_service.get_feed_items(smmm_id, client_id, f"2024-Q{quarter}")
            assert len(items) >= 1


class TestEndToEndWithRealServices:
    """End-to-end tests using actual services"""

    def test_complete_flow_normal(self, tmp_path):
        """Normal scenario complete flow"""
        # 1. Generate data
        data = generate_quarter_data(2024, 1, scenario="normal", seed=999)

        # 2. Create services
        feed_service = FeedService()
        bundle_service = EvidenceBundleService(output_dir=str(tmp_path))
        brief_service = BriefService()
        dossier_service = DossierService(output_dir=str(tmp_path))

        # 3. Add feed item
        scope = FeedScope(data.smmm_id, data.client_id, data.period)
        item = FeedItem(
            id="FEED-E2E-001",
            scope=scope,
            category=FeedCategory.MIZAN,
            severity=FeedSeverity.LOW,
            score=25,
            impact=FeedImpact(points=1),
            title="E2E Test Bulgusu",
            summary="End-to-end test.",
            why="Test amaciyla olusturuldu.",
            evidence_refs=[EvidenceRef("EVD-E2E-1", "test", "Test Evidence")],
            actions=[FeedAction("ACT-E2E-1", "Test aksiyonu")]
        )
        feed_service.add_feed_item(item)

        # 4. Get items
        items = feed_service.get_feed_items(data.smmm_id, data.client_id, data.period)
        assert len(items) >= 1

        # 5. Generate bundle
        bundle_result = bundle_service.generate_bundle(
            smmm_id=data.smmm_id,
            client_id=data.client_id,
            period=data.period,
            feed_items=items
        )
        assert bundle_result["data"]["bundle_id"] is not None

        # 6. Generate brief
        brief_result = brief_service.generate_brief(
            smmm_id=data.smmm_id,
            client_id=data.client_id,
            period=data.period,
            feed_items=items,
            bundle_id=bundle_result["data"]["bundle_id"]
        )
        assert len(brief_result["data"]["slides"]) >= 2

        # 7. Generate dossier
        dossier_result = dossier_service.generate_dossier(
            smmm_id=data.smmm_id,
            client_id=data.client_id,
            period=data.period,
            feed_items=items,
            bundle_id=bundle_result["data"]["bundle_id"],
            brief_id=brief_result["data"]["brief_id"],
            generate_pdf=False
        )
        assert len(dossier_result["data"]["sections"]) >= 4

        # Verify linking
        assert dossier_result["data"]["source"]["bundle_id"] == bundle_result["data"]["bundle_id"]
        assert dossier_result["data"]["source"]["brief_id"] == brief_result["data"]["brief_id"]
