#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
LYNTOS Mevcut Veri Duplicate Temizleme
======================================

Bu script mevcut tablolardaki duplicate verileri temizler.

PRENSİP: "Silme yok, Kanıt kaybı yok"
- Orijinal tablolar (edefter_entries, bank_transactions) DOKUNULMAZ
- Yeni "cleaned_" tablolar oluşturulur
- Her benzersiz kayıt için sadece 1 kopya tutulur
- Hangi kayıtların birleştirildiği loglanır

Kullanım:
    python scripts/004_dedupe_existing_data.py

Author: Claude
Date: 2026-01-25
"""

import sqlite3
from pathlib import Path
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"


def create_cleaned_tables(cursor: sqlite3.Cursor):
    """Temizlenmiş veri için tablolar oluştur"""

    # 1. Cleaned E-defter entries
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cleaned_edefter_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            -- Original fields
            tenant_id TEXT,
            client_id TEXT,
            period_id TEXT,
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

            -- Dedup metadata
            source_file TEXT,  -- İlk görüldüğü dosya
            duplicate_count INTEGER DEFAULT 1,  -- Kaç kez tekrarlandığı
            all_source_files TEXT,  -- Tüm kaynak dosyalar (JSON array)

            -- Timestamps
            created_at TEXT DEFAULT (datetime('now')),

            -- Unique constraint
            UNIQUE (client_id, period_id, fis_no, satir_no)
        )
    """)

    # 2. Cleaned Bank transactions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cleaned_bank_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            -- Original fields
            tenant_id TEXT,
            client_id TEXT,
            period_id TEXT,
            hesap_kodu TEXT,
            banka_adi TEXT,
            tarih TEXT,
            aciklama TEXT,
            islem_tipi TEXT,
            tutar REAL,
            bakiye REAL,

            -- Dedup metadata
            source_file TEXT,
            duplicate_count INTEGER DEFAULT 1,
            all_source_files TEXT,

            -- Timestamps
            created_at TEXT DEFAULT (datetime('now')),

            -- Unique constraint
            UNIQUE (client_id, period_id, tarih, tutar, aciklama)
        )
    """)

    # 3. Dedup log tablosu
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dedup_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            source_table TEXT NOT NULL,
            target_table TEXT NOT NULL,

            original_count INTEGER,
            unique_count INTEGER,
            duplicate_count INTEGER,

            client_id TEXT,
            period_id TEXT,

            executed_at TEXT DEFAULT (datetime('now')),
            execution_time_seconds REAL
        )
    """)

    logger.info("Temizlenmiş tablolar oluşturuldu")


def dedupe_edefter_entries(cursor: sqlite3.Cursor, client_id: str, period_id: str) -> dict:
    """
    E-defter entries duplicate temizleme

    Benzersizlik kriteri: client_id + period_id + fis_no + satir_no
    """
    import time
    import json
    start_time = time.time()

    logger.info(f"E-defter dedupe başlıyor: {client_id}/{period_id}")

    # Orijinal kayıt sayısı
    cursor.execute("""
        SELECT COUNT(*) FROM edefter_entries
        WHERE client_id = ? AND period_id = ?
    """, (client_id, period_id))
    original_count = cursor.fetchone()[0]

    # Benzersiz kayıtları bul ve ekle
    cursor.execute("""
        INSERT OR REPLACE INTO cleaned_edefter_entries (
            tenant_id, client_id, period_id, vkn, donem, defter_tipi,
            fis_no, satir_no, tarih, fis_aciklama,
            hesap_kodu, hesap_adi, alt_hesap_kodu, alt_hesap_adi,
            tutar, borc_alacak, belge_no, belge_tarihi, aciklama,
            source_file, duplicate_count, all_source_files
        )
        SELECT
            tenant_id, client_id, period_id, vkn, donem, defter_tipi,
            fis_no, satir_no, tarih, fis_aciklama,
            hesap_kodu, hesap_adi, alt_hesap_kodu, alt_hesap_adi,
            tutar, borc_alacak, belge_no, belge_tarihi, aciklama,
            MIN(source_file) as source_file,
            COUNT(*) as duplicate_count,
            json_group_array(DISTINCT source_file) as all_source_files
        FROM edefter_entries
        WHERE client_id = ? AND period_id = ?
        GROUP BY client_id, period_id, fis_no, satir_no
    """, (client_id, period_id))

    # Benzersiz kayıt sayısı
    cursor.execute("""
        SELECT COUNT(*) FROM cleaned_edefter_entries
        WHERE client_id = ? AND period_id = ?
    """, (client_id, period_id))
    unique_count = cursor.fetchone()[0]

    execution_time = time.time() - start_time

    # Log kaydet
    cursor.execute("""
        INSERT INTO dedup_log (source_table, target_table, original_count, unique_count,
                               duplicate_count, client_id, period_id, execution_time_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'edefter_entries', 'cleaned_edefter_entries',
        original_count, unique_count, original_count - unique_count,
        client_id, period_id, execution_time
    ))

    result = {
        'original_count': original_count,
        'unique_count': unique_count,
        'duplicate_count': original_count - unique_count,
        'reduction_percent': round(100 * (original_count - unique_count) / original_count, 1) if original_count > 0 else 0,
        'execution_time': round(execution_time, 2)
    }

    logger.info(f"E-defter dedupe tamamlandı: {original_count:,} -> {unique_count:,} ({result['reduction_percent']}% azalma)")

    return result


def dedupe_bank_transactions(cursor: sqlite3.Cursor, client_id: str, period_id: str) -> dict:
    """
    Bank transactions duplicate temizleme

    Benzersizlik kriteri: client_id + period_id + tarih + tutar + aciklama
    """
    import time
    start_time = time.time()

    logger.info(f"Bank transactions dedupe başlıyor: {client_id}/{period_id}")

    # Orijinal kayıt sayısı
    cursor.execute("""
        SELECT COUNT(*) FROM bank_transactions
        WHERE client_id = ? AND period_id = ?
    """, (client_id, period_id))
    original_count = cursor.fetchone()[0]

    # Benzersiz kayıtları bul ve ekle
    cursor.execute("""
        INSERT OR REPLACE INTO cleaned_bank_transactions (
            tenant_id, client_id, period_id,
            hesap_kodu, banka_adi, tarih, aciklama, islem_tipi, tutar, bakiye,
            source_file, duplicate_count, all_source_files
        )
        SELECT
            tenant_id, client_id, period_id,
            hesap_kodu, banka_adi, tarih, aciklama, islem_tipi, tutar,
            MAX(bakiye) as bakiye,  -- En son bakiye
            MIN(source_file) as source_file,
            COUNT(*) as duplicate_count,
            json_group_array(DISTINCT source_file) as all_source_files
        FROM bank_transactions
        WHERE client_id = ? AND period_id = ?
        GROUP BY client_id, period_id, tarih, tutar, aciklama
    """, (client_id, period_id))

    # Benzersiz kayıt sayısı
    cursor.execute("""
        SELECT COUNT(*) FROM cleaned_bank_transactions
        WHERE client_id = ? AND period_id = ?
    """, (client_id, period_id))
    unique_count = cursor.fetchone()[0]

    execution_time = time.time() - start_time

    # Log kaydet
    cursor.execute("""
        INSERT INTO dedup_log (source_table, target_table, original_count, unique_count,
                               duplicate_count, client_id, period_id, execution_time_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'bank_transactions', 'cleaned_bank_transactions',
        original_count, unique_count, original_count - unique_count,
        client_id, period_id, execution_time
    ))

    result = {
        'original_count': original_count,
        'unique_count': unique_count,
        'duplicate_count': original_count - unique_count,
        'reduction_percent': round(100 * (original_count - unique_count) / original_count, 1) if original_count > 0 else 0,
        'execution_time': round(execution_time, 2)
    }

    logger.info(f"Bank dedupe tamamlandı: {original_count:,} -> {unique_count:,} ({result['reduction_percent']}% azalma)")

    return result


def run_full_dedupe():
    """Tüm mevcut verileri temizle"""

    print("="*70)
    print("LYNTOS MEVCUT VERİ DUPLICATE TEMİZLEME")
    print("="*70)
    print("\nPRENSİP: Orijinal veriler DOKUNULMAZ, temiz kopyalar oluşturulur\n")

    conn = sqlite3.connect(str(DB_PATH), timeout=60)
    cursor = conn.cursor()

    try:
        # 1. Tablolar oluştur
        create_cleaned_tables(cursor)
        conn.commit()

        # 2. Tüm client/period kombinasyonlarını bul
        cursor.execute("""
            SELECT DISTINCT client_id, period_id
            FROM edefter_entries
            WHERE client_id IS NOT NULL AND period_id IS NOT NULL
        """)
        combinations = cursor.fetchall()

        print(f"İşlenecek client/period: {len(combinations)}\n")

        total_results = {
            'edefter': {'original': 0, 'unique': 0, 'duplicate': 0},
            'bank': {'original': 0, 'unique': 0, 'duplicate': 0}
        }

        # 3. Her kombinasyon için temizle
        for client_id, period_id in combinations:
            print(f"\n--- {client_id} / {period_id} ---")

            # E-defter
            result = dedupe_edefter_entries(cursor, client_id, period_id)
            total_results['edefter']['original'] += result['original_count']
            total_results['edefter']['unique'] += result['unique_count']
            total_results['edefter']['duplicate'] += result['duplicate_count']

            # Bank
            result = dedupe_bank_transactions(cursor, client_id, period_id)
            total_results['bank']['original'] += result['original_count']
            total_results['bank']['unique'] += result['unique_count']
            total_results['bank']['duplicate'] += result['duplicate_count']

            conn.commit()

        # 4. Özet rapor
        print("\n" + "="*70)
        print("ÖZET RAPOR")
        print("="*70)

        print("\nE-DEFTER:")
        print(f"  Orijinal: {total_results['edefter']['original']:,}")
        print(f"  Temiz: {total_results['edefter']['unique']:,}")
        print(f"  Kaldırılan duplicate: {total_results['edefter']['duplicate']:,}")

        print("\nBANK TRANSACTIONS:")
        print(f"  Orijinal: {total_results['bank']['original']:,}")
        print(f"  Temiz: {total_results['bank']['unique']:,}")
        print(f"  Kaldırılan duplicate: {total_results['bank']['duplicate']:,}")

        total_original = total_results['edefter']['original'] + total_results['bank']['original']
        total_unique = total_results['edefter']['unique'] + total_results['bank']['unique']

        print(f"\nTOPLAM:")
        print(f"  {total_original:,} -> {total_unique:,} kayıt")
        print(f"  %{100*(total_original-total_unique)/total_original:.1f} azalma")

        print("\n✅ Temizleme tamamlandı!")
        print("Orijinal tablolar KORUNDU, temiz veriler cleaned_* tablolarında.")

    except Exception as e:
        logger.error(f"Hata: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_full_dedupe()
