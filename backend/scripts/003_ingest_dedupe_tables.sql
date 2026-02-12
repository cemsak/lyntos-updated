-- ============================================================================
-- LYNTOS Ingest & Dedupe Tables
-- Tavsiye Mektubu 3: Multi-format Ingest + Canonicalization
-- ============================================================================
-- Prensip: "Silme yok, Kanıt kaybı yok"
-- 3 Katman: Acquisition → Classification → Canonicalization
-- 2 Seviye Dedupe: Blob (byte-identical) + Canonical (semantic-identical)
-- ============================================================================

-- ============================================================================
-- KATMAN A: RAW FILES (Acquisition Layer)
-- ZIP'ten çıkan her dosyanın kaydı - hiçbir şey silinmez
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw_files (
    id TEXT PRIMARY KEY,                    -- UUID

    -- İlişkiler
    tenant_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    period_id TEXT NOT NULL,
    upload_session_id TEXT NOT NULL,        -- Hangi upload batch'inde geldi

    -- Dosya bilgileri
    original_path TEXT NOT NULL,            -- ZIP içindeki orijinal path (a/b/c/file.xml)
    original_filename TEXT NOT NULL,        -- Sadece dosya adı
    file_extension TEXT,                    -- .xml, .pdf, .csv, etc.
    size_bytes INTEGER NOT NULL,

    -- Hash bilgileri
    sha256_hash TEXT NOT NULL,              -- Blob dedupe için anahtar
    md5_hash TEXT,                          -- Opsiyonel, hızlı karşılaştırma

    -- ZIP bilgileri
    source_zip_filename TEXT,               -- Ana ZIP dosya adı
    nested_zip_level INTEGER DEFAULT 0,     -- 0=ana ZIP, 1=iç ZIP, 2=iç içe ZIP...
    parent_zip_raw_file_id TEXT,            -- Eğer nested ise parent ZIP'in ID'si

    -- Durum
    is_garbage INTEGER DEFAULT 0,           -- .DS_Store, __MACOSX, Thumbs.db, etc.
    garbage_reason TEXT,                    -- Neden garbage olarak işaretlendi

    -- Metadata
    mime_type TEXT,
    encoding TEXT,                          -- Tespit edilen karakter encoding

    -- Timestamps
    received_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT,

    -- Foreign key to blob (after blob created)
    blob_id TEXT,

    FOREIGN KEY (parent_zip_raw_file_id) REFERENCES raw_files(id)
);

-- Indexes for raw_files
CREATE INDEX IF NOT EXISTS idx_raw_files_upload_session ON raw_files(upload_session_id);
CREATE INDEX IF NOT EXISTS idx_raw_files_sha256 ON raw_files(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_raw_files_client_period ON raw_files(client_id, period_id);
CREATE INDEX IF NOT EXISTS idx_raw_files_blob ON raw_files(blob_id);

-- ============================================================================
-- KATMAN B: BLOBS (Binary Large Objects - Byte-identical dedupe)
-- Aynı hash = Aynı blob. Dosya içeriği sadece 1 kez saklanır.
-- ============================================================================

CREATE TABLE IF NOT EXISTS blobs (
    id TEXT PRIMARY KEY,                    -- sha256_hash (content-addressable)

    -- Depolama
    stored_path TEXT NOT NULL,              -- Fiziksel dosya yolu
    size_bytes INTEGER NOT NULL,
    mime_type TEXT,

    -- İstatistik
    reference_count INTEGER DEFAULT 1,      -- Kaç raw_file bu blob'a işaret ediyor
    first_seen_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now')),

    -- Soft delete
    is_active INTEGER DEFAULT 1,
    deleted_at TEXT,
    deleted_reason TEXT
);

-- ============================================================================
-- KATMAN C: CANONICAL DOCUMENTS (Semantic dedupe)
-- Farklı format/isim ama aynı içerik = Aynı canonical doc
-- Örnek: Aynı e-defter, farklı ZIP'ten = tek canonical
-- ============================================================================

CREATE TABLE IF NOT EXISTS canonical_docs (
    id TEXT PRIMARY KEY,                    -- UUID

    -- İlişkiler
    tenant_id TEXT NOT NULL,
    client_id TEXT NOT NULL,

    -- Canonical identity
    doc_type TEXT NOT NULL,                 -- EDEFTER_YEVMIYE, EDEFTER_KEBIR, MIZAN, BANKA, etc.
    canonical_fingerprint TEXT NOT NULL,    -- Semantic hash (doc_type specific)

    -- Doc-type specific identifiers
    -- E-defter: VKN + dönem + defter tipi
    vkn TEXT,
    donem TEXT,                             -- 202501, 202502, etc.
    defter_tipi TEXT,                       -- Y (Yevmiye), K (Kebir), YB, KB

    -- Mizan: Client + Period
    -- Banka: Client + Period + Hesap Kodu + Banka
    hesap_kodu TEXT,
    banka_adi TEXT,

    -- Beyanname/Tahakkuk: Tip + Dönem + VKN
    beyanname_tipi TEXT,
    tahakkuk_no TEXT,

    -- Primary blob (en son/en güvenilir versiyon)
    primary_blob_id TEXT NOT NULL,

    -- İçerik özeti (debug/display için)
    content_summary TEXT,                   -- İlk 500 karakter veya satır sayısı
    record_count INTEGER,                   -- Parse sonrası kayıt sayısı

    -- Tarih aralığı (içerikten çıkarılan)
    date_min TEXT,
    date_max TEXT,

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    -- Soft delete
    is_active INTEGER DEFAULT 1,
    superseded_by TEXT,                     -- Daha yeni versiyon varsa
    superseded_at TEXT,
    superseded_reason TEXT,

    FOREIGN KEY (primary_blob_id) REFERENCES blobs(id),
    FOREIGN KEY (superseded_by) REFERENCES canonical_docs(id),

    -- Unique constraint: Aynı fingerprint = aynı doc
    UNIQUE (tenant_id, client_id, doc_type, canonical_fingerprint)
);

-- Indexes for canonical_docs
CREATE INDEX IF NOT EXISTS idx_canonical_docs_client ON canonical_docs(client_id);
CREATE INDEX IF NOT EXISTS idx_canonical_docs_type ON canonical_docs(doc_type);
CREATE INDEX IF NOT EXISTS idx_canonical_docs_fingerprint ON canonical_docs(canonical_fingerprint);
CREATE INDEX IF NOT EXISTS idx_canonical_docs_vkn_donem ON canonical_docs(vkn, donem);

-- ============================================================================
-- CANONICAL ALIASES (Aynı canonical doc'a işaret eden tüm blob'lar)
-- "Silme yok" prensibinin implementasyonu
-- ============================================================================

CREATE TABLE IF NOT EXISTS canonical_aliases (
    id TEXT PRIMARY KEY,                    -- UUID

    canonical_doc_id TEXT NOT NULL,
    blob_id TEXT NOT NULL,
    raw_file_id TEXT NOT NULL,              -- Hangi raw_file'dan geldi

    -- Alias bilgileri
    alias_filename TEXT NOT NULL,           -- Bu blob'un orijinal adı
    alias_path TEXT,                        -- ZIP içindeki path

    -- Sıralama
    is_primary INTEGER DEFAULT 0,           -- Primary blob mu?
    priority_score REAL DEFAULT 0,          -- Güvenilirlik skoru

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (canonical_doc_id) REFERENCES canonical_docs(id),
    FOREIGN KEY (blob_id) REFERENCES blobs(id),
    FOREIGN KEY (raw_file_id) REFERENCES raw_files(id),

    -- Unique: Bir blob sadece bir canonical'a bağlı olabilir (per tenant/client)
    UNIQUE (canonical_doc_id, blob_id)
);

-- Indexes for canonical_aliases
CREATE INDEX IF NOT EXISTS idx_canonical_aliases_doc ON canonical_aliases(canonical_doc_id);
CREATE INDEX IF NOT EXISTS idx_canonical_aliases_blob ON canonical_aliases(blob_id);

-- ============================================================================
-- UPLOAD SESSIONS (Batch tracking)
-- Her ZIP upload'u bir session
-- ============================================================================

CREATE TABLE IF NOT EXISTS upload_sessions (
    id TEXT PRIMARY KEY,                    -- UUID

    tenant_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    period_id TEXT NOT NULL,

    -- Upload bilgileri
    original_filename TEXT NOT NULL,        -- Upload edilen ZIP adı
    size_bytes INTEGER,
    sha256_hash TEXT,

    -- İstatistikler
    total_files_extracted INTEGER DEFAULT 0,
    garbage_files_count INTEGER DEFAULT 0,
    new_blobs_count INTEGER DEFAULT 0,
    duplicate_blobs_count INTEGER DEFAULT 0,
    new_canonical_docs_count INTEGER DEFAULT 0,
    updated_canonical_docs_count INTEGER DEFAULT 0,

    -- Durum
    status TEXT DEFAULT 'PENDING',          -- PENDING, PROCESSING, COMPLETED, FAILED
    error_message TEXT,

    -- Timestamps
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,

    -- Kullanıcı bilgisi
    uploaded_by TEXT
);

-- Index for upload_sessions
CREATE INDEX IF NOT EXISTS idx_upload_sessions_client_period ON upload_sessions(client_id, period_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);

-- ============================================================================
-- GARBAGE PATTERNS (Otomatik çöp dosya tespiti)
-- ============================================================================

CREATE TABLE IF NOT EXISTS garbage_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    pattern_type TEXT NOT NULL,             -- FILENAME, EXTENSION, PATH_CONTAINS
    pattern TEXT NOT NULL,                  -- Regex veya exact match
    is_regex INTEGER DEFAULT 0,

    reason TEXT NOT NULL,                   -- Neden çöp

    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Default garbage patterns
INSERT OR IGNORE INTO garbage_patterns (pattern_type, pattern, is_regex, reason) VALUES
    ('FILENAME', '.DS_Store', 0, 'macOS system file'),
    ('FILENAME', 'Thumbs.db', 0, 'Windows thumbnail cache'),
    ('FILENAME', 'desktop.ini', 0, 'Windows folder settings'),
    ('PATH_CONTAINS', '__MACOSX', 0, 'macOS resource fork'),
    ('PATH_CONTAINS', '.Spotlight-', 0, 'macOS Spotlight index'),
    ('EXTENSION', '.xslt', 0, 'Stylesheet file'),
    ('EXTENSION', '.xsd', 0, 'Schema file'),
    ('EXTENSION', '.id', 0, 'ID file'),
    ('FILENAME', '.gitkeep', 0, 'Git placeholder'),
    ('FILENAME', '.gitignore', 0, 'Git ignore file'),
    ('EXTENSION', '.log', 0, 'Log file'),
    ('EXTENSION', '.tmp', 0, 'Temporary file'),
    ('EXTENSION', '.bak', 0, 'Backup file');

-- ============================================================================
-- CANONICAL FINGERPRINT RULES (Doc type başına fingerprint hesaplama)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fingerprint_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    doc_type TEXT NOT NULL UNIQUE,

    -- Fingerprint hesaplama kuralları (JSON)
    -- Örnek: {"fields": ["vkn", "donem", "defter_tipi"], "hash_content": false}
    fingerprint_config TEXT NOT NULL,

    description TEXT,

    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Default fingerprint rules
INSERT OR IGNORE INTO fingerprint_rules (doc_type, fingerprint_config, description) VALUES
    ('EDEFTER_YEVMIYE', '{"fields": ["vkn", "donem"], "suffix": "Y"}', 'VKN + Dönem + Y'),
    ('EDEFTER_KEBIR', '{"fields": ["vkn", "donem"], "suffix": "K"}', 'VKN + Dönem + K'),
    ('EDEFTER_YEVMIYE_BERAT', '{"fields": ["vkn", "donem"], "suffix": "YB"}', 'VKN + Dönem + YB'),
    ('EDEFTER_KEBIR_BERAT', '{"fields": ["vkn", "donem"], "suffix": "KB"}', 'VKN + Dönem + KB'),
    ('MIZAN', '{"fields": ["client_id", "period_id"], "hash_content": true}', 'Client + Period + Content Hash'),
    ('BANKA', '{"fields": ["client_id", "period_id", "hesap_kodu", "banka_adi"]}', 'Client + Period + Hesap + Banka'),
    ('BEYANNAME_KDV', '{"fields": ["vkn", "donem_yil", "donem_ay", "beyanname_tipi"]}', 'VKN + Dönem + Tip'),
    ('BEYANNAME_MUHTASAR', '{"fields": ["vkn", "donem_yil", "donem_ay", "beyanname_tipi"]}', 'VKN + Dönem + Tip'),
    ('TAHAKKUK', '{"fields": ["vkn", "tahakkuk_no"], "fallback": ["vkn", "donem_yil", "donem_ay", "tahakkuk_tipi"]}', 'VKN + Tahakkuk No (veya Dönem+Tip)');

-- ============================================================================
-- VIEW: Duplicate Report (Debug/Monitoring için)
-- ============================================================================

CREATE VIEW IF NOT EXISTS v_duplicate_report AS
SELECT
    cd.doc_type,
    cd.client_id,
    cd.canonical_fingerprint,
    COUNT(ca.id) as alias_count,
    GROUP_CONCAT(ca.alias_filename, ' | ') as filenames,
    cd.created_at
FROM canonical_docs cd
LEFT JOIN canonical_aliases ca ON cd.id = ca.canonical_doc_id
WHERE cd.is_active = 1
GROUP BY cd.id
HAVING alias_count > 1
ORDER BY alias_count DESC;

-- ============================================================================
-- VIEW: Upload Session Summary
-- ============================================================================

CREATE VIEW IF NOT EXISTS v_upload_summary AS
SELECT
    us.id,
    us.client_id,
    us.period_id,
    us.original_filename,
    us.status,
    us.total_files_extracted,
    us.garbage_files_count,
    us.new_blobs_count,
    us.duplicate_blobs_count,
    us.new_canonical_docs_count,
    us.updated_canonical_docs_count,
    (us.total_files_extracted - us.garbage_files_count) as processable_files,
    ROUND(100.0 * us.duplicate_blobs_count / NULLIF(us.total_files_extracted - us.garbage_files_count, 0), 1) as dedupe_rate,
    us.started_at,
    us.completed_at
FROM upload_sessions us
ORDER BY us.started_at DESC;
