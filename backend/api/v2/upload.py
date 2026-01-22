# -*- coding: utf-8 -*-
"""
LYNTOS v2 Upload API
=====================

POST /api/v2/upload - Dönem verisi yükleme (ZIP)

Bu endpoint, frontend'den gelen ZIP dosyasını alıp:
1. ZIP'i açar
2. Dosya tiplerini algılar
3. Parse eder
4. Database'e yazar
5. Sonuç döner

KRİTİK: Frontend parse YAPMIYOR. Sadece dosya gönderiyor.
Bu endpoint "Backend Parse" prensibinin uygulamasıdır.

Author: Claude
Date: 2026-01-22
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pathlib import Path
from typing import Optional, List, Dict, Any
import zipfile
import tempfile
import re
import os
import hashlib
import sqlite3
import uuid
import logging
from datetime import datetime

from services.parse_service import (
    parse_mizan_file,
    trigger_parse_for_document
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2", tags=["upload"])

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"

# Dosya tipi pattern'leri (bulk_upload.py'den, genişletilmiş)
# ÖNEMLİ: Sıralama önemli! Daha spesifik pattern'ler önce kontrol edilmeli
# OrderedDict gibi davranması için classify_file fonksiyonu sırayla kontrol eder
DOC_PATTERNS_ORDERED = [
    # Önce spesifik pattern'ler (sıralama önemli!)
    ("MIZAN", [r"mizan", r"mizn", r"MİZAN", r"trial.?balance"]),
    ("YEVMIYE", [r"yevmiye_defteri", r"yevmiye defteri", r"yevmiye"]),
    ("KEBIR", [r"defteri_kebir", r"kebir_defteri", r"kebir"]),
    ("POSET", [r"poset", r"Poset", r"POSET", r"poşet", r"Poşet"]),  # Poset BEYANNAME'den önce!
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
        r"E.?DEFTER\s+\d", r"e-defter", r"e_defter", r"berat", r"BERAT",
        r"\d{10}-\d{6}-[YKDB]"
    ]),
    ("EFATURA_ARSIV", [
        r"e.?fatura", r"e.?arsiv", r"e.?arşiv", r"fatura.*liste",
        r"arsiv.*liste", r"arşiv.*liste"
    ]),
]


def get_db():
    """Database bağlantısı oluştur"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def classify_file(filename: str) -> str:
    """Dosya adından dosya tipini algıla (sıralı kontrol)"""
    for doc_type, patterns in DOC_PATTERNS_ORDERED:
        for pattern in patterns:
            if re.search(pattern, filename, re.IGNORECASE):
                return doc_type
    return "OTHER"


def validate_period_format(period: str) -> bool:
    """Dönem formatını kontrol et: YYYY-QN"""
    return bool(re.match(r'^\d{4}-Q[1-4]$', period, re.IGNORECASE))


def compute_file_hash(content: bytes) -> str:
    """Dosya içeriğinin SHA-256 hash'ini hesapla"""
    return hashlib.sha256(content).hexdigest()


def ensure_client_exists(cursor, client_id: str, smmm_id: str) -> bool:
    """Müşteri yoksa oluştur"""
    cursor.execute("SELECT id FROM clients WHERE id = ?", (client_id,))
    if cursor.fetchone():
        return True

    now = datetime.utcnow().isoformat()
    placeholder_tax_id = f"PENDING-{client_id[:20]}"

    cursor.execute("""
        INSERT INTO clients (id, smmm_id, name, tax_id, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (
        client_id,
        smmm_id,
        client_id.replace("_", " ").title(),
        placeholder_tax_id,
        now
    ))
    return True


def ensure_period_exists(cursor, client_id: str, period: str) -> bool:
    """Dönem yoksa oluştur"""
    period_upper = period.upper()
    period_id = f"{client_id}_{period_upper}"

    cursor.execute("SELECT id FROM periods WHERE id = ?", (period_id,))
    if cursor.fetchone():
        return True

    # Quarter tarih hesapla
    parts = period_upper.split('-Q')
    year = int(parts[0])
    quarter = int(parts[1])

    quarter_map = {
        1: ("01-01", "03-31"),
        2: ("04-01", "06-30"),
        3: ("07-01", "09-30"),
        4: ("10-01", "12-31"),
    }

    start_suffix, end_suffix = quarter_map.get(quarter, ("01-01", "12-31"))
    start_date = f"{year}-{start_suffix}"
    end_date = f"{year}-{end_suffix}"

    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO periods (id, client_id, period_code, start_date, end_date, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        period_id,
        client_id,
        period_upper,
        start_date,
        end_date,
        "active",
        now
    ))
    return True


def clear_existing_data(cursor, tenant_id: str, client_id: str, period: str):
    """Aynı dönem için eski veriyi temizle"""
    period_upper = period.upper()

    # Mizan verilerini temizle
    cursor.execute("""
        DELETE FROM mizan_entries
        WHERE tenant_id = ? AND client_id = ? AND period_id = ?
    """, (tenant_id, client_id, period_upper))

    logger.info(f"Eski mizan verileri temizlendi: {client_id}/{period_upper}")


def save_and_parse_mizan(
    cursor,
    tenant_id: str,
    client_id: str,
    period: str,
    file_path: Path,
    original_filename: str
) -> Dict[str, Any]:
    """
    Mizan dosyasını parse edip database'e yaz

    Returns:
        Dict with status and row count
    """
    period_upper = period.upper()
    now = datetime.utcnow().isoformat()

    try:
        # Mizan dosyasını parse et
        rows = parse_mizan_file(file_path)

        if not rows:
            return {
                "status": "empty",
                "rows": 0,
                "message": "Mizan dosyasında veri bulunamadı"
            }

        inserted_count = 0

        for idx, row in enumerate(rows):
            try:
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
                    tenant_id,
                    client_id,
                    period_upper,
                    row['hesap_kodu'],
                    row.get('hesap_adi'),
                    row.get('borc_toplam', 0),
                    row.get('alacak_toplam', 0),
                    row.get('borc_bakiye', 0),
                    row.get('alacak_bakiye', 0),
                    original_filename,
                    idx,
                    now,
                    now
                ))
                inserted_count += 1
            except Exception as e:
                logger.warning(f"Satır {idx} eklenemedi ({row.get('hesap_kodu', '?')}): {e}")

        return {
            "status": "success",
            "rows": inserted_count,
            "message": f"{inserted_count} hesap kaydedildi"
        }

    except Exception as e:
        logger.error(f"Mizan parse hatası: {e}")
        return {
            "status": "error",
            "rows": 0,
            "message": f"Parse hatası: {str(e)}"
        }


@router.post("/upload")
async def upload_donem_zip(
    file: UploadFile = File(..., description="Dönem ZIP dosyası"),
    smmm_id: str = Form(default="HKOZKAN", description="SMMM kimliği"),
    client_id: str = Form(..., description="Mükellef ID"),
    period: str = Form(..., description="Dönem (örn: 2025-Q1)")
):
    """
    Dönem verisi yükle (ZIP)

    ZIP içinde desteklenen dosya tipleri:
    - MIZAN: mizan.csv, mizan.xlsx
    - BANKA: 102.csv, banka_ekstre.xlsx
    - BEYANNAME: KDV_BYN.pdf
    - TAHAKKUK: KDV_THK.pdf
    - EDEFTER: yevmiye_berat.xml

    İşlem adımları:
    1. Validasyon (ZIP, dönem formatı)
    2. ZIP extract
    3. Her dosya için tip algıla
    4. Parse et (şimdilik sadece MIZAN)
    5. Database'e yaz
    6. Response dön

    Returns:
        success: bool
        donem_id: str
        files: List[{file, type, status, rows}]
        uploaded_at: str
    """

    # 1. VALIDASYON

    # ZIP dosyası kontrolü
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Dosya adı belirtilmedi"
        )

    if not file.filename.lower().endswith('.zip'):
        raise HTTPException(
            status_code=400,
            detail="Sadece ZIP dosyası kabul edilir. Geçerli format: .zip"
        )

    # Dönem formatı kontrolü
    if not validate_period_format(period):
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz dönem formatı: {period}. Doğru format: YYYY-QN (örn: 2025-Q1)"
        )

    # Client ID kontrolü
    if not client_id or len(client_id) < 2:
        raise HTTPException(
            status_code=400,
            detail="Geçerli bir mükellef ID giriniz"
        )

    period_upper = period.upper()
    donem_id = f"{client_id}_{period_upper}"

    logger.info(f"Upload başladı: {donem_id} - {file.filename}")

    results = []

    try:
        # 2. ZIP DOSYASINI İŞLE
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)

            # ZIP'i kaydet
            zip_path = tmpdir_path / file.filename
            content = await file.read()

            with open(zip_path, 'wb') as f:
                f.write(content)

            # ZIP'i aç
            try:
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    zf.extractall(tmpdir_path)
            except zipfile.BadZipFile:
                raise HTTPException(
                    status_code=400,
                    detail="Geçersiz ZIP dosyası. Dosya bozuk olabilir."
                )

            # 3. DATABASE İŞLEMLERİ
            conn = get_db()
            cursor = conn.cursor()

            try:
                # Client ve period oluştur (yoksa)
                ensure_client_exists(cursor, client_id, smmm_id)
                ensure_period_exists(cursor, client_id, period_upper)

                # Eski veriyi temizle
                clear_existing_data(cursor, smmm_id, client_id, period_upper)

                # 4. DOSYALARI İŞLE
                for fpath in tmpdir_path.rglob('*'):
                    # Sadece dosyaları işle, klasörleri ve gizli dosyaları atla
                    if not fpath.is_file():
                        continue
                    if fpath.name.startswith('.'):
                        continue
                    if fpath.name.startswith('__'):
                        continue
                    if fpath.suffix.lower() in ['.zip']:
                        continue

                    # Dosya tipini algıla
                    doc_type = classify_file(fpath.name)

                    logger.info(f"Dosya işleniyor: {fpath.name} -> {doc_type}")

                    file_result = {
                        "file": fpath.name,
                        "type": doc_type,
                        "status": "skipped",
                        "rows": 0,
                        "message": ""
                    }

                    # 5. PARSE ET
                    if doc_type == "MIZAN":
                        # CSV veya XLSX mizan dosyası
                        if fpath.suffix.lower() in ['.csv', '.xlsx', '.xls']:
                            parse_result = save_and_parse_mizan(
                                cursor,
                                smmm_id,
                                client_id,
                                period_upper,
                                fpath,
                                fpath.name
                            )
                            file_result["status"] = parse_result["status"]
                            file_result["rows"] = parse_result["rows"]
                            file_result["message"] = parse_result["message"]
                        else:
                            file_result["message"] = f"Desteklenmeyen mizan formatı: {fpath.suffix}"

                    elif doc_type in ["BANKA", "BEYANNAME", "TAHAKKUK", "YEVMIYE", "KEBIR", "GECICI_VERGI", "EDEFTER_BERAT", "EFATURA_ARSIV", "POSET"]:
                        # TODO: Diğer dosya tipleri için parse eklenecek
                        file_result["status"] = "pending"
                        file_result["message"] = f"{doc_type} parse henüz eklenmedi"

                    elif doc_type == "OTHER":
                        file_result["message"] = "Bilinmeyen dosya tipi"

                    else:
                        file_result["message"] = f"Tanınan tip: {doc_type}"

                    results.append(file_result)

                # 6. COMMIT
                conn.commit()
                logger.info(f"Upload tamamlandı: {donem_id}")

            except Exception as e:
                conn.rollback()
                logger.error(f"Database hatası: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Veritabanı hatası: {str(e)}"
                )
            finally:
                conn.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload hatası: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Upload işlemi başarısız: {str(e)}"
        )

    # Başarılı işlenmiş dosya sayısı
    success_count = sum(1 for r in results if r["status"] == "success")
    total_rows = sum(r["rows"] for r in results)

    return {
        "success": True,
        "donem_id": donem_id,
        "period": period_upper,
        "client_id": client_id,
        "smmm_id": smmm_id,
        "files": results,
        "summary": {
            "total_files": len(results),
            "success_files": success_count,
            "total_rows": total_rows
        },
        "uploaded_at": datetime.utcnow().isoformat()
    }


@router.get("/upload/status/{donem_id}")
async def get_upload_status(donem_id: str):
    """
    Upload durumunu kontrol et

    Args:
        donem_id: CLIENT_ID_YYYY-QN formatında dönem ID

    Returns:
        has_data: bool
        mizan_count: int
        last_upload: str
    """
    try:
        parts = donem_id.rsplit('_', 1)
        if len(parts) != 2:
            raise HTTPException(
                status_code=400,
                detail="Geçersiz dönem ID formatı. Doğru format: CLIENT_ID_YYYY-QN"
            )

        client_id = parts[0]
        period = parts[1].upper()

        conn = get_db()
        cursor = conn.cursor()

        # Mizan sayısını kontrol et
        cursor.execute("""
            SELECT COUNT(*) as count, MAX(created_at) as last_upload
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period))

        row = cursor.fetchone()
        conn.close()

        mizan_count = row['count'] if row else 0
        last_upload = row['last_upload'] if row else None

        return {
            "donem_id": donem_id,
            "client_id": client_id,
            "period": period,
            "has_data": mizan_count > 0,
            "mizan_count": mizan_count,
            "last_upload": last_upload
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Durum sorgusu hatası: {str(e)}"
        )
