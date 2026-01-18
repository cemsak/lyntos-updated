"""Evidence Bundle Service Tests"""
import pytest
import os
import json
import zipfile
from pathlib import Path

from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus
)
from services.evidence_bundle import EvidenceBundleService


class TestEvidenceBundleService:
    """Test Evidence Bundle Service"""

    @pytest.fixture
    def service(self, tmp_path):
        return EvidenceBundleService(output_dir=str(tmp_path))

    @pytest.fixture
    def sample_feed_items(self):
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
                summary="KDV farki",
                why="191 hesap tutarsiz",
                evidence_refs=[
                    EvidenceRef("EVD-001", "mizan", "Mizan", status=EvidenceStatus.AVAILABLE),
                    EvidenceRef("EVD-002", "beyan", "Beyanname", status=EvidenceStatus.MISSING)
                ],
                actions=[
                    FeedAction("ACT-001", "Beyanname yukle", responsible="SMMM")
                ]
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
                actions=[
                    FeedAction("ACT-002", "Islemleri kontrol et")
                ]
            )
        ]

    def test_collect_evidence_deduplicates(self, service, sample_feed_items):
        """Test that evidence collection deduplicates by ref_id"""
        evidence, actions, stats = service.collect_evidence(sample_feed_items)

        # Should have 3 unique evidence refs
        assert len(evidence) == 3
        ref_ids = [e.ref_id for e in evidence]
        assert len(ref_ids) == len(set(ref_ids))  # All unique

    def test_collect_evidence_counts_severity(self, service, sample_feed_items):
        """Test severity counting"""
        evidence, actions, stats = service.collect_evidence(sample_feed_items)

        assert stats["critical_items"] == 1
        assert stats["high_items"] == 1

    def test_calculate_summary(self, service, sample_feed_items):
        """Test summary calculation"""
        evidence, actions, stats = service.collect_evidence(sample_feed_items)
        summary = service.calculate_summary(evidence, actions, stats)

        assert summary.total_evidence == 3
        assert summary.available_evidence == 2
        assert summary.missing_evidence == 1
        assert summary.completion_rate == pytest.approx(66.7, rel=0.1)

    def test_generate_bundle_creates_zip(self, service, sample_feed_items):
        """Test that generate_bundle creates a ZIP file"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        assert result["data"]["zip_path"] is not None
        assert os.path.exists(result["data"]["zip_path"])

    def test_zip_contains_manifest(self, service, sample_feed_items):
        """Test that ZIP contains manifest.json"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        with zipfile.ZipFile(result["data"]["zip_path"], 'r') as zf:
            assert "manifest.json" in zf.namelist()

            manifest_content = zf.read("manifest.json").decode('utf-8')
            manifest = json.loads(manifest_content)

            assert manifest["client_id"] == "CLIENT-1"
            assert manifest["period"] == "2024-Q1"

    def test_response_envelope_format(self, service, sample_feed_items):
        """Test ResponseEnvelope format compliance"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        # Check required fields
        assert "schema" in result
        assert result["schema"]["name"] == "EvidenceBundleResponse"
        assert "meta" in result
        assert result["meta"]["smmm_id"] == "SMMM-1"
        assert "data" in result
        assert "errors" in result
        assert "warnings" in result

    def test_warnings_for_missing_evidence(self, service, sample_feed_items):
        """Test that warnings are generated for missing evidence"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        # Should have warning about EVD-002 being missing
        assert len(result["warnings"]) > 0
        missing_warning = next(
            (w for w in result["warnings"] if w["type"] == "missing_evidence"),
            None
        )
        assert missing_warning is not None
        assert "EVD-002" in missing_warning["refs"]

    def test_empty_feed_items(self, service):
        """Test handling of empty feed items"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=[]
        )

        assert result["data"]["summary"]["total_evidence"] == 0
        assert result["data"]["summary"]["completion_rate"] == 100.0

    def test_zip_contains_pdf(self, service, sample_feed_items):
        """Test that ZIP contains PDF report"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        with zipfile.ZipFile(result["data"]["zip_path"], 'r') as zf:
            assert "report.pdf" in zf.namelist()

    def test_bundle_id_format(self, service, sample_feed_items):
        """Test that bundle ID has correct format"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        bundle_id = result["data"]["bundle_id"]
        assert bundle_id.startswith("EVBND-")
        assert "2024-Q1" in bundle_id

    def test_action_items_collected(self, service, sample_feed_items):
        """Test that action items are collected in manifest"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        manifest = result["data"]["manifest"]
        assert len(manifest["action_items"]) == 2

    def test_source_feed_ids_tracked(self, service, sample_feed_items):
        """Test that source feed IDs are tracked"""
        result = service.generate_bundle(
            smmm_id="SMMM-1",
            client_id="CLIENT-1",
            period="2024-Q1",
            feed_items=sample_feed_items
        )

        manifest = result["data"]["manifest"]
        assert "FEED-001" in manifest["source_feed_ids"]
        assert "FEED-002" in manifest["source_feed_ids"]
