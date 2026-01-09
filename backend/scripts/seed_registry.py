"""
LYNTOS Trade Registry Seed Data
Sprint T1 - Alanya Pilot

Seeds:
- Trade registry offices (Alanya, Antalya, Manavgat)
- Demo companies for Alanya pilot
"""

import sys
import os
from pathlib import Path
from datetime import date
import uuid

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection


# Pilot Region: Alanya and surroundings
PILOT_OFFICES = [
    {
        "id": str(uuid.uuid4()),
        "office_code": "07-ALANYA",
        "office_name": "Alanya Ticaret Sicili Mudurlugu",
        "city": "Antalya",
        "district": "Alanya",
        "chamber_name": "Alanya Ticaret ve Sanayi Odasi (ALTSO)",
        "chamber_url": "https://www.altso.org.tr",
        "is_pilot": 1,
        "scrape_priority": 10,
        "is_active": 1,
    },
    {
        "id": str(uuid.uuid4()),
        "office_code": "07-ANTALYA",
        "office_name": "Antalya Ticaret Sicili Mudurlugu",
        "city": "Antalya",
        "district": "Antalya",
        "chamber_name": "Antalya Ticaret ve Sanayi Odasi (ATSO)",
        "chamber_url": "https://www.atso.org.tr",
        "is_pilot": 0,
        "scrape_priority": 8,
        "is_active": 1,
    },
    {
        "id": str(uuid.uuid4()),
        "office_code": "07-MANAVGAT",
        "office_name": "Manavgat Ticaret Sicili Mudurlugu",
        "city": "Antalya",
        "district": "Manavgat",
        "chamber_name": "Manavgat Ticaret ve Sanayi Odasi (MATSO)",
        "chamber_url": "https://www.matso.org.tr",
        "is_pilot": 0,
        "scrape_priority": 5,
        "is_active": 1,
    },
]

# Demo companies for Alanya pilot
DEMO_COMPANIES = [
    {
        "id": str(uuid.uuid4()),
        "tax_number": "1234567890",
        "trade_registry_number": "12345",
        "company_name": "ALANYA TURIZM YATIRIMLARI ANONIM SIRKETI",
        "company_type": "as",
        "trade_registry_office": "Alanya",
        "city": "Antalya",
        "district": "Alanya",
        "address": "Keykubat Mah. Ataturk Cad. No:123 Alanya/Antalya",
        "establishment_date": "2020-03-15",
        "current_capital": 5000000,
        "paid_capital": 5000000,
        "currency": "TRY",
        "status": "active",
        "nace_code": "55.10",
        "activity_description": "Otel isletmeciligi",
        "is_tracked": 1,
        "tracked_by": "HKOZKAN",
        "source": "demo",
    },
    {
        "id": str(uuid.uuid4()),
        "tax_number": "0987654321",
        "trade_registry_number": "12346",
        "company_name": "AKDENIZ INSAAT LIMITED SIRKETI",
        "company_type": "ltd",
        "trade_registry_office": "Alanya",
        "city": "Antalya",
        "district": "Alanya",
        "address": "Saray Mah. Gazipasa Cad. No:45 Alanya/Antalya",
        "establishment_date": "2018-06-20",
        "current_capital": 500000,
        "paid_capital": 500000,
        "currency": "TRY",
        "status": "active",
        "nace_code": "41.20",
        "activity_description": "Bina insaati",
        "is_tracked": 1,
        "tracked_by": "HKOZKAN",
        "source": "demo",
    },
    {
        "id": str(uuid.uuid4()),
        "tax_number": "5555555555",
        "trade_registry_number": "12347",
        "company_name": "GUNES OTEL ISLETMECILIGI ANONIM SIRKETI",
        "company_type": "as",
        "trade_registry_office": "Alanya",
        "city": "Antalya",
        "district": "Alanya",
        "address": "Obagol Mah. Sahil Yolu No:78 Alanya/Antalya",
        "establishment_date": "2015-01-10",
        "current_capital": 2500000,
        "paid_capital": 2500000,
        "currency": "TRY",
        "status": "liquidation",
        "nace_code": "55.10",
        "activity_description": "Otel isletmeciligi",
        "is_tracked": 1,
        "tracked_by": "HKOZKAN",
        "source": "demo",
    },
    {
        "id": str(uuid.uuid4()),
        "tax_number": "6666666666",
        "trade_registry_number": "12348",
        "company_name": "ALANYA TARIM URUNLERI LIMITED SIRKETI",
        "company_type": "ltd",
        "trade_registry_office": "Alanya",
        "city": "Antalya",
        "district": "Alanya",
        "address": "Kestel Mah. Tarim Cad. No:12 Alanya/Antalya",
        "establishment_date": "2019-09-05",
        "current_capital": 100000,
        "paid_capital": 50000,
        "currency": "TRY",
        "status": "active",
        "nace_code": "01.24",
        "activity_description": "Narenciye yetistiriciligi",
        "is_tracked": 0,
        "source": "demo",
    },
]

# Demo changes
DEMO_CHANGES = [
    {
        "id": str(uuid.uuid4()),
        "company_id": None,  # Will be set dynamically
        "tax_number": "1234567890",
        "change_type": "capital_increase",
        "change_description": "Sermaye 3.000.000 TL'den 5.000.000 TL'ye artirildi",
        "old_value": "3000000",
        "new_value": "5000000",
        "ttsg_issue": "11234",
        "ttsg_date": "2024-12-15",
    },
    {
        "id": str(uuid.uuid4()),
        "company_id": None,
        "tax_number": "5555555555",
        "change_type": "liquidation_start",
        "change_description": "Sirket tasfiyeye girdi",
        "old_value": "active",
        "new_value": "liquidation",
        "ttsg_issue": "11250",
        "ttsg_date": "2025-01-05",
    },
]


def seed_registry_offices():
    """Seed trade registry offices"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM trade_registry_offices")
        existing = cursor.fetchone()['count']

        if existing > 0:
            print(f"⚠️  {existing} offices already exist. Skipping.")
            return

        for office in PILOT_OFFICES:
            cursor.execute("""
                INSERT INTO trade_registry_offices
                (id, office_code, office_name, city, district, chamber_name,
                 chamber_url, is_pilot, scrape_priority, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                office['id'],
                office['office_code'],
                office['office_name'],
                office['city'],
                office['district'],
                office['chamber_name'],
                office['chamber_url'],
                office['is_pilot'],
                office['scrape_priority'],
                office['is_active'],
            ])

        conn.commit()
        print(f"✅ {len(PILOT_OFFICES)} trade registry offices seeded.")


def seed_demo_companies():
    """Seed demo companies"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM company_registry")
        existing = cursor.fetchone()['count']

        if existing > 0:
            print(f"⚠️  {existing} companies already exist. Skipping.")
            return

        for company in DEMO_COMPANIES:
            cursor.execute("""
                INSERT INTO company_registry
                (id, tax_number, trade_registry_number, company_name, company_type,
                 trade_registry_office, city, district, address, establishment_date,
                 current_capital, paid_capital, currency, status, nace_code,
                 activity_description, is_tracked, tracked_by, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                company['id'],
                company['tax_number'],
                company['trade_registry_number'],
                company['company_name'],
                company['company_type'],
                company['trade_registry_office'],
                company['city'],
                company['district'],
                company['address'],
                company['establishment_date'],
                company['current_capital'],
                company['paid_capital'],
                company['currency'],
                company['status'],
                company['nace_code'],
                company['activity_description'],
                company['is_tracked'],
                company.get('tracked_by'),
                company['source'],
            ])

        conn.commit()
        print(f"✅ {len(DEMO_COMPANIES)} demo companies seeded.")


def seed_demo_changes():
    """Seed demo company changes"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM company_changes")
        existing = cursor.fetchone()['count']

        if existing > 0:
            print(f"⚠️  {existing} changes already exist. Skipping.")
            return

        for change in DEMO_CHANGES:
            # Get company_id from tax_number
            cursor.execute(
                "SELECT id FROM company_registry WHERE tax_number = ?",
                [change['tax_number']]
            )
            company = cursor.fetchone()
            company_id = company['id'] if company else None

            cursor.execute("""
                INSERT INTO company_changes
                (id, company_id, tax_number, change_type, change_description,
                 old_value, new_value, ttsg_issue, ttsg_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, [
                change['id'],
                company_id,
                change['tax_number'],
                change['change_type'],
                change['change_description'],
                change['old_value'],
                change['new_value'],
                change['ttsg_issue'],
                change['ttsg_date'],
            ])

        conn.commit()
        print(f"✅ {len(DEMO_CHANGES)} demo changes seeded.")


def seed_demo_portfolio():
    """Seed demo SMMM portfolio"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM client_portfolio")
        existing = cursor.fetchone()['count']

        if existing > 0:
            print(f"⚠️  {existing} portfolio entries already exist. Skipping.")
            return

        # Add tracked companies to HKOZKAN portfolio
        for company in DEMO_COMPANIES:
            if company.get('is_tracked'):
                cursor.execute("""
                    INSERT INTO client_portfolio
                    (id, smmm_id, company_id, tax_number, company_name,
                     relationship_type, start_date, is_active)
                    VALUES (?, ?, ?, ?, ?, 'accounting', date('now'), 1)
                """, [
                    str(uuid.uuid4()),
                    "HKOZKAN",
                    company['id'],
                    company['tax_number'],
                    company['company_name'],
                ])

        conn.commit()
        tracked_count = sum(1 for c in DEMO_COMPANIES if c.get('is_tracked'))
        print(f"✅ {tracked_count} portfolio entries seeded for HKOZKAN.")


if __name__ == "__main__":
    print("=" * 60)
    print("LYNTOS Trade Registry Seed - Sprint T1")
    print("=" * 60)

    seed_registry_offices()
    seed_demo_companies()
    seed_demo_changes()
    seed_demo_portfolio()

    print("=" * 60)
    print("Done!")
