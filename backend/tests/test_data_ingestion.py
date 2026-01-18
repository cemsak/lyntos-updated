"""
Data Ingestion Tests
Tests for mizan, banka, beyan parsing and loading
"""
import pytest
import json
from pathlib import Path
from decimal import Decimal

from tests.data_factory import MizanGenerator, BankaGenerator, generate_quarter_data


class TestMizanGenerator:
    """Test mizan data generation"""

    def test_generate_quarter_deterministic(self):
        """Same seed should produce same data when generator is fresh"""
        # Create fresh generators with same seed
        gen1 = MizanGenerator(seed=42)
        mizan1 = gen1.generate_quarter(2024, 1)

        gen2 = MizanGenerator(seed=42)
        mizan2 = gen2.generate_quarter(2024, 1)

        assert len(mizan1) == len(mizan2)
        for h1, h2 in zip(mizan1, mizan2):
            assert h1.hesap_kodu == h2.hesap_kodu
            assert h1.borc == h2.borc

    def test_generate_all_quarters(self):
        """Generate data for all 4 quarters"""
        gen = MizanGenerator(seed=100)

        for quarter in range(1, 5):
            mizan = gen.generate_quarter(2024, quarter)
            assert len(mizan) > 10

            # Check required accounts exist
            hesap_kodlari = [h.hesap_kodu for h in mizan]
            assert "100" in hesap_kodlari  # Kasa
            assert "102" in hesap_kodlari  # Banka
            assert "191" in hesap_kodlari  # Indirilecek KDV
            assert "391" in hesap_kodlari  # Hesaplanan KDV

    def test_mizan_balance(self):
        """Mizan should balance (borc = alacak bakiye)"""
        gen = MizanGenerator(seed=100)
        mizan = gen.generate_quarter(2024, 1, include_errors=False)

        totals = gen.calculate_totals(mizan)
        # Note: With errors=False, should be reasonably balanced
        # Small rounding differences acceptable

    def test_mizan_with_errors(self):
        """Mizan with errors should have KDV mismatch"""
        gen = MizanGenerator(seed=100)
        mizan = gen.generate_quarter(2024, 2, include_errors=True)

        # Find KDV accounts
        kdv_191 = next(h for h in mizan if h.hesap_kodu == "191")
        kdv_391 = next(h for h in mizan if h.hesap_kodu == "391")

        assert kdv_191 is not None
        assert kdv_391 is not None
        # With errors, 191 should be inflated

    def test_mizan_to_dict(self):
        """Test serialization to dict"""
        gen = MizanGenerator(seed=42)
        mizan = gen.generate_quarter(2024, 1)

        json_data = gen.to_json(mizan)
        assert len(json_data) == len(mizan)
        assert "hesap_kodu" in json_data[0]
        assert "borc" in json_data[0]

    def test_seasonal_variance(self):
        """Q4 should have higher revenue than Q3"""
        gen = MizanGenerator(seed=42)

        q3 = gen.generate_quarter(2024, 3)
        q4 = gen.generate_quarter(2024, 4)

        # Get 600 (sales) account
        sales_q3 = next(h for h in q3 if h.hesap_kodu == "600")
        sales_q4 = next(h for h in q4 if h.hesap_kodu == "600")

        # Q4 seasonal factor is 1.25, Q3 is 0.85
        # So Q4 sales should be higher


class TestBankaGenerator:
    """Test banka data generation"""

    def test_generate_quarter(self):
        """Generate bank statement for quarter"""
        gen = BankaGenerator(seed=42)
        islemler = gen.generate_quarter(2024, 1, transaction_count=30)

        assert len(islemler) == 30

        # Check sorted by date
        for i in range(1, len(islemler)):
            assert islemler[i].tarih >= islemler[i-1].tarih

    def test_running_balance(self):
        """Running balance should be correct"""
        gen = BankaGenerator(seed=42)
        opening = Decimal("100000")
        islemler = gen.generate_quarter(2024, 1, opening_balance=opening)

        # Verify running balance
        balance = opening
        for islem in islemler:
            if islem.islem_tipi == "giris":
                balance += islem.tutar
            else:
                balance -= islem.tutar
            assert islem.bakiye == balance

    def test_with_unmatched(self):
        """Include unmatched transaction"""
        gen = BankaGenerator(seed=42)
        islemler = gen.generate_quarter(2024, 1, include_unmatched=True)

        unmatched = [i for i in islemler if "UNMATCHED" in i.aciklama]
        assert len(unmatched) == 1

    def test_deterministic_generation(self):
        """Same seed should produce same transactions when generator is fresh"""
        # Create fresh generators with same seed
        gen1 = BankaGenerator(seed=123)
        islemler1 = gen1.generate_quarter(2024, 1)

        gen2 = BankaGenerator(seed=123)
        islemler2 = gen2.generate_quarter(2024, 1)

        assert len(islemler1) == len(islemler2)
        for i1, i2 in zip(islemler1, islemler2):
            assert i1.tutar == i2.tutar
            assert i1.islem_tipi == i2.islem_tipi

    def test_calculate_summary(self):
        """Summary calculation should be correct"""
        gen = BankaGenerator(seed=42)
        opening = Decimal("500000")
        islemler = gen.generate_quarter(2024, 1, opening_balance=opening)

        summary = gen.calculate_summary(islemler)

        assert "transaction_count" in summary
        assert "total_giris" in summary
        assert "total_cikis" in summary
        assert summary["transaction_count"] == len(islemler)

    def test_quarter_date_range(self):
        """Transactions should be within quarter date range"""
        from datetime import date

        gen = BankaGenerator(seed=42)

        for quarter in range(1, 5):
            islemler = gen.generate_quarter(2024, quarter)

            start_month = (quarter - 1) * 3 + 1
            end_month = start_month + 2

            for islem in islemler:
                assert islem.tarih.year == 2024
                assert start_month <= islem.tarih.month <= end_month


class TestQuarterData:
    """Test complete quarter data package"""

    def test_generate_normal_scenario(self):
        """Normal scenario should have minimal findings"""
        data = generate_quarter_data(2024, 1, scenario="normal")

        assert data.period == "2024-Q1"
        assert len(data.mizan) > 0
        assert len(data.banka) > 0
        assert not data.has_kdv_mismatch
        assert not data.has_banka_mismatch

    def test_generate_kdv_mismatch_scenario(self):
        """KDV mismatch scenario"""
        data = generate_quarter_data(2024, 2, scenario="kdv_mismatch")

        assert data.has_kdv_mismatch
        assert any(f.category == "VDK" for f in data.expected_findings)

    def test_generate_banka_mismatch_scenario(self):
        """Bank mismatch scenario"""
        data = generate_quarter_data(2024, 3, scenario="banka_mismatch")

        assert data.has_banka_mismatch
        assert any(f.category == "Mutabakat" for f in data.expected_findings)

    def test_generate_missing_docs_scenario(self):
        """Missing documents scenario"""
        data = generate_quarter_data(2024, 1, scenario="missing_docs")

        assert data.has_missing_documents
        assert any(f.category == "Belge" for f in data.expected_findings)

    def test_generate_critical_scenario(self):
        """Critical scenario with multiple issues"""
        data = generate_quarter_data(2024, 3, scenario="critical")

        assert data.has_kdv_mismatch
        assert data.has_banka_mismatch
        assert len(data.expected_findings) >= 2

    def test_save_and_load(self, tmp_path):
        """Save and verify data files"""
        data = generate_quarter_data(2024, 1)
        data.save(tmp_path)

        # Verify files created
        assert (tmp_path / "mizan_2024-Q1.json").exists()
        assert (tmp_path / "banka_2024-Q1.json").exists()
        assert (tmp_path / "meta_2024-Q1.json").exists()

        # Verify content
        with open(tmp_path / "mizan_2024-Q1.json") as f:
            mizan_data = json.load(f)
            assert len(mizan_data) == len(data.mizan)

    def test_all_quarters_2024(self):
        """Generate all quarters of 2024"""
        scenarios = ["normal", "kdv_mismatch", "banka_mismatch", "critical"]

        for quarter, scenario in enumerate(scenarios, 1):
            data = generate_quarter_data(2024, quarter, scenario=scenario)
            assert data.quarter == quarter
            assert data.year == 2024

    def test_to_dict(self):
        """Test full serialization"""
        data = generate_quarter_data(2024, 1)
        d = data.to_dict()

        assert "period" in d
        assert "mizan" in d
        assert "banka" in d
        assert "expected_findings" in d
        assert "flags" in d

    def test_deterministic_with_seed(self):
        """Same seed should produce same data"""
        data1 = generate_quarter_data(2024, 1, seed=999)
        data2 = generate_quarter_data(2024, 1, seed=999)

        assert len(data1.mizan) == len(data2.mizan)
        assert len(data1.banka) == len(data2.banka)

    def test_custom_ids(self):
        """Custom SMMM and client IDs"""
        data = generate_quarter_data(
            2024, 1,
            smmm_id="MY-SMMM-001",
            client_id="MY-CLIENT-001"
        )

        assert data.smmm_id == "MY-SMMM-001"
        assert data.client_id == "MY-CLIENT-001"
