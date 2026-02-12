#!/usr/bin/env python3
"""
LYNTOS Demo Data Cleanup Script
Removes all demo/test data from the database.
Run this before production testing.

Usage:
    cd backend
    python scripts/cleanup_demo_data.py
"""

import sqlite3
import os
from datetime import datetime

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'lyntos.db')

def backup_database():
    """Create a backup before cleanup"""
    backup_path = DB_PATH + f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
    import shutil
    shutil.copy2(DB_PATH, backup_path)
    print(f"✅ Backup created: {backup_path}")
    return backup_path

def cleanup_demo_data():
    """Remove all demo/test data"""
    print(f"\n🔄 Connecting to database: {DB_PATH}")

    if not os.path.exists(DB_PATH):
        print("❌ Database not found!")
        return

    # Create backup first
    backup_database()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"\n📋 Found tables: {tables}")

    # Demo client IDs to remove
    demo_clients = ['OZKAN_KIRTASIYE', 'ABC_TICARET', 'TEST_FIRMA', 'DEMO_SIRKET']
    demo_smmm = ['HKOZKAN', 'TEST_SMMM', 'DEMO_SMMM']

    total_deleted = 0

    for table in tables:
        # Skip system tables
        if table.startswith('sqlite_'):
            continue

        # Get column names
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [col[1] for col in cursor.fetchall()]

        # Check for client_id column
        if 'client_id' in columns:
            for client in demo_clients:
                cursor.execute(f"DELETE FROM {table} WHERE client_id = ?", (client,))
                deleted = cursor.rowcount
                if deleted > 0:
                    print(f"  🗑️ {table}: Deleted {deleted} rows for client_id={client}")
                    total_deleted += deleted

        # Check for smmm_id column
        if 'smmm_id' in columns:
            for smmm in demo_smmm:
                cursor.execute(f"DELETE FROM {table} WHERE smmm_id = ?", (smmm,))
                deleted = cursor.rowcount
                if deleted > 0:
                    print(f"  🗑️ {table}: Deleted {deleted} rows for smmm_id={smmm}")
                    total_deleted += deleted

    conn.commit()

    print(f"\n✅ Cleanup complete! Total rows deleted: {total_deleted}")

    # Show remaining data counts
    print("\n📊 Remaining data counts:")
    for table in tables:
        if table.startswith('sqlite_'):
            continue
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"  {table}: {count} rows")

    conn.close()

if __name__ == '__main__':
    print("=" * 50)
    print("LYNTOS Demo Data Cleanup")
    print("=" * 50)

    confirm = input("\n⚠️ This will DELETE all demo/test data. Continue? (yes/no): ")
    if confirm.lower() == 'yes':
        cleanup_demo_data()
    else:
        print("Cancelled.")
