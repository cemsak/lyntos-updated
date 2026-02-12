#!/usr/bin/env python3
"""
LYNTOS DB Clean Reset Script
=============================

Tüm client, period ve veri tablolarını temizler.
Kullanıcı sıfırdan veri yükleyecek.

Kullanım:
  python scripts/clean_reset.py              # DRY-RUN (sadece göster)
  python scripts/clean_reset.py --execute    # GERÇEK TEMİZLİK

Author: Claude
Date: 2026-02-08
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"

# Temizlenecek tablolar (sıra önemli - FK bağımlılıkları)
TABLES_TO_CLEAR = [
    # Önce bağımlı tablolar
    "feed_items",
    "ai_analyses",
    "generated_reports",
    "chat_messages",
    "chat_sessions",
    "checklist_progress",

    # Veri tabloları
    "mizan_entries",
    "journal_entries",
    "ledger_entries",
    "edefter_entries",
    "bank_transactions",
    "beyanname_entries",
    "tahakkuk_entries",
    "tahakkuk_kalemleri",
    "banka_bakiye_data",
    "kdv_beyanname_data",
    "tahakkuk_data",
    "cari_ekstreler",
    "opening_balances",
    "opening_balance_summary",

    # Dosya/belge tabloları
    "document_uploads",
    "tax_certificates",

    # Dönem ve client
    "periods",
    "clients",
]


def get_table_counts(cursor) -> dict:
    """Her tablodaki kayıt sayısını döndür"""
    counts = {}
    for table in TABLES_TO_CLEAR:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            counts[table] = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            counts[table] = -1  # Tablo yok
    return counts


def run_clean(execute: bool = False):
    """DB temizlik"""
    if not DB_PATH.exists():
        print(f"❌ DB bulunamadı: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    print("=" * 60)
    print("LYNTOS DB Clean Reset")
    print(f"DB: {DB_PATH}")
    print(f"Zaman: {datetime.now().isoformat()}")
    print(f"Mod: {'🔴 EXECUTE (gerçek silme)' if execute else '🟡 DRY-RUN (sadece göster)'}")
    print("=" * 60)

    # Mevcut durum
    counts = get_table_counts(cursor)
    print("\n📊 Mevcut Durum:")
    total_rows = 0
    for table, count in counts.items():
        if count > 0:
            print(f"  {table}: {count:,} kayıt")
            total_rows += count
        elif count == -1:
            print(f"  {table}: ⚠️ tablo yok")

    if total_rows == 0:
        print("\n✅ DB zaten temiz, silinecek bir şey yok.")
        conn.close()
        return

    print(f"\n  TOPLAM: {total_rows:,} kayıt silinecek")

    if not execute:
        print("\n⚠️  DRY-RUN modu. Gerçek silme için:")
        print(f"   python {sys.argv[0]} --execute")
        conn.close()
        return

    # Gerçek silme
    print("\n🔴 Silme başlıyor...")

    # FK kontrolünü kapat (CASCADE sorunları için)
    cursor.execute("PRAGMA foreign_keys = OFF")

    deleted_counts = {}
    for table in TABLES_TO_CLEAR:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            if count > 0:
                cursor.execute(f"DELETE FROM {table}")
                deleted_counts[table] = count
                print(f"  ✅ {table}: {count:,} kayıt silindi")
        except sqlite3.OperationalError as e:
            print(f"  ⚠️ {table}: {e}")

    # FK kontrolünü aç
    cursor.execute("PRAGMA foreign_keys = ON")

    conn.commit()

    # Doğrulama
    print("\n📊 Silme Sonrası Doğrulama:")
    final_counts = get_table_counts(cursor)
    all_clean = True
    for table, count in final_counts.items():
        if count > 0:
            print(f"  ❌ {table}: hala {count:,} kayıt var!")
            all_clean = False

    if all_clean:
        print("  ✅ Tüm tablolar temiz!")

    # VACUUM - boş alanı geri al
    print("\n🔧 VACUUM çalıştırılıyor...")
    conn.execute("VACUUM")

    conn.close()

    print(f"\n✅ Temizlik tamamlandı. {sum(deleted_counts.values()):,} toplam kayıt silindi.")
    print("   Şimdi kullanıcı sıfırdan veri yükleyebilir.")


if __name__ == "__main__":
    execute = "--execute" in sys.argv
    run_clean(execute=execute)
