# -*- coding: utf-8 -*-
"""
LYNTOS Period Utilities
========================

Period (dönem) normalizasyonu, tarih aralığı hesaplama ve doğrulama.

Standard format: "2025-Q1" (tire, büyük harf)
"""

import re
from dataclasses import dataclass
from datetime import date
from typing import List, Optional

from fastapi import Query


# Quarter sınırları
QUARTER_BOUNDS = {
    1: (1, 1, 3, 31),   # Q1: 1 Ocak - 31 Mart
    2: (4, 1, 6, 30),   # Q2: 1 Nisan - 30 Haziran
    3: (7, 1, 9, 30),   # Q3: 1 Temmuz - 30 Eylül
    4: (10, 1, 12, 31), # Q4: 1 Ekim - 31 Aralık
}


@dataclass
class PeriodValidation:
    """Dönem doğrulama sonucu"""
    status: str  # 'ok', 'mismatch', 'unknown'
    detected_period: Optional[str] = None
    detail: Optional[str] = None


def normalize_period_db(period: str) -> str:
    """
    Her formattan DB storage formatina donustur: 2025_Q1 (alt cizgi, buyuk harf).

    Desteklenen: '2025-Q1', '2025_Q1', '2025-q1', '2025Q1'
    Cikti: '2025_Q1'
    """
    if not period:
        raise ValueError("Period bos olamaz")
    p = period.strip().upper().replace('-', '_')
    if re.match(r'^\d{4}Q[1-4]$', p):
        p = f"{p[:4]}_{p[4:]}"
    if not re.match(r'^\d{4}_Q[1-4]$', p):
        raise ValueError(f"Gecersiz donem formati: '{period}'. Beklenen: YYYY-QN (orn: 2025-Q1)")
    return p


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

def get_period_db(period_id: str = Query(..., description="Donem ID (orn: 2025-Q1)")) -> str:
    """FastAPI Depends: query param 'period_id' -> DB format (2025_Q1)."""
    return normalize_period_db(period_id)


def get_period_db_from_period(period: str = Query(..., description="Donem (orn: 2025-Q1)")) -> str:
    """FastAPI Depends: query param 'period' -> DB format (2025_Q1)."""
    return normalize_period_db(period)


def get_period_db_optional(period_id: str = Query(None, description="Donem ID (opsiyonel)")) -> Optional[str]:
    """FastAPI Depends: optional query param 'period_id' -> DB format."""
    return normalize_period_db(period_id) if period_id else None


def normalize_period(period: str) -> str:
    """
    Her formattan '2025-Q1' standardına dönüştür.

    Desteklenen formatlar:
    - '2025-Q1', '2025_Q1', '2025-q1', '2025_q1'
    - '2025Q1', '2025q1'

    Raises:
        ValueError: Geçersiz format
    """
    if not period:
        raise ValueError("Period boş olamaz")

    p = period.strip().upper().replace('_', '-')

    # 2025Q1 → 2025-Q1
    if re.match(r'^\d{4}Q[1-4]$', p):
        p = f"{p[:4]}-{p[4:]}"

    if not re.match(r'^\d{4}-Q[1-4]$', p):
        raise ValueError(f"Geçersiz dönem formatı: '{period}'. Beklenen: YYYY-QN (örn: 2025-Q1)")

    return p


def get_period_date_range(period: str) -> tuple:
    """
    Dönem kodundan başlangıç ve bitiş tarihlerini döndür.

    Args:
        period: '2025-Q1' formatında dönem

    Returns:
        (start_date, end_date) tuple

    Example:
        >>> get_period_date_range('2025-Q1')
        (date(2025, 1, 1), date(2025, 3, 31))
    """
    p = normalize_period(period)
    year = int(p[:4])
    quarter = int(p[-1])

    sm, sd, em, ed = QUARTER_BOUNDS[quarter]
    return date(year, sm, sd), date(year, em, ed)


def detect_period_from_dates(dates: List[date]) -> Optional[str]:
    """
    Tarih listesinden hangi döneme ait olduğunu tahmin et.

    Majority voting: Tarihlerin çoğunluğu hangi çeyrekteyse o dönem.

    Args:
        dates: Tarih listesi

    Returns:
        '2025-Q1' formatında dönem veya None (belirlenemezse)
    """
    if not dates:
        return None

    # Her tarih için yıl-çeyrek belirle
    quarter_counts = {}
    for d in dates:
        q = (d.month - 1) // 3 + 1
        key = f"{d.year}-Q{q}"
        quarter_counts[key] = quarter_counts.get(key, 0) + 1

    if not quarter_counts:
        return None

    # En çok oy alan dönem
    best_period = max(quarter_counts, key=quarter_counts.get)
    best_count = quarter_counts[best_period]

    # Toplam tarihlerin en az %60'ı aynı dönemde olmalı
    if best_count / len(dates) >= 0.6:
        return best_period

    return None


def validate_dates_in_period(dates: List[date], period: str) -> PeriodValidation:
    """
    Tarihlerin seçilen döneme ait olup olmadığını kontrol et.

    Args:
        dates: Dosyadaki tarihler
        period: Seçilen dönem (örn: '2025-Q1')

    Returns:
        PeriodValidation sonucu
    """
    if not dates:
        return PeriodValidation(status='unknown', detail='Tarih bilgisi bulunamadı')

    p = normalize_period(period)
    start_date, end_date = get_period_date_range(p)

    # Tarihlerin kaçı dönem içinde
    in_period = sum(1 for d in dates if start_date <= d <= end_date)
    total = len(dates)
    ratio = in_period / total if total > 0 else 0

    if ratio >= 0.8:
        return PeriodValidation(status='ok', detected_period=p)

    # Hangi dönem olduğunu tespit et
    detected = detect_period_from_dates(dates)

    if detected and detected != p:
        return PeriodValidation(
            status='mismatch',
            detected_period=detected,
            detail=f"Dosya içeriği {detected} dönemine ait görünüyor, ancak {p} dönemi seçildi. "
                   f"({in_period}/{total} tarih seçilen dönem içinde)"
        )

    if ratio >= 0.5:
        return PeriodValidation(
            status='ok',
            detected_period=p,
            detail=f"Tarihlerin {in_period}/{total} tanesi dönem içinde"
        )

    return PeriodValidation(
        status='mismatch',
        detected_period=detected,
        detail=f"Tarihlerin çoğunluğu ({total - in_period}/{total}) seçilen dönem ({p}) dışında"
    )


def month_in_quarter(year: int, month: int, period: str) -> bool:
    """
    Belirli bir ay/yıl, seçilen dönem içinde mi?

    Args:
        year: Yıl (2025)
        month: Ay (1-12)
        period: '2025-Q1' formatında dönem
    """
    p = normalize_period(period)
    p_year = int(p[:4])
    p_quarter = int(p[-1])

    if year != p_year:
        return False

    sm, _, em, _ = QUARTER_BOUNDS[p_quarter]
    return sm <= month <= em


def get_quarter_months(period: str) -> List[int]:
    """
    Dönemdeki ay numaralarını döndür.

    >>> get_quarter_months('2025-Q1')
    [1, 2, 3]
    """
    p = normalize_period(period)
    quarter = int(p[-1])
    sm, _, em, _ = QUARTER_BOUNDS[quarter]
    return list(range(sm, em + 1))
