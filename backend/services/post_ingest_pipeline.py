# -*- coding: utf-8 -*-
"""
Post-Ingest Pipeline Service
==============================

İngest tamamlandıktan sonra arka planda çalışan kademeli trigger pipeline.

Akış:
  1. PARSE: post_ingest_parse (zaten ingest içinde çalışıyor - senkron)
  2. CROSS-CHECK: Çapraz kontrolleri çalıştır
  3. ANALYSIS: VDK + GV + CrossCheck kuralları → feed_items

Bu pipeline FastAPI BackgroundTasks ile çalışır.
İngest endpoint hemen cevap döner, pipeline arka planda devam eder.

Status tracking: upload_sessions tablosuna pipeline_status kolonu ile.

Author: Claude
Date: 2026-02-06
"""

import asyncio
import logging
import sqlite3
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent.parent / "database" / "lyntos.db"


# ═══════════════════════════════════════════════════════════════════════
# Pipeline Status Tracking
# ═══════════════════════════════════════════════════════════════════════

PIPELINE_STATUSES = [
    "parsing",          # post_ingest_parse çalışıyor (senkron - ingest içinde)
    "cross_checking",   # Çapraz kontroller çalışıyor
    "analyzing",        # Risk analizi çalışıyor
    "completed",        # Tamamlandı
    "error",            # Hata
]


def _ensure_pipeline_columns():
    """upload_sessions tablosuna pipeline_status ve pipeline_detail kolonları ekle (yoksa)."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()

        # Kolon var mı kontrol et
        cursor.execute("PRAGMA table_info(upload_sessions)")
        columns = {row[1] for row in cursor.fetchall()}

        if "pipeline_status" not in columns:
            cursor.execute(
                "ALTER TABLE upload_sessions ADD COLUMN pipeline_status TEXT DEFAULT 'pending'"
            )
            logger.info("upload_sessions tablosuna pipeline_status kolonu eklendi")

        if "pipeline_detail" not in columns:
            cursor.execute(
                "ALTER TABLE upload_sessions ADD COLUMN pipeline_detail TEXT DEFAULT ''"
            )
            logger.info("upload_sessions tablosuna pipeline_detail kolonu eklendi")

        if "pipeline_completed_at" not in columns:
            cursor.execute(
                "ALTER TABLE upload_sessions ADD COLUMN pipeline_completed_at TEXT"
            )
            logger.info("upload_sessions tablosuna pipeline_completed_at kolonu eklendi")

        if "cross_check_count" not in columns:
            cursor.execute(
                "ALTER TABLE upload_sessions ADD COLUMN cross_check_count INTEGER DEFAULT 0"
            )

        if "analysis_findings_count" not in columns:
            cursor.execute(
                "ALTER TABLE upload_sessions ADD COLUMN analysis_findings_count INTEGER DEFAULT 0"
            )

        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Pipeline kolon ekleme hatası: {e}")


def _update_pipeline_status(
    session_id: str,
    status: str,
    detail: str = "",
    cross_check_count: int = 0,
    analysis_findings_count: int = 0,
):
    """Pipeline durumunu güncelle."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()

        updates = ["pipeline_status = ?", "pipeline_detail = ?"]
        params = [status, detail]

        if cross_check_count > 0:
            updates.append("cross_check_count = ?")
            params.append(cross_check_count)

        if analysis_findings_count > 0:
            updates.append("analysis_findings_count = ?")
            params.append(analysis_findings_count)

        if status in ("completed", "error"):
            updates.append("pipeline_completed_at = ?")
            params.append(datetime.utcnow().isoformat())

        params.append(session_id)
        sql = f"UPDATE upload_sessions SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(sql, params)
        conn.commit()
        conn.close()

        logger.info(f"Pipeline status [{session_id[:8]}]: {status} - {detail}")
    except Exception as e:
        logger.error(f"Pipeline status güncelleme hatası: {e}")


def get_pipeline_status(session_id: str) -> Optional[Dict]:
    """Pipeline durumunu getir."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, client_id, period_id, status,
                   pipeline_status, pipeline_detail, pipeline_completed_at,
                   cross_check_count, analysis_findings_count,
                   started_at, completed_at
            FROM upload_sessions
            WHERE id = ?
            """,
            (session_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        return dict(row)
    except Exception as e:
        logger.error(f"Pipeline status sorgu hatası: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════
# Pipeline Steps
# ═══════════════════════════════════════════════════════════════════════

def _run_cross_check(tenant_id: str, client_id: str, period_id: str) -> Dict:
    """Çapraz kontrolleri çalıştır - cross_check_engine kullanarak."""
    try:
        from services.cross_check_engine import cross_check_engine

        # Mizan verilerini çek
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Mizan entries
        cursor.execute(
            """
            SELECT hesap_kodu, hesap_adi, borc_bakiye, alacak_bakiye
            FROM mizan_entries
            WHERE client_id = ? AND period_id = ?
            """,
            (client_id, period_id),
        )
        mizan_rows = [dict(r) for r in cursor.fetchall()]

        if not mizan_rows:
            conn.close()
            return {"status": "no_data", "checks": 0, "message": "Mizan verisi yok"}

        # Mizan toplamları
        toplam_borc = sum(float(r.get("borc_bakiye", 0) or 0) for r in mizan_rows)
        toplam_alacak = sum(float(r.get("alacak_bakiye", 0) or 0) for r in mizan_rows)

        # Hesap bazlı bakiyeler (ilk 3 hane gruplama)
        hesap_bakiyeler: Dict[str, float] = {}
        for row in mizan_rows:
            kodu = str(row.get("hesap_kodu", ""))[:3]
            borc = float(row.get("borc_bakiye", 0) or 0)
            alacak = float(row.get("alacak_bakiye", 0) or 0)
            net = borc - alacak
            hesap_bakiyeler[kodu] = hesap_bakiyeler.get(kodu, 0) + net

        # Beyanname verilerini çek
        cursor.execute(
            """
            SELECT beyanname_tipi, matrah, hesaplanan_vergi, indirilecek_vergi, odenecek_vergi
            FROM beyanname_entries
            WHERE client_id = ? AND period_id = ?
            """,
            (client_id, period_id),
        )
        beyanname_rows = [dict(r) for r in cursor.fetchall()]

        # Banka verilerini çek
        cursor.execute(
            """
            SELECT SUM(CASE WHEN islem_tipi = 'giris' THEN tutar ELSE -tutar END) as net_bakiye
            FROM bank_transactions
            WHERE client_id = ? AND period_id = ?
            """,
            (client_id, period_id),
        )
        banka_row = cursor.fetchone()
        banka_bakiye = float(banka_row["net_bakiye"] or 0) if banka_row else None

        conn.close()

        # Cross-check data yapısını oluştur
        check_data: Dict[str, Any] = {
            "toplam_borc": toplam_borc,
            "toplam_alacak": toplam_alacak,
            "mizan_entries": mizan_rows,
        }

        # Hesap bakiyeleri ekle
        for hesap, bakiye in hesap_bakiyeler.items():
            key = f"mizan_{hesap}"
            check_data[key] = abs(bakiye)

        # Beyanname verileri
        for beyan in beyanname_rows:
            tip = (beyan.get("beyanname_tipi") or "").lower()
            if "kdv" in tip:
                check_data["kdv_beyan_matrah"] = float(beyan.get("matrah", 0) or 0)
                check_data["kdv_beyan_hesaplanan"] = float(beyan.get("hesaplanan_vergi", 0) or 0)
                check_data["kdv_beyan_indirilecek"] = float(beyan.get("indirilecek_vergi", 0) or 0)
            elif "gecici" in tip or "geçici" in tip:
                check_data["gecici_vergi_matrahi"] = float(beyan.get("matrah", 0) or 0)

        # Banka bilgisi
        if banka_bakiye is not None:
            check_data["bank_balance"] = banka_bakiye
            check_data["banka_loaded"] = True
        else:
            check_data["banka_loaded"] = False

        # E-fatura ve mali tablo (şimdilik False)
        check_data["efatura_loaded"] = False
        check_data["mali_tablo_loaded"] = False

        # Gelir/gider toplamları (6xx hesaplar)
        gelir_toplam = 0.0
        gider_toplam = 0.0
        for row in mizan_rows:
            kodu = str(row.get("hesap_kodu", ""))[:3]
            borc = float(row.get("borc_bakiye", 0) or 0)
            alacak = float(row.get("alacak_bakiye", 0) or 0)
            if kodu.startswith("6"):
                if kodu in ("600", "601", "602", "640", "642", "644", "645", "646", "647", "648", "649", "671", "679", "692"):
                    gelir_toplam += (alacak - borc)
                else:
                    gider_toplam += (borc - alacak)

        check_data["mizan_gelir_toplam"] = gelir_toplam
        check_data["mizan_gider_toplam"] = gider_toplam

        # Run checks
        results = cross_check_engine.run_all_checks(check_data)

        # Teknik kontroller
        teknik = cross_check_engine.run_teknik_kontroller(mizan_rows)

        total_checks = len(results) + teknik.get("toplam_sorun", 0)

        return {
            "status": "ok",
            "checks": len(results),
            "teknik_sorunlar": teknik.get("toplam_sorun", 0),
            "kritik_sorunlar": teknik.get("kritik_sorun", 0),
            "total": total_checks,
        }

    except Exception as e:
        logger.error(f"Cross-check hatası: {e}", exc_info=True)
        return {"status": "error", "checks": 0, "message": str(e)}


def _run_analysis(tenant_id: str, client_id: str, period_id: str) -> Dict:
    """Risk analizi çalıştır - analysis_trigger kullanarak."""
    try:
        from services.analysis_trigger import run_analysis

        result = run_analysis(tenant_id, client_id, period_id)
        return result
    except Exception as e:
        logger.error(f"Analysis hatası: {e}", exc_info=True)
        return {"status": "error", "findings": 0, "message": str(e)}


# ═══════════════════════════════════════════════════════════════════════
# Main Pipeline
# ═══════════════════════════════════════════════════════════════════════

def run_post_ingest_pipeline(
    session_id: str,
    tenant_id: str,
    client_id: str,
    period_id: str,
):
    """
    Post-ingest pipeline - arka planda çalışır.

    Sıra:
      1. Cross-check çalıştır
      2. Risk analizi çalıştır
      3. Tamamlandı olarak işaretle

    Parse zaten ingest içinde senkron çalışıyor, bu pipeline sadece
    cross-check ve analysis'i arka plana alır.
    """
    _ensure_pipeline_columns()

    logger.info(
        f"Pipeline başladı: session={session_id[:8]}, "
        f"client={client_id}, period={period_id}"
    )

    start_time = time.time()

    try:
        # ─── STEP 1: Cross-Check ──────────────────────────────────────
        _update_pipeline_status(session_id, "cross_checking", "Çapraz kontroller çalışıyor...")

        cc_result = _run_cross_check(tenant_id, client_id, period_id)
        cc_count = cc_result.get("total", cc_result.get("checks", 0))

        logger.info(f"Cross-check tamamlandı: {cc_count} kontrol")

        # ─── STEP 2: Analysis (VDK + GV + Rules) ─────────────────────
        _update_pipeline_status(
            session_id,
            "analyzing",
            f"Risk analizi çalışıyor... ({cc_count} çapraz kontrol tamamlandı)",
            cross_check_count=cc_count,
        )

        analysis_result = _run_analysis(tenant_id, client_id, period_id)
        findings_count = analysis_result.get("findings", 0)

        logger.info(f"Analysis tamamlandı: {findings_count} bulgu")

        # ─── STEP 3: Tamamlandı ──────────────────────────────────────
        elapsed = round(time.time() - start_time, 1)
        detail = (
            f"Tamamlandı ({elapsed}s): "
            f"{cc_count} çapraz kontrol, "
            f"{findings_count} risk bulgusu"
        )

        _update_pipeline_status(
            session_id,
            "completed",
            detail,
            cross_check_count=cc_count,
            analysis_findings_count=findings_count,
        )

        logger.info(f"Pipeline tamamlandı: {detail}")

    except Exception as e:
        logger.error(f"Pipeline hatası: {e}", exc_info=True)
        _update_pipeline_status(session_id, "error", str(e))
