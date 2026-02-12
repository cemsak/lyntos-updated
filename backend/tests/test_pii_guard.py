# -*- coding: utf-8 -*-
"""
Tests for PII Guard — VKN masking, company name anonymization, text sanitization
"""

import pytest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.pii_guard import (
    mask_vkn,
    mask_company_name,
    sanitize_text,
    sanitize_mukellef_context,
    reset_mask_map,
)


@pytest.fixture(autouse=True)
def _reset_pii():
    """Reset mask map before each test for deterministic results"""
    reset_mask_map()
    yield
    reset_mask_map()


# ═══════════════════════════════════════════════════════════════
# mask_vkn
# ═══════════════════════════════════════════════════════════════

class TestMaskVkn:
    def test_10_digit_vkn(self):
        assert mask_vkn("1234567890") == "123****890"

    def test_11_digit_tckn(self):
        assert mask_vkn("12345678901") == "123****901"

    def test_none_returns_na(self):
        assert mask_vkn(None) == "N/A"

    def test_empty_returns_na(self):
        assert mask_vkn("") == "N/A"

    def test_short_vkn_passthrough(self):
        """VKN shorter than 6 chars returned as-is"""
        assert mask_vkn("12345") == "12345"

    def test_6_char_minimum(self):
        result = mask_vkn("123456")
        assert result == "123****456"


# ═══════════════════════════════════════════════════════════════
# mask_company_name
# ═══════════════════════════════════════════════════════════════

class TestMaskCompanyName:
    def test_none_returns_mukellef(self):
        assert mask_company_name(None) == "MUKELLEF"

    def test_empty_returns_mukellef(self):
        assert mask_company_name("") == "MUKELLEF"

    def test_first_call_returns_a(self):
        result = mask_company_name("Ozkan Kirtasiye Ltd.")
        assert result == "MUKELLEF_A"

    def test_second_call_returns_b(self):
        mask_company_name("Firma A")
        result = mask_company_name("Firma B")
        assert result == "MUKELLEF_B"

    def test_same_name_consistent(self):
        """Same company name always maps to same code"""
        r1 = mask_company_name("Ozkan Ltd.")
        r2 = mask_company_name("Ozkan Ltd.")
        assert r1 == r2


# ═══════════════════════════════════════════════════════════════
# sanitize_text
# ═══════════════════════════════════════════════════════════════

class TestSanitizeText:
    def test_empty_text(self):
        assert sanitize_text("") == ""
        assert sanitize_text(None) is None

    def test_masks_specific_vkn(self):
        text = "Mukellef VKN: 1234567890 kayitli."
        result = sanitize_text(text, vkn="1234567890")
        assert "1234567890" not in result
        assert "123****890" in result

    def test_masks_specific_company(self):
        text = "Ozkan Ltd. icin analiz yapildi."
        result = sanitize_text(text, company_name="Ozkan Ltd.")
        assert "Ozkan Ltd." not in result
        assert "MUKELLEF_A" in result

    def test_masks_general_vkn_pattern(self):
        """10-11 digit numbers are auto-masked even without explicit vkn param"""
        text = "Diger firma: 9876543210 bilgisi."
        result = sanitize_text(text)
        assert "9876543210" not in result
        assert "987****210" in result

    def test_no_false_positive_on_short_numbers(self):
        """Numbers shorter than 10 digits should NOT be masked"""
        text = "Tutar: 123456789 TL"
        result = sanitize_text(text)
        assert "123456789" in result  # 9 digits — not a VKN


# ═══════════════════════════════════════════════════════════════
# sanitize_mukellef_context
# ═══════════════════════════════════════════════════════════════

class TestSanitizeMukellefContext:
    def test_masks_vkn(self):
        mukellef = {"vkn": "0480525636", "ad": "Ozkan Ltd."}
        result = sanitize_mukellef_context(mukellef)
        assert result["vkn"] == "048****636"

    def test_masks_company_name(self):
        mukellef = {"vkn": "0480525636", "ad": "Ozkan Ltd."}
        result = sanitize_mukellef_context(mukellef)
        assert result["ad"] == "MUKELLEF_A"

    def test_masks_vergi_dairesi(self):
        mukellef = {"vkn": "0480525636", "ad": "Test", "vergi_dairesi": "Kadikoy"}
        result = sanitize_mukellef_context(mukellef)
        assert result["vergi_dairesi"] == "VD_***"

    def test_none_input(self):
        assert sanitize_mukellef_context(None) is None

    def test_empty_dict(self):
        assert sanitize_mukellef_context({}) == {}

    def test_original_not_mutated(self):
        mukellef = {"vkn": "0480525636", "ad": "Test"}
        sanitize_mukellef_context(mukellef)
        assert mukellef["vkn"] == "0480525636"  # original unchanged
