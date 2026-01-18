#!/usr/bin/env python3
"""
Sprint 1: Migrate existing document_uploads to clients and periods tables.
This is a one-time migration script.

Run: python backend/scripts/migrate_uploads_to_clients.py
     python backend/scripts/migrate_uploads_to_clients.py --dry-run
"""
import sqlite3
from pathlib import Path
from datetime import datetime
import sys

# Configuration
DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"
DRY_RUN = "--dry-run" in sys.argv


def log(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_period_dates(period_str: str) -> tuple:
    """
    Convert period string to start/end dates.

    Examples:
        "2025-Q1" -> ("2025-01-01", "2025-03-31")
        "2024-Q4" -> ("2024-10-01", "2024-12-31")
    """
    if not period_str or "-" not in period_str:
        return None, None

    try:
        parts = period_str.split("-")
        year = int(parts[0])
        quarter = parts[1].upper()

        quarter_map = {
            "Q1": ("01-01", "03-31"),
            "Q2": ("04-01", "06-30"),
            "Q3": ("07-01", "09-30"),
            "Q4": ("10-01", "12-31"),
        }

        if quarter not in quarter_map:
            return None, None

        start_suffix, end_suffix = quarter_map[quarter]
        return f"{year}-{start_suffix}", f"{year}-{end_suffix}"
    except (ValueError, IndexError):
        return None, None


def migrate_clients(cursor) -> tuple:
    """Migrate unique clients from document_uploads to clients table."""

    # Get unique tenant_id + client_id combinations
    cursor.execute("""
        SELECT DISTINCT tenant_id, client_id
        FROM document_uploads
        WHERE client_id IS NOT NULL
          AND client_id != ''
          AND tenant_id IS NOT NULL
    """)
    upload_clients = cursor.fetchall()

    log(f"Found {len(upload_clients)} unique clients in document_uploads")

    created = 0
    skipped = 0

    for tenant_id, client_id in upload_clients:
        # Check if already exists
        cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
        if cursor.fetchone():
            log(f"  ⏭️  Client '{client_id}' already exists, skipping")
            skipped += 1
            continue

        # Generate display name from client_id
        display_name = client_id.replace("_", " ").title()

        # Create placeholder tax_id (will be updated from Vergi Levhası)
        placeholder_tax_id = f"PENDING-{client_id[:20]}"

        if DRY_RUN:
            log(f"  [DRY-RUN] Would create client: {client_id}")
        else:
            cursor.execute("""
                INSERT INTO clients (
                    id, smmm_id, name, tax_id, tax_office,
                    company_type, nace_code, nace_description,
                    address, start_date, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                client_id,                              # id
                tenant_id,                              # smmm_id
                display_name,                           # name
                placeholder_tax_id,                     # tax_id (placeholder)
                None,                                   # tax_office
                None,                                   # company_type
                None,                                   # nace_code
                None,                                   # nace_description
                None,                                   # address
                None,                                   # start_date
                datetime.now().isoformat(),             # created_at
            ))
            log(f"  ✅ Created client: {client_id} (smmm: {tenant_id})")

        created += 1

    return created, skipped


def migrate_periods(cursor) -> tuple:
    """Migrate unique periods from document_uploads to periods table."""

    # Get unique client_id + period combinations
    cursor.execute("""
        SELECT DISTINCT client_id, period_id
        FROM document_uploads
        WHERE client_id IS NOT NULL
          AND period_id IS NOT NULL
          AND client_id != ''
          AND period_id != ''
    """)
    upload_periods = cursor.fetchall()

    log(f"Found {len(upload_periods)} unique client-period combinations")

    created = 0
    skipped = 0
    errors = 0

    for client_id, period_str in upload_periods:
        # Generate period_id
        period_id = f"{client_id}_{period_str}"

        # Check if already exists
        cursor.execute("SELECT id FROM periods WHERE id = ?", (period_id,))
        if cursor.fetchone():
            log(f"  ⏭️  Period '{period_id}' already exists, skipping")
            skipped += 1
            continue

        # Verify client exists
        cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
        if not cursor.fetchone():
            log(f"  ⚠️  Client '{client_id}' not found, skipping period '{period_str}'")
            errors += 1
            continue

        # Get date range
        start_date, end_date = get_period_dates(period_str)
        if not start_date:
            log(f"  ⚠️  Invalid period format: '{period_str}', skipping")
            errors += 1
            continue

        if DRY_RUN:
            log(f"  [DRY-RUN] Would create period: {period_id}")
        else:
            cursor.execute("""
                INSERT INTO periods (
                    id, client_id, period_code,
                    start_date, end_date, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                period_id,                              # id
                client_id,                              # client_id
                period_str,                             # period_code
                start_date,                             # start_date
                end_date,                               # end_date
                "active",                               # status
                datetime.now().isoformat(),             # created_at
            ))
            log(f"  ✅ Created period: {period_id} ({start_date} to {end_date})")

        created += 1

    return created, skipped, errors


def verify_migration(cursor):
    """Verify migration results."""

    cursor.execute("SELECT COUNT(*) FROM clients")
    client_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM periods")
    period_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM document_uploads")
    upload_count = cursor.fetchone()[0]

    log("")
    log("=" * 50)
    log("MIGRATION VERIFICATION")
    log("=" * 50)
    log(f"  Clients:          {client_count}")
    log(f"  Periods:          {period_count}")
    log(f"  Document Uploads: {upload_count}")

    # Check for orphaned uploads (uploads without matching client)
    cursor.execute("""
        SELECT COUNT(*) FROM document_uploads d
        WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = d.client_id)
          AND d.client_id IS NOT NULL AND d.client_id != ''
    """)
    orphaned = cursor.fetchone()[0]

    if orphaned > 0:
        log(f"  ⚠️  Orphaned uploads: {orphaned}")
    else:
        log(f"  ✅ No orphaned uploads")

    return client_count, period_count


def main():
    log("=" * 50)
    log("LYNTOS Sprint 1: Database Migration")
    log("=" * 50)

    if DRY_RUN:
        log("🔍 DRY RUN MODE - No changes will be made")

    if not DB_PATH.exists():
        log(f"❌ Database not found: {DB_PATH}")
        sys.exit(1)

    log(f"Database: {DB_PATH}")
    log("")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Step 1: Migrate clients
        log("STEP 1: Migrating clients...")
        clients_created, clients_skipped = migrate_clients(cursor)
        log(f"  → Created: {clients_created}, Skipped: {clients_skipped}")
        log("")

        # Step 2: Migrate periods
        log("STEP 2: Migrating periods...")
        periods_created, periods_skipped, periods_errors = migrate_periods(cursor)
        log(f"  → Created: {periods_created}, Skipped: {periods_skipped}, Errors: {periods_errors}")
        log("")

        # Step 3: Commit
        if not DRY_RUN:
            conn.commit()
            log("✅ Changes committed to database")

        # Step 4: Verify
        verify_migration(cursor)

        log("")
        log("=" * 50)
        log("✅ MIGRATION COMPLETE")
        log("=" * 50)

    except Exception as e:
        log(f"❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
