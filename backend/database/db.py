"""
LYNTOS Database Module (SQLite)
"""

import sqlite3
from pathlib import Path
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# Database path
DB_DIR = Path(__file__).parent
DB_PATH = DB_DIR / "lyntos.db"


def get_db_path() -> Path:
    """Get database file path"""
    return DB_PATH


@contextmanager
def get_connection():
    """Context manager for database connections"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # Enable dict-like access
    try:
        yield conn
    finally:
        conn.close()


def init_database():
    """Initialize database with all tables"""

    with get_connection() as conn:
        cursor = conn.cursor()

        # ════════════════════════════════════════════════════════════════
        # MULTI-TENANT TABLES
        # ════════════════════════════════════════════════════════════════

        # Users (SMMM accounts)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('admin', 'smmm', 'viewer')),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # Clients (Müşteriler)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                smmm_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                tax_id TEXT UNIQUE NOT NULL,
                sector TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # Periods (Dönemler)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS periods (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'locked')),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # Audit Log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT DEFAULT (datetime('now')),
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
                period_id TEXT REFERENCES periods(id) ON DELETE SET NULL,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT
            )
        """)

        # Multi-tenant indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_clients_smmm ON clients(smmm_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_periods_client ON periods(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_periods_status ON periods(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_client ON audit_log(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action)")

        # ════════════════════════════════════════════════════════════════
        # REGWATCH TABLES
        # ════════════════════════════════════════════════════════════════

        # RegWatch Events Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS regwatch_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,              -- 'new', 'amendment', 'repeal'
                source TEXT NOT NULL,                  -- 'gib', 'resmigazete', 'mevzuat', 'turmob'
                title TEXT NOT NULL,
                canonical_url TEXT,
                content_hash TEXT UNIQUE,
                published_date TEXT,
                detected_at TEXT DEFAULT (datetime('now')),
                status TEXT DEFAULT 'pending',          -- 'pending', 'approved', 'rejected'
                impact_rules TEXT,                      -- JSON array: ["R-001", "R-KDV-01"]
                expert_notes TEXT,
                approved_by TEXT,
                approved_at TEXT,
                source_id TEXT                          -- Created source ID after approval
            )
        """)

        # Source Registry Table (for approved sources)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS source_registry (
                id TEXT PRIMARY KEY,                    -- SRC-0001
                kurum TEXT NOT NULL,
                tur TEXT NOT NULL,
                baslik TEXT NOT NULL,
                canonical_url TEXT,
                content_hash TEXT,
                version TEXT DEFAULT 'v1.0',
                kapsam_etiketleri TEXT,                 -- JSON array
                trust_class TEXT DEFAULT 'A',           -- A, B, C, D
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # RegWatch indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_regwatch_status ON regwatch_events(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_regwatch_source ON regwatch_events(source)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_regwatch_detected ON regwatch_events(detected_at)")

        # ════════════════════════════════════════════════════════════════
        # DOCUMENT UPLOADS (Big-6 unified)
        # ════════════════════════════════════════════════════════════════

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_uploads (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                doc_type TEXT NOT NULL CHECK (doc_type IN (
                    'MIZAN', 'BANKA', 'BEYANNAME', 'TAHAKKUK', 'EDEFTER_BERAT', 'EFATURA_ARSIV'
                )),
                original_filename TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                mime_type TEXT,
                size_bytes INTEGER,
                content_hash_sha256 TEXT NOT NULL,
                received_at TEXT NOT NULL DEFAULT (datetime('now')),
                received_by TEXT,
                parser_name TEXT,
                parser_version TEXT,
                parse_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (parse_status IN (
                    'PENDING', 'OK', 'WARN', 'ERROR'
                )),
                parse_error TEXT,
                doc_date_min TEXT,
                doc_date_max TEXT,
                time_shield_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (time_shield_status IN (
                    'PENDING', 'PASS', 'WARN', 'REJECT'
                )),
                time_shield_reason TEXT,
                classification_confidence REAL NOT NULL DEFAULT 0.0,
                user_doc_type_override TEXT,
                override_reason TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                replaced_by TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)

        # Document uploads indexes
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_dedupe ON document_uploads(tenant_id, client_id, period_id, doc_type, content_hash_sha256) WHERE is_active = 1")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_tenant_period ON document_uploads(tenant_id, client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_hash ON document_uploads(content_hash_sha256)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_parse_status ON document_uploads(parse_status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_time_shield ON document_uploads(time_shield_status)")

        # ════════════════════════════════════════════════════════════════
        # INGESTION AUDIT LOG
        # ════════════════════════════════════════════════════════════════

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ingestion_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT,
                period_id TEXT,
                actor TEXT NOT NULL,
                action TEXT NOT NULL CHECK (action IN (
                    'UPLOAD_RECEIVED', 'UPLOAD_DEDUPE_SKIP', 'PARSE_OK', 'PARSE_WARN', 'PARSE_ERROR',
                    'TIME_SHIELD_PASS', 'TIME_SHIELD_WARN', 'TIME_SHIELD_REJECT',
                    'OVERRIDE_DOC_TYPE', 'MIGRATE_REVIEW_ADDED', 'MIGRATE_OK', 'MIGRATE_REJECTED',
                    'DELETE_DENIED', 'VERSION_REPLACED'
                )),
                target_id TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                details TEXT NOT NULL DEFAULT '{}'
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ing_audit_tenant ON ingestion_audit_log(tenant_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ing_audit_action ON ingestion_audit_log(action)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ing_audit_target ON ingestion_audit_log(target_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ing_audit_time ON ingestion_audit_log(timestamp)")

        # ════════════════════════════════════════════════════════════════
        # MIGRATION REVIEW QUEUE (legacy file migration)
        # ════════════════════════════════════════════════════════════════

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS migration_review_queue (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                client_id TEXT,
                detected_period_id TEXT,
                suggested_period_id TEXT,
                suggested_doc_type TEXT,
                confidence REAL NOT NULL,
                legacy_path TEXT NOT NULL,
                legacy_filename TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (status IN (
                    'NEEDS_REVIEW', 'MIGRATED_OK', 'REJECTED'
                )),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                resolved_at TEXT,
                resolved_by TEXT,
                resolution TEXT NOT NULL DEFAULT '{}'
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_migration_tenant ON migration_review_queue(tenant_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_migration_status ON migration_review_queue(status)")

        # ════════════════════════════════════════════════════════════════
        # NACE CODES TABLE (Sprint 7.4)
        # ════════════════════════════════════════════════════════════════

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nace_codes (
                code TEXT PRIMARY KEY,
                description_tr TEXT NOT NULL,
                description_en TEXT,
                sector_group TEXT NOT NULL,
                risk_profile TEXT NOT NULL CHECK (risk_profile IN ('low', 'medium', 'high', 'critical')),
                k_criteria TEXT NOT NULL DEFAULT '[]',
                avg_margin REAL,
                risk_weight REAL DEFAULT 1.0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_nace_sector ON nace_codes(sector_group)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_nace_risk ON nace_codes(risk_profile)")

        # ════════════════════════════════════════════════════════════════
        # TAX CERTIFICATES TABLE (Sprint 7.4 - Vergi Levhası)
        # ════════════════════════════════════════════════════════════════

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tax_certificates (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                year INTEGER NOT NULL,
                vkn TEXT NOT NULL,
                company_name TEXT NOT NULL,
                nace_code TEXT,
                nace_description TEXT,
                tax_office TEXT,
                address TEXT,
                city TEXT,
                district TEXT,
                kv_matrah REAL,
                kv_paid REAL,
                file_url TEXT,
                file_name TEXT,
                parsed_data TEXT DEFAULT '{}',
                uploaded_at TEXT DEFAULT (datetime('now')),
                uploaded_by TEXT,
                UNIQUE(client_id, year)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_taxcert_client ON tax_certificates(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_taxcert_year ON tax_certificates(year)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_taxcert_nace ON tax_certificates(nace_code)")

        # Add nace_code column to clients table if not exists
        cursor.execute("PRAGMA table_info(clients)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'nace_code' not in columns:
            cursor.execute("ALTER TABLE clients ADD COLUMN nace_code TEXT")
            cursor.execute("ALTER TABLE clients ADD COLUMN nace_description TEXT")
            logger.info("Added nace_code columns to clients table")

        conn.commit()
        logger.info(f"Database initialized: {DB_PATH}")


def seed_pilot_data():
    """Seed pilot SMMM and client data"""

    with get_connection() as conn:
        cursor = conn.cursor()

        # Pilot SMMM user (password hash for 'lyntos2025')
        cursor.execute("""
            INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
            VALUES ('HKOZKAN', 'Hakki Ozkan', 'hakki@ozkan.com',
                    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtK9xvq0Ej.u', 'smmm')
        """)

        # Pilot client
        cursor.execute("""
            INSERT OR IGNORE INTO clients (id, smmm_id, name, tax_id, sector)
            VALUES ('OZKAN_KIRTASIYE', 'HKOZKAN', 'Ozkan Kirtasiye Ltd. Sti.', '1234567890', 'Perakende')
        """)

        # Pilot periods
        cursor.execute("""
            INSERT OR IGNORE INTO periods (id, client_id, start_date, end_date, status)
            VALUES
                ('2025-Q1', 'OZKAN_KIRTASIYE', '2025-01-01', '2025-03-31', 'closed'),
                ('2025-Q2', 'OZKAN_KIRTASIYE', '2025-04-01', '2025-06-30', 'active'),
                ('2025-Q3', 'OZKAN_KIRTASIYE', '2025-07-01', '2025-09-30', 'active')
        """)

        conn.commit()
        logger.info("Pilot data seeded")


# Initialize on import
init_database()
seed_pilot_data()
