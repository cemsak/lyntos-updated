# -*- coding: utf-8 -*-
"""
Tests for cascade delete — taxpayer deletion must clean all 30+ tables
"""

import pytest
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


# ═══════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════

# The CLEANUP_TABLES list from tenants.py
CLEANUP_TABLES = [
    'feed_items', 'document_uploads', 'mizan_entries',
    'beyanname_entries', 'tahakkuk_entries', 'edefter_entries',
    'bank_transactions', 'journal_entries', 'ledger_entries',
    'uploaded_files', 'upload_sessions', 'raw_files',
    'ingestion_audit_log', 'generated_reports', 'rule_execution_log',
    'audit_log', 'tasks', 'checklist_progress',
    'kdv_beyanname_data', 'banka_bakiye_data', 'tahakkuk_data',
    'cari_ekstreler', 'opening_balances', 'opening_balance_summary',
    'document_preparation', 'preparation_notes', 'smmm_kararlar',
    'tax_certificates', 'migration_review_queue', 'periods',
]


@pytest.fixture
def cascade_db(tmp_path):
    """Create a test DB with all tables that cascade delete touches"""
    db_path = tmp_path / "cascade_test.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    # Create clients table
    conn.execute("""
        CREATE TABLE clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            tax_id TEXT,
            smmm_id TEXT
        )
    """)

    # Create all cleanup tables with at minimum a client_id column
    for table in CLEANUP_TABLES:
        conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {table} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                data TEXT DEFAULT 'test'
            )
        """)

    # Create task-related tables for task_comments/task_history cascade
    conn.execute("""
        CREATE TABLE IF NOT EXISTS task_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            comment TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS task_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            action TEXT
        )
    """)

    # Seed test data
    conn.execute("""
        INSERT INTO clients (id, name, tax_id, smmm_id)
        VALUES ('CLIENT_TEST', 'Test Firma', '1234567890', 'SMMM_TEST')
    """)
    conn.execute("""
        INSERT INTO clients (id, name, tax_id, smmm_id)
        VALUES ('CLIENT_KEEP', 'Keep Firma', '9876543210', 'SMMM_TEST')
    """)

    # Insert data into every cleanup table for CLIENT_TEST
    for table in CLEANUP_TABLES:
        conn.execute(f"INSERT INTO {table} (client_id) VALUES ('CLIENT_TEST')")
        conn.execute(f"INSERT INTO {table} (client_id) VALUES ('CLIENT_TEST')")
        # Also insert data for CLIENT_KEEP to verify isolation
        conn.execute(f"INSERT INTO {table} (client_id) VALUES ('CLIENT_KEEP')")

    # Insert tasks and related comments/history for CLIENT_TEST
    # tasks table already has entries, but let's give them known IDs
    conn.execute("DELETE FROM tasks")  # Clear auto-generated
    conn.execute("INSERT INTO tasks (id, client_id) VALUES (100, 'CLIENT_TEST')")
    conn.execute("INSERT INTO tasks (id, client_id) VALUES (101, 'CLIENT_TEST')")
    conn.execute("INSERT INTO tasks (id, client_id) VALUES (200, 'CLIENT_KEEP')")

    conn.execute("INSERT INTO task_comments (task_id, comment) VALUES (100, 'comment 1')")
    conn.execute("INSERT INTO task_comments (task_id, comment) VALUES (101, 'comment 2')")
    conn.execute("INSERT INTO task_comments (task_id, comment) VALUES (200, 'keep comment')")

    conn.execute("INSERT INTO task_history (task_id, action) VALUES (100, 'created')")
    conn.execute("INSERT INTO task_history (task_id, action) VALUES (200, 'keep history')")

    conn.commit()
    conn.close()
    return db_path


def _simulate_cascade_delete(db_path: str, client_id: str, smmm_id: str):
    """
    Reproduce the cascade delete logic from tenants.py delete_taxpayer()
    This tests the ALGORITHM, not the HTTP endpoint.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Verify ownership
    cursor.execute(
        "SELECT id, name FROM clients WHERE id = ? AND smmm_id = ?",
        (client_id, smmm_id)
    )
    client = cursor.fetchone()
    if not client:
        conn.close()
        raise ValueError(f"Client not found: {client_id}")

    deleted_records = {}
    _VALID = frozenset(CLEANUP_TABLES)

    # task_comments / task_history cascade via task_id
    # MUST run BEFORE bulk CLEANUP_TABLES loop (tasks is in the list)
    try:
        cursor.execute("SELECT id FROM tasks WHERE client_id = ?", (client_id,))
        task_ids = [r["id"] for r in cursor.fetchall()]
        if task_ids:
            ph = ','.join('?' * len(task_ids))
            cursor.execute(f"DELETE FROM task_comments WHERE task_id IN ({ph})", task_ids)
            if cursor.rowcount > 0:
                deleted_records["task_comments"] = cursor.rowcount
            cursor.execute(f"DELETE FROM task_history WHERE task_id IN ({ph})", task_ids)
            if cursor.rowcount > 0:
                deleted_records["task_history"] = cursor.rowcount
    except sqlite3.OperationalError:
        pass

    for table in CLEANUP_TABLES:
        assert table in _VALID
        try:
            cursor.execute(f"DELETE FROM {table} WHERE client_id = ?", (client_id,))
            if cursor.rowcount > 0:
                deleted_records[table] = cursor.rowcount
        except sqlite3.OperationalError:
            pass

    # Delete the client itself
    cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
    conn.commit()
    conn.close()

    return deleted_records


# ═══════════════════════════════════════════════════════════════
# Tests
# ═══════════════════════════════════════════════════════════════

class TestCascadeDelete:
    def test_all_tables_cleaned(self, cascade_db):
        """Every cleanup table should have CLIENT_TEST records removed"""
        deleted = _simulate_cascade_delete(str(cascade_db), "CLIENT_TEST", "SMMM_TEST")

        # Every table should have had 2 records deleted
        for table in CLEANUP_TABLES:
            assert table in deleted, f"Table {table} was not cleaned"
            assert deleted[table] == 2, f"Table {table}: expected 2 deleted, got {deleted[table]}"

    def test_task_comments_cascade(self, cascade_db):
        """task_comments should be deleted via task_id, not client_id"""
        deleted = _simulate_cascade_delete(str(cascade_db), "CLIENT_TEST", "SMMM_TEST")
        assert "task_comments" in deleted
        assert deleted["task_comments"] == 2  # comments for task 100, 101

    def test_task_history_cascade(self, cascade_db):
        """task_history should be deleted via task_id"""
        deleted = _simulate_cascade_delete(str(cascade_db), "CLIENT_TEST", "SMMM_TEST")
        assert "task_history" in deleted
        assert deleted["task_history"] == 1  # only task 100 had history

    def test_client_record_deleted(self, cascade_db):
        """The client record itself should be deleted"""
        _simulate_cascade_delete(str(cascade_db), "CLIENT_TEST", "SMMM_TEST")

        conn = sqlite3.connect(str(cascade_db))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients WHERE id = 'CLIENT_TEST'")
        assert cursor.fetchone()[0] == 0
        conn.close()

    def test_other_client_data_preserved(self, cascade_db):
        """CLIENT_KEEP data should not be affected"""
        _simulate_cascade_delete(str(cascade_db), "CLIENT_TEST", "SMMM_TEST")

        conn = sqlite3.connect(str(cascade_db))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Client record preserved
        cursor.execute("SELECT COUNT(*) FROM clients WHERE id = 'CLIENT_KEEP'")
        assert cursor.fetchone()[0] == 1

        # Data in all tables preserved
        for table in CLEANUP_TABLES:
            cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE client_id = 'CLIENT_KEEP'")
            count = cursor.fetchone()[0]
            assert count == 1, f"Table {table}: CLIENT_KEEP data was deleted!"

        # task_comments for CLIENT_KEEP preserved
        cursor.execute("SELECT COUNT(*) FROM task_comments WHERE task_id = 200")
        assert cursor.fetchone()[0] == 1

        conn.close()

    def test_smmm_isolation_on_delete(self, cascade_db):
        """Delete should fail if client doesn't belong to given SMMM"""
        with pytest.raises(ValueError, match="not found"):
            _simulate_cascade_delete(str(cascade_db), "CLIENT_TEST", "WRONG_SMMM")

        # Verify nothing was deleted
        conn = sqlite3.connect(str(cascade_db))
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clients WHERE id = 'CLIENT_TEST'")
        assert cursor.fetchone()[0] == 1
        conn.close()

    def test_cleanup_tables_count(self):
        """Verify we're testing the right number of tables (30)"""
        assert len(CLEANUP_TABLES) == 30

    def test_no_duplicate_tables(self):
        """Ensure no table appears twice in CLEANUP_TABLES"""
        assert len(CLEANUP_TABLES) == len(set(CLEANUP_TABLES))
