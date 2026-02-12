# -*- coding: utf-8 -*-
"""
LYNTOS Ingest Service
======================

Tavsiye Mektubu 3: Multi-format Ingest + Canonicalization

3 Katmanlı Mimari:
- Katman A: Acquisition (ZIP extraction, garbage filtering)
- Katman B: Classification (document type detection)
- Katman C: Canonicalization + Dedupe (blob + semantic dedupe)

Prensip: "Silme yok, Kanıt kaybı yok"

Author: Claude
Date: 2026-01-25
"""

import hashlib
import json
import logging
import os
import re
import sqlite3
import tempfile
import uuid
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import shutil

logger = logging.getLogger(__name__)

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class RawFile:
    """ZIP'ten çıkan ham dosya"""
    id: str
    original_path: str
    original_filename: str
    file_extension: str
    size_bytes: int
    sha256_hash: str
    md5_hash: str
    content: bytes  # Geçici - DB'ye yazıldıktan sonra temizlenir
    source_zip_filename: str
    nested_zip_level: int = 0
    parent_zip_raw_file_id: Optional[str] = None
    is_garbage: bool = False
    garbage_reason: Optional[str] = None
    mime_type: Optional[str] = None
    encoding: Optional[str] = None


@dataclass
class Blob:
    """Byte-identical content (dedupe unit)"""
    id: str  # SHA256 hash
    stored_path: str
    size_bytes: int
    mime_type: Optional[str] = None
    reference_count: int = 1
    is_new: bool = True  # Bu session'da yeni mi oluşturuldu


@dataclass
class CanonicalDoc:
    """Semantic-identical document"""
    id: str
    doc_type: str
    canonical_fingerprint: str
    primary_blob_id: str
    content_summary: Optional[str] = None
    record_count: int = 0
    date_min: Optional[str] = None
    date_max: Optional[str] = None
    is_new: bool = True
    # Doc-type specific fields
    vkn: Optional[str] = None
    donem: Optional[str] = None
    defter_tipi: Optional[str] = None
    hesap_kodu: Optional[str] = None
    banka_adi: Optional[str] = None
    beyanname_tipi: Optional[str] = None
    tahakkuk_no: Optional[str] = None
    donem_ay: Optional[int] = None
    donem_yil: Optional[int] = None


@dataclass
class IngestResult:
    """Upload session sonucu"""
    session_id: str
    status: str = "PENDING"
    error_message: Optional[str] = None

    # İstatistikler
    total_files_extracted: int = 0
    garbage_files_count: int = 0
    new_blobs_count: int = 0
    duplicate_blobs_count: int = 0
    new_canonical_docs_count: int = 0
    updated_canonical_docs_count: int = 0

    # Detaylı sonuçlar
    files: List[Dict[str, Any]] = field(default_factory=list)


# ============================================================================
# GARBAGE PATTERNS
# ============================================================================

# Hardcoded defaults (DB'den de yüklenebilir)
DEFAULT_GARBAGE_PATTERNS = {
    "FILENAME": {
        ".DS_Store": "macOS system file",
        "Thumbs.db": "Windows thumbnail cache",
        "desktop.ini": "Windows folder settings",
        ".gitkeep": "Git placeholder",
        ".gitignore": "Git ignore file",
    },
    "PATH_CONTAINS": {
        "__MACOSX": "macOS resource fork",
        ".Spotlight-": "macOS Spotlight index",
        ".Trashes": "macOS trash",
        "@eaDir": "Synology thumbnail",
    },
    "EXTENSION": {
        ".xslt": "Stylesheet file",
        ".xsd": "Schema file",
        ".id": "ID file",
        ".log": "Log file",
        ".tmp": "Temporary file",
        ".bak": "Backup file",
    },
    "STARTS_WITH": {
        ".": "Hidden file",
        "~$": "Office temp file",
    }
}


# ============================================================================
# DOCUMENT TYPE PATTERNS (Classification)
# ============================================================================

# Sıralı pattern listesi - daha spesifik olanlar önce
DOC_TYPE_PATTERNS = [
    # E-Defter (XML içeriğine de bakılacak)
    ("EDEFTER_YEVMIYE", [
        r"\d{10}-\d{6}-Y-\d+\.xml$",  # VKN-YYYYMM-Y-seq.xml
        r"yevmiye.*\.xml$",
    ]),
    ("EDEFTER_KEBIR", [
        r"\d{10}-\d{6}-K-\d+\.xml$",
        r"kebir.*\.xml$",
    ]),
    ("EDEFTER_YEVMIYE_BERAT", [
        r"\d{10}-\d{6}-YB-\d+\.xml$",
        r"GIB.*YB.*\.xml$",
    ]),
    ("EDEFTER_KEBIR_BERAT", [
        r"\d{10}-\d{6}-KB-\d+\.xml$",
        r"GIB.*KB.*\.xml$",
    ]),
    ("EDEFTER_DEFTER_RAPORU", [
        r"\d{10}-\d{6}-DR-\d+\.xml$",
    ]),

    # Mizan
    ("MIZAN", [
        r"mizan", r"mizn", r"MİZAN", r"trial.?balance",
    ]),

    # Defterler (Excel)
    ("YEVMIYE_DEFTERI", [
        r"yevmiye_defteri", r"yevmiye defteri", r"yevmiye\.xlsx?$",
    ]),
    ("DEFTERI_KEBIR", [
        r"defteri_kebir", r"kebir_defteri", r"kebir\.xlsx?$",
    ]),

    # Beyanname/Tahakkuk (PDF)
    ("POSET", [r"poset", r"Poset", r"POSET", r"poşet"]),
    ("GECICI_VERGI", [
        r"KGecici", r"k.?gecici", r"geçici.?vergi", r"gecici.?vergi",
    ]),
    ("BEYANNAME_KDV", [r"KDV.*BYN\.pdf$", r"kdv.*beyanname"]),
    ("BEYANNAME_MUHTASAR", [r"Muhtasar.*BYN\.pdf$", r"muhtasar.*beyanname"]),
    ("BEYANNAME", [r"_BYN\.pdf$", r"beyanname"]),
    ("TAHAKKUK_KDV", [r"KDV.*THK\.pdf$"]),
    ("TAHAKKUK_MUHTASAR", [r"Muhtasar.*THK\.pdf$"]),
    ("TAHAKKUK", [r"_THK\.pdf$", r"tahakkuk"]),

    # Banka
    ("BANKA", [
        r"^102\.", r"banka", r"ekstre",
        r"YKB", r"AKBANK", r"HALKBANK", r"ZİRAAT", r"ZIRAAT",
        r"GARANTİ", r"GARANTI", r"İŞ.?BANK", r"ISBANK",
        r"VAKIF", r"KUVEYT", r"QNB", r"ING", r"TEB", r"HSBC",
        r"ALBARAKA", r"DENİZ", r"DENIZ", r"YAPI.?KREDİ",
    ]),

    # E-Fatura Arşiv
    ("EFATURA_ARSIV", [
        r"e.?fatura", r"e.?arsiv", r"e.?arşiv",
    ]),
]


# ============================================================================
# INGEST SERVICE CLASS
# ============================================================================

class IngestService:
    """
    3 Katmanlı Ingest Pipeline

    Kullanım:
        service = IngestService(db_path, blob_storage_path)
        result = service.ingest_zip(
            zip_path=Path("Q1_2025.zip"),
            tenant_id="HKOZKAN",
            client_id="CLIENT_048_76E7913D",
            period_id="2025_Q1"
        )
    """

    def __init__(self, db_path: Path, blob_storage_path: Path):
        self.db_path = db_path
        self.blob_storage_path = blob_storage_path
        self.blob_storage_path.mkdir(parents=True, exist_ok=True)

        # Session-level cache
        self._garbage_patterns: Optional[Dict] = None
        self._fingerprint_rules: Optional[Dict] = None

    def _get_db(self) -> sqlite3.Connection:
        """Database bağlantısı"""
        conn = sqlite3.connect(str(self.db_path), timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _load_garbage_patterns(self, cursor: sqlite3.Cursor) -> Dict:
        """Garbage pattern'leri DB'den yükle"""
        if self._garbage_patterns is not None:
            return self._garbage_patterns

        patterns = {
            "FILENAME": {},
            "PATH_CONTAINS": {},
            "EXTENSION": {},
            "REGEX": [],
        }

        try:
            cursor.execute("""
                SELECT pattern_type, pattern, is_regex, reason
                FROM garbage_patterns
                WHERE is_active = 1
            """)
            for row in cursor.fetchall():
                if row['is_regex']:
                    patterns["REGEX"].append((re.compile(row['pattern']), row['reason']))
                elif row['pattern_type'] in patterns:
                    patterns[row['pattern_type']][row['pattern']] = row['reason']
        except Exception as e:
            logger.warning(f"Garbage patterns yüklenemedi, default kullanılıyor: {e}")
            return DEFAULT_GARBAGE_PATTERNS

        self._garbage_patterns = patterns
        return patterns

    def _load_fingerprint_rules(self, cursor: sqlite3.Cursor) -> Dict:
        """Fingerprint kurallarını DB'den yükle"""
        if self._fingerprint_rules is not None:
            return self._fingerprint_rules

        rules = {}
        try:
            cursor.execute("""
                SELECT doc_type, fingerprint_config
                FROM fingerprint_rules
                WHERE is_active = 1
            """)
            for row in cursor.fetchall():
                rules[row['doc_type']] = json.loads(row['fingerprint_config'])
        except Exception as e:
            logger.warning(f"Fingerprint rules yüklenemedi: {e}")

        self._fingerprint_rules = rules
        return rules

    # ========================================================================
    # KATMAN A: ACQUISITION
    # ========================================================================

    def _extract_zip_recursive(
        self,
        zip_path: Path,
        dest_dir: Path,
        source_zip_filename: str,
        parent_raw_file_id: Optional[str] = None,
        depth: int = 0,
        max_depth: int = 3
    ) -> List[RawFile]:
        """
        ZIP dosyasını recursive olarak aç.

        Returns:
            List of RawFile objects
        """
        if depth > max_depth:
            logger.warning(f"Max ZIP depth ({max_depth}) aşıldı: {zip_path}")
            return []

        raw_files = []

        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                for info in zf.infolist():
                    # Klasörleri atla
                    if info.is_dir():
                        continue

                    # Dosya bilgilerini al
                    original_path = info.filename
                    original_filename = Path(original_path).name
                    file_extension = Path(original_filename).suffix.lower()

                    # Dosya içeriğini oku
                    try:
                        content = zf.read(info)
                    except Exception as e:
                        logger.warning(f"Dosya okunamadı: {original_path}: {e}")
                        continue

                    # Hash hesapla
                    sha256_hash = hashlib.sha256(content).hexdigest()
                    md5_hash = hashlib.md5(content).hexdigest()

                    # RawFile oluştur
                    raw_file = RawFile(
                        id=str(uuid.uuid4()),
                        original_path=original_path,
                        original_filename=original_filename,
                        file_extension=file_extension,
                        size_bytes=len(content),
                        sha256_hash=sha256_hash,
                        md5_hash=md5_hash,
                        content=content,
                        source_zip_filename=source_zip_filename,
                        nested_zip_level=depth,
                        parent_zip_raw_file_id=parent_raw_file_id,
                    )

                    # Nested ZIP kontrolü
                    if file_extension == '.zip':
                        # Nested ZIP'i geçici dosyaya yaz
                        nested_zip_path = dest_dir / f"nested_{raw_file.id}.zip"
                        nested_zip_path.write_bytes(content)

                        # Recursive extract
                        nested_files = self._extract_zip_recursive(
                            zip_path=nested_zip_path,
                            dest_dir=dest_dir,
                            source_zip_filename=original_filename,
                            parent_raw_file_id=raw_file.id,
                            depth=depth + 1,
                            max_depth=max_depth
                        )
                        raw_files.extend(nested_files)

                        # Geçici ZIP'i sil
                        nested_zip_path.unlink(missing_ok=True)

                        # ZIP dosyasının kendisini de kaydet (garbage olarak işaretlenecek)
                        raw_file.is_garbage = True
                        raw_file.garbage_reason = "Nested ZIP (içeriği extract edildi)"
                        raw_file.content = b""  # İçeriği tutmaya gerek yok

                    raw_files.append(raw_file)

        except zipfile.BadZipFile as e:
            logger.error(f"Bozuk ZIP dosyası: {zip_path}: {e}")
            raise

        return raw_files

    def _is_garbage(self, raw_file: RawFile, patterns: Dict) -> Tuple[bool, Optional[str]]:
        """
        Dosyanın garbage olup olmadığını kontrol et.

        Returns:
            (is_garbage, reason)
        """
        filename = raw_file.original_filename
        path = raw_file.original_path
        ext = raw_file.file_extension

        # Filename exact match
        if filename in patterns.get("FILENAME", {}):
            return True, patterns["FILENAME"][filename]

        # Starts with
        for prefix, reason in patterns.get("STARTS_WITH", DEFAULT_GARBAGE_PATTERNS.get("STARTS_WITH", {})).items():
            if filename.startswith(prefix):
                return True, reason

        # Path contains
        for substring, reason in patterns.get("PATH_CONTAINS", {}).items():
            if substring in path:
                return True, reason

        # Extension
        if ext in patterns.get("EXTENSION", {}):
            return True, patterns["EXTENSION"][ext]

        # Regex patterns
        for regex, reason in patterns.get("REGEX", []):
            if regex.search(path):
                return True, reason

        return False, None

    # ========================================================================
    # KATMAN B: CLASSIFICATION
    # ========================================================================

    def _classify_file(self, raw_file: RawFile) -> str:
        """
        Dosya tipini algıla.

        Öncelik:
        1. Dosya adı pattern'leri
        2. XML içeriği (e-defter için)
        3. Dosya uzantısı

        Returns:
            doc_type string (e.g., "EDEFTER_YEVMIYE", "MIZAN", "BANKA")
        """
        filename = raw_file.original_filename
        path = raw_file.original_path
        ext = raw_file.file_extension

        # Pattern matching (sıralı kontrol)
        for doc_type, patterns in DOC_TYPE_PATTERNS:
            for pattern in patterns:
                if re.search(pattern, filename, re.IGNORECASE):
                    return doc_type
                if re.search(pattern, path, re.IGNORECASE):
                    return doc_type

        # XML içeriği kontrolü (e-defter tespiti)
        if ext == '.xml' and raw_file.content:
            try:
                content_start = raw_file.content[:2000].decode('utf-8', errors='ignore')

                if '<yevmiye' in content_start.lower() or '<gl:yevmiyeFisi' in content_start:
                    return "EDEFTER_YEVMIYE"
                if '<kebir' in content_start.lower() or '<gl:defterKebir' in content_start:
                    return "EDEFTER_KEBIR"
                if 'GIB' in content_start and 'berat' in content_start.lower():
                    if 'yevmiye' in content_start.lower():
                        return "EDEFTER_YEVMIYE_BERAT"
                    if 'kebir' in content_start.lower():
                        return "EDEFTER_KEBIR_BERAT"
            except Exception:
                pass

        # Uzantı bazlı fallback
        if ext in ['.csv', '.xlsx', '.xls']:
            return "UNKNOWN_TABULAR"
        if ext == '.pdf':
            return "UNKNOWN_PDF"
        if ext == '.xml':
            return "UNKNOWN_XML"

        return "OTHER"

    # ========================================================================
    # KATMAN C: CANONICALIZATION + DEDUPE
    # ========================================================================

    def _get_or_create_blob(
        self,
        cursor: sqlite3.Cursor,
        raw_file: RawFile
    ) -> Blob:
        """
        Blob oluştur veya mevcut olanı getir (SHA256 bazlı dedupe).

        Returns:
            Blob object with is_new flag
        """
        blob_id = raw_file.sha256_hash

        # Mevcut blob kontrolü
        cursor.execute("SELECT id, stored_path, reference_count FROM blobs WHERE id = ?", (blob_id,))
        row = cursor.fetchone()

        if row:
            # Mevcut blob - reference count artır
            cursor.execute("""
                UPDATE blobs
                SET reference_count = reference_count + 1,
                    last_seen_at = datetime('now')
                WHERE id = ?
            """, (blob_id,))

            return Blob(
                id=blob_id,
                stored_path=row['stored_path'],
                size_bytes=raw_file.size_bytes,
                reference_count=row['reference_count'] + 1,
                is_new=False
            )

        # Yeni blob - içeriği kaydet
        # Dizin yapısı: blobs/ab/cd/abcd1234...
        blob_dir = self.blob_storage_path / blob_id[:2] / blob_id[2:4]
        blob_dir.mkdir(parents=True, exist_ok=True)
        blob_path = blob_dir / blob_id

        blob_path.write_bytes(raw_file.content)
        stored_path = str(blob_path.relative_to(self.blob_storage_path))

        # DB'ye kaydet
        cursor.execute("""
            INSERT INTO blobs (id, stored_path, size_bytes, mime_type, reference_count)
            VALUES (?, ?, ?, ?, 1)
        """, (blob_id, stored_path, raw_file.size_bytes, raw_file.mime_type))

        return Blob(
            id=blob_id,
            stored_path=stored_path,
            size_bytes=raw_file.size_bytes,
            mime_type=raw_file.mime_type,
            reference_count=1,
            is_new=True
        )

    def _compute_canonical_fingerprint(
        self,
        doc_type: str,
        raw_file: RawFile,
        extracted_metadata: Dict[str, Any],
        rules: Dict
    ) -> str:
        """
        Canonical fingerprint hesapla (semantic dedupe için).

        Fingerprint = hash(doc_type + semantic_fields)
        """
        rule = rules.get(doc_type, {"fields": ["sha256_hash"]})

        # Fingerprint bileşenlerini topla
        components = [doc_type]

        for field in rule.get("fields", []):
            value = extracted_metadata.get(field, "")
            if not value:
                # RawFile'dan dene
                value = getattr(raw_file, field, "")
            components.append(str(value) if value else "")

        # Suffix varsa ekle
        if "suffix" in rule:
            components.append(rule["suffix"])

        # Hash content flag'i varsa içeriği de dahil et
        if rule.get("hash_content"):
            components.append(raw_file.sha256_hash)

        # Fingerprint oluştur
        fingerprint_input = "|".join(components)
        return hashlib.sha256(fingerprint_input.encode()).hexdigest()[:32]

    def _extract_metadata_from_content(
        self,
        doc_type: str,
        raw_file: RawFile
    ) -> Dict[str, Any]:
        """
        Dosya içeriğinden metadata çıkar.

        E-defter XML'den: VKN, dönem, defter tipi
        PDF'den: Beyanname tipi, dönem, VKN
        """
        metadata = {}

        if not raw_file.content:
            return metadata

        # E-defter XML parsing
        if doc_type.startswith("EDEFTER") and raw_file.file_extension == '.xml':
            try:
                content = raw_file.content.decode('utf-8', errors='ignore')

                # VKN
                vkn_match = re.search(r'<gl:tckn>(\d{10,11})</gl:tckn>', content)
                if not vkn_match:
                    vkn_match = re.search(r'<gl:vkn>(\d{10})</gl:vkn>', content)
                if vkn_match:
                    metadata['vkn'] = vkn_match.group(1)

                # Dönem (dosya adından veya içerikten)
                donem_match = re.search(r'-(\d{6})-[YK]', raw_file.original_filename)
                if donem_match:
                    metadata['donem'] = donem_match.group(1)

                # Defter tipi
                if 'YEVMIYE' in doc_type:
                    metadata['defter_tipi'] = 'Y'
                elif 'KEBIR' in doc_type:
                    metadata['defter_tipi'] = 'K'

            except Exception as e:
                logger.warning(f"E-defter metadata extraction hatası: {e}")

        # Beyanname/Tahakkuk PDF (filename'den)
        elif 'BEYANNAME' in doc_type or 'TAHAKKUK' in doc_type:
            # Dönem tespiti (OCAK, ŞUBAT, MART vs.)
            ay_map = {
                'OCAK': 1, 'ŞUBAT': 2, 'MART': 3, 'NİSAN': 4,
                'MAYIS': 5, 'HAZİRAN': 6, 'TEMMUZ': 7, 'AĞUSTOS': 8,
                'EYLÜL': 9, 'EKİM': 10, 'KASIM': 11, 'ARALIK': 12,
                'SUBAT': 2, 'NISAN': 4, 'HAZIRAN': 6, 'AGUSTOS': 8,
                'EYLUL': 9, 'EKIM': 10, 'ARALIK': 12
            }

            filename_upper = raw_file.original_filename.upper()
            for ay_name, ay_no in ay_map.items():
                if ay_name in filename_upper:
                    metadata['donem_ay'] = ay_no
                    break

            # Yıl tespiti
            year_match = re.search(r'20\d{2}', raw_file.original_filename)
            if year_match:
                metadata['donem_yil'] = int(year_match.group())

            # Tip tespiti
            if 'KDV' in filename_upper:
                metadata['beyanname_tipi'] = 'KDV'
            elif 'MUHTASAR' in filename_upper:
                metadata['beyanname_tipi'] = 'MUHTASAR'
            elif 'GECICI' in filename_upper or 'GEÇİCİ' in filename_upper:
                metadata['beyanname_tipi'] = 'GECICI_VERGI'

        return metadata

    def _get_or_create_canonical_doc(
        self,
        cursor: sqlite3.Cursor,
        tenant_id: str,
        client_id: str,
        doc_type: str,
        fingerprint: str,
        blob: Blob,
        raw_file: RawFile,
        metadata: Dict[str, Any]
    ) -> CanonicalDoc:
        """
        Canonical document oluştur veya mevcut olanı getir.
        """
        # Mevcut canonical kontrolü
        cursor.execute("""
            SELECT id, primary_blob_id
            FROM canonical_docs
            WHERE tenant_id = ? AND client_id = ? AND doc_type = ? AND canonical_fingerprint = ?
              AND is_active = 1
        """, (tenant_id, client_id, doc_type, fingerprint))

        row = cursor.fetchone()

        if row:
            # Mevcut canonical - güncelle
            cursor.execute("""
                UPDATE canonical_docs
                SET updated_at = datetime('now')
                WHERE id = ?
            """, (row['id'],))

            return CanonicalDoc(
                id=row['id'],
                doc_type=doc_type,
                canonical_fingerprint=fingerprint,
                primary_blob_id=row['primary_blob_id'],
                is_new=False,
                **metadata
            )

        # Yeni canonical
        canonical_id = str(uuid.uuid4())

        cursor.execute("""
            INSERT INTO canonical_docs (
                id, tenant_id, client_id, doc_type, canonical_fingerprint,
                primary_blob_id, vkn, donem, defter_tipi,
                hesap_kodu, banka_adi, beyanname_tipi, tahakkuk_no
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            canonical_id, tenant_id, client_id, doc_type, fingerprint,
            blob.id,
            metadata.get('vkn'),
            metadata.get('donem'),
            metadata.get('defter_tipi'),
            metadata.get('hesap_kodu'),
            metadata.get('banka_adi'),
            metadata.get('beyanname_tipi'),
            metadata.get('tahakkuk_no'),
        ))

        return CanonicalDoc(
            id=canonical_id,
            doc_type=doc_type,
            canonical_fingerprint=fingerprint,
            primary_blob_id=blob.id,
            is_new=True,
            **metadata
        )

    def _create_canonical_alias(
        self,
        cursor: sqlite3.Cursor,
        canonical_doc: CanonicalDoc,
        blob: Blob,
        raw_file: RawFile,
        is_primary: bool = False
    ):
        """Canonical alias oluştur"""
        alias_id = str(uuid.uuid4())

        cursor.execute("""
            INSERT OR IGNORE INTO canonical_aliases (
                id, canonical_doc_id, blob_id, raw_file_id,
                alias_filename, alias_path, is_primary
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            alias_id,
            canonical_doc.id,
            blob.id,
            raw_file.id,
            raw_file.original_filename,
            raw_file.original_path,
            1 if is_primary else 0
        ))

    # ========================================================================
    # MAIN INGEST PIPELINE
    # ========================================================================

    def ingest_zip(
        self,
        zip_path: Path,
        tenant_id: str,
        client_id: str,
        period_id: str,
        uploaded_by: Optional[str] = None
    ) -> IngestResult:
        """
        Ana ingest pipeline.

        1. Upload session oluştur
        2. ZIP'i recursive aç (Katman A)
        3. Garbage filtrele (Katman A)
        4. Her dosyayı classify et (Katman B)
        5. Blob dedupe (Katman C)
        6. Canonical dedupe (Katman C)
        7. Sonuçları kaydet

        Args:
            zip_path: Yüklenecek ZIP dosyası
            tenant_id: SMMM ID (e.g., "HKOZKAN")
            client_id: Mükellef ID (e.g., "CLIENT_048_76E7913D")
            period_id: Dönem ID (e.g., "2025_Q1")
            uploaded_by: Yükleyen kullanıcı

        Returns:
            IngestResult with statistics and file list
        """
        session_id = str(uuid.uuid4())
        result = IngestResult(session_id=session_id)

        conn = self._get_db()
        cursor = conn.cursor()

        try:
            # ----------------------------------------------------------------
            # 1. Upload session oluştur
            # ----------------------------------------------------------------
            zip_content = zip_path.read_bytes()
            zip_hash = hashlib.sha256(zip_content).hexdigest()

            cursor.execute("""
                INSERT INTO upload_sessions (
                    id, tenant_id, client_id, period_id,
                    original_filename, size_bytes, sha256_hash,
                    status, uploaded_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PROCESSING', ?)
            """, (
                session_id, tenant_id, client_id, period_id,
                zip_path.name, len(zip_content), zip_hash, uploaded_by
            ))
            conn.commit()

            # Garbage patterns ve fingerprint rules yükle
            garbage_patterns = self._load_garbage_patterns(cursor)
            fingerprint_rules = self._load_fingerprint_rules(cursor)

            # ----------------------------------------------------------------
            # 2. ZIP'i aç (Katman A - Acquisition)
            # ----------------------------------------------------------------
            with tempfile.TemporaryDirectory() as tmpdir:
                tmpdir_path = Path(tmpdir)

                logger.info(f"[{session_id[:8]}] ZIP extraction başlıyor: {zip_path.name}")

                raw_files = self._extract_zip_recursive(
                    zip_path=zip_path,
                    dest_dir=tmpdir_path,
                    source_zip_filename=zip_path.name
                )

                result.total_files_extracted = len(raw_files)
                logger.info(f"[{session_id[:8]}] {len(raw_files)} dosya extract edildi")

                # ----------------------------------------------------------------
                # 3-6. Her dosyayı işle
                # ----------------------------------------------------------------
                for raw_file in raw_files:
                    file_result = {
                        "filename": raw_file.original_filename,
                        "path": raw_file.original_path,
                        "size_bytes": raw_file.size_bytes,
                        "sha256": raw_file.sha256_hash[:16] + "...",
                        "status": "pending",
                    }

                    # 3. Garbage kontrolü (Katman A)
                    if not raw_file.is_garbage:
                        is_garbage, reason = self._is_garbage(raw_file, garbage_patterns)
                        if is_garbage:
                            raw_file.is_garbage = True
                            raw_file.garbage_reason = reason

                    if raw_file.is_garbage:
                        result.garbage_files_count += 1
                        file_result["status"] = "garbage"
                        file_result["reason"] = raw_file.garbage_reason

                        # raw_file'ı yine de kaydet (kanıt)
                        self._save_raw_file(cursor, raw_file, tenant_id, client_id, period_id, session_id)
                        result.files.append(file_result)
                        continue

                    # 4. Classification (Katman B)
                    doc_type = self._classify_file(raw_file)
                    file_result["doc_type"] = doc_type

                    # 5. Blob dedupe (Katman C)
                    blob = self._get_or_create_blob(cursor, raw_file)
                    file_result["blob_id"] = blob.id[:16] + "..."

                    if blob.is_new:
                        result.new_blobs_count += 1
                        file_result["blob_status"] = "new"
                    else:
                        result.duplicate_blobs_count += 1
                        file_result["blob_status"] = "duplicate"

                    # 6. Canonical dedupe (Katman C)
                    metadata = self._extract_metadata_from_content(doc_type, raw_file)
                    fingerprint = self._compute_canonical_fingerprint(
                        doc_type, raw_file, metadata, fingerprint_rules
                    )

                    canonical = self._get_or_create_canonical_doc(
                        cursor, tenant_id, client_id, doc_type, fingerprint,
                        blob, raw_file, metadata
                    )
                    file_result["canonical_id"] = canonical.id[:16] + "..."

                    if canonical.is_new:
                        result.new_canonical_docs_count += 1
                        file_result["canonical_status"] = "new"
                    else:
                        result.updated_canonical_docs_count += 1
                        file_result["canonical_status"] = "existing"

                    # Alias oluştur
                    self._create_canonical_alias(
                        cursor, canonical, blob, raw_file,
                        is_primary=canonical.is_new
                    )

                    # raw_file kaydet
                    raw_file.blob_id = blob.id
                    self._save_raw_file(cursor, raw_file, tenant_id, client_id, period_id, session_id)

                    file_result["status"] = "processed"
                    result.files.append(file_result)

                    # Memory temizliği
                    raw_file.content = b""

            # ----------------------------------------------------------------
            # 7. Session'ı tamamla
            # ----------------------------------------------------------------
            cursor.execute("""
                UPDATE upload_sessions
                SET status = 'COMPLETED',
                    completed_at = datetime('now'),
                    total_files_extracted = ?,
                    garbage_files_count = ?,
                    new_blobs_count = ?,
                    duplicate_blobs_count = ?,
                    new_canonical_docs_count = ?,
                    updated_canonical_docs_count = ?
                WHERE id = ?
            """, (
                result.total_files_extracted,
                result.garbage_files_count,
                result.new_blobs_count,
                result.duplicate_blobs_count,
                result.new_canonical_docs_count,
                result.updated_canonical_docs_count,
                session_id
            ))

            conn.commit()
            result.status = "COMPLETED"

            logger.info(
                f"[{session_id[:8]}] Ingest tamamlandı: "
                f"{result.total_files_extracted} dosya, "
                f"{result.new_blobs_count} yeni blob, "
                f"{result.duplicate_blobs_count} duplicate blob, "
                f"{result.new_canonical_docs_count} yeni canonical"
            )

        except Exception as e:
            logger.error(f"[{session_id[:8]}] Ingest hatası: {e}")
            result.status = "FAILED"
            result.error_message = str(e)

            # Session'ı failed olarak işaretle
            try:
                cursor.execute("""
                    UPDATE upload_sessions
                    SET status = 'FAILED', error_message = ?
                    WHERE id = ?
                """, (str(e), session_id))
                conn.commit()
            except sqlite3.Error:
                pass

            conn.rollback()
            raise

        finally:
            conn.close()

        return result

    def _save_raw_file(
        self,
        cursor: sqlite3.Cursor,
        raw_file: RawFile,
        tenant_id: str,
        client_id: str,
        period_id: str,
        session_id: str
    ):
        """Raw file'ı database'e kaydet"""
        cursor.execute("""
            INSERT INTO raw_files (
                id, tenant_id, client_id, period_id, upload_session_id,
                original_path, original_filename, file_extension, size_bytes,
                sha256_hash, md5_hash, source_zip_filename, nested_zip_level,
                parent_zip_raw_file_id, is_garbage, garbage_reason,
                mime_type, encoding, blob_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            raw_file.id,
            tenant_id,
            client_id,
            period_id,
            session_id,
            raw_file.original_path,
            raw_file.original_filename,
            raw_file.file_extension,
            raw_file.size_bytes,
            raw_file.sha256_hash,
            raw_file.md5_hash,
            raw_file.source_zip_filename,
            raw_file.nested_zip_level,
            raw_file.parent_zip_raw_file_id,
            1 if raw_file.is_garbage else 0,
            raw_file.garbage_reason,
            raw_file.mime_type,
            raw_file.encoding,
            getattr(raw_file, 'blob_id', None)
        ))


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_ingest_service(db_path: Optional[Path] = None, blob_path: Optional[Path] = None) -> IngestService:
    """
    IngestService factory.

    Defaults:
        db_path: backend/database/lyntos.db
        blob_path: backend/uploads/blobs
    """
    base_path = Path(__file__).parent.parent

    if db_path is None:
        db_path = base_path / "database" / "lyntos.db"

    if blob_path is None:
        blob_path = base_path / "uploads" / "blobs"

    return IngestService(db_path, blob_path)


# ============================================================================
# CLI TEST (python -m services.ingest_service)
# ============================================================================

if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) < 2:
        print("Kullanım: python -m services.ingest_service <zip_path> [client_id] [period_id]")
        sys.exit(1)

    zip_path = Path(sys.argv[1])
    client_id = sys.argv[2] if len(sys.argv) > 2 else "TEST_CLIENT"
    period_id = sys.argv[3] if len(sys.argv) > 3 else "2025_Q1"

    service = create_ingest_service()
    result = service.ingest_zip(
        zip_path=zip_path,
        tenant_id="HKOZKAN",
        client_id=client_id,
        period_id=period_id
    )

    print(f"\n{'='*60}")
    print(f"Session ID: {result.session_id}")
    print(f"Status: {result.status}")
    print(f"Total files: {result.total_files_extracted}")
    print(f"Garbage: {result.garbage_files_count}")
    print(f"New blobs: {result.new_blobs_count}")
    print(f"Duplicate blobs: {result.duplicate_blobs_count}")
    print(f"New canonical docs: {result.new_canonical_docs_count}")
    print(f"{'='*60}")
