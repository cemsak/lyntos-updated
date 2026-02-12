# -*- coding: utf-8 -*-
"""
Tests for ingest pipeline — classify_file, garbage detection, SHA256 dedupe
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.ingest_service import (
    IngestService,
    RawFile,
    DOC_TYPE_PATTERNS,
    DEFAULT_GARBAGE_PATTERNS,
)


# ═══════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════

def _make_raw_file(
    filename: str,
    path: str = None,
    ext: str = None,
    content: bytes = b"test",
) -> RawFile:
    """Create a minimal RawFile for testing"""
    if path is None:
        path = filename
    if ext is None:
        ext = Path(filename).suffix.lower()

    return RawFile(
        id="test-id",
        original_path=path,
        original_filename=filename,
        file_extension=ext,
        size_bytes=len(content),
        sha256_hash="abc123",
        md5_hash="def456",
        content=content,
        source_zip_filename="test.zip",
    )


@pytest.fixture
def ingest_service(tmp_path):
    """IngestService with temp paths"""
    db_path = tmp_path / "test.db"
    blob_path = tmp_path / "blobs"
    # We don't need a real DB for classification tests
    return IngestService(db_path, blob_path)


# ═══════════════════════════════════════════════════════════════
# _classify_file
# ═══════════════════════════════════════════════════════════════

class TestClassifyFile:
    def test_mizan_xlsx(self, ingest_service):
        rf = _make_raw_file("Q1 OZKAN MIZAN.xlsx", ext=".xlsx")
        assert ingest_service._classify_file(rf) == "MIZAN"

    def test_mizan_case_insensitive(self, ingest_service):
        rf = _make_raw_file("mizan_detay.xlsx", ext=".xlsx")
        assert ingest_service._classify_file(rf) == "MIZAN"

    def test_yevmiye_defteri(self, ingest_service):
        rf = _make_raw_file("yevmiye_defteri_ozkan.xlsx", ext=".xlsx")
        assert ingest_service._classify_file(rf) == "YEVMIYE_DEFTERI"

    def test_defteri_kebir(self, ingest_service):
        rf = _make_raw_file("defteri_kebir_ozkan.xlsx", ext=".xlsx")
        assert ingest_service._classify_file(rf) == "DEFTERI_KEBIR"

    def test_edefter_yevmiye_xml(self, ingest_service):
        rf = _make_raw_file("0480525636-202501-Y-000000.xml", ext=".xml")
        assert ingest_service._classify_file(rf) == "EDEFTER_YEVMIYE"

    def test_edefter_kebir_xml(self, ingest_service):
        rf = _make_raw_file("0480525636-202501-K-000000.xml", ext=".xml")
        assert ingest_service._classify_file(rf) == "EDEFTER_KEBIR"

    def test_edefter_yevmiye_berat(self, ingest_service):
        rf = _make_raw_file("0480525636-202501-YB-000000.xml", ext=".xml")
        assert ingest_service._classify_file(rf) == "EDEFTER_YEVMIYE_BERAT"

    def test_edefter_kebir_berat(self, ingest_service):
        rf = _make_raw_file("GIB-0480525636-202501-KB-000000.xml", ext=".xml")
        assert ingest_service._classify_file(rf) == "EDEFTER_KEBIR_BERAT"

    def test_edefter_defter_raporu(self, ingest_service):
        rf = _make_raw_file("0480525636-202501-DR-000000.xml", ext=".xml")
        assert ingest_service._classify_file(rf) == "EDEFTER_DEFTER_RAPORU"

    def test_beyanname_kdv(self, ingest_service):
        rf = _make_raw_file("OZKAN KIRT_OCAK_KDV(AYLIK).xml_BYN.pdf", ext=".pdf")
        assert ingest_service._classify_file(rf) == "BEYANNAME_KDV"

    def test_beyanname_muhtasar(self, ingest_service):
        rf = _make_raw_file("OZKAN KIRT_OCAK_Muhtasar(AYLIK).xml_BYN.pdf", ext=".pdf")
        assert ingest_service._classify_file(rf) == "BEYANNAME_MUHTASAR"

    def test_tahakkuk_kdv(self, ingest_service):
        rf = _make_raw_file("OZKAN KIRT_OCAK_KDV(AYLIK).xml_THK.pdf", ext=".pdf")
        assert ingest_service._classify_file(rf) == "TAHAKKUK_KDV"

    def test_tahakkuk_muhtasar(self, ingest_service):
        rf = _make_raw_file("OZKAN KIRT_OCAK_Muhtasar(AYLIK).xml_THK.pdf", ext=".pdf")
        assert ingest_service._classify_file(rf) == "TAHAKKUK_MUHTASAR"

    def test_banka_csv_hesap_kodu(self, ingest_service):
        rf = _make_raw_file("102.01 YKB 01.csv", ext=".csv")
        assert ingest_service._classify_file(rf) == "BANKA"

    def test_banka_csv_bank_name(self, ingest_service):
        rf = _make_raw_file("AKBANK 1-2-3.csv", ext=".csv")
        assert ingest_service._classify_file(rf) == "BANKA"

    def test_banka_ziraat(self, ingest_service):
        rf = _make_raw_file("ZIRAATBANK 7. AY.csv", ext=".csv")
        assert ingest_service._classify_file(rf) == "BANKA"

    def test_gecici_vergi(self, ingest_service):
        rf = _make_raw_file("OZKAN_MART_KGecici(UC_AYLIK).xml_BYN.pdf", ext=".pdf")
        assert ingest_service._classify_file(rf) == "GECICI_VERGI"

    def test_poset(self, ingest_service):
        rf = _make_raw_file("OZKAN_OCAK_Poset(UC_AYLIK).xml_BYN.pdf", ext=".pdf")
        assert ingest_service._classify_file(rf) == "POSET"

    def test_unknown_csv(self, ingest_service):
        rf = _make_raw_file("random_data.csv", ext=".csv")
        assert ingest_service._classify_file(rf) == "UNKNOWN_TABULAR"

    def test_unknown_pdf(self, ingest_service):
        rf = _make_raw_file("random_document.pdf", ext=".pdf")
        assert ingest_service._classify_file(rf) == "UNKNOWN_PDF"

    def test_unknown_xml(self, ingest_service):
        rf = _make_raw_file("random.xml", ext=".xml", content=b"<root>nothing</root>")
        assert ingest_service._classify_file(rf) == "UNKNOWN_XML"

    def test_other_extension(self, ingest_service):
        rf = _make_raw_file("readme.txt", ext=".txt")
        assert ingest_service._classify_file(rf) == "OTHER"

    def test_xml_content_fallback_yevmiye(self, ingest_service):
        """XML content-based detection for yevmiye"""
        xml_content = b'<?xml version="1.0"?><gl:yevmiyeFisi>...</gl:yevmiyeFisi>'
        rf = _make_raw_file("unknown.xml", ext=".xml", content=xml_content)
        assert ingest_service._classify_file(rf) == "EDEFTER_YEVMIYE"

    def test_xml_content_fallback_kebir(self, ingest_service):
        """XML content-based detection for kebir"""
        xml_content = b'<?xml version="1.0"?><gl:defterKebir>...</gl:defterKebir>'
        rf = _make_raw_file("unknown.xml", ext=".xml", content=xml_content)
        assert ingest_service._classify_file(rf) == "EDEFTER_KEBIR"


# ═══════════════════════════════════════════════════════════════
# _is_garbage
# ═══════════════════════════════════════════════════════════════

class TestIsGarbage:
    def test_ds_store(self, ingest_service):
        rf = _make_raw_file(".DS_Store")
        is_g, reason = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is True
        assert "macOS" in reason

    def test_thumbs_db(self, ingest_service):
        rf = _make_raw_file("Thumbs.db")
        is_g, _ = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is True

    def test_macosx_path(self, ingest_service):
        rf = _make_raw_file("file.pdf", path="__MACOSX/._file.pdf")
        is_g, reason = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is True

    def test_xslt_extension(self, ingest_service):
        rf = _make_raw_file("berat.xslt", ext=".xslt")
        is_g, _ = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is True

    def test_hidden_file(self, ingest_service):
        rf = _make_raw_file(".hidden_config")
        is_g, reason = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is True
        assert "Hidden" in reason

    def test_office_temp_file(self, ingest_service):
        rf = _make_raw_file("~$document.xlsx")
        is_g, _ = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is True

    def test_normal_file_not_garbage(self, ingest_service):
        rf = _make_raw_file("mizan_2025.xlsx", ext=".xlsx")
        is_g, reason = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is False
        assert reason is None

    def test_pdf_not_garbage(self, ingest_service):
        rf = _make_raw_file("beyanname.pdf", ext=".pdf")
        is_g, _ = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is False

    def test_log_extension(self, ingest_service):
        rf = _make_raw_file("debug.log", ext=".log")
        is_g, _ = ingest_service._is_garbage(rf, DEFAULT_GARBAGE_PATTERNS)
        assert is_g is True
