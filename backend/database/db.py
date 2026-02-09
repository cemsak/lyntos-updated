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
                folder_name TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        # Migration: folder_name kolonu yoksa ekle
        try:
            cursor.execute("ALTER TABLE clients ADD COLUMN folder_name TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

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
        # MUHASEBE VERİ TABLOLARI (KRİTİK - MALİYE CEZASI RİSKİ!)
        # Sprint 8: Bu tablolar olmadan veri yüklenemez!
        # ════════════════════════════════════════════════════════════════

        # Mizan Entries - Trial Balance (MİZAN)
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
                source_file TEXT,
                row_index INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, client_id, period_id, hesap_kodu)
            )
        """)

        # KDV Beyanname Data - VAT Declaration
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS kdv_beyanname_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                beyan_tipi TEXT DEFAULT 'KDV1',
                matrah REAL DEFAULT 0,
                hesaplanan_kdv REAL DEFAULT 0,
                indirilecek_kdv REAL DEFAULT 0,
                odenecek_kdv REAL DEFAULT 0,
                devreden_kdv REAL DEFAULT 0,
                iade_talep REAL DEFAULT 0,
                tecil_terkin REAL DEFAULT 0,
                ihracat_istisna REAL DEFAULT 0,
                source_file TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, client_id, period_id, beyan_tipi)
            )
        """)

        # Banka Bakiye Data - Bank Balance
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS banka_bakiye_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                banka_adi TEXT NOT NULL,
                hesap_no TEXT,
                hesap_kodu TEXT,
                donem_basi_bakiye REAL DEFAULT 0,
                donem_sonu_bakiye REAL DEFAULT 0,
                toplam_giris REAL DEFAULT 0,
                toplam_cikis REAL DEFAULT 0,
                source_file TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, client_id, period_id, banka_adi, hesap_no)
            )
        """)

        # Tahakkuk Data - Tax Assessment
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tahakkuk_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                vergi_turu TEXT NOT NULL,
                tahakkuk_tarihi TEXT,
                vade_tarihi TEXT,
                tahakkuk_tutari REAL DEFAULT 0,
                odenen_tutar REAL DEFAULT 0,
                kalan_tutar REAL DEFAULT 0,
                source_file TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, client_id, period_id, vergi_turu, tahakkuk_tarihi)
            )
        """)

        # Muhasebe veri indexleri
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mizan_tenant_client_period ON mizan_entries(tenant_id, client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mizan_hesap_kodu ON mizan_entries(hesap_kodu)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_kdv_tenant_client_period ON kdv_beyanname_data(tenant_id, client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_banka_tenant_client_period ON banka_bakiye_data(tenant_id, client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tahakkuk_tenant_client_period ON tahakkuk_data(tenant_id, client_id, period_id)")

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

        # Migration: metadata kolonu yoksa ekle (JSON yapısal veri için)
        try:
            cursor.execute("ALTER TABLE tax_parameters ADD COLUMN metadata TEXT DEFAULT '{}'")
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Migration: description kolonu yoksa ekle
        try:
            cursor.execute("ALTER TABLE tax_parameters ADD COLUMN description TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

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
                    'MIZAN', 'BANKA', 'BEYANNAME', 'TAHAKKUK', 'EDEFTER_BERAT', 'EFATURA_ARSIV',
                    'YEVMIYE', 'KEBIR', 'POSET', 'GECICI_VERGI', 'OTHER'
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

        # ════════════════════════════════════════════════════════════════
        # BANKA HAREKETLERİ (Bank Transactions)
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bank_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                hesap_kodu TEXT,
                banka_adi TEXT,
                tarih TEXT,
                aciklama TEXT,
                islem_tipi TEXT,
                tutar REAL,
                bakiye REAL,
                source_file TEXT,
                line_number INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bank_trans_client_period ON bank_transactions(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bank_trans_hesap ON bank_transactions(hesap_kodu)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bank_trans_tarih ON bank_transactions(tarih)")

        # ════════════════════════════════════════════════════════════════
        # YEVMİYE DEFTERİ (Journal Entries)
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS journal_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                fis_no TEXT,
                tarih TEXT,
                fis_aciklama TEXT,
                hesap_kodu TEXT,
                hesap_adi TEXT,
                aciklama TEXT,
                borc REAL DEFAULT 0,
                alacak REAL DEFAULT 0,
                source_file TEXT,
                line_number INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_journal_client_period ON journal_entries(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_journal_fis ON journal_entries(fis_no)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_journal_hesap ON journal_entries(hesap_kodu)")

        # ════════════════════════════════════════════════════════════════
        # DEFTERİ KEBİR (General Ledger)
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ledger_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                kebir_hesap TEXT,
                tarih TEXT,
                madde_no TEXT,
                fis_no TEXT,
                evrak_no TEXT,
                evrak_tarihi TEXT,
                hesap_kodu TEXT,
                hesap_adi TEXT,
                aciklama TEXT,
                borc REAL DEFAULT 0,
                alacak REAL DEFAULT 0,
                bakiye REAL DEFAULT 0,
                source_file TEXT,
                line_number INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_client_period ON ledger_entries(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_hesap ON ledger_entries(hesap_kodu)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_kebir ON ledger_entries(kebir_hesap)")

        # ════════════════════════════════════════════════════════════════
        # E-DEFTER KAYITLARI (E-Ledger Entries from XML)
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS edefter_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                vkn TEXT,
                donem TEXT,
                defter_tipi TEXT,
                fis_no TEXT,
                satir_no INTEGER,
                tarih TEXT,
                fis_aciklama TEXT,
                hesap_kodu TEXT,
                hesap_adi TEXT,
                alt_hesap_kodu TEXT,
                alt_hesap_adi TEXT,
                tutar REAL DEFAULT 0,
                borc_alacak TEXT,
                belge_no TEXT,
                belge_tarihi TEXT,
                aciklama TEXT,
                source_file TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_edefter_client_period ON edefter_entries(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_edefter_vkn ON edefter_entries(vkn)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_edefter_hesap ON edefter_entries(hesap_kodu)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_edefter_fis ON edefter_entries(fis_no)")

        # ════════════════════════════════════════════════════════════════
        # BEYANNAME ENTRIES - Vergi Beyannameleri
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS beyanname_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                beyanname_tipi TEXT,
                donem_yil INTEGER,
                donem_ay INTEGER,
                donem_tipi TEXT,
                vergi_dairesi TEXT,
                vkn TEXT,
                unvan TEXT,
                onay_zamani TEXT,
                matrah_toplam REAL DEFAULT 0,
                hesaplanan_vergi REAL DEFAULT 0,
                indirimler_toplam REAL DEFAULT 0,
                odenecek_vergi REAL DEFAULT 0,
                devreden_kdv REAL DEFAULT 0,
                source_file TEXT,
                raw_text TEXT,
                parsed_ok INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_beyanname_client_period ON beyanname_entries(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_beyanname_tipi ON beyanname_entries(beyanname_tipi)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_beyanname_vkn ON beyanname_entries(vkn)")

        # ════════════════════════════════════════════════════════════════
        # TAHAKKUK ENTRIES - Vergi Tahakkuk Fişleri
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tahakkuk_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                tahakkuk_tipi TEXT,
                donem_yil INTEGER,
                donem_ay INTEGER,
                vergi_dairesi TEXT,
                vkn TEXT,
                unvan TEXT,
                tahakkuk_no TEXT,
                tahakkuk_tarihi TEXT,
                vergi_turu TEXT,
                vergi_tutari REAL DEFAULT 0,
                gecikme_zammi REAL DEFAULT 0,
                toplam_borc REAL DEFAULT 0,
                vade_tarihi TEXT,
                source_file TEXT,
                raw_text TEXT,
                parsed_ok INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tahakkuk_client_period ON tahakkuk_entries(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tahakkuk_tipi ON tahakkuk_entries(tahakkuk_tipi)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tahakkuk_vkn ON tahakkuk_entries(vkn)")

        # ════════════════════════════════════════════════════════════════
        # TAHAKKUK KALEMLERİ - Her tahakkuk fişindeki alt satırlar
        # Örn: KDV fişinde → 0015 KDV + 1048 Damga Vergisi
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tahakkuk_kalemleri (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tahakkuk_id INTEGER NOT NULL REFERENCES tahakkuk_entries(id) ON DELETE CASCADE,
                vergi_kodu TEXT NOT NULL,
                vergi_adi TEXT,
                matrah REAL DEFAULT 0,
                tahakkuk_eden REAL DEFAULT 0,
                mahsup_edilen REAL DEFAULT 0,
                odenecek REAL DEFAULT 0,
                vade_tarihi TEXT,
                is_ana_vergi INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tahakkuk_kalemleri_tahakkuk ON tahakkuk_kalemleri(tahakkuk_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tahakkuk_kalemleri_kod ON tahakkuk_kalemleri(vergi_kodu)")

        # ════════════════════════════════════════════════════════════════
        # FEED ITEMS - Kokpit bildirim ve uyarı sistemi
        # Sprint 4: Feed'e gelen risk/uyarı/bilgi kartları
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS feed_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL DEFAULT 'SYSTEM',
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('risk', 'alert', 'info', 'upload', 'system')),
                title TEXT NOT NULL,
                message TEXT,
                severity TEXT DEFAULT 'INFO' CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
                is_read BOOLEAN DEFAULT 0,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_feed_items_client_period ON feed_items(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_feed_items_tenant ON feed_items(tenant_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_feed_items_created ON feed_items(created_at DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_feed_items_severity ON feed_items(severity)")

        # ════════════════════════════════════════════════════════════════
        # AÇILIŞ BAKİYELERİ (Opening Balances) - Sprint TD-002
        # Her yılın başında dönem başı bakiyeleri için gerekli
        # Kebir-Mizan cross-check'inde tutarlılık sağlar
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS opening_balances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                fiscal_year INTEGER NOT NULL,
                hesap_kodu TEXT NOT NULL,
                hesap_adi TEXT,
                borc_bakiye REAL DEFAULT 0,
                alacak_bakiye REAL DEFAULT 0,
                source_type TEXT NOT NULL CHECK (source_type IN ('acilis_fisi', 'acilis_mizani', 'manual')),
                source_file TEXT,
                acilis_tarihi TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, client_id, period_id, fiscal_year, hesap_kodu)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_opening_bal_client_period ON opening_balances(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_opening_bal_fiscal_year ON opening_balances(fiscal_year)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_opening_bal_hesap ON opening_balances(hesap_kodu)")

        # Açılış Bakiyesi Özeti - Her dönem için toplam durum
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS opening_balance_summary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                fiscal_year INTEGER NOT NULL,
                toplam_hesap_sayisi INTEGER DEFAULT 0,
                toplam_borc REAL DEFAULT 0,
                toplam_alacak REAL DEFAULT 0,
                is_balanced INTEGER DEFAULT 0,
                balance_diff REAL DEFAULT 0,
                source_type TEXT,
                source_file TEXT,
                upload_date TEXT,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'loaded', 'verified', 'error')),
                error_message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tenant_id, client_id, period_id, fiscal_year)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_opening_sum_client_period ON opening_balance_summary(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_opening_sum_status ON opening_balance_summary(status)")

        # ════════════════════════════════════════════════════════════════
        # KURAL KÜTÜPHANESİ TABLOLARI (Sprint PENCERE-4)
        # 180+ VDK/KURGAN/RAM kuralları için merkezi veritabanı
        # ════════════════════════════════════════════════════════════════

        # RULES - Ana Kural Tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rules (
                rule_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                name_tr TEXT,
                version TEXT DEFAULT '1.0.0',
                category TEXT NOT NULL,
                priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
                severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
                description TEXT,
                algorithm TEXT,
                thresholds TEXT DEFAULT '{}',
                inputs TEXT DEFAULT '[]',
                outputs TEXT DEFAULT '[]',
                accounts TEXT DEFAULT '[]',
                sector_thresholds TEXT DEFAULT '{}',
                inspector_questions TEXT DEFAULT '[]',
                answer_templates TEXT DEFAULT '[]',
                required_documents TEXT DEFAULT '[]',
                legal_refs TEXT DEFAULT '[]',
                test_cases TEXT DEFAULT '[]',
                evidence_required TEXT DEFAULT '[]',
                source_type TEXT DEFAULT 'yaml' CHECK (source_type IN ('yaml', 'json', 'python', 'db')),
                source_file TEXT,
                is_active INTEGER DEFAULT 1,
                is_deprecated INTEGER DEFAULT 0,
                deprecated_by TEXT,
                effective_from TEXT,
                effective_until TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                created_by TEXT,
                updated_by TEXT
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rules_category ON rules(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(priority)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rules_severity ON rules(severity)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rules_source ON rules(source_type)")

        # MEVZUAT_REFS - Mevzuat Referansları Tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mevzuat_refs (
                id TEXT PRIMARY KEY,
                src_code TEXT UNIQUE,
                mevzuat_type TEXT NOT NULL CHECK (mevzuat_type IN (
                    'kanun', 'khk', 'teblig', 'sirkular', 'genelge', 'ozelge',
                    'danistay_karar', 'yonetmelik', 'diger'
                )),
                mevzuat_no TEXT,
                madde TEXT,
                fikra TEXT,
                baslik TEXT NOT NULL,
                kisa_aciklama TEXT,
                tam_metin TEXT,
                resmi_gazete_tarih TEXT,
                resmi_gazete_sayi TEXT,
                yururluk_tarih TEXT,
                bitis_tarih TEXT,
                canonical_url TEXT,
                pdf_url TEXT,
                content_hash TEXT,
                kurum TEXT,
                kapsam_etiketleri TEXT DEFAULT '[]',
                affected_rules TEXT DEFAULT '[]',
                trust_class TEXT DEFAULT 'A' CHECK (trust_class IN ('A', 'B', 'C', 'D')),
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mevzuat_src_code ON mevzuat_refs(src_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mevzuat_type ON mevzuat_refs(mevzuat_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mevzuat_active ON mevzuat_refs(is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_mevzuat_yururluk ON mevzuat_refs(yururluk_tarih)")

        # MEVZUAT_REFS_FTS - Full-Text Search (FTS5) tablosu
        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS mevzuat_refs_fts USING fts5(
                baslik, kisa_aciklama, tam_metin,
                content='mevzuat_refs', content_rowid='rowid',
                tokenize='unicode61 remove_diacritics 2'
            )
        """)

        # FTS5 senkronizasyon trigger'ları
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS mevzuat_refs_ai AFTER INSERT ON mevzuat_refs BEGIN
                INSERT INTO mevzuat_refs_fts(rowid, baslik, kisa_aciklama, tam_metin)
                VALUES (new.rowid, new.baslik, new.kisa_aciklama, new.tam_metin);
            END
        """)
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS mevzuat_refs_ad AFTER DELETE ON mevzuat_refs BEGIN
                INSERT INTO mevzuat_refs_fts(mevzuat_refs_fts, rowid, baslik, kisa_aciklama, tam_metin)
                VALUES ('delete', old.rowid, old.baslik, old.kisa_aciklama, old.tam_metin);
            END
        """)
        cursor.execute("""
            CREATE TRIGGER IF NOT EXISTS mevzuat_refs_au AFTER UPDATE ON mevzuat_refs BEGIN
                INSERT INTO mevzuat_refs_fts(mevzuat_refs_fts, rowid, baslik, kisa_aciklama, tam_metin)
                VALUES ('delete', old.rowid, old.baslik, old.kisa_aciklama, old.tam_metin);
                INSERT INTO mevzuat_refs_fts(rowid, baslik, kisa_aciklama, tam_metin)
                VALUES (new.rowid, new.baslik, new.kisa_aciklama, new.tam_metin);
            END
        """)

        # RULE_MEVZUAT_LINK - Kural-Mevzuat İlişki Tablosu (Many-to-Many)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rule_mevzuat_link (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id TEXT NOT NULL REFERENCES rules(rule_id) ON DELETE CASCADE,
                mevzuat_id TEXT NOT NULL REFERENCES mevzuat_refs(id) ON DELETE CASCADE,
                link_type TEXT DEFAULT 'primary' CHECK (link_type IN ('primary', 'secondary', 'reference')),
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(rule_id, mevzuat_id)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_mevzuat_rule ON rule_mevzuat_link(rule_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_mevzuat_mevzuat ON rule_mevzuat_link(mevzuat_id)")

        # RULE_DUPLICATES - Duplicate/Overlap Kuralları Takibi
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rule_duplicates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id_1 TEXT NOT NULL,
                rule_id_2 TEXT NOT NULL,
                overlap_type TEXT NOT NULL CHECK (overlap_type IN ('duplicate', 'partial', 'supersedes')),
                overlap_description TEXT,
                resolution TEXT CHECK (resolution IN ('keep_both', 'merge', 'deprecate_1', 'deprecate_2', 'pending')),
                resolved_at TEXT,
                resolved_by TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(rule_id_1, rule_id_2)
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_dup_rule1 ON rule_duplicates(rule_id_1)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_dup_rule2 ON rule_duplicates(rule_id_2)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_dup_resolution ON rule_duplicates(resolution)")

        # RULE_EXECUTION_LOG - Kural Çalışma Geçmişi
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rule_execution_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id TEXT NOT NULL,
                client_id TEXT,
                period_id TEXT,
                execution_time_ms INTEGER,
                result_status TEXT CHECK (result_status IN ('pass', 'fail', 'warning', 'error', 'skip')),
                result_score REAL,
                result_data TEXT DEFAULT '{}',
                triggered_by TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_exec_rule ON rule_execution_log(rule_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_exec_client ON rule_execution_log(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_exec_result ON rule_execution_log(result_status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_rule_exec_created ON rule_execution_log(created_at)")

        # ════════════════════════════════════════════════════════════════
        # AKILLI GÖREV MERKEZİ - SMART TASK CENTER
        # Sprint: Pencere 5 - SMMM/YMM için gerçek iş akışı takibi
        # ════════════════════════════════════════════════════════════════

        # TASKS - Ana Görev Tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT UNIQUE NOT NULL,

                -- Scope
                smmm_id TEXT NOT NULL,
                client_id TEXT,
                period_id TEXT,

                -- Content
                category TEXT NOT NULL CHECK (category IN (
                    'RISK_MITIGATION',
                    'DEADLINE_MANAGEMENT',
                    'DATA_QUALITY',
                    'REGULATORY_CHANGES',
                    'CLIENT_SPECIFIC',
                    'SYSTEM_TASKS'
                )),
                task_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                details TEXT DEFAULT '{}',

                -- Priority & Urgency
                severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
                priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
                due_date TEXT,

                -- Progress
                status TEXT DEFAULT 'PENDING' CHECK (status IN (
                    'PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED', 'SNOOZED'
                )),
                assigned_to TEXT DEFAULT 'SMMM' CHECK (assigned_to IN ('SMMM', 'CLIENT', 'SYSTEM', 'BOTH')),
                progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
                blocked_reason TEXT,
                snooze_until TEXT,

                -- Source & Evidence
                source TEXT NOT NULL,
                source_ref TEXT,
                related_rule_id TEXT,
                related_documents TEXT DEFAULT '[]',
                evidence_refs TEXT DEFAULT '[]',

                -- Actions
                required_actions TEXT DEFAULT '[]',
                suggested_actions TEXT DEFAULT '[]',
                action_url TEXT,

                -- Tracking
                created_at TEXT DEFAULT (datetime('now')),
                started_at TEXT,
                completed_at TEXT,
                updated_at TEXT DEFAULT (datetime('now')),

                -- Notifications
                notification_sent INTEGER DEFAULT 0,
                reminder_count INTEGER DEFAULT 0,
                last_reminder_at TEXT,

                -- Indexes for foreign keys
                FOREIGN KEY (smmm_id) REFERENCES users(id),
                FOREIGN KEY (client_id) REFERENCES clients(id),
                FOREIGN KEY (related_rule_id) REFERENCES rules(rule_id)
            )
        """)

        # Task indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_smmm ON tasks(smmm_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_period ON tasks(period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_severity ON tasks(severity)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at)")

        # TASK_COMMENTS - Görev Yorumları
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL,
                comment TEXT NOT NULL,
                is_system INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id)")

        # TASK_HISTORY - Görev Değişiklik Geçmişi
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                field_name TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                changed_by TEXT,
                changed_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_task_history_changed ON task_history(changed_at)")

        # DEADLINE_CALENDAR - Beyanname ve Ödeme Tarihleri
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS deadline_calendar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deadline_type TEXT NOT NULL CHECK (deadline_type IN ('BEYANNAME', 'ODEME', 'DONEM_KAPATIS', 'MEVZUAT')),
                title TEXT NOT NULL,
                description TEXT,
                deadline_date TEXT NOT NULL,
                applicable_to TEXT DEFAULT 'ALL',
                frequency TEXT CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME')),
                legal_reference TEXT,
                reminder_days TEXT DEFAULT '[7, 3, 1]',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_deadline_type ON deadline_calendar(deadline_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_deadline_date ON deadline_calendar(deadline_date)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_deadline_active ON deadline_calendar(is_active)")

        # ════════════════════════════════════════════════════════════════
        # CARİ MUTABAKAT - Cari Hesap Ekstre Karşılaştırma (IS-5)
        # SMMM'nin müşteri/tedarikçi cari hesap ekstrelerini yükleyip
        # mizan 120/320 alt hesapları ile karşılaştırma
        # Mevzuat: VUK Md. 177 (bilanço esası), TTK Md. 64 (envanter),
        #          VUK Md. 323 (şüpheli alacak karşılığı)
        # TDHP: 120 Alıcılar, 320 Satıcılar, 128 Şüpheli Ticari Alacaklar
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cari_ekstreler (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                cari_hesap_kodu TEXT NOT NULL,
                karsi_taraf TEXT,
                ekstre_bakiye REAL DEFAULT 0,
                mizan_bakiye REAL DEFAULT 0,
                fark REAL DEFAULT 0,
                fark_yuzde REAL DEFAULT 0,
                durum TEXT DEFAULT 'beklemede' CHECK (durum IN (
                    'beklemede', 'uyumlu', 'farkli', 'onaylandi'
                )),
                aging_gun INTEGER DEFAULT 0,
                supheli_alacak_riski INTEGER DEFAULT 0,
                onaylayan TEXT,
                onay_tarihi TEXT,
                source_file TEXT,
                uploaded_at TEXT DEFAULT (datetime('now')),
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cari_ekstreler_client_period ON cari_ekstreler(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cari_ekstreler_hesap ON cari_ekstreler(cari_hesap_kodu)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cari_ekstreler_durum ON cari_ekstreler(durum)")

        # ════════════════════════════════════════════════════════════════
        # CHECKLIST PROGRESS - Kontrol Listesi İlerleme Takibi
        # SMMM'lerin mükellef+dönem bazında checklist durumlarını saklar
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                checklist_id TEXT NOT NULL,
                item_index INTEGER NOT NULL,
                checked INTEGER DEFAULT 0,
                checked_by TEXT,
                checked_at TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                UNIQUE(client_id, period_id, checklist_id, item_index)
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_checklist_client_period ON checklist_progress(client_id, period_id, checklist_id)")

        # ════════════════════════════════════════════════════════════════
        # GENERATED REPORTS - Üretilen Rapor Arşivi
        # Big4+ kalite raporların kalıcı saklanması
        # ════════════════════════════════════════════════════════════════
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS generated_reports (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL,
                period_id TEXT NOT NULL,
                report_type TEXT NOT NULL,
                format TEXT DEFAULT 'PDF',
                file_path TEXT,
                file_size INTEGER,
                content_hash TEXT,
                generated_by TEXT,
                generated_at TEXT DEFAULT (datetime('now')),
                metadata TEXT DEFAULT '{}'
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_generated_reports_client ON generated_reports(client_id, period_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type)")

        # ================================================================
        # INGEST SYSTEM TABLES (Sprint: Veri Giriş Yeniden Tasarım)
        # ================================================================

        # Upload oturumu (her ZIP/dosya yükleme bir session)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS upload_sessions (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_code TEXT NOT NULL,
                source_filename TEXT,
                total_files INTEGER DEFAULT 0,
                new_files INTEGER DEFAULT 0,
                duplicate_files INTEGER DEFAULT 0,
                status TEXT DEFAULT 'pending',
                error_message TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                completed_at TEXT
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_upload_sessions_client ON upload_sessions(client_id, period_code)")

        # Yüklenen her dosyanın kaydı (tek tek silinebilir)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id TEXT PRIMARY KEY,
                session_id TEXT REFERENCES upload_sessions(id),
                tenant_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                period_code TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                file_hash_sha256 TEXT NOT NULL,
                file_size INTEGER,
                mime_type TEXT,
                stored_path TEXT,
                parse_status TEXT DEFAULT 'pending',
                parse_error TEXT,
                parsed_row_count INTEGER DEFAULT 0,
                is_duplicate BOOLEAN DEFAULT 0,
                duplicate_of_id TEXT,
                duplicate_in_period TEXT,
                period_validation_status TEXT,
                period_validation_detail TEXT,
                is_deleted BOOLEAN DEFAULT 0,
                deleted_at TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_uploaded_files_client ON uploaded_files(client_id, period_code) WHERE is_deleted = 0")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_uploaded_files_hash ON uploaded_files(file_hash_sha256) WHERE is_deleted = 0")
        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_uploaded_files_dedup
            ON uploaded_files(client_id, period_code, file_hash_sha256)
            WHERE is_deleted = 0 AND is_duplicate = 0
        """)

        # === source_file_id sütununu veri tablolarına ekle (dosya bazında silme için) ===
        _source_file_tables = [
            "mizan_entries", "bank_transactions", "journal_entries",
            "ledger_entries", "edefter_entries", "beyanname_entries",
            "tahakkuk_entries",
        ]
        for _tbl in _source_file_tables:
            try:
                cursor.execute(f"ALTER TABLE {_tbl} ADD COLUMN source_file_id TEXT")
            except Exception:
                pass  # Column already exists

        conn.commit()
        logger.info(f"Database initialized: {DB_PATH}")


def rebuild_fts_index():
    """Rebuild the FTS5 index for mevzuat_refs from scratch"""
    with get_connection() as conn:
        cursor = conn.cursor()
        # Delete all FTS content
        cursor.execute("INSERT INTO mevzuat_refs_fts(mevzuat_refs_fts) VALUES('delete-all')")
        # Re-populate from source table
        cursor.execute("""
            INSERT INTO mevzuat_refs_fts(rowid, baslik, kisa_aciklama, tam_metin)
            SELECT rowid, baslik, kisa_aciklama, tam_metin FROM mevzuat_refs
        """)
        conn.commit()
        count = cursor.execute("SELECT COUNT(*) FROM mevzuat_refs").fetchone()[0]
        logger.info(f"FTS5 index rebuilt: {count} records indexed")
        return count


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
