"""
LYNTOS Backend Test Configuration
Virgosol Standard: Isolated, Deterministic, Fast

Shared fixtures for all tests
"""

import pytest
import sqlite3
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Generator, List

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from schemas.feed import (
    FeedItem, FeedScope, FeedImpact, EvidenceRef, FeedAction,
    FeedCategory, FeedSeverity, EvidenceStatus, ActionStatus
)

# Test database path
TEST_DB_PATH = str(backend_path / "database" / "test_lyntos.db")


@pytest.fixture(scope="session")
def test_db():
    """Create a test database for the session"""
    # Remove old test db if exists
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)

    # Create test database with same schema
    conn = sqlite3.connect(TEST_DB_PATH)

    # Create essential tables
    conn.executescript("""
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
        );

        CREATE TABLE IF NOT EXISTS document_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            period_id TEXT NOT NULL,
            doc_type TEXT NOT NULL,
            original_filename TEXT,
            stored_path TEXT,
            content_hash_sha256 TEXT,
            parse_status TEXT DEFAULT 'PENDING',
            parser_name TEXT,
            metadata TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS kdv_beyanname_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            period_id TEXT NOT NULL,
            matrah REAL DEFAULT 0,
            hesaplanan_kdv REAL DEFAULT 0,
            indirilecek_kdv REAL DEFAULT 0,
            odenecek_kdv REAL DEFAULT 0,
            devreden_kdv REAL DEFAULT 0,
            source_file TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, client_id, period_id)
        );

        CREATE TABLE IF NOT EXISTS tahakkuk_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            period_id TEXT NOT NULL,
            vergi_turu TEXT NOT NULL,
            tahakkuk_tutari REAL DEFAULT 0,
            gecikme_faizi REAL DEFAULT 0,
            toplam_borc REAL DEFAULT 0,
            source_file TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, client_id, period_id, vergi_turu)
        );

        CREATE TABLE IF NOT EXISTS banka_bakiye_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            client_id TEXT NOT NULL,
            period_id TEXT NOT NULL,
            banka_adi TEXT NOT NULL,
            hesap_no TEXT,
            donem_basi_bakiye REAL DEFAULT 0,
            donem_sonu_bakiye REAL DEFAULT 0,
            source_file TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id, client_id, period_id, banka_adi, hesap_no)
        );
    """)

    conn.commit()
    conn.close()

    yield TEST_DB_PATH

    # Cleanup
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


@pytest.fixture
def db_connection(test_db):
    """Get a database connection for each test with clean tables"""
    conn = sqlite3.connect(test_db)
    conn.row_factory = sqlite3.Row

    # Clean all tables before each test
    cursor = conn.cursor()
    cursor.execute("DELETE FROM mizan_entries")
    cursor.execute("DELETE FROM kdv_beyanname_data")
    cursor.execute("DELETE FROM tahakkuk_data")
    cursor.execute("DELETE FROM banka_bakiye_data")
    cursor.execute("DELETE FROM document_uploads")
    conn.commit()

    yield conn
    conn.close()


@pytest.fixture
def sample_mizan_data():
    """Sample mizan entries for testing"""
    return [
        {
            "hesap_kodu": "100",
            "hesap_adi": "Kasa",
            "borc_toplam": 10000,
            "alacak_toplam": 5000,
            "borc_bakiye": 5000,
            "alacak_bakiye": 0,
        },
        {
            "hesap_kodu": "102",
            "hesap_adi": "Bankalar",
            "borc_toplam": 50000,
            "alacak_toplam": 20000,
            "borc_bakiye": 30000,
            "alacak_bakiye": 0,
        },
        {
            "hesap_kodu": "120",
            "hesap_adi": "Alicilar",
            "borc_toplam": 25000,
            "alacak_toplam": 10000,
            "borc_bakiye": 15000,
            "alacak_bakiye": 0,
        },
        {
            "hesap_kodu": "320",
            "hesap_adi": "Saticilar",
            "borc_toplam": 5000,
            "alacak_toplam": 30000,
            "borc_bakiye": 0,
            "alacak_bakiye": 25000,
        },
        {
            "hesap_kodu": "391",
            "hesap_adi": "Hesaplanan KDV",
            "borc_toplam": 0,
            "alacak_toplam": 18000,
            "borc_bakiye": 0,
            "alacak_bakiye": 18000,
        },
        {
            "hesap_kodu": "600",
            "hesap_adi": "Satislar",
            "borc_toplam": 0,
            "alacak_toplam": 100000,
            "borc_bakiye": 0,
            "alacak_bakiye": 100000,
        },
        {
            "hesap_kodu": "770",
            "hesap_adi": "Genel Yonetim Giderleri",
            "borc_toplam": 20000,
            "alacak_toplam": 0,
            "borc_bakiye": 20000,
            "alacak_bakiye": 0,
        },
    ]


@pytest.fixture
def sample_kdv_data():
    """Sample KDV beyanname data for testing"""
    return {
        "matrah": 100000,
        "hesaplanan_kdv": 18000,
        "indirilecek_kdv": 12000,
        "odenecek_kdv": 6000,
        "devreden_kdv": 0,
    }


@pytest.fixture
def sample_banka_data():
    """Sample banka bakiye data for testing"""
    return [
        {
            "banka_adi": "Garanti",
            "hesap_no": "123456",
            "donem_basi_bakiye": 20000,
            "donem_sonu_bakiye": 30000,
        },
        {
            "banka_adi": "Akbank",
            "hesap_no": "789012",
            "donem_basi_bakiye": 10000,
            "donem_sonu_bakiye": 5000,
        },
    ]


# ============== SCOPE FIXTURES ==============

@pytest.fixture
def sample_scope() -> FeedScope:
    """Standard test scope"""
    return FeedScope(
        smmm_id="TEST-SMMM-001",
        client_id="TEST-CLIENT-001",
        period="2024-Q1"
    )


@pytest.fixture
def sample_scope_q2() -> FeedScope:
    """Q2 test scope"""
    return FeedScope(
        smmm_id="TEST-SMMM-001",
        client_id="TEST-CLIENT-001",
        period="2024-Q2"
    )


# ============== EVIDENCE FIXTURES ==============

@pytest.fixture
def evidence_available() -> EvidenceRef:
    """Available evidence fixture"""
    return EvidenceRef(
        ref_id="EVD-TEST-001",
        source_type="mizan",
        description="Test Mizan Q1 2024",
        status=EvidenceStatus.AVAILABLE,
        account_code="191",
        file_path="mizan_q1_2024.xlsx"
    )


@pytest.fixture
def evidence_missing() -> EvidenceRef:
    """Missing evidence fixture"""
    return EvidenceRef(
        ref_id="EVD-TEST-002",
        source_type="beyan",
        description="KDV Beyannamesi",
        status=EvidenceStatus.MISSING
    )


@pytest.fixture
def evidence_list(evidence_available, evidence_missing) -> List[EvidenceRef]:
    """Mixed evidence list"""
    return [evidence_available, evidence_missing]


# ============== ACTION FIXTURES ==============

@pytest.fixture
def action_pending() -> FeedAction:
    """Pending action fixture"""
    return FeedAction(
        action_id="ACT-TEST-001",
        description="Beyanname yukleyin",
        responsible="SMMM",
        status=ActionStatus.PENDING,
        priority=1
    )


@pytest.fixture
def action_completed() -> FeedAction:
    """Completed action fixture"""
    return FeedAction(
        action_id="ACT-TEST-002",
        description="Mizan kontrolu",
        responsible="Sistem",
        status=ActionStatus.COMPLETED,
        priority=2
    )


# ============== FEED ITEM FIXTURES ==============

@pytest.fixture
def feed_item_critical(sample_scope, evidence_available, evidence_missing, action_pending) -> FeedItem:
    """Critical severity feed item"""
    return FeedItem(
        id="FEED-TEST-CRIT-001",
        scope=sample_scope,
        category=FeedCategory.VDK,
        severity=FeedSeverity.CRITICAL,
        score=95,
        impact=FeedImpact(amount_try=125000.0, points=15),
        title="KDV Beyanname-Mizan Uyumsuzlugu",
        summary="KDV beyannamesi ile mizan arasinda 125.000 TL fark tespit edildi.",
        why="191 Hesap bakiyesi ile KDV beyannamesi tutarsiz. VDK 2.1.3 kontrolu basarisiz.",
        evidence_refs=[evidence_available, evidence_missing],
        actions=[action_pending]
    )


@pytest.fixture
def feed_item_high(sample_scope, evidence_available, action_pending) -> FeedItem:
    """High severity feed item"""
    return FeedItem(
        id="FEED-TEST-HIGH-001",
        scope=sample_scope,
        category=FeedCategory.MUTABAKAT,
        severity=FeedSeverity.HIGH,
        score=82,
        impact=FeedImpact(amount_try=45000.0),
        title="Banka Mutabakat Farki",
        summary="Banka hesabi ile ekstre arasinda fark.",
        why="3 adet islem eslesmedi.",
        evidence_refs=[evidence_available],
        actions=[action_pending]
    )


@pytest.fixture
def feed_item_medium(sample_scope, evidence_available, action_pending) -> FeedItem:
    """Medium severity feed item"""
    return FeedItem(
        id="FEED-TEST-MED-001",
        scope=sample_scope,
        category=FeedCategory.BELGE,
        severity=FeedSeverity.MEDIUM,
        score=65,
        impact=FeedImpact(points=5),
        title="Eksik E-Fatura",
        summary="3 adet gider faturasi bulunamadi.",
        why="Mizan 770 hesabindaki kayitlar e-fatura ile eslesmedi.",
        evidence_refs=[evidence_available],
        actions=[action_pending]
    )


@pytest.fixture
def feed_item_mevzuat(sample_scope, evidence_available, action_pending) -> FeedItem:
    """Mevzuat category feed item"""
    return FeedItem(
        id="FEED-TEST-MEVZUAT-001",
        scope=sample_scope,
        category=FeedCategory.MEVZUAT,
        severity=FeedSeverity.HIGH,
        score=78,
        impact=FeedImpact(points=10),
        title="KDV Oran Degisikligi",
        summary="Yeni KDV oranlari yururlukte.",
        why="7491 sayili Kanun ile KDV oranlari guncellendi.",
        evidence_refs=[evidence_available],
        actions=[action_pending]
    )


@pytest.fixture
def feed_items_mixed(feed_item_critical, feed_item_high, feed_item_medium, feed_item_mevzuat) -> List[FeedItem]:
    """Mixed severity feed items list"""
    return [feed_item_critical, feed_item_high, feed_item_medium, feed_item_mevzuat]


@pytest.fixture
def feed_items_critical_high(feed_item_critical, feed_item_high) -> List[FeedItem]:
    """Only CRITICAL and HIGH items"""
    return [feed_item_critical, feed_item_high]


# ============== SERVICE FIXTURES ==============

@pytest.fixture
def feed_service():
    """Fresh feed service instance"""
    from services.feed import FeedService
    return FeedService()


@pytest.fixture
def evidence_bundle_service(tmp_path):
    """Evidence bundle service with temp output"""
    from services.evidence_bundle import EvidenceBundleService
    return EvidenceBundleService(output_dir=str(tmp_path))


@pytest.fixture
def brief_service():
    """Brief service instance"""
    from services.brief import BriefService
    return BriefService()


@pytest.fixture
def dossier_service(tmp_path):
    """Dossier service with temp output"""
    from services.dossier import DossierService
    return DossierService(output_dir=str(tmp_path))


# ============== API TEST FIXTURES ==============

@pytest.fixture
def test_client():
    """FastAPI test client with auth dependency override"""
    from fastapi.testclient import TestClient
    from main import app
    from middleware.auth import verify_token

    async def mock_verify_token():
        return {
            "id": "TEST-ADMIN",
            "name": "Test Admin",
            "email": "test@lyntos.dev",
            "role": "admin",
            "smmm_id": "TEST-ADMIN"
        }

    app.dependency_overrides[verify_token] = mock_verify_token
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ============== CLEANUP ==============

@pytest.fixture(autouse=True)
def cleanup_singletons():
    """Reset singletons and clean feed_items between tests"""
    # Clean feed_items before each test for isolation
    try:
        from database.db import get_connection
        with get_connection() as conn:
            conn.execute("DELETE FROM feed_items")
            conn.commit()
    except Exception:
        pass

    yield

    # Reset service singletons
    import services.feed.service as feed_mod
    import services.evidence_bundle.service as bundle_mod
    import services.brief.service as brief_mod
    import services.dossier.service as dossier_mod

    feed_mod._feed_service = None
    bundle_mod._service = None
    brief_mod._service = None
    dossier_mod._service = None
