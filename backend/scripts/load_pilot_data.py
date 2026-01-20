#!/usr/bin/env python3
"""
LYNTOS Sprint 1 - Load Pilot Data
Loads ÖZKAN KIRTASİYE 2025 mizan data from Excel files.

Author: Claude Code
Date: 2026-01-19
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import re
import json

# ============================================================
# CONFIGURATION
# ============================================================
DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"
PILOT_DIR = Path(__file__).parent.parent / "uploads" / "pilot_ozkan"

TENANT_ID = "HKOZKAN"
CLIENT_ID = "OZKAN_KIRTASIYE"

PERIODS = {
    'Q1': '2025-Q1',
    'Q2': '2025-Q2',
    'Q3': '2025-Q3',
    'Q4': '2025-Q4',
}

# Mizan file patterns (Turkish characters may be mangled)
MIZAN_PATTERNS = [
    "*MİZAN*DETAY*",
    "*MIZAN*DETAY*",
    "*MİZAN*",
    "*MIZAN*",
]

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def parse_number(value) -> float:
    """Parse number value to float."""
    if pd.isna(value) or value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s or s == '-' or s.upper() == 'NAN':
        return 0.0
    # Handle Turkish format if present (1.234.567,89)
    if ',' in s and '.' in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0

def find_mizan_file(quarter_dir: Path) -> Optional[Path]:
    """Find mizan Excel file in extracted directory."""
    for pattern in MIZAN_PATTERNS:
        files = list(quarter_dir.rglob(pattern))
        xlsx_files = [f for f in files if f.suffix.lower() in ['.xlsx', '.xls']]
        if xlsx_files:
            return xlsx_files[0]
    return None

def parse_mizan_excel(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse mizan Excel file.

    Format (based on analysis):
    - Row 0-4: Header info (company name, period, etc.)
    - Row 5: Column names (HESAP KODU, HESAP ADI, [empty], BORÇ, ALACAK, BORÇ BAKİYESİ, ALACAK BAKİYESİ)
    - Row 6+: Data
    """
    print(f"  Parsing: {file_path.name}")

    df = pd.read_excel(file_path, header=None)

    # Find header row containing "HESAP KODU"
    header_row = None
    for i, row in df.iterrows():
        row_str = ' '.join([str(x) for x in row.values if pd.notna(x)]).upper()
        if 'HESAP KODU' in row_str:
            header_row = i
            break

    if header_row is None:
        print(f"  ERROR: Could not find header row")
        return []

    # Get column names and find indices
    headers = df.iloc[header_row].values
    col_indices = {
        'hesap_kodu': None,
        'hesap_adi': None,
        'borc_toplam': None,
        'alacak_toplam': None,
        'borc_bakiye': None,
        'alacak_bakiye': None,
    }

    for idx, col in enumerate(headers):
        col_str = str(col).strip().upper() if pd.notna(col) else ''
        if 'HESAP KODU' in col_str:
            col_indices['hesap_kodu'] = idx
        elif 'HESAP ADI' in col_str or col_str == 'HESAP ADI':
            col_indices['hesap_adi'] = idx
        elif 'BORÇ BAKİYE' in col_str or 'BORC BAKIYE' in col_str:
            col_indices['borc_bakiye'] = idx
        elif 'ALACAK BAKİYE' in col_str:
            col_indices['alacak_bakiye'] = idx
        elif col_str == 'BORÇ' or col_str == 'BORC':
            col_indices['borc_toplam'] = idx
        elif col_str == 'ALACAK':
            col_indices['alacak_toplam'] = idx

    print(f"  Header row: {header_row}, Columns: {col_indices}")

    # Parse data rows
    entries = []
    for i in range(header_row + 1, len(df)):
        row = df.iloc[i]

        # Get hesap_kodu
        hesap_kodu_idx = col_indices['hesap_kodu']
        if hesap_kodu_idx is None:
            continue

        hesap_kodu = row.iloc[hesap_kodu_idx] if hesap_kodu_idx < len(row) else None
        if pd.isna(hesap_kodu) or not str(hesap_kodu).strip():
            continue

        hesap_kodu = str(hesap_kodu).strip()

        # Skip summary/total rows
        if hesap_kodu.upper() in ['TOPLAM', 'GENEL TOPLAM', 'ARA TOPLAM', 'NAN', '']:
            continue

        # Skip rows that are just group headers (single digit codes like "1", "2")
        # We want detailed accounts like "100", "100.01", etc.
        if len(hesap_kodu) < 2 and hesap_kodu.isdigit():
            continue

        # Skip non-numeric codes (but allow dots like "100.01")
        if not re.match(r'^[\d\.]+$', hesap_kodu):
            continue

        # Get other values safely
        def get_val(key):
            idx = col_indices.get(key)
            if idx is not None and idx < len(row):
                return row.iloc[idx]
            return None

        hesap_adi = get_val('hesap_adi')
        hesap_adi = str(hesap_adi).strip() if pd.notna(hesap_adi) else ''

        # Clean up hesap_adi - remove any leading currency markers
        if hesap_adi.startswith('TL') or hesap_adi.startswith('$') or hesap_adi.startswith('€'):
            hesap_adi = ''

        entry = {
            'hesap_kodu': hesap_kodu,
            'hesap_adi': hesap_adi,
            'borc_toplam': parse_number(get_val('borc_toplam')),
            'alacak_toplam': parse_number(get_val('alacak_toplam')),
            'borc_bakiye': parse_number(get_val('borc_bakiye')),
            'alacak_bakiye': parse_number(get_val('alacak_bakiye')),
        }
        entries.append(entry)

    print(f"  Parsed {len(entries)} entries")
    return entries

# ============================================================
# DATABASE FUNCTIONS
# ============================================================
def get_db():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def ensure_periods():
    """Ensure all periods exist in periods table."""
    conn = get_db()
    cursor = conn.cursor()

    for q, period_id in PERIODS.items():
        # Check if period exists
        cursor.execute("""
            SELECT id FROM periods WHERE client_id = ? AND period_code = ?
        """, (CLIENT_ID, period_id))

        if not cursor.fetchone():
            # Determine dates based on quarter
            if 'Q1' in period_id:
                start_date, end_date = '2025-01-01', '2025-03-31'
            elif 'Q2' in period_id:
                start_date, end_date = '2025-04-01', '2025-06-30'
            elif 'Q3' in period_id:
                start_date, end_date = '2025-07-01', '2025-09-30'
            else:  # Q4
                start_date, end_date = '2025-10-01', '2025-12-31'

            period_table_id = f"{CLIENT_ID}_{period_id}"
            now = datetime.utcnow().isoformat()

            cursor.execute("""
                INSERT INTO periods (id, client_id, period_code, start_date, end_date, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
            """, (period_table_id, CLIENT_ID, period_id, start_date, end_date, now, now))
            print(f"  Created period: {period_id}")

    conn.commit()
    conn.close()

def save_mizan_entries(entries: List[Dict], period_id: str, source_file: str) -> int:
    """Save mizan entries to database."""
    if not entries:
        return 0

    conn = get_db()
    cursor = conn.cursor()

    # Delete existing entries for this period
    cursor.execute("""
        DELETE FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (TENANT_ID, CLIENT_ID, period_id))
    deleted = cursor.rowcount
    if deleted > 0:
        print(f"  Deleted {deleted} existing entries")

    # Insert new entries
    now = datetime.utcnow().isoformat()
    inserted = 0

    for idx, entry in enumerate(entries):
        try:
            cursor.execute("""
                INSERT INTO mizan_entries (
                    tenant_id, client_id, period_id,
                    hesap_kodu, hesap_adi,
                    borc_toplam, alacak_toplam,
                    borc_bakiye, alacak_bakiye,
                    source_file, row_index,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                TENANT_ID,
                CLIENT_ID,
                period_id,
                entry['hesap_kodu'],
                entry['hesap_adi'],
                entry['borc_toplam'],
                entry['alacak_toplam'],
                entry['borc_bakiye'],
                entry['alacak_bakiye'],
                source_file,
                idx,
                now,
                now
            ))
            inserted += 1
        except Exception as e:
            print(f"  ERROR inserting {entry['hesap_kodu']}: {e}")

    conn.commit()
    conn.close()

    return inserted

# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 70)
    print("LYNTOS SPRINT 1 - LOAD PILOT DATA")
    print("=" * 70)
    print(f"Tenant: {TENANT_ID}")
    print(f"Client: {CLIENT_ID}")
    print(f"Source: {PILOT_DIR}")
    print(f"Database: {DB_PATH}")
    print()

    # Verify database exists
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return 1

    # Verify pilot directory exists
    if not PILOT_DIR.exists():
        print(f"ERROR: Pilot directory not found at {PILOT_DIR}")
        return 1

    # Ensure periods exist
    print("[1/4] Ensuring periods...")
    ensure_periods()

    # Process each quarter
    print("\n[2/4] Processing quarters...")
    results = {}

    for q in ['Q1', 'Q2', 'Q3']:  # Q4 doesn't have mizan file
        print(f"\n--- {q} ---")
        period_id = PERIODS[q]

        # Find extracted directory
        q_dir = PILOT_DIR / f"{q}_extracted"
        if not q_dir.exists():
            print(f"  WARNING: Directory not found: {q_dir}")
            results[period_id] = {'status': 'MISSING', 'count': 0}
            continue

        # Find mizan file
        mizan_file = find_mizan_file(q_dir)
        if not mizan_file:
            print(f"  WARNING: No mizan file found in {q_dir}")
            results[period_id] = {'status': 'NO_MIZAN', 'count': 0}
            continue

        print(f"  Found: {mizan_file.name}")

        # Parse mizan
        entries = parse_mizan_excel(mizan_file)
        if not entries:
            print(f"  WARNING: No entries parsed from {mizan_file}")
            results[period_id] = {'status': 'EMPTY', 'count': 0}
            continue

        # Save to database
        count = save_mizan_entries(entries, period_id, mizan_file.name)
        results[period_id] = {'status': 'OK', 'count': count}
        print(f"  ✅ Saved {count} entries")

    # Verification
    print("\n[3/4] Verification...")
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT period_id, COUNT(*) as cnt,
               SUM(borc_bakiye) as total_borc,
               SUM(alacak_bakiye) as total_alacak
        FROM mizan_entries
        WHERE client_id = ?
        GROUP BY period_id
        ORDER BY period_id
    """, (CLIENT_ID,))

    print("\n  Period       | Count | Borç Bakiye      | Alacak Bakiye")
    print("  " + "-" * 65)
    total_entries = 0
    for row in cursor.fetchall():
        borc = row['total_borc'] or 0
        alacak = row['total_alacak'] or 0
        print(f"  {row['period_id']:12} | {row['cnt']:5} | {borc:16,.2f} | {alacak:14,.2f}")
        total_entries += row['cnt']

    conn.close()

    # Summary
    print("\n[4/4] Summary...")
    print(f"\n  Total entries loaded: {total_entries}")
    print(f"\n  Results by period:")
    for period_id, result in results.items():
        status_icon = "✅" if result['status'] == 'OK' else "❌"
        print(f"    {status_icon} {period_id}: {result['status']} ({result['count']} entries)")

    # Final status
    success_count = sum(1 for r in results.values() if r['status'] == 'OK')

    print("\n" + "=" * 70)
    if success_count >= 3:
        print("✅ SPRINT 1 COMPLETE - All quarters loaded successfully")
        status = "SUCCESS"
    elif success_count > 0:
        print("⚠️ SPRINT 1 PARTIAL - Some quarters loaded")
        status = "PARTIAL"
    else:
        print("❌ SPRINT 1 FAILED - No data loaded")
        status = "FAILED"

    # Output JSON summary
    summary = {
        "sprint": "1",
        "status": status,
        "total_entries": total_entries,
        "periods": results,
        "next_action": "SPRINT 2: Analysis Pipeline" if status in ["SUCCESS", "PARTIAL"] else "FIX: Check file paths and formats"
    }
    print(f"\n{json.dumps(summary, indent=2)}")

    return 0 if status == "SUCCESS" else 1

if __name__ == "__main__":
    sys.exit(main())
