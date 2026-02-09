"""
LYNTOS Assistant Context Service
Asistan için dinamik kontekst yükleyicileri.

Müşteri bilgileri, mali veriler, mevzuat araması,
sektör teşvikleri ve risk özetlerini sağlar.
"""

import json
import logging
import sys
from datetime import datetime, date
from typing import Dict, List, Optional
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)


def load_client_context(client_id: str) -> Optional[str]:
    """
    Müşterinin temel bilgilerini yükle.
    Vergi no, sektör, şirket türü, sermaye vb.
    """
    if not client_id or client_id == 'default':
        return None

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # taxpayers tablosundan müşteri bilgisi
            cursor.execute("""
                SELECT
                    name, tax_id, company_type, sector,
                    address, city, registration_date
                FROM taxpayers
                WHERE id = ? OR tax_id = ?
                LIMIT 1
            """, (client_id, client_id))

            row = cursor.fetchone()
            if not row:
                return None

            data = dict(row)
            lines = [
                "## Seçili Mükellef Bilgileri:",
                f"- Unvan: {data.get('name', '-')}",
                f"- VKN/TCKN: {data.get('tax_id', '-')}",
                f"- Şirket Türü: {data.get('company_type', '-')}",
                f"- Sektör: {data.get('sector', '-')}",
                f"- İl: {data.get('city', '-')}",
            ]

            return "\n".join(lines)

    except Exception as e:
        logger.error(f"Client context load error (id={client_id}): {e}")
        return None


def load_client_financials(
    client_id: str, period: Optional[str] = None
) -> Optional[str]:
    """
    Müşterinin mali verilerini yükle.
    Mizan özeti, öz varlık, kar/zarar.
    """
    if not client_id or client_id == 'default':
        return None

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # Son dönem mizan verisi
            cursor.execute("""
                SELECT
                    period_id, total_borc, total_alacak,
                    hesap_count, created_at
                FROM mizan_entries
                WHERE client_id = ?
                ORDER BY period_id DESC
                LIMIT 1
            """, (client_id,))

            row = cursor.fetchone()
            if not row:
                return None

            data = dict(row)
            lines = [
                "## Müşteri Mali Özeti:",
                f"- Dönem: {data.get('period_id', '-')}",
                f"- Toplam Borç: {data.get('total_borc', 0):,.2f} TL",
                f"- Toplam Alacak: {data.get('total_alacak', 0):,.2f} TL",
                f"- Hesap Sayısı: {data.get('hesap_count', 0)}",
            ]

            # Öz varlık hesabı varsa
            cursor.execute("""
                SELECT borc_bakiye, alacak_bakiye
                FROM mizan_entries
                WHERE client_id = ? AND hesap_kodu LIKE '5%'
                AND period_id = ?
            """, (client_id, data.get('period_id', '')))

            equity_rows = cursor.fetchall()
            if equity_rows:
                oz_varlik = sum(
                    (r.get('alacak_bakiye', 0) or 0) - (r.get('borc_bakiye', 0) or 0)
                    for r in equity_rows
                )
                lines.append(f"- Öz Varlık (tahmini): {oz_varlik:,.2f} TL")

            return "\n".join(lines)

    except Exception as e:
        logger.debug(f"Client financials load error: {e}")
        return None


def load_recent_mevzuat(limit: int = 10) -> str:
    """Son mevzuat değişikliklerinin özetini yükle"""
    parts = []
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT baslik, mevzuat_type, kurum,
                       resmi_gazete_tarih, trust_class
                FROM mevzuat_refs
                WHERE is_active = 1
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))

            refs = cursor.fetchall()
            if refs:
                for r in refs:
                    rd = dict(r)
                    tip = rd.get('mevzuat_type', '').upper()
                    trust = rd.get('trust_class', 'C')
                    parts.append(
                        f"- [{tip}] {rd.get('baslik', '')} "
                        f"({rd.get('kurum', '')} - "
                        f"{rd.get('resmi_gazete_tarih', '')}) "
                        f"[Güven: {trust}]"
                    )
            else:
                parts.append("Güncel mevzuat kaydı bulunamadı.")

    except Exception as e:
        logger.error(f"Recent mevzuat load error: {e}")
        parts.append("Mevzuat veritabanına erişilemedi.")

    return "\n".join(parts)


def load_sector_incentives(sector: Optional[str] = None) -> str:
    """
    Sektör bazlı teşvikleri yükle.
    Şimdilik hardcoded - ileride DB'den çekilebilir.
    """
    incentives = {
        'imalat': [
            "KVK md.32/A: Yatırım teşvik belgesi ile indirimli KV (%0-20)",
            "KDVK md.13/d: Makine-teçhizat KDV istisnası",
            "SGK Teşvik: 6 ay-6 yıl SGK prim desteği (bölgeye göre)",
        ],
        'teknoloji': [
            "4691 Teknokent: KV muafiyeti (31.12.2028'e kadar)",
            "5746 Ar-Ge: %100 Ar-Ge indirimi + gelir vergisi istisnası",
            "Yazılım ihracatı: KDV istisnası",
        ],
        'ihracat': [
            "KDVK md.11: İhracat KDV istisnası (tam istisna)",
            "Dahilde İşleme Rejimi: Gümrük muafiyeti",
            "Eximbank kredileri: Uygun faizli finansman",
        ],
        'tarim': [
            "KDV %1: Tarımsal ürünlerde indirimli oran",
            "Tarım sigortası prim desteği: %50-67",
            "Hayvancılık destekleri: Yem, süt, et primi",
        ],
    }

    if sector:
        sector_lower = sector.lower()
        matching = []
        for key, items in incentives.items():
            if key in sector_lower or sector_lower in key:
                matching.extend(items)

        if matching:
            return f"## {sector} Sektörü Teşvikleri:\n" + "\n".join(
                f"- {item}" for item in matching
            )

    # Genel teşvikler
    lines = ["## Sektör Teşvikleri Özeti:"]
    for sector_name, items in incentives.items():
        lines.append(f"\n### {sector_name.capitalize()}:")
        for item in items:
            lines.append(f"- {item}")

    return "\n".join(lines)


def load_risk_summary(client_id: str) -> Optional[str]:
    """Müşterinin VDK risk skoru özetini yükle"""
    if not client_id or client_id == 'default':
        return None

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            # risk_items tablosundan özet
            cursor.execute("""
                SELECT risk_code, risk_title, severity, status
                FROM risk_items
                WHERE client_id = ?
                AND status != 'resolved'
                ORDER BY severity DESC
                LIMIT 5
            """, (client_id,))

            rows = cursor.fetchall()
            if not rows:
                return None

            lines = [
                "## Risk Özeti:",
                f"- Aktif risk sayısı: {len(rows)}",
            ]
            for r in rows:
                rd = dict(r)
                severity_icon = {
                    'high': '🔴', 'medium': '🟡', 'low': '🟢'
                }.get(rd.get('severity', ''), '⚪')
                lines.append(
                    f"- {severity_icon} {rd.get('risk_code', '')}: "
                    f"{rd.get('risk_title', '')}"
                )

            return "\n".join(lines)

    except Exception as e:
        logger.debug(f"Risk summary load error: {e}")
        return None


def build_enriched_context(
    client_id: Optional[str] = None,
    sector: Optional[str] = None,
) -> str:
    """
    Tüm kontekst kaynaklarını birleştirerek zenginleştirilmiş
    bir kontekst metni oluştur.
    """
    parts = []

    # Müşteri konteksti
    if client_id:
        client_ctx = load_client_context(client_id)
        if client_ctx:
            parts.append(client_ctx)

        financials = load_client_financials(client_id)
        if financials:
            parts.append(financials)

        risk = load_risk_summary(client_id)
        if risk:
            parts.append(risk)

    # Sektör teşvikleri
    sector_ctx = load_sector_incentives(sector)
    if sector_ctx:
        parts.append(sector_ctx)

    # Son mevzuat
    mevzuat_ctx = load_recent_mevzuat(limit=10)
    if mevzuat_ctx:
        parts.append(f"## Son Mevzuat Değişiklikleri:\n{mevzuat_ctx}")

    if not parts:
        return ""

    return "\n\n".join(parts)
