#!/usr/bin/env python3
"""
LYNTOS - Özkan Kırtasiye Mizan Verisini Database'e Yükle

Bu script disk'teki mizan.csv dosyasını okuyup database'e yükler.
Dashboard'un gerçek veri gösterebilmesi için gerekli.

Kullanım:
    cd /Users/cem/LYNTOS/lyntos/backend
    python scripts/load_ozkan_mizan_to_db.py
"""

import sqlite3
import csv
import sys
from pathlib import Path
from decimal import Decimal
import re

# Paths
BACKEND_DIR = Path(__file__).parent.parent
DB_PATH = BACKEND_DIR / "database" / "lyntos.db"
DATA_DIR = BACKEND_DIR / "data"

# Özkan Kırtasiye data location
OZKAN_Q1_PATH = DATA_DIR / "luca" / "HKOZKAN" / "OZKAN_KIRTASIYE" / "2025-Q1__SMOKETEST_COPY_FROM_Q2" / "mizan.csv"
OZKAN_Q2_PATH = DATA_DIR / "luca" / "HKOZKAN" / "OZKAN_KIRTASIYE" / "2025-Q2" / "mizan.csv"

# Client mapping
CLIENT_ID = "OZKAN_KIRTASIYE"
TENANT_ID = "default"  # Database uses 'default' as tenant


def parse_turkish_number(value: str) -> float:
    """
    Parse Turkish number format: 1.234.567,89 -> 1234567.89
    """
    if not value or value.strip() == '':
        return 0.0

    # Remove thousand separators (dots) and convert comma to dot
    clean = value.strip().replace('.', '').replace(',', '.')

    try:
        return float(clean)
    except (ValueError, TypeError):
        return 0.0


def parse_mizan_csv(file_path: Path) -> list[dict]:
    """
    Parse Luca mizan.csv file and return list of account entries.

    Expected format:
    HESAP KODU;HESAP ADI;;BORÇ;ALACAK;BORÇ BAKİYESİ;ALACAK BAKİYESİ
    """
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return []

    entries = []

    with open(file_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f, delimiter=';')

        # Skip header rows (may have multiple)
        for row in reader:
            if len(row) < 7:
                continue

            hesap_kodu = row[0].strip()

            # Skip header row or empty rows
            if not hesap_kodu or hesap_kodu.upper() == 'HESAP KODU':
                continue

            # Skip non-numeric account codes
            if not hesap_kodu[0].isdigit():
                continue

            hesap_adi = row[1].strip()
            # row[2] is usually empty
            borc_toplam = parse_turkish_number(row[3])
            alacak_toplam = parse_turkish_number(row[4])
            borc_bakiye = parse_turkish_number(row[5])
            alacak_bakiye = parse_turkish_number(row[6]) if len(row) > 6 else 0.0

            entries.append({
                'hesap_kodu': hesap_kodu,
                'hesap_adi': hesap_adi,
                'borc_toplam': borc_toplam,
                'alacak_toplam': alacak_toplam,
                'borc_bakiye': borc_bakiye,
                'alacak_bakiye': alacak_bakiye,
            })

    return entries


def ensure_tables_exist(conn: sqlite3.Connection):
    """
    Ensure mizan_entries table exists.
    """
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mizan_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            period_id TEXT NOT NULL,
            hesap_kodu TEXT NOT NULL,
            hesap_adi TEXT,
            borc_toplam REAL DEFAULT 0,
            alacak_toplam REAL DEFAULT 0,
            borc_bakiye REAL DEFAULT 0,
            alacak_bakiye REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, client_id, period_id, hesap_kodu)
        )
    """)

    # Create index for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_mizan_entries_lookup
        ON mizan_entries(tenant_id, client_id, period_id)
    """)

    conn.commit()


def clear_existing_data(conn: sqlite3.Connection, client_id: str, period_id: str):
    """
    Clear existing mizan data for client/period.
    """
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (TENANT_ID, client_id, period_id))

    deleted = cursor.rowcount
    conn.commit()

    if deleted > 0:
        print(f"  🗑️  Deleted {deleted} existing entries for {client_id}/{period_id}")


def insert_mizan_entries(conn: sqlite3.Connection, client_id: str, period_id: str, entries: list[dict]):
    """
    Insert mizan entries into database.
    """
    cursor = conn.cursor()

    for entry in entries:
        cursor.execute("""
            INSERT OR REPLACE INTO mizan_entries
            (tenant_id, client_id, period_id, hesap_kodu, hesap_adi, borc_toplam, alacak_toplam, borc_bakiye, alacak_bakiye)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            TENANT_ID,
            client_id,
            period_id,
            entry['hesap_kodu'],
            entry['hesap_adi'],
            entry['borc_toplam'],
            entry['alacak_toplam'],
            entry['borc_bakiye'],
            entry['alacak_bakiye'],
        ))

    conn.commit()
    print(f"  ✅ Inserted {len(entries)} entries for {client_id}/{period_id}")


def verify_data(conn: sqlite3.Connection, client_id: str, period_id: str):
    """
    Verify loaded data with summary statistics.
    """
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            COUNT(*) as entry_count,
            SUM(borc_toplam) as toplam_borc,
            SUM(alacak_toplam) as toplam_alacak,
            SUM(borc_bakiye) as borc_bakiye_toplam,
            SUM(alacak_bakiye) as alacak_bakiye_toplam
        FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (TENANT_ID, client_id, period_id))

    row = cursor.fetchone()

    print(f"\n  📊 Verification for {client_id}/{period_id}:")
    print(f"     - Entry count: {row[0]}")
    print(f"     - Toplam Borç: {row[1]:,.2f} TL")
    print(f"     - Toplam Alacak: {row[2]:,.2f} TL")
    print(f"     - Borç Bakiye: {row[3]:,.2f} TL")
    print(f"     - Alacak Bakiye: {row[4]:,.2f} TL")

    # Check balance
    fark = abs((row[1] or 0) - (row[2] or 0))
    if fark < 1:
        print(f"     - ✅ Mizan dengeli (fark: {fark:.2f})")
    else:
        print(f"     - ⚠️ Mizan dengesiz (fark: {fark:,.2f})")


def load_period(conn: sqlite3.Connection, client_id: str, period_id: str, csv_path: Path):
    """
    Load a single period's mizan data.
    """
    print(f"\n📁 Loading {period_id} from {csv_path.name}...")

    if not csv_path.exists():
        print(f"  ❌ File not found: {csv_path}")
        return False

    # Parse CSV
    entries = parse_mizan_csv(csv_path)

    if not entries:
        print(f"  ❌ No valid entries found in {csv_path}")
        return False

    print(f"  📋 Parsed {len(entries)} accounts from CSV")

    # Clear existing and insert new
    clear_existing_data(conn, client_id, period_id)
    insert_mizan_entries(conn, client_id, period_id, entries)

    # Verify
    verify_data(conn, client_id, period_id)

    return True


def main():
    """
    Main entry point.
    """
    print("=" * 60)
    print("LYNTOS - Özkan Kırtasiye Mizan Data Loader")
    print("=" * 60)

    # Check database exists
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        print("   Run backend first to create the database.")
        sys.exit(1)

    print(f"📂 Database: {DB_PATH}")

    # Connect
    conn = sqlite3.connect(DB_PATH)

    try:
        # Ensure tables exist
        ensure_tables_exist(conn)

        # Load Q1 data only (Q2 klasörü test kopyası, gerçek veri değil)
        if OZKAN_Q1_PATH.exists():
            load_period(conn, CLIENT_ID, "2025-Q1", OZKAN_Q1_PATH)
        else:
            print(f"\n⚠️ Q1 file not found: {OZKAN_Q1_PATH}")

        # NOT: Q2 yüklenmez - 2025-Q2 klasörü Q1'den kopyalanmış test verisi

        print("\n" + "=" * 60)
        print("✅ DONE! Data loaded to database.")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Restart backend: uvicorn main:app --reload")
        print("2. Open dashboard: http://localhost:3000/v2")
        print("3. Select: SMMM=HKOZKAN, Client=OZKAN_KIRTASIYE, Period=2025-Q1")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
