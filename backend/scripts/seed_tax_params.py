#!/usr/bin/env python3
"""
Seed Tax Parameters for LYNTOS RegWatch
Sprint R1 - RegWatch Infrastructure

Seeds the tax_parameters table with 2025 Turkish tax rates and limits.
Run this script after database initialization to populate base tax data.

Usage:
    python scripts/seed_tax_params.py
"""

import sys
import uuid
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection


# 2025 Tax Parameters - Turkish Tax System
TAX_PARAMETERS_2025 = [
    # ============================================
    # KURUMLAR VERGISI (Corporate Tax)
    # ============================================
    {
        "category": "KURUMLAR_VERGISI",
        "param_key": "kv_genel_oran",
        "param_value": 25.0,
        "param_unit": "percent",
        "legal_reference": "KVK md.32",
        "source_url": "https://www.gib.gov.tr/kurumlar-vergisi",
        "description": "Kurumlar Vergisi Genel Orani"
    },
    {
        "category": "KURUMLAR_VERGISI",
        "param_key": "kv_ihracat_indirimi",
        "param_value": 5.0,
        "param_unit": "percent",
        "legal_reference": "KVK md.32/7",
        "source_url": "https://www.gib.gov.tr/kurumlar-vergisi",
        "description": "Ihracat Kazanci Indirimli Oran (25% - 5% = 20%)"
    },
    {
        "category": "KURUMLAR_VERGISI",
        "param_key": "kv_uretim_indirimi",
        "param_value": 1.0,
        "param_unit": "percent",
        "legal_reference": "KVK md.32/6",
        "source_url": "https://www.gib.gov.tr/kurumlar-vergisi",
        "description": "Uretim Kazanci Indirimli Oran (25% - 1% = 24%)"
    },
    {
        "category": "KURUMLAR_VERGISI",
        "param_key": "asgari_kv_oran",
        "param_value": 10.0,
        "param_unit": "percent",
        "legal_reference": "KVK md.32/C",
        "source_url": "https://www.gib.gov.tr/kurumlar-vergisi",
        "description": "Asgari Kurumlar Vergisi Orani"
    },
    {
        "category": "KURUMLAR_VERGISI",
        "param_key": "uyumlu_mukellef_indirimi",
        "param_value": 5.0,
        "param_unit": "percent",
        "legal_reference": "KVK md.32/C",
        "source_url": "https://www.gib.gov.tr/kurumlar-vergisi",
        "description": "Uyumlu Mukellef Vergi Indirimi"
    },
    {
        "category": "KURUMLAR_VERGISI",
        "param_key": "uyumlu_mukellef_limit",
        "param_value": 9900000.0,
        "param_unit": "TRY",
        "legal_reference": "KVK md.32/C",
        "source_url": "https://www.gib.gov.tr/kurumlar-vergisi",
        "description": "Uyumlu Mukellef Indirim Limiti (9.9M TL)"
    },

    # ============================================
    # AR-GE TESVIKLERI (R&D Incentives)
    # ============================================
    {
        "category": "AR_GE",
        "param_key": "arge_stopaj_indirimi_doktora",
        "param_value": 95.0,
        "param_unit": "percent",
        "legal_reference": "5746 md.3",
        "source_url": "https://www.gib.gov.tr/arge-tesvikleri",
        "description": "Ar-Ge Stopaj Indirimi - Doktora"
    },
    {
        "category": "AR_GE",
        "param_key": "arge_stopaj_indirimi_yukseklisans",
        "param_value": 90.0,
        "param_unit": "percent",
        "legal_reference": "5746 md.3",
        "source_url": "https://www.gib.gov.tr/arge-tesvikleri",
        "description": "Ar-Ge Stopaj Indirimi - Yuksek Lisans"
    },
    {
        "category": "AR_GE",
        "param_key": "arge_stopaj_indirimi_lisans",
        "param_value": 80.0,
        "param_unit": "percent",
        "legal_reference": "5746 md.3",
        "source_url": "https://www.gib.gov.tr/arge-tesvikleri",
        "description": "Ar-Ge Stopaj Indirimi - Lisans/Diger"
    },
    {
        "category": "AR_GE",
        "param_key": "arge_gider_indirimi",
        "param_value": 100.0,
        "param_unit": "percent",
        "legal_reference": "5746 md.3",
        "source_url": "https://www.gib.gov.tr/arge-tesvikleri",
        "description": "Ar-Ge Gider Indirimi Orani"
    },
    {
        "category": "AR_GE",
        "param_key": "arge_ek_indirim",
        "param_value": 50.0,
        "param_unit": "percent",
        "legal_reference": "5746 md.3/4",
        "source_url": "https://www.gib.gov.tr/arge-tesvikleri",
        "description": "Ar-Ge Ek Indirim (artis durumunda)"
    },

    # ============================================
    # TEKNOKENT TESVIKLERI
    # ============================================
    {
        "category": "TEKNOKENT",
        "param_key": "teknokent_kv_istisnasi",
        "param_value": 100.0,
        "param_unit": "percent",
        "legal_reference": "4691 md.8",
        "source_url": "https://www.gib.gov.tr/teknokent",
        "description": "Teknokent KV Istisnasi (31.12.2028'e kadar)"
    },
    {
        "category": "TEKNOKENT",
        "param_key": "teknokent_stopaj_istisnasi",
        "param_value": 100.0,
        "param_unit": "percent",
        "legal_reference": "4691 md.8",
        "source_url": "https://www.gib.gov.tr/teknokent",
        "description": "Teknokent Stopaj Istisnasi"
    },
    {
        "category": "TEKNOKENT",
        "param_key": "teknokent_kdv_istisnasi",
        "param_value": 100.0,
        "param_unit": "percent",
        "legal_reference": "4691 md.8",
        "source_url": "https://www.gib.gov.tr/teknokent",
        "description": "Teknokent KDV Istisnasi (sistem/uygulama yazilimi)"
    },

    # ============================================
    # SGK TESVIKLERI
    # ============================================
    {
        "category": "SGK",
        "param_key": "sgk_issizlik_tesviki",
        "param_value": 100.0,
        "param_unit": "percent",
        "legal_reference": "4447 md.Ek-2",
        "source_url": "https://www.sgk.gov.tr/tesvikler",
        "description": "SGK Issizlik Tesviki (12 ay)"
    },
    {
        "category": "SGK",
        "param_key": "sgk_ek_istihdam_tesviki",
        "param_value": 100.0,
        "param_unit": "percent",
        "legal_reference": "4447 Gecici md.19",
        "source_url": "https://www.sgk.gov.tr/tesvikler",
        "description": "SGK Ek Istihdam Tesviki"
    },
    {
        "category": "SGK",
        "param_key": "sgk_genc_girişimci_tesviki",
        "param_value": 100.0,
        "param_unit": "percent",
        "legal_reference": "5510 md.81",
        "source_url": "https://www.sgk.gov.tr/tesvikler",
        "description": "SGK Genc Girisimci Tesviki (1 yil)"
    },
    {
        "category": "SGK",
        "param_key": "sgk_isveren_payi",
        "param_value": 22.5,
        "param_unit": "percent",
        "legal_reference": "5510 md.81",
        "source_url": "https://www.sgk.gov.tr",
        "description": "SGK Isveren Payi Toplam"
    },
    {
        "category": "SGK",
        "param_key": "sgk_isci_payi",
        "param_value": 15.0,
        "param_unit": "percent",
        "legal_reference": "5510 md.81",
        "source_url": "https://www.sgk.gov.tr",
        "description": "SGK Isci Payi Toplam"
    },

    # ============================================
    # KDV (VAT Rates)
    # ============================================
    {
        "category": "KDV",
        "param_key": "kdv_genel_oran",
        "param_value": 20.0,
        "param_unit": "percent",
        "legal_reference": "KDVK md.28",
        "source_url": "https://www.gib.gov.tr/kdv",
        "description": "KDV Genel Oran"
    },
    {
        "category": "KDV",
        "param_key": "kdv_indirimli_oran_1",
        "param_value": 10.0,
        "param_unit": "percent",
        "legal_reference": "KDVK md.28",
        "source_url": "https://www.gib.gov.tr/kdv",
        "description": "KDV Indirimli Oran (%10 - gida, saglik, egitim)"
    },
    {
        "category": "KDV",
        "param_key": "kdv_indirimli_oran_2",
        "param_value": 1.0,
        "param_unit": "percent",
        "legal_reference": "KDVK md.28",
        "source_url": "https://www.gib.gov.tr/kdv",
        "description": "KDV Indirimli Oran (%1 - temel gida)"
    },

    # ============================================
    # ASGARI UCRET VE LIMITLER
    # ============================================
    {
        "category": "ASGARI_UCRET",
        "param_key": "asgari_ucret_brut",
        "param_value": 22104.0,
        "param_unit": "TRY",
        "legal_reference": "4857 md.39",
        "source_url": "https://www.csgb.gov.tr/asgari-ucret",
        "description": "2025 Asgari Ucret Brut (1. Donem)"
    },
    {
        "category": "ASGARI_UCRET",
        "param_key": "asgari_ucret_net",
        "param_value": 17002.12,
        "param_unit": "TRY",
        "legal_reference": "4857 md.39",
        "source_url": "https://www.csgb.gov.tr/asgari-ucret",
        "description": "2025 Asgari Ucret Net (1. Donem)"
    },
    {
        "category": "LIMIT",
        "param_key": "nakit_sermaye_artis_limit",
        "param_value": 885_000_000.0,
        "param_unit": "TRY",
        "legal_reference": "KVK md.10/1-i",
        "source_url": "https://www.gib.gov.tr",
        "description": "Nakit Sermaye Artisi Indirim Limiti (40 x asgari ucret x 1000)"
    },

    # ============================================
    # YATIRIM TESVIKLERI
    # ============================================
    {
        "category": "YATIRIM",
        "param_key": "yatirim_tesviki_bolgesel_1",
        "param_value": 15.0,
        "param_unit": "percent",
        "legal_reference": "Yatirim Tesvikleri BKK",
        "source_url": "https://www.sanayi.gov.tr/tesvikler",
        "description": "Yatirim Tesviki 1. Bolge Orani"
    },
    {
        "category": "YATIRIM",
        "param_key": "yatirim_tesviki_bolgesel_6",
        "param_value": 50.0,
        "param_unit": "percent",
        "legal_reference": "Yatirim Tesvikleri BKK",
        "source_url": "https://www.sanayi.gov.tr/tesvikler",
        "description": "Yatirim Tesviki 6. Bolge Orani"
    },
    {
        "category": "YATIRIM",
        "param_key": "yatirim_tesviki_stratejik",
        "param_value": 50.0,
        "param_unit": "percent",
        "legal_reference": "Yatirim Tesvikleri BKK",
        "source_url": "https://www.sanayi.gov.tr/tesvikler",
        "description": "Stratejik Yatirim Tesviki Orani"
    },

    # ============================================
    # DAMGA VERGISI
    # ============================================
    {
        "category": "DAMGA_VERGISI",
        "param_key": "damga_sozlesme_orani",
        "param_value": 0.948,
        "param_unit": "percent",
        "legal_reference": "DVK md.14",
        "source_url": "https://www.gib.gov.tr/damga-vergisi",
        "description": "Sozlesmeler Icin Damga Vergisi Orani (binde 9.48)"
    },
    {
        "category": "DAMGA_VERGISI",
        "param_key": "damga_ust_sinir",
        "param_value": 19433247.90,
        "param_unit": "TRY",
        "legal_reference": "DVK md.14",
        "source_url": "https://www.gib.gov.tr/damga-vergisi",
        "description": "2025 Damga Vergisi Ust Siniri"
    },

    # ============================================
    # OZEL TUKETIM VERGISI (OTV)
    # ============================================
    {
        "category": "OTV",
        "param_key": "otv_otomobil_matrah_1",
        "param_value": 1700000.0,
        "param_unit": "TRY",
        "legal_reference": "OTVK",
        "source_url": "https://www.gib.gov.tr/otv",
        "description": "OTV Otomobil 1. Matrah Dilimi"
    },
    {
        "category": "OTV",
        "param_key": "otv_otomobil_oran_1",
        "param_value": 45.0,
        "param_unit": "percent",
        "legal_reference": "OTVK",
        "source_url": "https://www.gib.gov.tr/otv",
        "description": "OTV Otomobil 1. Dilim Orani"
    },
]


def seed_tax_parameters():
    """Insert all tax parameters into the database."""
    valid_from = "2025-01-01"
    created_count = 0
    updated_count = 0

    with get_connection() as conn:
        cursor = conn.cursor()

        try:
            for param in TAX_PARAMETERS_2025:
                param_id = str(uuid.uuid4())

                # Check if parameter already exists
                cursor.execute("""
                    SELECT id FROM tax_parameters
                    WHERE category = ? AND param_key = ? AND valid_from = ?
                """, (param["category"], param["param_key"], valid_from))

                existing = cursor.fetchone()

                if existing:
                    # Update existing parameter
                    cursor.execute("""
                        UPDATE tax_parameters
                        SET param_value = ?,
                            param_unit = ?,
                            legal_reference = ?,
                            source_url = ?,
                            updated_at = ?
                        WHERE id = ?
                    """, (
                        param["param_value"],
                        param.get("param_unit", ""),
                        param.get("legal_reference", ""),
                        param.get("source_url", ""),
                        datetime.now().isoformat(),
                        existing[0]
                    ))
                    updated_count += 1
                    print(f"  Updated: {param['category']}/{param['param_key']}")
                else:
                    # Insert new parameter
                    cursor.execute("""
                        INSERT INTO tax_parameters (
                            id, category, param_key, param_value, param_unit,
                            valid_from, legal_reference, source_url, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        param_id,
                        param["category"],
                        param["param_key"],
                        param["param_value"],
                        param.get("param_unit", ""),
                        valid_from,
                        param.get("legal_reference", ""),
                        param.get("source_url", ""),
                        datetime.now().isoformat()
                    ))
                    created_count += 1
                    print(f"  Created: {param['category']}/{param['param_key']}")

            conn.commit()
            print(f"\n{'='*50}")
            print(f"Tax Parameters Seed Complete!")
            print(f"  Created: {created_count}")
            print(f"  Updated: {updated_count}")
            print(f"  Total:   {len(TAX_PARAMETERS_2025)}")
            print(f"{'='*50}")

        except Exception as e:
            conn.rollback()
            print(f"Error seeding tax parameters: {e}")
            raise


def seed_regulatory_sources():
    """Insert default regulatory sources for scraping."""
    sources = [
        {
            "source_name": "GIB Mevzuat",
            "source_url": "https://www.gib.gov.tr/gibmevzuat",
            "scrape_frequency": 15,  # minutes
            "scraper_config": '{"type": "gib", "selectors": {"content": ".mevzuat-content"}}'
        },
        {
            "source_name": "Resmi Gazete",
            "source_url": "https://www.resmigazete.gov.tr",
            "scrape_frequency": 30,
            "scraper_config": '{"type": "resmi_gazete", "selectors": {"list": ".gazete-list"}}'
        },
        {
            "source_name": "TURMOB Sirkuler",
            "source_url": "https://www.turmob.org.tr/sirkuler",
            "scrape_frequency": 60,
            "scraper_config": '{"type": "turmob", "selectors": {"list": ".sirkuler-list"}}'
        },
        {
            "source_name": "SGK Mevzuat",
            "source_url": "https://www.sgk.gov.tr/wps/portal/sgk/tr/mevzuat",
            "scrape_frequency": 60,
            "scraper_config": '{"type": "sgk", "selectors": {"content": ".mevzuat-icerik"}}'
        },
        {
            "source_name": "VDK Rehberler",
            "source_url": "https://www.vdk.gov.tr/File/?path=",
            "scrape_frequency": 1440,  # daily
            "scraper_config": '{"type": "vdk", "file_pattern": "rehber"}'
        },
    ]

    created_count = 0

    with get_connection() as conn:
        cursor = conn.cursor()

        try:
            for source in sources:
                source_id = str(uuid.uuid4())

                # Check if source already exists
                cursor.execute("""
                    SELECT id FROM regulatory_sources WHERE source_url = ?
                """, (source["source_url"],))

                if cursor.fetchone():
                    print(f"  Skipped (exists): {source['source_name']}")
                    continue

                cursor.execute("""
                    INSERT INTO regulatory_sources (
                        id, source_name, source_url, scrape_frequency,
                        is_active, scraper_config
                    ) VALUES (?, ?, ?, ?, 1, ?)
                """, (
                    source_id,
                    source["source_name"],
                    source["source_url"],
                    source["scrape_frequency"],
                    source.get("scraper_config", "{}")
                ))
                created_count += 1
                print(f"  Created: {source['source_name']}")

            conn.commit()
            print(f"\nRegulatory Sources: {created_count} created")

        except Exception as e:
            conn.rollback()
            print(f"Error seeding regulatory sources: {e}")
            raise


def main():
    """Main entry point."""
    print("="*50)
    print("LYNTOS Tax Parameters Seed Script")
    print("Sprint R1 - RegWatch Infrastructure")
    print("="*50)
    print()

    print("[1/2] Seeding Tax Parameters...")
    seed_tax_parameters()

    print()
    print("[2/2] Seeding Regulatory Sources...")
    seed_regulatory_sources()

    print()
    print("Seed complete!")


if __name__ == "__main__":
    main()
