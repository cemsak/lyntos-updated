"""
Tenant & Taxpayer Management API
Lists taxpayers (mükellef) and periods (dönem) for SMMM offices

LYNTOS Enterprise - Multi-tenant SMMM Platform

Sprint 4: Now uses real database data instead of hardcoded demo data
Sprint 7: Added taxpayer CRUD operations (create, delete)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from middleware.auth import verify_token
from pathlib import Path
import sqlite3
import uuid
from datetime import datetime

router = APIRouter(prefix="/tenants", tags=["tenants"])

# Database path
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"
# NOT: DATA_DIR kaldırıldı - disk fallback devre dışı (2026-01-26)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ============== DISK FALLBACK FONKSİYONLARI KALDIRILDI ==============
# Tarih: 2026-01-26
# Sebep: Tüm veri document_uploads tablosu üzerinden takip edilecek
#        Disk'teki test/demo verisi yanlışlıkla gösterilmeyecek
#        Tek kaynak (single source of truth) prensibi uygulandı
# ====================================================================


class Taxpayer(BaseModel):
    id: str
    name: str
    vkn: str  # Vergi Kimlik No (masked)
    active: bool = True


class Period(BaseModel):
    id: str
    label: str
    status: str  # active, closed, draft


class TaxpayerListResponse(BaseModel):
    schema_name: str = "taxpayer_list"
    version: str = "1.0"
    data: dict


class PeriodListResponse(BaseModel):
    schema_name: str = "period_list"
    version: str = "1.0"
    data: dict


class TaxpayerCreateRequest(BaseModel):
    """Request body for creating a new taxpayer"""
    name: str = Field(..., min_length=2, max_length=200, description="Firma adı")
    vkn: str = Field(..., min_length=10, max_length=11, description="VKN (10 hane) veya TCKN (11 hane)")
    type: Optional[str] = Field("limited", description="Şirket türü: limited, anonim, sahis")


class TaxpayerCreateResponse(BaseModel):
    schema_name: str = "taxpayer_create"
    version: str = "1.0"
    data: dict


def mask_vkn(tax_id: str) -> str:
    """Mask VKN for display (show first 3 and last 2 digits)"""
    if not tax_id or len(tax_id) < 5:
        return tax_id or "***"
    return f"{tax_id[:3]}****{tax_id[-2:]}"


def get_period_label(period_code: str) -> str:
    """Generate Turkish period label from code"""
    if not period_code or "-Q" not in period_code.upper():
        return period_code

    parts = period_code.upper().split("-Q")
    year = parts[0]
    quarter = int(parts[1])

    quarter_labels = {
        1: "Ocak-Mart",
        2: "Nisan-Haziran",
        3: "Temmuz-Eylül",
        4: "Ekim-Aralık"
    }

    month_range = quarter_labels.get(quarter, "")
    return f"{year} Q{quarter} ({month_range})"


def get_data_status(cursor, client_id: str, smmm_id: str = "HKOZKAN") -> dict:
    """
    Her mükellef için yüklü veri durumunu kontrol et
    SMMM'ler için kritik: Hangi dönemde hangi veri var?

    NOT: Disk fallback KALDIRILDI (2026-01-26)
    Tüm veri document_uploads ve ilgili tablolar üzerinden takip edilir.
    """
    # Dönemleri al
    cursor.execute("""
        SELECT id, period_code, start_date, end_date, status
        FROM periods
        WHERE client_id = ?
        ORDER BY start_date DESC
    """, (client_id,))
    periods = cursor.fetchall()

    if not periods:
        return {
            "periods": [],
            "summary": {
                "total_periods": 0,
                "data_complete": False,
                "missing_data": ["Dönem tanımlı değil"]
            }
        }

    period_data = []
    for p in periods:
        period_code = p["period_code"] or p["id"]
        # Dönem formatını normalize et: 2025-Q1 → 2025_Q1 (veri tabloları alt çizgi kullanır)
        period_id = period_code.replace('-', '_').upper()

        # Mizan verisi var mı? (Database)
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        mizan_count = cursor.fetchone()["cnt"]

        # Beyanname verisi var mı? (Database)
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM beyanname_entries
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        beyanname_count = cursor.fetchone()["cnt"]

        # Banka verisi var mı? (Database)
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM bank_transactions
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        banka_count = cursor.fetchone()["cnt"]

        # E-Defter verisi var mı? (Database)
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM edefter_entries
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        edefter_count = cursor.fetchone()["cnt"]

        # Tahakkuk verisi var mı? (Database)
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM tahakkuk_entries
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        tahakkuk_count = cursor.fetchone()["cnt"]

        # NOT: Disk fallback KALDIRILDI (2026-01-26)
        # Tüm veri sadece database tablolarından okunur
        # document_uploads üzerinden yüklenen veriler ilgili tablolara parse edilir

        # Feed items (analiz sonuçları) var mı?
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM feed_items
            WHERE client_id = ? AND period_id = ?
        """, (client_id, period_id))
        feed_result = cursor.fetchone()
        feed_count = feed_result["cnt"] if feed_result else 0

        period_data.append({
            "id": p["id"],  # Benzersiz DB ID (CLIENT_048_1EFCED87_2025-Q1)
            "period_id": period_code,  # Period code (2025-Q1) - frontend display
            "period_label": get_period_label(period_code),
            "status": p["status"],
            "data": {
                "mizan": mizan_count > 0,
                "mizan_count": mizan_count,
                "beyanname": beyanname_count > 0,
                "beyanname_count": beyanname_count,
                "banka": banka_count > 0,
                "banka_count": banka_count,
                "edefter": edefter_count > 0,
                "edefter_count": edefter_count,
                "tahakkuk": tahakkuk_count > 0,
                "tahakkuk_count": tahakkuk_count,
            },
            "analysis": {
                "has_results": feed_count > 0,
                "finding_count": feed_count
            }
        })

    # Özet hesapla
    has_any_mizan = any(p["data"]["mizan"] for p in period_data)
    complete_periods = sum(1 for p in period_data if p["data"]["mizan"])

    missing = []
    if not has_any_mizan:
        missing.append("Mizan verisi yüklenmemiş")

    return {
        "periods": period_data,
        "summary": {
            "total_periods": len(period_data),
            "complete_periods": complete_periods,
            "data_complete": complete_periods == len(period_data) and len(period_data) > 0,
            "has_mizan": has_any_mizan,
            "missing_data": missing if missing else None
        }
    }


@router.get("/{tenant_id}/taxpayers")
async def list_taxpayers(tenant_id: str, user: dict = Depends(verify_token)):
    """
    List all taxpayers (mükellef) for a tenant (SMMM office)

    Reads from clients table in database.
    Includes data status for each taxpayer (Sprint 6: SMMM Transparency)
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Get clients for this SMMM (tenant)
        # KRİTİK: OR smmm_id IS NULL kaldırıldı — SMMM veri izolasyonu
        # Her SMMM sadece kendi mükelleflerini görmeli
        cursor.execute("""
            SELECT id, name, tax_id
            FROM clients
            WHERE smmm_id = ?
            ORDER BY name
        """, (tenant_id,))

        rows = cursor.fetchall()

        taxpayers = []
        for row in rows:
            data_status = get_data_status(cursor, row["id"], smmm_id=tenant_id)
            taxpayers.append({
                "id": row["id"],
                "name": row["name"],
                "vkn": mask_vkn(row["tax_id"]),
                "vkn_full": row["tax_id"],  # For internal use
                "active": True,
                "data_status": data_status
            })

        return {
            "schema": {"name": "taxpayer_list", "version": "1.0"},
            "data": {"taxpayers": taxpayers}
        }

    finally:
        conn.close()


@router.get("/{tenant_id}/taxpayers/{taxpayer_id}/periods")
async def list_periods(tenant_id: str, taxpayer_id: str, user: dict = Depends(verify_token)):
    """
    List available periods for a taxpayer

    Reads from periods table in database.
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Verify taxpayer exists
        cursor.execute("SELECT id FROM clients WHERE id = ?", (taxpayer_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail=f"Mükellef bulunamadı: {taxpayer_id}")

        # Get periods for this client
        cursor.execute("""
            SELECT id, period_code, start_date, end_date, status
            FROM periods
            WHERE client_id = ?
            ORDER BY start_date DESC
        """, (taxpayer_id,))

        rows = cursor.fetchall()

        periods = [
            {
                "id": row["period_code"] or row["id"],
                "label": get_period_label(row["period_code"] or row["id"]),
                "status": row["status"] or "active"
            }
            for row in rows
        ]

        return {
            "schema": {"name": "period_list", "version": "1.0"},
            "data": {"periods": periods, "taxpayer_id": taxpayer_id}
        }

    finally:
        conn.close()


@router.post("/{tenant_id}/taxpayers")
async def create_taxpayer(
    tenant_id: str,
    request: TaxpayerCreateRequest,
    user: dict = Depends(verify_token)
):
    """
    Create a new taxpayer (mükellef) for a tenant (SMMM office)

    Sprint 7: SMMM can add new taxpayers
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # VKN validation
        vkn = request.vkn.strip()
        if not vkn.isdigit():
            raise HTTPException(status_code=400, detail="VKN sadece rakam içermelidir")

        if len(vkn) not in [10, 11]:
            raise HTTPException(status_code=400, detail="VKN 10 (tüzel) veya 11 (gerçek kişi) hane olmalıdır")

        # Check for duplicate VKN
        cursor.execute("SELECT id, name FROM clients WHERE tax_id = ?", (vkn,))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Bu VKN ile kayıtlı mükellef zaten var: {existing['name']}"
            )

        # Generate unique ID
        client_id = f"CLIENT_{vkn[:3]}_{uuid.uuid4().hex[:8].upper()}"

        # Insert new taxpayer
        cursor.execute("""
            INSERT INTO clients (id, name, tax_id, smmm_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            client_id,
            request.name.strip(),
            vkn,
            tenant_id,
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))

        conn.commit()

        # Return created taxpayer with data status
        data_status = get_data_status(cursor, client_id)

        taxpayer = {
            "id": client_id,
            "name": request.name.strip(),
            "vkn": mask_vkn(vkn),
            "vkn_full": vkn,
            "active": True,
            "data_status": data_status
        }

        return {
            "schema": {"name": "taxpayer_create", "version": "1.0"},
            "data": {"taxpayer": taxpayer, "message": "Mükellef başarıyla eklendi"}
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Mükellef eklenirken hata oluştu: {str(e)}")
    finally:
        conn.close()


@router.delete("/{tenant_id}/taxpayers/{taxpayer_id}")
async def delete_taxpayer(
    tenant_id: str,
    taxpayer_id: str,
    user: dict = Depends(verify_token)
):
    """
    Delete a taxpayer (mükellef) and all related data

    Sprint 7: SMMM can remove taxpayers
    WARNING: This permanently deletes all data for this taxpayer!
    """
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Verify taxpayer exists and belongs to this tenant
        # KRİTİK: OR smmm_id IS NULL kaldırıldı — SMMM veri izolasyonu
        cursor.execute("""
            SELECT id, name FROM clients
            WHERE id = ? AND smmm_id = ?
        """, (taxpayer_id, tenant_id))

        client = cursor.fetchone()
        if not client:
            raise HTTPException(status_code=404, detail=f"Mükellef bulunamadı: {taxpayer_id}")

        client_name = client["name"]

        # ── KOMplet Cascade Silme ──
        # Tüm client_id içeren tablolardan veri sil (zehirli kalıntı bırakma!)
        CLEANUP_TABLES = [
            # Veri tabloları
            'feed_items',
            'document_uploads',
            'mizan_entries',
            'beyanname_entries',
            'tahakkuk_entries',
            'edefter_entries',
            'bank_transactions',
            'journal_entries',
            'ledger_entries',
            # Upload / Ingest
            'uploaded_files',
            'upload_sessions',
            'raw_files',
            'ingestion_audit_log',
            # Analiz / Rapor
            'generated_reports',
            'rule_execution_log',
            'audit_log',
            # Görev / Checklist
            'tasks',
            'checklist_progress',
            # Dönem verileri
            'kdv_beyanname_data',
            'banka_bakiye_data',
            'tahakkuk_data',
            'cari_ekstreler',
            # Açılış bakiyesi
            'opening_balances',
            'opening_balance_summary',
            # Belge hazırlama
            'document_preparation',
            'preparation_notes',
            # SMMM kararlar
            'smmm_kararlar',
            # Sertifikalar
            'tax_certificates',
            # Migrasyon
            'migration_review_queue',
            # Dönemler (en son silinmeli — diğerleri period_id referans edebilir)
            'periods',
        ]

        deleted_records = {}
        for table in CLEANUP_TABLES:
            try:
                cursor.execute(f"DELETE FROM {table} WHERE client_id = ?", (taxpayer_id,))
                if cursor.rowcount > 0:
                    deleted_records[table] = cursor.rowcount
            except sqlite3.OperationalError:
                pass  # Tablo yoksa veya sütun yoksa geç

        # task_comments ve task_history: task_id üzerinden temizle
        try:
            cursor.execute("SELECT id FROM tasks WHERE client_id = ?", (taxpayer_id,))
            task_ids = [r["id"] for r in cursor.fetchall()]
            if task_ids:
                placeholders = ','.join('?' * len(task_ids))
                cursor.execute(f"DELETE FROM task_comments WHERE task_id IN ({placeholders})", task_ids)
                if cursor.rowcount > 0:
                    deleted_records["task_comments"] = cursor.rowcount
                cursor.execute(f"DELETE FROM task_history WHERE task_id IN ({placeholders})", task_ids)
                if cursor.rowcount > 0:
                    deleted_records["task_history"] = cursor.rowcount
        except sqlite3.OperationalError:
            pass

        # Son olarak client kaydını sil
        cursor.execute("DELETE FROM clients WHERE id = ?", (taxpayer_id,))

        conn.commit()

        # Calculate total deleted
        total_deleted = sum(deleted_records.values())

        return {
            "schema": {"name": "taxpayer_delete", "version": "1.0"},
            "data": {
                "deleted_id": taxpayer_id,
                "deleted_name": client_name,
                "deleted_records": deleted_records,
                "total_deleted": total_deleted,
                "message": f"'{client_name}' mükellefi ve tüm verileri başarıyla silindi ({total_deleted} kayıt)"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Mükellef silinirken hata oluştu: {str(e)}")
    finally:
        conn.close()
