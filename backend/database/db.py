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

        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_regwatch_status ON regwatch_events(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_regwatch_source ON regwatch_events(source)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_regwatch_detected ON regwatch_events(detected_at)")

        conn.commit()
        logger.info(f"Database initialized: {DB_PATH}")


# Initialize on import
init_database()
