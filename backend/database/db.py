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
        # TAX PARAMETERS TABLE (Sprint R1 - Live Mevzuat Tracking)
        # ════════════════════════════════════════════════════════════════

        # Tax Parameters - Stores all current and historical tax rates/limits
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tax_parameters (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                param_key TEXT NOT NULL,
                param_value REAL,
                param_unit TEXT,
                valid_from TEXT NOT NULL,
                valid_until TEXT,
                legal_reference TEXT,
                source_url TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT,
                updated_by TEXT
            )
        """)

        # Tax Parameter indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tax_param_category ON tax_parameters(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tax_param_key ON tax_parameters(param_key)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tax_param_valid ON tax_parameters(valid_from, valid_until)")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_param_unique ON tax_parameters(param_key, valid_from)")

        # Change Log - Tracks all parameter changes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tax_change_log (
                id TEXT PRIMARY KEY,
                param_id TEXT,
                old_value REAL,
                new_value REAL,
                change_type TEXT,
                effective_date TEXT,
                detected_at TEXT DEFAULT (datetime('now')),
                source_document TEXT,
                impact_analysis TEXT,
                notification_sent INTEGER DEFAULT 0,
                FOREIGN KEY (param_id) REFERENCES tax_parameters(id)
            )
        """)

        # Change Log indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_change_log_param ON tax_change_log(param_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_change_log_detected ON tax_change_log(detected_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_change_log_type ON tax_change_log(change_type)")

        # Regulatory Sources - Tracks monitored sources
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS regulatory_sources (
                id TEXT PRIMARY KEY,
                source_name TEXT NOT NULL,
                source_url TEXT NOT NULL,
                scrape_frequency INTEGER DEFAULT 15,
                last_scraped_at TEXT,
                last_change_detected_at TEXT,
                is_active INTEGER DEFAULT 1,
                scraper_config TEXT DEFAULT '{}'
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reg_sources_active ON regulatory_sources(is_active)")

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

        # ════════════════════════════════════════════════════════════════
        # INSPECTOR PREPARATION TABLES (Sprint 8.1)
        # ════════════════════════════════════════════════════════════════

        # Preparation notes for inspector questions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS preparation_notes (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                period TEXT NOT NULL,
                rule_id TEXT NOT NULL,
                question_index INTEGER NOT NULL,
                note_text TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(client_id, period, rule_id, question_index)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_prep_notes_client ON preparation_notes(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_prep_notes_period ON preparation_notes(client_id, period)")

        # Document preparation status
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_preparation (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                period TEXT NOT NULL,
                document_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified')),
                file_url TEXT,
                uploaded_at TEXT,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(client_id, period, document_id)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_prep_client ON document_preparation(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_prep_period ON document_preparation(client_id, period)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doc_prep_status ON document_preparation(status)")

        # Add rule_id and file_name columns to document_preparation if not exists (Sprint 8.2)
        cursor.execute("PRAGMA table_info(document_preparation)")
        doc_columns = [col[1] for col in cursor.fetchall()]
        if 'rule_id' not in doc_columns:
            cursor.execute("ALTER TABLE document_preparation ADD COLUMN rule_id TEXT")
            logger.info("Added rule_id column to document_preparation table")
        if 'file_name' not in doc_columns:
            cursor.execute("ALTER TABLE document_preparation ADD COLUMN file_name TEXT")
            logger.info("Added file_name column to document_preparation table")

        # Add nace_code column to clients table if not exists
        cursor.execute("PRAGMA table_info(clients)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'nace_code' not in columns:
            cursor.execute("ALTER TABLE clients ADD COLUMN nace_code TEXT")
            cursor.execute("ALTER TABLE clients ADD COLUMN nace_description TEXT")
            logger.info("Added nace_code columns to clients table")

        # ════════════════════════════════════════════════════════════════
        # CORPORATE LAW TABLES (Sprint S1 - Sirketler Hukuku)
        # ════════════════════════════════════════════════════════════════

        # Corporate Event Types - Islem tipleri (kurulus, birlesme, bolunme, tur degistirme, sermaye, tasfiye)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS corporate_event_types (
                id TEXT PRIMARY KEY,
                event_code TEXT UNIQUE NOT NULL,
                event_name TEXT NOT NULL,
                company_types TEXT DEFAULT '[]',
                required_documents TEXT DEFAULT '[]',
                gk_quorum TEXT,
                registration_deadline INTEGER,
                legal_basis TEXT,
                tax_implications TEXT DEFAULT '{}',
                min_capital REAL,
                notes TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_corp_event_code ON corporate_event_types(event_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_corp_event_active ON corporate_event_types(is_active)")

        # Company Capital - Sirket sermaye durumu ve TTK 376 analizi
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_capital (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                company_name TEXT,
                company_type TEXT NOT NULL,
                tax_number TEXT,
                current_capital REAL,
                registered_capital REAL,
                paid_capital REAL,
                legal_reserves REAL DEFAULT 0,
                equity REAL,
                ttk376_status TEXT CHECK (ttk376_status IN ('healthy', 'half_loss', 'twothirds_loss', 'insolvent')),
                last_calculation_date TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_capital_id ON company_capital(company_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_capital_type ON company_capital(company_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_capital_status ON company_capital(ttk376_status)")

        # Corporate Events - Yapilan/planlanan sirket islemleri
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS corporate_events (
                id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                event_type_code TEXT NOT NULL,
                status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_gk', 'pending_registry', 'completed', 'cancelled')),
                planned_date TEXT,
                effective_date TEXT,
                registration_date TEXT,
                documents_checklist TEXT DEFAULT '{}',
                notes TEXT,
                created_by TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_corp_events_company ON corporate_events(company_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_corp_events_type ON corporate_events(event_type_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_corp_events_status ON corporate_events(status)")

        # ════════════════════════════════════════════════════════════════
        # TICARET SICILI TABLES (Sprint T1 - Trade Registry Integration)
        # ════════════════════════════════════════════════════════════════

        # Sirket Kayit Defteri - Company Registry from TTSG
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_registry (
                id TEXT PRIMARY KEY,
                tax_number TEXT UNIQUE NOT NULL,
                trade_registry_number TEXT,
                company_name TEXT NOT NULL,
                company_type TEXT,
                trade_registry_office TEXT,
                city TEXT,
                district TEXT,
                address TEXT,
                establishment_date TEXT,
                current_capital REAL,
                paid_capital REAL,
                currency TEXT DEFAULT 'TRY',
                status TEXT DEFAULT 'active',
                nace_code TEXT,
                activity_description TEXT,
                last_ttsg_issue TEXT,
                last_ttsg_date TEXT,
                last_ttsg_page INTEGER,
                ttsg_pdf_url TEXT,
                is_tracked INTEGER DEFAULT 0,
                tracked_by TEXT,
                tracking_notes TEXT,
                source TEXT DEFAULT 'ttsg',
                last_verified_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_reg_tax ON company_registry(tax_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_reg_city ON company_registry(city)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_reg_status ON company_registry(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_reg_tracked ON company_registry(is_tracked)")

        # Sirket Degisiklik Gecmisi - Company Change History
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_changes (
                id TEXT PRIMARY KEY,
                company_id TEXT,
                tax_number TEXT,
                change_type TEXT NOT NULL,
                change_description TEXT,
                old_value TEXT,
                new_value TEXT,
                ttsg_issue TEXT,
                ttsg_date TEXT,
                ttsg_page INTEGER,
                ttsg_url TEXT,
                notification_sent INTEGER DEFAULT 0,
                reviewed INTEGER DEFAULT 0,
                reviewed_by TEXT,
                reviewed_at TEXT,
                detected_at TEXT DEFAULT (datetime('now')),
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_changes_company ON company_changes(company_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_changes_tax ON company_changes(tax_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_changes_type ON company_changes(change_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_company_changes_detected ON company_changes(detected_at)")

        # SMMM Musteri Portfoyu - Client Portfolio
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS client_portfolio (
                id TEXT PRIMARY KEY,
                smmm_id TEXT NOT NULL,
                company_id TEXT,
                tax_number TEXT NOT NULL,
                company_name TEXT,
                relationship_type TEXT DEFAULT 'accounting',
                start_date TEXT,
                end_date TEXT,
                is_active INTEGER DEFAULT 1,
                notes TEXT,
                alert_preferences TEXT DEFAULT '{}',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_portfolio_smmm ON client_portfolio(smmm_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_portfolio_tax ON client_portfolio(tax_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_portfolio_active ON client_portfolio(is_active)")

        # Ticaret Sicil Mudurlukleri - Trade Registry Offices
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS trade_registry_offices (
                id TEXT PRIMARY KEY,
                office_code TEXT UNIQUE,
                office_name TEXT,
                city TEXT,
                district TEXT,
                chamber_name TEXT,
                chamber_url TEXT,
                is_pilot INTEGER DEFAULT 0,
                scrape_priority INTEGER DEFAULT 5,
                last_scraped_at TEXT,
                is_active INTEGER DEFAULT 1
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_registry_offices_city ON trade_registry_offices(city)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_registry_offices_pilot ON trade_registry_offices(is_pilot)")

        # ════════════════════════════════════════════════════════════════
        # AI ANALYSIS TABLES (Sprint R2 - Claude Integration)
        # ════════════════════════════════════════════════════════════════

        # AI Analiz Gecmisi
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ai_analyses (
                id TEXT PRIMARY KEY,
                source_type TEXT NOT NULL,
                source_id TEXT,
                source_content TEXT,
                analysis_type TEXT,
                summary TEXT,
                detailed_analysis TEXT,
                recommendations TEXT,
                affected_parameters TEXT,
                confidence_score REAL,
                severity TEXT,
                proposed_changes TEXT,
                status TEXT DEFAULT 'pending',
                reviewed_by TEXT,
                reviewed_at TEXT,
                review_notes TEXT,
                model_used TEXT,
                tokens_used INTEGER,
                processing_time_ms INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_analyses_source_type ON ai_analyses(source_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_analyses_source_id ON ai_analyses(source_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_analyses_status ON ai_analyses(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_analyses_severity ON ai_analyses(severity)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_analyses_created ON ai_analyses(created_at)")

        # Parametre Guncelleme Kuyrugu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS parameter_update_queue (
                id TEXT PRIMARY KEY,
                analysis_id TEXT,
                param_key TEXT NOT NULL,
                current_value REAL,
                proposed_value REAL,
                effective_date TEXT,
                legal_reference TEXT,
                source_url TEXT,
                status TEXT DEFAULT 'pending',
                approved_by TEXT,
                approved_at TEXT,
                applied_at TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_param_queue_analysis ON parameter_update_queue(analysis_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_param_queue_status ON parameter_update_queue(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_param_queue_param ON parameter_update_queue(param_key)")

        # ════════════════════════════════════════════════════════════════
        # NOTIFICATION TABLES (Sprint R3 - Alert & Notification System)
        # ════════════════════════════════════════════════════════════════

        # Bildirimler
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                message TEXT,
                notification_type TEXT NOT NULL,
                severity TEXT DEFAULT 'info',
                category TEXT,
                source_type TEXT,
                source_id TEXT,
                source_url TEXT,
                target_user TEXT DEFAULT 'all',
                target_role TEXT DEFAULT 'all',
                is_read INTEGER DEFAULT 0,
                read_at TEXT,
                is_dismissed INTEGER DEFAULT 0,
                dismissed_at TEXT,
                action_required INTEGER DEFAULT 0,
                action_type TEXT,
                action_url TEXT,
                action_completed INTEGER DEFAULT 0,
                action_completed_at TEXT,
                email_sent INTEGER DEFAULT 0,
                email_sent_at TEXT,
                expires_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(notification_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_severity ON notifications(severity)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_category ON notifications(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_target_user ON notifications(target_user)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications(is_read)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at)")

        # Bildirim Tercihleri
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                email TEXT,
                email_enabled INTEGER DEFAULT 1,
                dashboard_enabled INTEGER DEFAULT 1,
                min_severity TEXT DEFAULT 'low',
                tax_changes INTEGER DEFAULT 1,
                company_changes INTEGER DEFAULT 1,
                compliance_alerts INTEGER DEFAULT 1,
                deadlines INTEGER DEFAULT 1,
                system_alerts INTEGER DEFAULT 1,
                email_frequency TEXT DEFAULT 'instant',
                quiet_hours_start TEXT,
                quiet_hours_end TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id)")

        # Email Kuyrugu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS email_queue (
                id TEXT PRIMARY KEY,
                notification_id TEXT,
                recipient_email TEXT NOT NULL,
                subject TEXT,
                body_html TEXT,
                body_text TEXT,
                status TEXT DEFAULT 'pending',
                attempts INTEGER DEFAULT 0,
                last_attempt_at TEXT,
                sent_at TEXT,
                error_message TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_email_queue_notif ON email_queue(notification_id)")

        # ════════════════════════════════════════════════════════════════
        # CHAT TABLES (Sprint S3 - Corporate Chat Agent)
        # ════════════════════════════════════════════════════════════════

        # Chat Sessions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT DEFAULT 'default',
                agent_type TEXT NOT NULL,
                title TEXT,
                context TEXT DEFAULT '{}',
                is_active INTEGER DEFAULT 1,
                message_count INTEGER DEFAULT 0,
                last_message_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(agent_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(is_active)")

        # Chat Messages
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT DEFAULT '{}',
                tokens_used INTEGER DEFAULT 0,
                processing_time_ms INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role)")

        conn.commit()
        logger.info(f"Database initialized: {DB_PATH}")


def seed_pilot_data():
    """Seed pilot SMMM and client data"""

    with get_connection() as conn:
        cursor = conn.cursor()

        # Pilot SMMM user (password hash for 'lyntos2025')
        cursor.execute("""
            INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
            VALUES ('HKOZKAN', 'Hakkı Özkan', 'hakki@ozkan.com',
                    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtK9xvq0Ej.u', 'smmm')
        """)

        # Pilot client - TEMIZLENDI (SIFIR TOLERANS)
        # Gercek mukellef verileri sadece API/UI uzerinden eklenmeli
        # cursor.execute removed - no demo clients

        # Pilot periods - TEMIZLENDI (SIFIR TOLERANS)
        # Gercek donem verileri sadece API/UI uzerinden eklenmeli
        # cursor.execute removed - no demo periods

        conn.commit()
        logger.info("Pilot data seeded")


# Initialize on import
init_database()
seed_pilot_data()
