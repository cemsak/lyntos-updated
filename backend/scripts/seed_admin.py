"""
LYNTOS Admin Seed Script
========================
Admin kullanıcı oluşturur ve dummy verileri temizler.

Kullanım:
  cd /Users/cemsak/lyntos/backend
  .venv/bin/python scripts/seed_admin.py
"""

import sys
import sqlite3
from pathlib import Path

# bcrypt import kontrolü
try:
    import bcrypt
except ImportError:
    print("[HATA] bcrypt modülü bulunamadı. Yüklemek için:")
    print("  .venv/bin/pip install bcrypt")
    sys.exit(1)

DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"

# Admin bilgileri
ADMIN_ID = "CEMSAK"
ADMIN_NAME = "Cem Sak"
ADMIN_EMAIL = "cemsak@lyntos.com"
ADMIN_PASSWORD = "cem@1363"
ADMIN_ROLE = "admin"

# Silinecek dummy veriler
DUMMY_USERS = ["HKOZKAN", "TESTUSER"]
DUMMY_CLIENTS = ["CLIENT_123_89302417"]


def main():
    if not DB_PATH.exists():
        print(f"[HATA] Veritabanı bulunamadı: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("=" * 60)
    print("LYNTOS Admin Seed Script")
    print("=" * 60)

    # 1. Dummy client'ları sil (foreign key kısıtları nedeniyle önce)
    for client_id in DUMMY_CLIENTS:
        # Önce bu client'a bağlı period'ları sil
        cursor.execute("SELECT COUNT(*) as cnt FROM periods WHERE client_id = ?", (client_id,))
        period_count = cursor.fetchone()['cnt']
        if period_count > 0:
            cursor.execute("DELETE FROM periods WHERE client_id = ?", (client_id,))
            print(f"  [SİLİNDİ] {period_count} period (client: {client_id})")

        # Client'ı sil
        cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
        if cursor.rowcount > 0:
            print(f"  [SİLİNDİ] Dummy client: {client_id}")
        else:
            print(f"  [ATLA] Client {client_id} bulunamadı")

    # 2. Dummy client'ları smmm_id ile bul ve onlara bağlı verileri temizle
    for user_id in DUMMY_USERS:
        cursor.execute("SELECT id FROM clients WHERE smmm_id = ?", (user_id,))
        client_rows = cursor.fetchall()
        for row in client_rows:
            cid = row['id']
            cursor.execute("DELETE FROM periods WHERE client_id = ?", (cid,))
            cursor.execute("DELETE FROM clients WHERE id = ?", (cid,))
            print(f"  [SİLİNDİ] Client {cid} (smmm: {user_id})")

    # 3. Dummy user'ları sil
    for user_id in DUMMY_USERS:
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        if cursor.rowcount > 0:
            print(f"  [SİLİNDİ] Dummy user: {user_id}")
        else:
            print(f"  [ATLA] User {user_id} bulunamadı")

    # 4. Admin oluştur (varsa güncelle)
    password_hash = bcrypt.hashpw(
        ADMIN_PASSWORD.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    cursor.execute("SELECT id FROM users WHERE id = ? OR email = ?", (ADMIN_ID, ADMIN_EMAIL))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE users
            SET name = ?, email = ?, password_hash = ?, role = ?, updated_at = datetime('now')
            WHERE id = ? OR email = ?
        """, (ADMIN_NAME, ADMIN_EMAIL, password_hash, ADMIN_ROLE, ADMIN_ID, ADMIN_EMAIL))
        print(f"\n  [GÜNCELLE] Admin hesabı güncellendi: {ADMIN_EMAIL}")
    else:
        cursor.execute("""
            INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (ADMIN_ID, ADMIN_NAME, ADMIN_EMAIL, password_hash, ADMIN_ROLE))
        print(f"\n  [OLUŞTUR] Admin hesabı oluşturuldu: {ADMIN_EMAIL}")

    conn.commit()

    # Doğrulama
    print("\n" + "-" * 60)
    print("Doğrulama:")
    cursor.execute("SELECT id, name, email, role FROM users")
    users = cursor.fetchall()
    print(f"  Toplam kullanıcı: {len(users)}")
    for u in users:
        print(f"    - {u['id']}: {u['name']} ({u['email']}) [{u['role']}]")

    cursor.execute("SELECT COUNT(*) as cnt FROM clients")
    client_count = cursor.fetchone()['cnt']
    print(f"  Toplam mükellef: {client_count}")

    conn.close()

    print("\n" + "=" * 60)
    print("Tamamlandı!")
    print(f"  Admin: {ADMIN_EMAIL}")
    print(f"  Şifre: {'*' * len(ADMIN_PASSWORD)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
