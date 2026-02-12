# -*- coding: utf-8 -*-
"""
LYNTOS v2 Unified Ingest API
==============================

POST /api/v2/ingest              — ZIP veya tekil dosya yükleme
GET  /api/v2/ingest/files/{cid}/{period}  — Yüklenen dosyaları listele
DELETE /api/v2/ingest/file/{fid}  — Tekil dosya sil (soft delete + veri temizle)
GET  /api/v2/ingest/pipeline-status/{sid} — Pipeline durumu

Özellikler:
- ZIP + tekil dosya desteği
- SHA256 dedup (aynı dönem + aynı hash = skip)
- Cross-period dedup uyarısı (farklı dönemde aynı hash = uyarı)
- uploaded_files tablosuna her dosya kaydı
- Dosya bazında silme (soft delete + ilgili veri tablosundan temizleme)
- ClientResolver entegrasyonu (VKN bazlı)

Author: Claude
Date: 2026-02-08
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import Optional, List, Dict, Any
import tempfile
import zipfile
import hashlib
import sqlite3
import uuid
import re
import os
import logging
import shutil
from datetime import datetime

from middleware.auth import verify_token
from middleware.cache import response_cache

from services.parse_service import (
    parse_mizan_file,
    parse_bank_statement,
    parse_yevmiye_defteri,
    parse_defteri_kebir,
    parse_edefter_xml,
    parse_beyanname_pdf,
    parse_tahakkuk_pdf,
    parse_and_store_mizan,
)
from services.post_ingest_pipeline import run_post_ingest_pipeline, get_pipeline_status
from services.client_resolver import ClientResolver, ClientResolverError
from utils.period_utils import normalize_period as norm_period
from services.period_validator import PeriodValidator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2", tags=["ingest"])

# Paths
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"

# Garbage file patterns
GARBAGE_PATTERNS = [
    r'^\.', r'^__MACOSX', r'\.DS_Store$', r'Thumbs\.db$',
    r'desktop\.ini$', r'~\$', r'^~', r'\.tmp$',
]

# ==================== Dosya Tipi Sınıflandırma ====================

DOC_PATTERNS_ORDERED = [
    ("MIZAN", [r"mizan", r"mizn", r"MİZAN", r"trial.?balance"]),
    ("YEVMIYE", [r"yevmiye_defteri", r"yevmiye defteri", r"yevmiye"]),
    ("KEBIR", [r"defteri_kebir", r"kebir_defteri", r"kebir"]),
    ("POSET", [r"poset", r"Poset", r"POSET", r"poşet", r"Poşet"]),
    ("GECICI_VERGI", [
        r"KGecici", r"k.?gecici", r"geçici.?vergi", r"gecici.?vergi",
        r"quarterly.?tax"
    ]),
    ("BEYANNAME", [
        r"_BYN\.pdf", r"beyanname", r"BEYANNAME", r"KDV.*BYN",
        r"MUHTASAR.*BYN", r"Muhtasar.*BYN"
    ]),
    ("TAHAKKUK", [
        r"_THK\.pdf", r"tahakkuk", r"TAHAKKUK", r"KDV.*THK",
        r"MUHTASAR.*THK", r"Muhtasar.*THK"
    ]),
    ("BANKA", [
        r"102\.", r"banka", r"ekstre", r"YKB", r"AKBANK", r"HALKBANK",
        r"ZİRAAT", r"ZIRAAT", r"GARANTİ", r"GARANTI", r"İŞ.?BANK",
        r"ISBANK", r"VAKIF", r"KUVEYT", r"QNB", r"ING", r"TEB", r"HSBC",
        r"ALBARAKA", r"DENİZ", r"DENIZ", r"YAPI.?KREDİ", r"YAPI.?KREDI"
    ]),
    ("EDEFTER_BERAT", [
        r"e.?defter", r"e_defter", r"berat", r"BERAT",
        r"\d{10}-\d{6}-[YKDB]"
    ]),
    ("EFATURA_ARSIV", [
        r"e.?fatura", r"e.?arsiv", r"e.?arşiv", r"fatura.*liste",
        r"arsiv.*liste", r"arşiv.*liste"
    ]),
]

SUPPORTED_EXTENSIONS = {
    '.xlsx', '.xls', '.csv', '.xml', '.pdf', '.zip',
}


def classify_file(filename: str) -> str:
    """Dosya adından dosya tipini algıla (sıralı kontrol)"""
    for doc_type, patterns in DOC_PATTERNS_ORDERED:
        for pattern in patterns:
            if re.search(pattern, filename, re.IGNORECASE):
                return doc_type
    return "OTHER"


def is_garbage_file(filename: str) -> bool:
    """Garbage dosya mı kontrol et"""
    basename = os.path.basename(filename)
    for pattern in GARBAGE_PATTERNS:
        if re.search(pattern, basename):
            return True
    # Extension kontrolü
    _, ext = os.path.splitext(basename)
    if ext.lower() not in SUPPORTED_EXTENSIONS and ext != '':
        return True
    return False


def compute_sha256(content: bytes) -> str:
    """SHA256 hash hesapla"""
    return hashlib.sha256(content).hexdigest()


def get_db():
    """Database bağlantısı oluştur"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_pipeline_columns():
    """Pipeline sütunlarını upload_sessions'a ekle (yoksa)"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cols_to_add = [
            ("pipeline_status", "TEXT DEFAULT 'pending'"),
            ("pipeline_detail", "TEXT DEFAULT ''"),
            ("pipeline_completed_at", "TEXT"),
            ("cross_check_count", "INTEGER DEFAULT 0"),
            ("analysis_findings_count", "INTEGER DEFAULT 0"),
        ]
        for col_name, col_def in cols_to_add:
            try:
                cursor.execute(f"ALTER TABLE upload_sessions ADD COLUMN {col_name} {col_def}")
            except sqlite3.OperationalError:
                pass  # Column already exists
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Pipeline column ekleme uyarısı: {e}")


def _store_file(tenant_id: str, client_id: str, period_code: str,
                filename: str, content: bytes) -> str:
    """Dosyayı diske kaydet, stored_path döndür"""
    safe_period = period_code.replace('-', '_')
    dir_path = UPLOAD_DIR / tenant_id / client_id / safe_period
    dir_path.mkdir(parents=True, exist_ok=True)

    # Unique filename
    base, ext = os.path.splitext(filename)
    safe_name = re.sub(r'[^\w\-.]', '_', base)[:100]
    unique_name = f"{safe_name}_{uuid.uuid4().hex[:6]}{ext}"
    file_path = dir_path / unique_name

    with open(file_path, 'wb') as f:
        f.write(content)

    return str(file_path)


# ==================== Dosya Parse + Veri Tablosuna Yazma ====================

def _parse_and_store_file(
    cursor, file_id: str, tenant_id: str, client_id: str,
    period_code: str, doc_type: str, stored_path: str, filename: str
) -> Dict[str, Any]:
    """
    Tek bir dosyayı parse edip ilgili veri tablosuna yaz.
    uploaded_files tablosundaki parse_status ve parsed_row_count güncellenir.
    """
    result = {
        'status': 'SKIP',
        'doc_type': doc_type,
        'filename': filename,
        'parsed_count': 0,
        'inserted_count': 0,
        'message': '',
    }

    file_path = Path(stored_path)
    if not file_path.exists():
        result['status'] = 'ERROR'
        result['message'] = f'Dosya bulunamadı: {stored_path}'
        _update_file_parse_status(cursor, file_id, 'error', result['message'], 0)
        return result

    # Normalize period to underscore format for data tables
    period_id = period_code.replace('-', '_').upper()

    try:
        if doc_type == 'MIZAN':
            parse_result = parse_and_store_mizan(
                cursor, tenant_id, client_id, period_id, stored_path, filename
            )
            result['status'] = parse_result.get('status', 'OK')
            result['parsed_count'] = parse_result.get('parsed_count', 0)
            result['inserted_count'] = parse_result.get('inserted_count', 0)
            result['message'] = f"{result['inserted_count']} mizan satırı eklendi"

        elif doc_type == 'BANKA':
            rows = parse_bank_statement(file_path)
            result['parsed_count'] = len(rows)
            inserted = _store_bank_transactions(cursor, rows, tenant_id, client_id, period_id, file_id)
            result['inserted_count'] = inserted
            result['status'] = 'OK' if inserted > 0 else ('EMPTY' if len(rows) == 0 else 'OK')
            result['message'] = f"{inserted} banka işlemi eklendi"

        elif doc_type == 'YEVMIYE':
            rows = parse_yevmiye_defteri(file_path)
            result['parsed_count'] = len(rows)
            inserted = _store_journal_entries(cursor, rows, tenant_id, client_id, period_id, file_id)
            result['inserted_count'] = inserted
            result['status'] = 'OK'
            result['message'] = f"{inserted} yevmiye satırı eklendi"

        elif doc_type == 'KEBIR':
            rows = parse_defteri_kebir(file_path)
            result['parsed_count'] = len(rows)
            inserted = _store_ledger_entries(cursor, rows, tenant_id, client_id, period_id, file_id)
            result['inserted_count'] = inserted
            result['status'] = 'OK'
            result['message'] = f"{inserted} kebir satırı eklendi"

        elif doc_type in ('EDEFTER_BERAT',):
            rows = parse_edefter_xml(file_path)
            result['parsed_count'] = len(rows)
            inserted = _store_edefter_entries(cursor, rows, tenant_id, client_id, period_id, file_id)
            result['inserted_count'] = inserted
            result['status'] = 'OK'
            result['message'] = f"{inserted} e-defter satırı eklendi"

        elif doc_type in ('BEYANNAME', 'GECICI_VERGI', 'POSET'):
            parsed = parse_beyanname_pdf(file_path)
            result['parsed_count'] = 1 if parsed else 0
            inserted = _store_beyanname(cursor, parsed, tenant_id, client_id, period_id, file_id)
            result['inserted_count'] = inserted
            result['status'] = 'OK'
            result['message'] = f"Beyanname kaydedildi ({parsed.get('beyanname_tipi', 'N/A')})"
            # VKN cross-validation (uyarı, engelleme değil)
            vkn_warning = _check_vkn_mismatch(cursor, client_id, parsed.get('vkn'), filename)
            if vkn_warning:
                result['vkn_warning'] = vkn_warning

        elif doc_type == 'TAHAKKUK':
            parsed = parse_tahakkuk_pdf(file_path)
            result['parsed_count'] = 1 if parsed else 0
            inserted = _store_tahakkuk(cursor, parsed, tenant_id, client_id, period_id, file_id)
            result['inserted_count'] = inserted
            result['status'] = 'OK'
            result['message'] = f"Tahakkuk kaydedildi"
            # VKN cross-validation (uyarı, engelleme değil)
            vkn_warning = _check_vkn_mismatch(cursor, client_id, parsed.get('vkn'), filename)
            if vkn_warning:
                result['vkn_warning'] = vkn_warning

        else:
            result['message'] = f"Bilinmeyen dosya tipi: {doc_type}"

    except Exception as e:
        result['status'] = 'ERROR'
        result['message'] = f"Parse hatası: {str(e)}"
        logger.error(f"[Ingest] Parse hatası {filename}: {e}")

    # uploaded_files tablosunu güncelle
    _update_file_parse_status(
        cursor, file_id,
        'parsed' if result['status'] in ('OK', 'PARTIAL') else 'error',
        result['message'] if result['status'] == 'ERROR' else None,
        result['inserted_count']
    )

    return result


def _update_file_parse_status(cursor, file_id: str, status: str, error: Optional[str], row_count: int):
    """uploaded_files tablosunda parse durumunu güncelle"""
    cursor.execute("""
        UPDATE uploaded_files
        SET parse_status = ?, parse_error = ?, parsed_row_count = ?
        WHERE id = ?
    """, (status, error, row_count, file_id))


# ============ VKN Cross-Validation ============

def _check_vkn_mismatch(cursor, client_id: str, doc_vkn: Optional[str], filename: str) -> Optional[str]:
    """
    Belgedeki VKN ile client'ın VKN'sini karşılaştır.
    Uyuşmazlık varsa uyarı mesajı döndür (engelleme yok).
    """
    if not doc_vkn:
        return None

    try:
        cursor.execute("SELECT tax_id FROM clients WHERE id = ?", (client_id,))
        row = cursor.fetchone()
        if not row:
            return None

        client_vkn = row['tax_id'] if isinstance(row, sqlite3.Row) else row[0]
        if not client_vkn or client_vkn.startswith('PENDING-'):
            return None

        # Normalize: sadece rakamları karşılaştır
        doc_digits = ''.join(c for c in doc_vkn if c.isdigit())
        client_digits = ''.join(c for c in client_vkn if c.isdigit())

        if doc_digits and client_digits and doc_digits != client_digits:
            logger.warning(
                f"[Ingest] VKN uyuşmazlığı! Belge: {doc_vkn}, Client: {client_vkn}, Dosya: {filename}"
            )
            return (
                f"Dikkat: '{filename}' dosyasındaki VKN ({doc_vkn}) ile "
                f"mükellef VKN'si ({client_vkn}) eşleşmiyor. "
                f"Lütfen doğru mükellefi seçtiğinizden emin olun."
            )
    except Exception as e:
        logger.warning(f"VKN cross-validation hatası: {e}")

    return None


# ============ Veri Tablosuna Yazma Yardımcıları ============

def _store_bank_transactions(cursor, rows: List[Dict], tenant_id: str,
                             client_id: str, period_id: str, file_id: str) -> int:
    """Banka işlemlerini bank_transactions tablosuna yaz"""
    now = datetime.utcnow().isoformat()
    inserted = 0
    for row in rows:
        try:
            cursor.execute("""
                INSERT INTO bank_transactions
                (tenant_id, client_id, period_id, source_file_id, source_file,
                 tarih, aciklama, tutar, bakiye, islem_tipi, hesap_kodu, banka_adi,
                 created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id, file_id, f"ingest:{file_id}",
                row.get('tarih'), row.get('aciklama'), row.get('tutar'),
                row.get('bakiye'), row.get('islem_tipi'),
                row.get('hesap_kodu'), row.get('banka_adi'), now
            ))
            inserted += 1
        except sqlite3.IntegrityError:
            pass  # duplicate
        except Exception as e:
            logger.warning(f"Bank transaction insert hatası: {e}")
    return inserted


def _store_journal_entries(cursor, rows: List[Dict], tenant_id: str,
                           client_id: str, period_id: str, file_id: str) -> int:
    """Yevmiye kayıtlarını journal_entries tablosuna yaz"""
    now = datetime.utcnow().isoformat()
    inserted = 0
    for row in rows:
        try:
            cursor.execute("""
                INSERT INTO journal_entries
                (tenant_id, client_id, period_id, source_file_id, source_file,
                 fis_no, tarih, fis_aciklama, hesap_kodu, hesap_adi,
                 borc, alacak, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id, file_id, f"ingest:{file_id}",
                row.get('fis_no'), row.get('tarih'), row.get('fis_aciklama'),
                row.get('hesap_kodu'), row.get('hesap_adi'),
                row.get('borc'), row.get('alacak'), now
            ))
            inserted += 1
        except sqlite3.IntegrityError:
            pass
        except Exception as e:
            logger.warning(f"Journal entry insert hatası: {e}")
    return inserted


def _store_ledger_entries(cursor, rows: List[Dict], tenant_id: str,
                          client_id: str, period_id: str, file_id: str) -> int:
    """Kebir kayıtlarını ledger_entries tablosuna yaz"""
    now = datetime.utcnow().isoformat()
    inserted = 0
    for row in rows:
        try:
            cursor.execute("""
                INSERT INTO ledger_entries
                (tenant_id, client_id, period_id, source_file_id, source_file,
                 kebir_hesap, tarih, hesap_kodu, hesap_adi,
                 borc, alacak, bakiye, evrak_no, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id, file_id, f"ingest:{file_id}",
                row.get('kebir_hesap'), row.get('tarih'),
                row.get('hesap_kodu'), row.get('hesap_adi'),
                row.get('borc'), row.get('alacak'), row.get('bakiye'),
                row.get('evrak_no'), now
            ))
            inserted += 1
        except sqlite3.IntegrityError:
            pass
        except Exception as e:
            logger.warning(f"Ledger entry insert hatası: {e}")
    return inserted


def _store_edefter_entries(cursor, rows: List[Dict], tenant_id: str,
                           client_id: str, period_id: str, file_id: str) -> int:
    """E-Defter kayıtlarını edefter_entries tablosuna yaz"""
    now = datetime.utcnow().isoformat()
    inserted = 0
    for row in rows:
        try:
            cursor.execute("""
                INSERT INTO edefter_entries
                (tenant_id, client_id, period_id, source_file_id, source_file,
                 defter_tipi, fis_no, tarih, hesap_kodu, tutar, borc_alacak,
                 created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id, file_id, f"ingest:{file_id}",
                row.get('defter_tipi'), row.get('fis_no'), row.get('tarih'),
                row.get('hesap_kodu'), row.get('tutar'), row.get('borc_alacak'),
                now
            ))
            inserted += 1
        except sqlite3.IntegrityError:
            pass
        except Exception as e:
            logger.warning(f"E-Defter entry insert hatası: {e}")
    return inserted


def _store_beyanname(cursor, parsed: Dict, tenant_id: str,
                     client_id: str, period_id: str, file_id: str) -> int:
    """Beyanname kaydını beyanname_entries tablosuna yaz"""
    if not parsed:
        return 0
    now = datetime.utcnow().isoformat()
    try:
        cursor.execute("""
            INSERT INTO beyanname_entries
            (tenant_id, client_id, period_id, source_file_id, source_file,
             beyanname_tipi, donem_yil, donem_ay, vkn, unvan,
             matrah_toplam, hesaplanan_vergi, odenecek_vergi, devreden_kdv,
             created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tenant_id, client_id, period_id, file_id, f"ingest:{file_id}",
            parsed.get('beyanname_tipi'), parsed.get('donem_yil'),
            parsed.get('donem_ay'), parsed.get('vkn'), parsed.get('unvan'),
            parsed.get('matrah_toplam'), parsed.get('hesaplanan_vergi'),
            parsed.get('odenecek_vergi'), parsed.get('devreden_kdv'), now
        ))
        return 1
    except sqlite3.IntegrityError:
        return 0
    except Exception as e:
        logger.warning(f"Beyanname insert hatası: {e}")
        return 0


def _store_tahakkuk(cursor, parsed: Dict, tenant_id: str,
                    client_id: str, period_id: str, file_id: str) -> int:
    """Tahakkuk kaydını tahakkuk_entries tablosuna yaz"""
    if not parsed:
        return 0
    now = datetime.utcnow().isoformat()
    try:
        cursor.execute("""
            INSERT INTO tahakkuk_entries
            (tenant_id, client_id, period_id, source_file_id, source_file,
             tahakkuk_tipi, donem_yil, donem_ay, vergi_turu, vergi_tutari,
             toplam_borc, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tenant_id, client_id, period_id, file_id, f"ingest:{file_id}",
            parsed.get('tahakkuk_tipi'), parsed.get('donem_yil'),
            parsed.get('donem_ay'), parsed.get('vergi_turu'),
            parsed.get('vergi_tutari'), parsed.get('toplam_borc'), now
        ))
        return 1
    except sqlite3.IntegrityError:
        return 0
    except Exception as e:
        logger.warning(f"Tahakkuk insert hatası: {e}")
        return 0


# ==================== ANA ENDPOINT: POST /api/v2/ingest ====================

@router.post("/ingest")
async def ingest_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="ZIP veya tekil dosya (PDF, XLSX, CSV, XML)"),
    client_id: str = Form(..., description="Mükellef ID"),
    period: str = Form(..., description="Dönem (örn: 2025-Q1)"),
    user: dict = Depends(verify_token),
):
    """
    Dönem verisi yükle — ZIP veya tekil dosya

    ZIP ise içindeki tüm dosyalar çıkarılır ve işlenir.
    Tekil dosya ise direkt işlenir.

    Dedup: Aynı dönem + aynı SHA256 hash = skip (duplicate rapor edilir).
    Cross-period dedup: Farklı dönemde aynı hash = uyarı verilir.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya adı belirtilmedi")

    # KRİTİK: smmm_id artık JWT token'dan alınıyor (Form parametresinden DEĞİL)
    smmm_id = user.get("id", "")
    if not smmm_id:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama hatası: kullanıcı ID bulunamadı")

    # Period normalizasyonu
    try:
        period_code = norm_period(period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not client_id or len(client_id) < 2:
        raise HTTPException(status_code=400, detail="Geçerli bir mükellef ID giriniz")

    # Client doğrulama
    conn = get_db()
    cursor = conn.cursor()
    try:
        resolved_client_id = ClientResolver.resolve_existing(cursor, client_id)
    except ClientResolverError as e:
        conn.close()
        raise HTTPException(status_code=404, detail=str(e))

    # KRİTİK: SMMM veri izolasyonu — bu client bu SMMM'ye mi ait?
    if user.get("role") != "admin":
        cursor.execute(
            "SELECT id FROM clients WHERE id = ? AND smmm_id = ?",
            (resolved_client_id, smmm_id)
        )
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(
                status_code=403,
                detail="Bu mükellefi düzenleme yetkiniz yok"
            )

    # Upload session oluştur
    session_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO upload_sessions
        (id, tenant_id, client_id, period_code, source_filename, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'processing', ?)
    """, (session_id, smmm_id, resolved_client_id, period_code, file.filename, now))
    conn.commit()

    logger.info(f"[Ingest] Başladı: session={session_id[:8]} client={resolved_client_id} "
                f"period={period_code} file={file.filename}")

    try:
        # Dosyayı oku
        file_content = await file.read()
        is_zip = file.filename.lower().endswith('.zip')

        # Dosya listesi hazırla: [(filename, content_bytes), ...]
        file_items: List[tuple] = []

        if is_zip:
            file_items = _extract_zip(file_content, file.filename)
        else:
            file_items = [(file.filename, file_content)]

        # Her dosyayı işle
        results = []
        total_new = 0
        total_dup = 0
        total_parsed_rows = 0
        total_period_mismatch = 0
        doc_type_counts: Dict[str, int] = {}
        warnings: List[str] = []
        period_errors: List[Dict[str, str]] = []

        for fname, fcontent in file_items:
            # Garbage kontrol
            if is_garbage_file(fname):
                continue

            file_result = _process_single_file(
                cursor=cursor,
                session_id=session_id,
                tenant_id=smmm_id,
                client_id=resolved_client_id,
                period_code=period_code,
                filename=fname,
                content=fcontent,
            )

            results.append(file_result)

            if file_result.get('parse_status') == 'period_mismatch':
                total_period_mismatch += 1
                period_errors.append({
                    'filename': fname,
                    'detected_period': file_result.get('detected_period', '?'),
                    'detail': file_result.get('message', ''),
                })
            elif file_result['is_duplicate']:
                total_dup += 1
                if file_result.get('duplicate_in_period'):
                    warnings.append(
                        f"'{fname}' dosyası {file_result['duplicate_in_period']} "
                        f"döneminde de mevcut"
                    )
            else:
                total_new += 1
                total_parsed_rows += file_result.get('parsed_row_count', 0)
                # VKN uyuşmazlığı uyarısı (engelleme yok)
                if file_result.get('vkn_warning'):
                    warnings.append(file_result['vkn_warning'])
                dt = file_result.get('doc_type', 'OTHER')
                doc_type_counts[dt] = doc_type_counts.get(dt, 0) + 1

        # === Dönem uyuşmazlığı sert engelleme ===
        # Eğer HERHANGİ bir dosya dönem uyuşmazlığına sahipse,
        # tüm upload'ı reddet
        if period_errors and total_new == 0:
            # Tüm dosyalar mismatch veya duplicate — commit etme, rollback
            conn.rollback()
            error_details = "; ".join(
                f"{pe['filename']} → {pe['detected_period']}" for pe in period_errors
            )
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Dönem uyuşmazlığı",
                    "message": f"Yüklenen dosyalar seçilen dönemle ({period_code}) uyuşmuyor. "
                               f"Lütfen doğru dönemi seçin veya doğru dosyaları yükleyin.",
                    "period_errors": period_errors,
                    "selected_period": period_code,
                }
            )

        # Session güncelle
        try:
            cursor.execute("""
                UPDATE upload_sessions
                SET status = 'completed',
                    total_files = ?,
                    new_files = ?,
                    duplicate_files = ?,
                    completed_at = ?
                WHERE id = ?
            """, (len(results), total_new, total_dup, datetime.utcnow().isoformat(), session_id))
            conn.commit()
        except sqlite3.Error:
            conn.rollback()
            raise

        # P-10: Upload sonrası cache invalidation
        normalized_period = period_code.replace('-', '_').upper()
        response_cache.invalidate_client(resolved_client_id)
        logger.info(f"[Ingest] Cache invalidated for client {resolved_client_id}")

        # Pipeline başlat (cross-check + risk analizi) — arka plan
        try:
            _ensure_pipeline_columns()
            background_tasks.add_task(
                run_post_ingest_pipeline,
                session_id=session_id,
                tenant_id=smmm_id,
                client_id=resolved_client_id,
                period_id=normalized_period,
            )
            logger.info(f"[Ingest] Pipeline arka planda başlatıldı: {session_id[:8]}")
        except Exception as e:
            logger.warning(f"[Ingest] Pipeline başlatma uyarısı: {e}")

        conn.close()

        return {
            "success": True,
            "session_id": session_id,
            "client_id": resolved_client_id,
            "period": period_code,
            "statistics": {
                "total_files": len(results),
                "new_files": total_new,
                "duplicate_files": total_dup,
                "period_mismatch_files": total_period_mismatch,
                "total_parsed_rows": total_parsed_rows,
            },
            "doc_types": doc_type_counts,
            "files": [
                {
                    "filename": r['filename'],
                    "doc_type": r['doc_type'],
                    "is_duplicate": r['is_duplicate'],
                    "parsed_row_count": r.get('parsed_row_count', 0),
                    "status": r['parse_status'],
                    "message": r.get('message', ''),
                    "period_validation": r.get('period_validation_status', 'unknown'),
                }
                for r in results
            ],
            "warnings": warnings,
            "period_errors": period_errors if period_errors else None,
            "pipeline_status": "cross_checking",
            "uploaded_at": now,
        }

    except HTTPException:
        raise
    except Exception as e:
        # Session hata durumuna çek
        try:
            cursor.execute("""
                UPDATE upload_sessions SET status = 'error', error_message = ? WHERE id = ?
            """, (str(e), session_id))
            conn.commit()
        except Exception:
            pass
        conn.close()
        logger.error(f"[Ingest] Hata: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Yükleme hatası: {str(e)}")


def _extract_zip(content: bytes, source_filename: str,
                 max_depth: int = 3) -> List[tuple]:
    """
    ZIP dosyasını aç, nested ZIP'leri de aç (max 3 seviye).
    Returns: [(filename, content_bytes), ...]
    """
    import io

    items = []

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue

                fname = os.path.basename(info.filename)
                if not fname:
                    continue

                fcontent = zf.read(info.filename)

                # Nested ZIP
                if fname.lower().endswith('.zip') and max_depth > 0:
                    nested = _extract_zip(fcontent, fname, max_depth - 1)
                    items.extend(nested)
                else:
                    items.append((fname, fcontent))
    except zipfile.BadZipFile:
        logger.warning(f"[Ingest] Bozuk ZIP dosyası: {source_filename}")

    return items


def _process_single_file(
    cursor, session_id: str, tenant_id: str, client_id: str,
    period_code: str, filename: str, content: bytes,
) -> Dict[str, Any]:
    """
    Tek bir dosyayı işle:
    1. SHA256 hash hesapla
    2. Dedup kontrol (aynı dönem + aynı hash)
    3. Cross-period dedup kontrol
    4. Dosya tipi sınıflandır
    5. Diske kaydet
    6. uploaded_files tablosuna kaydet
    7. Parse et
    """
    file_hash = compute_sha256(content)
    file_size = len(content)
    doc_type = classify_file(filename)
    file_id = str(uuid.uuid4())

    # MIME type tahmini
    _, ext = os.path.splitext(filename)
    mime_map = {
        '.pdf': 'application/pdf',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.csv': 'text/csv',
        '.xml': 'application/xml',
    }
    mime_type = mime_map.get(ext.lower(), 'application/octet-stream')

    result = {
        'file_id': file_id,
        'filename': filename,
        'doc_type': doc_type,
        'file_hash': file_hash,
        'file_size': file_size,
        'is_duplicate': False,
        'duplicate_in_period': None,
        'parse_status': 'pending',
        'parsed_row_count': 0,
        'message': '',
    }

    # === VT-9: Atomik dedup — SELECT + UNIQUE index ile çifte koruma ===
    # Önce SELECT ile kontrol (hızlı path)
    cursor.execute("""
        SELECT id, original_filename FROM uploaded_files
        WHERE client_id = ? AND period_code = ? AND file_hash_sha256 = ?
              AND is_deleted = 0 AND is_duplicate = 0
    """, (client_id, period_code, file_hash))
    existing = cursor.fetchone()

    if existing:
        # Duplicate — kaydet ama parse etme
        existing_name = existing['original_filename'] if isinstance(existing, sqlite3.Row) else existing[1]
        result['is_duplicate'] = True
        result['parse_status'] = 'skipped'
        result['message'] = f"Bu dosya zaten yüklü: '{existing_name}'"

        cursor.execute("""
            INSERT INTO uploaded_files
            (id, session_id, tenant_id, client_id, period_code,
             original_filename, doc_type, file_hash_sha256, file_size, mime_type,
             is_duplicate, duplicate_of_id, parse_status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'skipped', datetime('now'))
        """, (
            file_id, session_id, tenant_id, client_id, period_code,
            filename, doc_type, file_hash, file_size, mime_type,
            existing[0] if isinstance(existing, tuple) else existing['id'],
        ))

        return result

    # === Cross-period dedup: Farklı dönemde aynı hash ===
    cursor.execute("""
        SELECT period_code, original_filename FROM uploaded_files
        WHERE client_id = ? AND file_hash_sha256 = ? AND period_code != ?
              AND is_deleted = 0 AND is_duplicate = 0
        LIMIT 1
    """, (client_id, file_hash, period_code))
    cross_dup = cursor.fetchone()

    if cross_dup:
        cross_period = cross_dup['period_code'] if isinstance(cross_dup, sqlite3.Row) else cross_dup[0]
        result['duplicate_in_period'] = cross_period

    # === Dönem doğrulama ===
    # Dosyayı geçici dizine yazıp period validator'a gönder
    try:
        _validator = PeriodValidator()
        import tempfile as _tf
        with _tf.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        validation = _validator.validate_file_period(
            file_path=tmp_path,
            doc_type=doc_type,
            filename=filename,
            selected_period=period_code,
        )

        # Geçici dosyayı temizle
        try:
            tmp_path.unlink()
        except OSError:
            pass

        result['period_validation_status'] = validation.status
        result['period_validation_detail'] = validation.detail or ''

        if validation.status == 'mismatch':
            result['parse_status'] = 'period_mismatch'
            result['message'] = validation.detail or 'Dönem uyuşmazlığı'
            result['detected_period'] = validation.detected_period

            # Dosyayı kaydetme, parse etme — engelleme
            cursor.execute("""
                INSERT INTO uploaded_files
                (id, session_id, tenant_id, client_id, period_code,
                 original_filename, doc_type, file_hash_sha256, file_size, mime_type,
                 period_validation_status, period_validation_detail,
                 parse_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mismatch', ?, 'period_mismatch', datetime('now'))
            """, (
                file_id, session_id, tenant_id, client_id, period_code,
                filename, doc_type, file_hash, file_size, mime_type,
                validation.detail,
            ))

            return result

    except Exception as e:
        logger.warning(f"[Ingest] Dönem doğrulaması atlandı ({filename}): {e}")
        result['period_validation_status'] = 'unknown'
        result['period_validation_detail'] = f'Doğrulama hatası: {str(e)}'

    # === Diske kaydet ===
    stored_path = _store_file(tenant_id, client_id, period_code, filename, content)

    # === VT-9: uploaded_files tablosuna kaydet (INSERT OR IGNORE ile race condition koruması) ===
    # UNIQUE index (idx_uploaded_files_dedup) concurrent insert'i engeller
    cursor.execute("""
        INSERT OR IGNORE INTO uploaded_files
        (id, session_id, tenant_id, client_id, period_code,
         original_filename, doc_type, file_hash_sha256, file_size, mime_type,
         stored_path, duplicate_in_period,
         period_validation_status, period_validation_detail,
         parse_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    """, (
        file_id, session_id, tenant_id, client_id, period_code,
        filename, doc_type, file_hash, file_size, mime_type,
        stored_path, result.get('duplicate_in_period'),
        result.get('period_validation_status', 'unknown'),
        result.get('period_validation_detail', ''),
    ))

    # VT-9: INSERT OR IGNORE ile race condition yakalandı mı kontrol et
    if cursor.rowcount == 0:
        # Eş zamanlı upload bu dosyayı zaten eklemiş
        result['is_duplicate'] = True
        result['parse_status'] = 'skipped'
        result['message'] = f"Eş zamanlı upload tarafından zaten kaydedilmiş: '{filename}'"
        logger.warning(f"[Ingest] VT-9 race condition yakalandı: {filename} hash={file_hash[:16]}")
        return result

    # === Parse et ===
    try:
        parse_result = _parse_and_store_file(
            cursor, file_id, tenant_id, client_id,
            period_code, doc_type, stored_path, filename
        )
        result['parse_status'] = parse_result.get('status', 'error')
        result['parsed_row_count'] = parse_result.get('inserted_count', 0)
        result['message'] = parse_result.get('message', '')
    except Exception as e:
        result['parse_status'] = 'error'
        result['message'] = f"Parse hatası: {str(e)}"
        logger.error(f"[Ingest] Parse hatası {filename}: {e}")

    return result


# ==================== GET /api/v2/ingest/files/{client_id}/{period} ====================

@router.get("/ingest/files/{client_id}/{period}")
async def list_uploaded_files(client_id: str, period: str):
    """
    Yüklenen dosyaları listele (dönem bazında).
    Silinmemiş, unique dosyalar + duplicate bilgisi.
    """
    try:
        period_code = norm_period(period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, original_filename, doc_type, file_size, mime_type,
                   file_hash_sha256, parse_status, parse_error,
                   parsed_row_count, is_duplicate, duplicate_of_id,
                   duplicate_in_period, period_validation_status,
                   period_validation_detail, created_at
            FROM uploaded_files
            WHERE client_id = ? AND period_code = ? AND is_deleted = 0
            ORDER BY created_at DESC
        """, (client_id, period_code))

        files = []
        for row in cursor.fetchall():
            files.append({
                "id": row["id"],
                "filename": row["original_filename"],
                "doc_type": row["doc_type"],
                "file_size": row["file_size"],
                "mime_type": row["mime_type"],
                "parse_status": row["parse_status"],
                "parsed_row_count": row["parsed_row_count"] or 0,
                "is_duplicate": bool(row["is_duplicate"]),
                "duplicate_in_period": row["duplicate_in_period"],
                "upload_date": row["created_at"],
                "can_delete": not bool(row["is_duplicate"]),
            })

        # Özet
        unique_files = [f for f in files if not f["is_duplicate"]]
        total_rows = sum(f["parsed_row_count"] for f in unique_files)

        conn.close()

        return {
            "files": files,
            "summary": {
                "total_files": len(files),
                "unique_files": len(unique_files),
                "duplicate_files": len(files) - len(unique_files),
                "total_rows_parsed": total_rows,
            }
        }

    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Sorgu hatası: {str(e)}")


# ==================== DELETE /api/v2/ingest/file/{file_id} ====================

@router.delete("/ingest/file/{file_id}")
async def delete_uploaded_file(file_id: str):
    """
    Tekil dosya sil (soft delete).
    İlgili veri tablolarından bu dosyadan gelen veriler de silinir.
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Dosya bilgisi al
        cursor.execute("""
            SELECT id, client_id, period_code, doc_type, original_filename,
                   parsed_row_count, is_deleted
            FROM uploaded_files WHERE id = ?
        """, (file_id,))
        file_row = cursor.fetchone()

        if not file_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Dosya bulunamadı")

        if file_row["is_deleted"]:
            conn.close()
            raise HTTPException(status_code=400, detail="Bu dosya zaten silinmiş")

        client_id = file_row["client_id"]
        period_code = file_row["period_code"]
        doc_type = file_row["doc_type"]
        filename = file_row["original_filename"]

        # İlgili veri tablolarından sil
        deleted_rows = _delete_file_data(cursor, file_id, doc_type, client_id, period_code)

        # Soft delete
        cursor.execute("""
            UPDATE uploaded_files
            SET is_deleted = 1, deleted_at = datetime('now')
            WHERE id = ?
        """, (file_id,))

        # İlgili cache tabloları temizle
        _cleanup_caches(cursor, client_id, period_code)

        try:
            conn.commit()
        except sqlite3.Error:
            conn.rollback()
            raise
        conn.close()

        logger.info(f"[Ingest] Dosya silindi: {filename} ({doc_type}), "
                    f"{deleted_rows} veri satırı temizlendi")

        return {
            "success": True,
            "message": f"'{filename}' silindi",
            "deleted_data_rows": deleted_rows,
            "doc_type": doc_type,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.close()
        logger.error(f"[Ingest] Dosya silme hatası: {e}")
        raise HTTPException(status_code=500, detail=f"Silme hatası: {str(e)}")


def _delete_file_data(cursor, file_id: str, doc_type: str,
                      client_id: str, period_code: str) -> int:
    """Dosyadan gelen verileri ilgili tablolardan sil"""
    total_deleted = 0

    # source_file_id ile eşleşen kayıtlar (yeni sistem)
    tables_by_type = {
        'MIZAN': ['mizan_entries'],
        'BANKA': ['bank_transactions'],
        'YEVMIYE': ['journal_entries'],
        'KEBIR': ['ledger_entries'],
        'EDEFTER_BERAT': ['edefter_entries'],
        'BEYANNAME': ['beyanname_entries'],
        'GECICI_VERGI': ['beyanname_entries'],
        'POSET': ['beyanname_entries'],
        'TAHAKKUK': ['tahakkuk_entries'],
    }

    _VALID_TABLES = frozenset(t for ts in tables_by_type.values() for t in ts)
    tables = tables_by_type.get(doc_type, [])

    for table in tables:
        assert table in _VALID_TABLES, f"Invalid table name: {table}"
        try:
            # Önce source_file_id ile dene (yeni kayıtlar)
            cursor.execute(f"""
                SELECT COUNT(*) FROM {table} WHERE source_file_id = ?
            """, (file_id,))
            count = cursor.fetchone()[0]

            if count > 0:
                cursor.execute(f"DELETE FROM {table} WHERE source_file_id = ?", (file_id,))
                total_deleted += count
            else:
                # Eski kayıtlarda source_file_id yok, tüm dönem verisini silmemek lazım
                # Sadece yeni sistemle yüklenen veriler silinebilir
                logger.info(f"[Ingest] {table} tablosunda source_file_id={file_id} kaydı yok")

        except sqlite3.OperationalError as e:
            # source_file_id sütunu yoksa
            if "no such column" in str(e):
                logger.warning(f"[Ingest] {table} tablosunda source_file_id sütunu yok")
            else:
                raise

    return total_deleted


def _cleanup_caches(cursor, client_id: str, period_code: str):
    """Veri silindiğinde cache tablolarını temizle"""
    period_id = period_code.replace('-', '_').upper()

    cache_tables = [
        ("ai_analyses", "client_id = ? AND period_code = ?"),
        ("generated_reports", "client_id = ? AND period_code = ?"),
        ("feed_items", "client_id = ? AND period = ?"),
    ]
    _VALID_CACHE_TABLES = frozenset(t for t, _ in cache_tables)

    for table, condition in cache_tables:
        assert table in _VALID_CACHE_TABLES, f"Invalid cache table: {table}"
        try:
            cursor.execute(f"DELETE FROM {table} WHERE {condition}", (client_id, period_id))
        except sqlite3.OperationalError:
            pass  # Tablo yoksa geç


# ==================== Pipeline Status (mevcut frontend uyumu) ====================

@router.get("/ingest/pipeline-status/{session_id}")
async def get_ingest_pipeline_status(session_id: str):
    """
    Post-ingest pipeline durumunu getir.
    Frontend bu endpoint'i 3sn arayla poll eder.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Önce yeni upload_sessions tablosunda ara
    cursor.execute("""
        SELECT id, client_id, period_code, status, completed_at
        FROM upload_sessions WHERE id = ?
    """, (session_id,))
    session = cursor.fetchone()

    if session:
        # Pipeline status sütunları var mı kontrol et
        pipeline_status = "pending"
        pipeline_detail = ""
        try:
            cursor.execute("""
                SELECT pipeline_status, pipeline_detail, pipeline_completed_at,
                       cross_check_count, analysis_findings_count
                FROM upload_sessions WHERE id = ?
            """, (session_id,))
            prow = cursor.fetchone()
            if prow:
                pipeline_status = prow["pipeline_status"] or "pending"
                pipeline_detail = prow["pipeline_detail"] or ""

                conn.close()
                return {
                    "session_id": session_id,
                    "pipeline_status": pipeline_status,
                    "pipeline_detail": pipeline_detail,
                    "pipeline_completed_at": prow["pipeline_completed_at"],
                    "cross_check_count": prow["cross_check_count"] or 0,
                    "analysis_findings_count": prow["analysis_findings_count"] or 0,
                    "ingest_status": session["status"],
                    "client_id": session["client_id"],
                    "period_id": session["period_code"],
                }
        except sqlite3.OperationalError:
            pass

        # Pipeline sütunları yoksa basit yanıt
        conn.close()
        status = session["status"]
        return {
            "session_id": session_id,
            "pipeline_status": "completed" if status == "completed" else "pending",
            "pipeline_detail": "",
            "pipeline_completed_at": session["completed_at"],
            "cross_check_count": 0,
            "analysis_findings_count": 0,
            "ingest_status": status,
            "client_id": session["client_id"],
            "period_id": session["period_code"],
        }

    conn.close()

    # Eski sistem fallback
    try:
        status_data = get_pipeline_status(session_id)
        if status_data:
            return {
                "session_id": session_id,
                "pipeline_status": status_data.get("pipeline_status") or "pending",
                "pipeline_detail": status_data.get("pipeline_detail", ""),
                "pipeline_completed_at": status_data.get("pipeline_completed_at"),
                "cross_check_count": status_data.get("cross_check_count", 0),
                "analysis_findings_count": status_data.get("analysis_findings_count", 0),
                "ingest_status": status_data.get("status"),
                "client_id": status_data.get("client_id"),
                "period_id": status_data.get("period_id"),
            }
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Session bulunamadı")
