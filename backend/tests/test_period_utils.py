# -*- coding: utf-8 -*-
"""
Tests for period_utils — normalization, date range, validation
"""

import pytest
from datetime import date

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.period_utils import (
    normalize_period,
    normalize_period_db,
    get_period_date_range,
    detect_period_from_dates,
    validate_dates_in_period,
    month_in_quarter,
    get_quarter_months,
    PeriodValidation,
)


# ═══════════════════════════════════════════════════════════════
# normalize_period (frontend format: 2025-Q1)
# ═══════════════════════════════════════════════════════════════

class TestNormalizePeriod:
    def test_standard_format(self):
        assert normalize_period("2025-Q1") == "2025-Q1"

    def test_underscore_format(self):
        assert normalize_period("2025_Q1") == "2025-Q1"

    def test_lowercase(self):
        assert normalize_period("2025-q2") == "2025-Q2"

    def test_no_separator(self):
        assert normalize_period("2025Q3") == "2025-Q3"

    def test_lowercase_no_separator(self):
        assert normalize_period("2025q4") == "2025-Q4"

    def test_whitespace_trimmed(self):
        assert normalize_period("  2025-Q1  ") == "2025-Q1"

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="boş olamaz"):
            normalize_period("")

    def test_invalid_quarter_raises(self):
        with pytest.raises(ValueError, match="Geçersiz"):
            normalize_period("2025-Q5")

    def test_garbage_raises(self):
        with pytest.raises(ValueError, match="Geçersiz"):
            normalize_period("foobar")

    def test_only_year_raises(self):
        with pytest.raises(ValueError, match="Geçersiz"):
            normalize_period("2025")


# ═══════════════════════════════════════════════════════════════
# normalize_period_db (DB format: 2025_Q1)
# ═══════════════════════════════════════════════════════════════

class TestNormalizePeriodDb:
    def test_dash_to_underscore(self):
        assert normalize_period_db("2025-Q1") == "2025_Q1"

    def test_already_underscore(self):
        assert normalize_period_db("2025_Q2") == "2025_Q2"

    def test_no_separator(self):
        assert normalize_period_db("2025Q3") == "2025_Q3"

    def test_lowercase(self):
        assert normalize_period_db("2025-q4") == "2025_Q4"

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="bos olamaz"):
            normalize_period_db("")

    def test_invalid_raises(self):
        with pytest.raises(ValueError, match="Gecersiz"):
            normalize_period_db("invalid")


# ═══════════════════════════════════════════════════════════════
# get_period_date_range
# ═══════════════════════════════════════════════════════════════

class TestGetPeriodDateRange:
    def test_q1(self):
        start, end = get_period_date_range("2025-Q1")
        assert start == date(2025, 1, 1)
        assert end == date(2025, 3, 31)

    def test_q2(self):
        start, end = get_period_date_range("2025-Q2")
        assert start == date(2025, 4, 1)
        assert end == date(2025, 6, 30)

    def test_q3(self):
        start, end = get_period_date_range("2025-Q3")
        assert start == date(2025, 7, 1)
        assert end == date(2025, 9, 30)

    def test_q4(self):
        start, end = get_period_date_range("2025-Q4")
        assert start == date(2025, 10, 1)
        assert end == date(2025, 12, 31)

    def test_accepts_alternate_formats(self):
        start, end = get_period_date_range("2025_Q1")
        assert start == date(2025, 1, 1)


# ═══════════════════════════════════════════════════════════════
# detect_period_from_dates
# ═══════════════════════════════════════════════════════════════

class TestDetectPeriodFromDates:
    def test_clear_q1(self):
        dates = [date(2025, 1, 15), date(2025, 2, 10), date(2025, 3, 20)]
        assert detect_period_from_dates(dates) == "2025-Q1"

    def test_clear_q3(self):
        dates = [date(2025, 7, 1), date(2025, 8, 15), date(2025, 9, 30)]
        assert detect_period_from_dates(dates) == "2025-Q3"

    def test_empty_list(self):
        assert detect_period_from_dates([]) is None

    def test_mixed_below_threshold(self):
        """If no quarter has >= 60%, returns None"""
        dates = [
            date(2025, 1, 1), date(2025, 4, 1),
            date(2025, 7, 1), date(2025, 10, 1), date(2025, 11, 1),
        ]
        # Q4 has 2/5 = 40%, Q1-Q3 have 1/5 = 20% each → None
        assert detect_period_from_dates(dates) is None

    def test_majority_with_outlier(self):
        """Even with 1 outlier, majority should win"""
        dates = [
            date(2025, 1, 5), date(2025, 2, 10), date(2025, 3, 15),
            date(2025, 5, 1),  # outlier (Q2)
        ]
        # Q1 = 3/4 = 75% → 2025-Q1
        assert detect_period_from_dates(dates) == "2025-Q1"


# ═══════════════════════════════════════════════════════════════
# validate_dates_in_period
# ═══════════════════════════════════════════════════════════════

class TestValidateDatesInPeriod:
    def test_all_dates_match(self):
        dates = [date(2025, 1, 1), date(2025, 2, 15), date(2025, 3, 31)]
        result = validate_dates_in_period(dates, "2025-Q1")
        assert result.status == "ok"

    def test_mismatch_detected(self):
        dates = [date(2025, 4, 1), date(2025, 5, 15), date(2025, 6, 30)]
        result = validate_dates_in_period(dates, "2025-Q1")
        assert result.status == "mismatch"
        assert result.detected_period == "2025-Q2"

    def test_empty_dates(self):
        result = validate_dates_in_period([], "2025-Q1")
        assert result.status == "unknown"

    def test_partial_match_ok(self):
        """50-80% match → still ok with detail"""
        dates = [
            date(2025, 1, 1), date(2025, 2, 1), date(2025, 3, 1),  # Q1
            date(2025, 4, 1), date(2025, 5, 1),  # Q2
        ]
        # 3/5 = 60% in Q1 → should detect ok (>= 50%)
        result = validate_dates_in_period(dates, "2025-Q1")
        assert result.status == "ok"


# ═══════════════════════════════════════════════════════════════
# month_in_quarter
# ═══════════════════════════════════════════════════════════════

class TestMonthInQuarter:
    def test_jan_in_q1(self):
        assert month_in_quarter(2025, 1, "2025-Q1") is True

    def test_mar_in_q1(self):
        assert month_in_quarter(2025, 3, "2025-Q1") is True

    def test_apr_not_in_q1(self):
        assert month_in_quarter(2025, 4, "2025-Q1") is False

    def test_wrong_year(self):
        assert month_in_quarter(2024, 1, "2025-Q1") is False

    def test_dec_in_q4(self):
        assert month_in_quarter(2025, 12, "2025-Q4") is True


# ═══════════════════════════════════════════════════════════════
# get_quarter_months
# ═══════════════════════════════════════════════════════════════

class TestGetQuarterMonths:
    def test_q1(self):
        assert get_quarter_months("2025-Q1") == [1, 2, 3]

    def test_q2(self):
        assert get_quarter_months("2025-Q2") == [4, 5, 6]

    def test_q3(self):
        assert get_quarter_months("2025-Q3") == [7, 8, 9]

    def test_q4(self):
        assert get_quarter_months("2025-Q4") == [10, 11, 12]
