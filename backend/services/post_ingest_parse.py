# -*- coding: utf-8 -*-
"""
Post-Ingest Parse Service
==========================

İngest pipeline tamamlandıktan sonra canonical_docs üzerinden
dosyaları parse edip veri tablolarına (mizan_entries, bank_transactions vb.) yazar.

Akış:
  1. ingest_zip() → blob/canonical dedupe tamamlanır
  2. trigger_parse_for_session() → canonical_docs üzerinden parse başlar
  3. Her doc_type için ilgili parse fonksiyonu çalışır
  4. Parse sonuçları veri tablolarına yazılır (UPSERT mantığıyla)

Prensip: "Silme yok" — mevcut veri silinmez, UPSERT ile güncellenir.

Author: Claude
Date: 2026-02-06
"""

import logging
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from services.parse_service import (
    parse_mizan_file,
    parse_bank_statement,
    parse_yevmiye_defteri,
    parse_defteri_kebir,
    parse_edefter_xml,
    parse_beyanname_pdf,
    parse_tahakkuk_pdf,
    _parse_tr_number,
)

logger = logging.getLogger(__name__)


@dataclass
class ParseResult:
    """Tek bir dosyanın parse sonucu"""
    doc_type: str
    canonical_doc_id: str
    blob_id: str
    filename: str
    status: str = "pending"  # pending, success, empty, error, skipped
    row_count: int = 0
    message: str = ""


@dataclass
class SessionParseResults:
    """Bir session'ın tüm parse sonuçları"""
    session_id: str
    total_parsed: int = 0
    total_rows: int = 0
    success_count: int = 0
    error_count: int = 0
    skip_count: int = 0
    results: List[Dict[str, Any]] = field(default_factory=list)


# Doc type -> parse fonksiyonu + hedef tablo mapping
DOC_TYPE_PARSERS = {
    "MIZAN": {
        "extensions": [".csv", ".xlsx", ".xls"],
        "parser": "parse_mizan",
        "table": "mizan_entries",
    },
    "BANKA": {
        "extensions": [".csv", ".xlsx", ".xls"],
        "parser": "parse_banka",
        "table": "bank_transactions",
    },
    "YEVMIYE_DEFTERI": {
        "extensions": [".xlsx", ".xls"],
        "parser": "parse_yevmiye",
        "table": "journal_entries",
    },
    "DEFTERI_KEBIR": {
        "extensions": [".xlsx", ".xls"],
        "parser": "parse_kebir",
        "table": "ledger_entries",
    },
    "EDEFTER_YEVMIYE": {
        "extensions": [".xml"],
        "parser": "parse_edefter",
        "table": "edefter_entries",
    },
    "EDEFTER_KEBIR": {
        "extensions": [".xml"],
        "parser": "parse_edefter",
        "table": "edefter_entries",
    },
    "BEYANNAME_KDV": {
        "extensions": [".pdf"],
        "parser": "parse_beyanname",
        "table": "beyanname_entries",
    },
    "BEYANNAME_MUHTASAR": {
        "extensions": [".pdf"],
        "parser": "parse_beyanname",
        "table": "beyanname_entries",
    },
    "BEYANNAME": {
        "extensions": [".pdf"],
        "parser": "parse_beyanname",
        "table": "beyanname_entries",
    },
    "GECICI_VERGI": {
        "extensions": [".pdf"],
        "parser": "parse_beyanname",
        "table": "beyanname_entries",
    },
    "POSET": {
        "extensions": [".pdf"],
        "parser": "parse_beyanname",
        "table": "beyanname_entries",
    },
    "TAHAKKUK_KDV": {
        "extensions": [".pdf"],
        "parser": "parse_tahakkuk",
        "table": "tahakkuk_entries",
    },
    "TAHAKKUK_MUHTASAR": {
        "extensions": [".pdf"],
        "parser": "parse_tahakkuk",
        "table": "tahakkuk_entries",
    },
    "TAHAKKUK": {
        "extensions": [".pdf"],
        "parser": "parse_tahakkuk",
        "table": "tahakkuk_entries",
    },
}


def trigger_parse_for_session(
    db_path: Path,
    blob_storage_path: Path,
    session_id: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
) -> SessionParseResults:
    """
    İngest session tamamlandıktan sonra parse pipeline'ını çalıştır.

    canonical_docs tablosundan session'a ait yeni doc'ları çekip
    blob dosyalarını parse eder, veri tablolarına yazar.

    Args:
        db_path: SQLite veritabanı yolu
        blob_storage_path: Blob depolama dizini
        session_id: Upload session UUID
        tenant_id: SMMM ID
        client_id: Mükellef ID
        period_id: Dönem ID (örn: 2025_Q1)

    Returns:
        SessionParseResults with per-file results
    """
    results = SessionParseResults(session_id=session_id)

    conn = sqlite3.connect(str(db_path), timeout=30)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Session'a ait canonical doc'ları bul
        # raw_files → canonical_aliases → canonical_docs zincirinden gideriz
        cursor.execute("""
            SELECT DISTINCT
                cd.id as canonical_doc_id,
                cd.doc_type,
                cd.primary_blob_id,
                b.stored_path,
                ca.alias_filename
            FROM raw_files rf
            JOIN canonical_aliases ca ON ca.raw_file_id = rf.id
            JOIN canonical_docs cd ON ca.canonical_doc_id = cd.id
            JOIN blobs b ON cd.primary_blob_id = b.id
            WHERE rf.upload_session_id = ?
              AND rf.is_garbage = 0
              AND cd.is_active = 1
            ORDER BY cd.doc_type
        """, (session_id,))

        docs_to_parse = cursor.fetchall()

        if not docs_to_parse:
            logger.info(f"[{session_id[:8]}] Parse edilecek canonical doc bulunamadı")
            return results

        logger.info(f"[{session_id[:8]}] {len(docs_to_parse)} canonical doc parse edilecek")

        # Her doc için parse et
        for doc in docs_to_parse:
            doc_type = doc['doc_type']
            canonical_doc_id = doc['canonical_doc_id']
            blob_id = doc['primary_blob_id']
            stored_path = doc['stored_path']
            filename = doc['alias_filename']

            parse_result = _parse_single_doc(
                cursor=cursor,
                blob_storage_path=blob_storage_path,
                doc_type=doc_type,
                canonical_doc_id=canonical_doc_id,
                blob_id=blob_id,
                stored_path=stored_path,
                filename=filename,
                tenant_id=tenant_id,
                client_id=client_id,
                period_id=period_id,
            )

            results.results.append({
                "doc_type": parse_result.doc_type,
                "filename": parse_result.filename,
                "status": parse_result.status,
                "row_count": parse_result.row_count,
                "message": parse_result.message,
            })

            results.total_parsed += 1
            results.total_rows += parse_result.row_count

            if parse_result.status == "success":
                results.success_count += 1
            elif parse_result.status == "error":
                results.error_count += 1
            else:
                results.skip_count += 1

        conn.commit()
        logger.info(
            f"[{session_id[:8]}] Parse tamamlandı: "
            f"{results.success_count} başarılı, "
            f"{results.error_count} hata, "
            f"{results.skip_count} atlandı, "
            f"toplam {results.total_rows} satır"
        )

    except Exception as e:
        logger.error(f"[{session_id[:8]}] Parse pipeline hatası: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

    return results


def _parse_single_doc(
    cursor: sqlite3.Cursor,
    blob_storage_path: Path,
    doc_type: str,
    canonical_doc_id: str,
    blob_id: str,
    stored_path: str,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
) -> ParseResult:
    """
    Tek bir canonical doc'u parse edip veri tablosuna yaz.
    """
    result = ParseResult(
        doc_type=doc_type,
        canonical_doc_id=canonical_doc_id,
        blob_id=blob_id,
        filename=filename,
    )

    # Parser config'i bul
    parser_config = DOC_TYPE_PARSERS.get(doc_type)
    if not parser_config:
        result.status = "skipped"
        result.message = f"Parse desteklenmeyen doc_type: {doc_type}"
        logger.debug(f"Skipping {doc_type}: {filename}")
        return result

    # Dosya uzantısını kontrol et
    file_ext = Path(filename).suffix.lower()
    if file_ext not in parser_config["extensions"]:
        result.status = "skipped"
        result.message = f"Desteklenmeyen uzantı: {file_ext}"
        return result

    # Blob dosyasının tam yolunu bul
    blob_path = blob_storage_path / stored_path
    if not blob_path.exists():
        result.status = "error"
        result.message = f"Blob dosyası bulunamadı: {stored_path}"
        logger.warning(f"Blob not found: {blob_path}")
        return result

    try:
        parser_name = parser_config["parser"]

        if parser_name == "parse_mizan":
            return _do_parse_mizan(cursor, blob_path, filename, tenant_id, client_id, period_id, result)
        elif parser_name == "parse_banka":
            return _do_parse_banka(cursor, blob_path, filename, tenant_id, client_id, period_id, result)
        elif parser_name == "parse_yevmiye":
            return _do_parse_yevmiye(cursor, blob_path, filename, tenant_id, client_id, period_id, result)
        elif parser_name == "parse_kebir":
            return _do_parse_kebir(cursor, blob_path, filename, tenant_id, client_id, period_id, result)
        elif parser_name == "parse_edefter":
            return _do_parse_edefter(cursor, blob_path, filename, tenant_id, client_id, period_id, result)
        elif parser_name == "parse_beyanname":
            return _do_parse_beyanname(cursor, blob_path, filename, tenant_id, client_id, period_id, result)
        elif parser_name == "parse_tahakkuk":
            return _do_parse_tahakkuk(cursor, blob_path, filename, tenant_id, client_id, period_id, result)
        else:
            result.status = "skipped"
            result.message = f"Bilinmeyen parser: {parser_name}"
            return result

    except Exception as e:
        result.status = "error"
        result.message = f"Parse hatası: {str(e)}"
        logger.error(f"Parse error {filename}: {e}")
        return result


# =============================================================================
# PARSE + STORE FONKSİYONLARI (UPSERT mantığıyla)
# =============================================================================

def _do_parse_mizan(
    cursor: sqlite3.Cursor,
    file_path: Path,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    result: ParseResult,
) -> ParseResult:
    """Mizan parse et ve mizan_entries'e yaz (UPSERT)"""
    rows = parse_mizan_file(file_path)

    if not rows:
        result.status = "empty"
        result.message = "Mizan dosyasında veri bulunamadı"
        return result

    now = datetime.utcnow().isoformat()
    inserted = 0

    for idx, row in enumerate(rows):
        try:
            # UPSERT: Aynı hesap kodu varsa güncelle
            cursor.execute("""
                SELECT id FROM mizan_entries
                WHERE tenant_id = ? AND client_id = ? AND period_id = ? AND hesap_kodu = ?
            """, (tenant_id, client_id, period_id, row['hesap_kodu']))

            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE mizan_entries
                    SET hesap_adi = ?, borc_toplam = ?, alacak_toplam = ?,
                        borc_bakiye = ?, alacak_bakiye = ?,
                        source_file = ?, row_index = ?, updated_at = ?
                    WHERE id = ?
                """, (
                    row.get('hesap_adi'),
                    row.get('borc_toplam', 0),
                    row.get('alacak_toplam', 0),
                    row.get('borc_bakiye', 0),
                    row.get('alacak_bakiye', 0),
                    filename,
                    idx,
                    now,
                    existing['id']
                ))
            else:
                cursor.execute("""
                    INSERT INTO mizan_entries (
                        tenant_id, client_id, period_id,
                        hesap_kodu, hesap_adi,
                        borc_toplam, alacak_toplam,
                        borc_bakiye, alacak_bakiye,
                        source_file, row_index,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    tenant_id, client_id, period_id,
                    row['hesap_kodu'],
                    row.get('hesap_adi'),
                    row.get('borc_toplam', 0),
                    row.get('alacak_toplam', 0),
                    row.get('borc_bakiye', 0),
                    row.get('alacak_bakiye', 0),
                    filename, idx, now, now
                ))
            inserted += 1
        except Exception as e:
            logger.warning(f"Mizan satır {idx} ({row.get('hesap_kodu', '?')}): {e}")

    result.status = "success"
    result.row_count = inserted
    result.message = f"{inserted} hesap kaydedildi"
    logger.info(f"Mizan parsed: {filename} → {inserted} satır")
    return result


def _do_parse_banka(
    cursor: sqlite3.Cursor,
    file_path: Path,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    result: ParseResult,
) -> ParseResult:
    """Banka ekstresi parse et ve bank_transactions'a yaz"""
    rows = parse_bank_statement(file_path)

    if not rows:
        result.status = "empty"
        result.message = "Banka ekstresinde veri bulunamadı"
        return result

    now = datetime.utcnow().isoformat()
    inserted = 0

    for idx, row in enumerate(rows):
        try:
            cursor.execute("""
                INSERT INTO bank_transactions (
                    tenant_id, client_id, period_id,
                    hesap_kodu, banka_adi, tarih,
                    aciklama, islem_tipi, tutar, bakiye,
                    source_file, line_number,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id,
                row.get('hesap_kodu'),
                row.get('banka_adi'),
                row.get('tarih'),
                row.get('aciklama'),
                row.get('islem_tipi'),
                row.get('tutar', 0),
                row.get('bakiye', 0),
                filename, idx, now, now
            ))
            inserted += 1
        except Exception as e:
            logger.warning(f"Banka satır {idx}: {e}")

    result.status = "success"
    result.row_count = inserted
    result.message = f"{inserted} banka işlemi kaydedildi"
    logger.info(f"Banka parsed: {filename} → {inserted} satır")
    return result


def _do_parse_yevmiye(
    cursor: sqlite3.Cursor,
    file_path: Path,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    result: ParseResult,
) -> ParseResult:
    """Yevmiye defteri parse et ve journal_entries'e yaz"""
    rows = parse_yevmiye_defteri(file_path)

    if not rows:
        result.status = "empty"
        result.message = "Yevmiye defterinde veri bulunamadı"
        return result

    now = datetime.utcnow().isoformat()
    inserted = 0

    for idx, row in enumerate(rows):
        try:
            cursor.execute("""
                INSERT INTO journal_entries (
                    tenant_id, client_id, period_id,
                    fis_no, tarih, fis_aciklama,
                    hesap_kodu, hesap_adi, aciklama,
                    borc, alacak,
                    source_file, line_number,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id,
                row.get('fis_no'),
                row.get('tarih'),
                row.get('fis_aciklama'),
                row.get('hesap_kodu'),
                row.get('hesap_adi'),
                row.get('aciklama'),
                row.get('borc', 0),
                row.get('alacak', 0),
                filename, idx, now, now
            ))
            inserted += 1
        except Exception as e:
            logger.warning(f"Yevmiye satır {idx}: {e}")

    result.status = "success"
    result.row_count = inserted
    result.message = f"{inserted} yevmiye kaydı eklendi"
    logger.info(f"Yevmiye parsed: {filename} → {inserted} satır")
    return result


def _do_parse_kebir(
    cursor: sqlite3.Cursor,
    file_path: Path,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    result: ParseResult,
) -> ParseResult:
    """Defteri Kebir parse et ve ledger_entries'e yaz"""
    rows = parse_defteri_kebir(file_path)

    if not rows:
        result.status = "empty"
        result.message = "Defteri Kebir'de veri bulunamadı"
        return result

    now = datetime.utcnow().isoformat()
    inserted = 0

    for idx, row in enumerate(rows):
        try:
            cursor.execute("""
                INSERT INTO ledger_entries (
                    tenant_id, client_id, period_id,
                    hesap_kodu, hesap_adi,
                    tarih, fis_no, aciklama,
                    borc, alacak, bakiye,
                    source_file, line_number,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id,
                row.get('hesap_kodu'),
                row.get('hesap_adi'),
                row.get('tarih'),
                row.get('fis_no'),
                row.get('aciklama'),
                row.get('borc', 0),
                row.get('alacak', 0),
                row.get('bakiye', 0),
                filename,
                row.get('line_number', idx),
                now, now
            ))
            inserted += 1
        except Exception as e:
            logger.warning(f"Kebir satır {idx}: {e}")

    result.status = "success"
    result.row_count = inserted
    result.message = f"{inserted} kebir kaydı eklendi"
    logger.info(f"Kebir parsed: {filename} → {inserted} satır")
    return result


def _do_parse_edefter(
    cursor: sqlite3.Cursor,
    file_path: Path,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    result: ParseResult,
) -> ParseResult:
    """E-Defter XML parse et ve edefter_entries'e yaz"""
    rows = parse_edefter_xml(file_path)

    if not rows:
        result.status = "empty"
        result.message = "E-Defter'de veri bulunamadı"
        return result

    now = datetime.utcnow().isoformat()
    inserted = 0

    for idx, row in enumerate(rows):
        try:
            cursor.execute("""
                INSERT INTO edefter_entries (
                    tenant_id, client_id, period_id,
                    defter_tipi, fis_no, satir_no, tarih,
                    fis_aciklama, hesap_kodu, hesap_adi,
                    alt_hesap_kodu, alt_hesap_adi,
                    tutar, borc_alacak,
                    belge_no, belge_tarihi, aciklama,
                    source_file,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id,
                row.get('defter_tipi'),
                row.get('fis_no'),
                row.get('satir_no'),
                row.get('tarih'),
                row.get('fis_aciklama'),
                row.get('hesap_kodu'),
                row.get('hesap_adi'),
                row.get('alt_hesap_kodu'),
                row.get('alt_hesap_adi'),
                row.get('tutar', 0),
                row.get('borc_alacak'),
                row.get('belge_no'),
                row.get('belge_tarihi'),
                row.get('aciklama'),
                filename, now, now
            ))
            inserted += 1
        except Exception as e:
            logger.warning(f"E-Defter satır {idx}: {e}")

    result.status = "success"
    result.row_count = inserted
    result.message = f"{inserted} e-defter kaydı eklendi"
    logger.info(f"E-Defter parsed: {filename} → {inserted} satır")
    return result


def _do_parse_beyanname(
    cursor: sqlite3.Cursor,
    file_path: Path,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    result: ParseResult,
) -> ParseResult:
    """Beyanname PDF parse et ve beyanname_entries'e yaz"""
    parsed = parse_beyanname_pdf(file_path)

    if not parsed.get('parsed_ok'):
        result.status = "error"
        result.message = f"Parse hatası: {', '.join(parsed.get('parse_errors', []))}"
        return result

    now = datetime.utcnow().isoformat()

    try:
        # UPSERT: Aynı beyanname tipi + dönem varsa güncelle
        cursor.execute("""
            SELECT id FROM beyanname_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
              AND beyanname_tipi = ? AND donem_ay = ?
        """, (
            tenant_id, client_id, period_id,
            parsed.get('beyanname_tipi'),
            parsed.get('donem_ay'),
        ))

        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE beyanname_entries
                SET donem_yil = ?, vergi_dairesi = ?, vkn = ?, unvan = ?,
                    onay_zamani = ?, matrah_toplam = ?, hesaplanan_vergi = ?,
                    indirimler_toplam = ?, odenecek_vergi = ?, devreden_kdv = ?,
                    source_file = ?, raw_text = ?, parsed_ok = ?, updated_at = ?
                WHERE id = ?
            """, (
                parsed.get('donem_yil'),
                parsed.get('vergi_dairesi'),
                parsed.get('vkn'),
                parsed.get('unvan'),
                parsed.get('onay_zamani'),
                parsed.get('matrah_toplam', 0),
                parsed.get('hesaplanan_vergi', 0),
                parsed.get('indirimler_toplam', 0),
                parsed.get('odenecek_vergi', 0),
                parsed.get('devreden_kdv', 0),
                filename,
                parsed.get('raw_text', '')[:10000],
                1 if parsed.get('parsed_ok') else 0,
                now,
                existing['id']
            ))
        else:
            cursor.execute("""
                INSERT INTO beyanname_entries (
                    tenant_id, client_id, period_id,
                    beyanname_tipi, donem_yil, donem_ay, donem_tipi,
                    vergi_dairesi, vkn, unvan, onay_zamani,
                    matrah_toplam, hesaplanan_vergi, indirimler_toplam,
                    odenecek_vergi, devreden_kdv,
                    source_file, raw_text, parsed_ok,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id,
                parsed.get('beyanname_tipi'),
                parsed.get('donem_yil'),
                parsed.get('donem_ay'),
                parsed.get('donem_tipi'),
                parsed.get('vergi_dairesi'),
                parsed.get('vkn'),
                parsed.get('unvan'),
                parsed.get('onay_zamani'),
                parsed.get('matrah_toplam', 0),
                parsed.get('hesaplanan_vergi', 0),
                parsed.get('indirimler_toplam', 0),
                parsed.get('odenecek_vergi', 0),
                parsed.get('devreden_kdv', 0),
                filename,
                parsed.get('raw_text', '')[:10000],
                1 if parsed.get('parsed_ok') else 0,
                now, now
            ))

        result.status = "success"
        result.row_count = 1
        result.message = f"{parsed.get('beyanname_tipi')} beyannamesi kaydedildi"

    except Exception as e:
        result.status = "error"
        result.message = f"DB yazma hatası: {str(e)}"
        logger.error(f"Beyanname DB error: {e}")

    return result


def _do_parse_tahakkuk(
    cursor: sqlite3.Cursor,
    file_path: Path,
    filename: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
    result: ParseResult,
) -> ParseResult:
    """Tahakkuk PDF parse et ve tahakkuk_entries'e yaz"""
    parsed = parse_tahakkuk_pdf(file_path)

    if not parsed.get('parsed_ok'):
        result.status = "error"
        result.message = f"Parse hatası: {', '.join(parsed.get('parse_errors', []))}"
        return result

    now = datetime.utcnow().isoformat()

    try:
        # UPSERT: Aynı tahakkuk tipi + dönem varsa güncelle
        cursor.execute("""
            SELECT id FROM tahakkuk_entries
            WHERE tenant_id = ? AND client_id = ? AND period_id = ?
              AND tahakkuk_tipi = ? AND donem_ay = ?
        """, (
            tenant_id, client_id, period_id,
            parsed.get('tahakkuk_tipi'),
            parsed.get('donem_ay'),
        ))

        existing = cursor.fetchone()

        if existing:
            tahakkuk_id = existing['id']
            cursor.execute("""
                UPDATE tahakkuk_entries
                SET donem_yil = ?, vergi_dairesi = ?, vkn = ?, unvan = ?,
                    tahakkuk_no = ?, tahakkuk_tarihi = ?,
                    vergi_turu = ?, vergi_tutari = ?, gecikme_zammi = ?, toplam_borc = ?,
                    vade_tarihi = ?,
                    source_file = ?, raw_text = ?, parsed_ok = ?, updated_at = ?
                WHERE id = ?
            """, (
                parsed.get('donem_yil'),
                parsed.get('vergi_dairesi'),
                parsed.get('vkn'),
                parsed.get('unvan'),
                parsed.get('tahakkuk_no'),
                parsed.get('tahakkuk_tarihi'),
                parsed.get('vergi_turu'),
                parsed.get('vergi_tutari', 0),
                parsed.get('gecikme_zammi', 0),
                parsed.get('toplam_borc', 0),
                parsed.get('vade_tarihi'),
                filename,
                parsed.get('raw_text', '')[:10000],
                1 if parsed.get('parsed_ok') else 0,
                now,
                tahakkuk_id
            ))

            # Eski kalemleri sil, yenilerini ekle
            cursor.execute("DELETE FROM tahakkuk_kalemleri WHERE tahakkuk_id = ?", (tahakkuk_id,))
        else:
            cursor.execute("""
                INSERT INTO tahakkuk_entries (
                    tenant_id, client_id, period_id,
                    tahakkuk_tipi, donem_yil, donem_ay,
                    vergi_dairesi, vkn, unvan,
                    tahakkuk_no, tahakkuk_tarihi,
                    vergi_turu, vergi_tutari, gecikme_zammi, toplam_borc,
                    vade_tarihi,
                    source_file, raw_text, parsed_ok,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tenant_id, client_id, period_id,
                parsed.get('tahakkuk_tipi'),
                parsed.get('donem_yil'),
                parsed.get('donem_ay'),
                parsed.get('vergi_dairesi'),
                parsed.get('vkn'),
                parsed.get('unvan'),
                parsed.get('tahakkuk_no'),
                parsed.get('tahakkuk_tarihi'),
                parsed.get('vergi_turu'),
                parsed.get('vergi_tutari', 0),
                parsed.get('gecikme_zammi', 0),
                parsed.get('toplam_borc', 0),
                parsed.get('vade_tarihi'),
                filename,
                parsed.get('raw_text', '')[:10000],
                1 if parsed.get('parsed_ok') else 0,
                now, now
            ))
            tahakkuk_id = cursor.lastrowid

        # Kalemleri ekle
        kalemler = parsed.get('kalemler', [])
        for kalem in kalemler:
            cursor.execute("""
                INSERT INTO tahakkuk_kalemleri (
                    tahakkuk_id, vergi_kodu, vergi_adi,
                    matrah, tahakkuk_eden, mahsup_edilen, odenecek,
                    vade_tarihi, is_ana_vergi
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tahakkuk_id,
                kalem.get('vergi_kodu'),
                kalem.get('vergi_adi'),
                kalem.get('matrah', 0),
                kalem.get('tahakkuk_eden', 0),
                kalem.get('mahsup_edilen', 0),
                kalem.get('odenecek', 0),
                kalem.get('vade_tarihi'),
                1 if kalem.get('is_ana_vergi') else 0
            ))

        result.status = "success"
        result.row_count = 1 + len(kalemler)
        result.message = f"{parsed.get('tahakkuk_tipi')} tahakkuku kaydedildi ({len(kalemler)} kalem)"

    except Exception as e:
        result.status = "error"
        result.message = f"DB yazma hatası: {str(e)}"
        logger.error(f"Tahakkuk DB error: {e}")

    return result
