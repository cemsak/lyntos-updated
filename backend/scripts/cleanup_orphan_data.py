"""
LYNTOS - Orphan Data Cleanup Script
Silinen mükelleflere ait yetim (orphan) kayıtları temizler.

Kullanım: python scripts/cleanup_orphan_data.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"


def cleanup_orphan_data():
    """Clients tablosunda olmayan client_id'ye sahip tüm kayıtları sil"""

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("LYNTOS - Orphan Data Cleanup")
    print("=" * 60)

    # Önce mevcut client'ları listele
    cursor.execute("SELECT id, name FROM clients")
    clients = cursor.fetchall()

    print(f"\nMevcut mükellefler ({len(clients)} adet):")
    for c in clients:
        print(f"  - {c[0]}: {c[1]}")

    if not clients:
        print("\n⚠️  Hiç mükellef yok! Tüm orphan veriler silinecek.")

    # Orphan kayıtları bul ve sil
    tables_to_clean = [
        "feed_items",
        "document_uploads",
        "mizan_entries",
        "beyanname_entries",
        "tahakkuk_entries",
        "edefter_entries",
        "bank_transactions",
        "journal_entries",
        "ledger_entries",
        "periods"
    ]

    total_deleted = 0

    print(f"\nOrphan kayıtlar temizleniyor...")
    print("-" * 60)

    for table in tables_to_clean:
        try:
            # Orphan kayıtları say
            cursor.execute(f"""
                SELECT COUNT(*) FROM {table}
                WHERE client_id NOT IN (SELECT id FROM clients)
            """)
            orphan_count = cursor.fetchone()[0]

            if orphan_count > 0:
                # Orphan kayıtları sil
                cursor.execute(f"""
                    DELETE FROM {table}
                    WHERE client_id NOT IN (SELECT id FROM clients)
                """)
                deleted = cursor.rowcount
                total_deleted += deleted
                print(f"  {table}: {deleted} orphan kayıt silindi")
            else:
                print(f"  {table}: temiz ✓")

        except sqlite3.OperationalError as e:
            if "no such table" in str(e):
                print(f"  {table}: tablo mevcut değil (atlandı)")
            else:
                print(f"  {table}: HATA - {e}")

    conn.commit()

    print("-" * 60)
    print(f"\n✅ Toplam {total_deleted} orphan kayıt silindi.")

    # Kalan verileri göster
    print(f"\nKalan veriler:")
    for table in tables_to_clean:
        try:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  {table}: {count} kayıt")
        except sqlite3.OperationalError:
            pass

    conn.close()
    print("\n" + "=" * 60)


if __name__ == "__main__":
    cleanup_orphan_data()
