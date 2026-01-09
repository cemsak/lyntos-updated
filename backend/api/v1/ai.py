"""
VERGUS AI Analysis API Routes
Sprint R2 - Claude API Integration
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database.db import get_connection
from services.ai_analyzer import AIAnalyzer

router = APIRouter(prefix="/ai", tags=["AI"])

# Initialize analyzer
analyzer = AIAnalyzer()


# ============================================
# PYDANTIC MODELS
# ============================================

class RegwatchAnalysisRequest(BaseModel):
    title: str
    content: Optional[str] = None
    source: Optional[str] = "manual"
    date: Optional[str] = None


class CompanyAnalysisRequest(BaseModel):
    company_name: str
    tax_number: Optional[str] = None
    change_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    additional_info: Optional[str] = None


class BatchAnalysisRequest(BaseModel):
    events: List[dict]
    event_type: str = "regwatch"


class ReviewRequest(BaseModel):
    status: str  # 'approved', 'rejected'
    notes: Optional[str] = None
    reviewed_by: str = "admin"


# ============================================
# ANALYSIS ENDPOINTS
# ============================================

@router.post("/analyze/regwatch")
async def analyze_regwatch_event(request: RegwatchAnalysisRequest):
    """Mevzuat degisikligini AI ile analiz et"""

    event = {
        "title": request.title,
        "content": request.content or request.title,
        "source": request.source,
        "date": request.date or datetime.now().strftime("%Y-%m-%d")
    }

    # AI analizi
    result = analyzer.analyze_regwatch_event(event)

    # Veritabanina kaydet
    analysis_id = str(uuid.uuid4())

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ai_analyses
            (id, source_type, source_content, analysis_type, summary, detailed_analysis,
             recommendations, affected_parameters, confidence_score, severity,
             proposed_changes, status, model_used, tokens_used, processing_time_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            analysis_id,
            "regwatch_event",
            json.dumps(event, ensure_ascii=False),
            "parameter_change" if result.get("change_detected") else "general",
            result.get("summary"),
            result.get("detailed_analysis"),
            result.get("action_required"),
            json.dumps(result.get("affected_parameters", []), ensure_ascii=False),
            0.8 if result.get("model_used") != "demo" else 0.3,
            result.get("severity", "info"),
            json.dumps(result.get("affected_parameters", []), ensure_ascii=False),
            "pending",
            result.get("model_used"),
            result.get("tokens_used"),
            result.get("processing_time_ms")
        ])
        conn.commit()

    result["analysis_id"] = analysis_id
    return result


@router.post("/analyze/company")
async def analyze_company_change(request: CompanyAnalysisRequest):
    """Sirket degisikligini AI ile analiz et"""

    change = {
        "company_name": request.company_name,
        "tax_number": request.tax_number,
        "change_type": request.change_type,
        "old_value": request.old_value,
        "new_value": request.new_value,
        "additional_info": request.additional_info
    }

    # AI analizi
    result = analyzer.analyze_company_change(change)

    # Veritabanina kaydet
    analysis_id = str(uuid.uuid4())

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ai_analyses
            (id, source_type, source_content, analysis_type, summary, detailed_analysis,
             recommendations, confidence_score, severity, status,
             model_used, tokens_used, processing_time_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            analysis_id,
            "company_change",
            json.dumps(change, ensure_ascii=False),
            "tax_impact",
            result.get("summary"),
            json.dumps(result.get("tax_implications", {}), ensure_ascii=False),
            json.dumps(result.get("smmm_actions", []), ensure_ascii=False),
            0.8 if result.get("model_used") != "demo" else 0.3,
            result.get("severity", "info"),
            "pending",
            result.get("model_used"),
            result.get("tokens_used"),
            result.get("processing_time_ms")
        ])
        conn.commit()

    result["analysis_id"] = analysis_id
    return result


@router.post("/analyze/batch")
async def batch_analyze(request: BatchAnalysisRequest, background_tasks: BackgroundTasks):
    """Toplu analiz (arka planda calisir)"""

    job_id = str(uuid.uuid4())

    # Arka planda analiz baslat
    background_tasks.add_task(
        _run_batch_analysis,
        job_id,
        request.events,
        request.event_type
    )

    return {
        "job_id": job_id,
        "status": "started",
        "event_count": len(request.events),
        "message": "Analiz arka planda calisiyor. /ai/analyses ile durumu kontrol edin."
    }


def _run_batch_analysis(job_id: str, events: List[dict], event_type: str):
    """Toplu analiz arka plan gorevi"""
    results = analyzer.batch_analyze_events(events, event_type)

    with get_connection() as conn:
        cursor = conn.cursor()
        for result in results:
            analysis_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO ai_analyses
                (id, source_type, source_content, summary, severity, status, model_used)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [
                analysis_id,
                f"batch_{event_type}",
                json.dumps(result.get("source_event"), ensure_ascii=False),
                result.get("summary"),
                result.get("severity", "info"),
                "pending",
                result.get("model_used")
            ])
        conn.commit()


# ============================================
# ANALYSIS HISTORY ENDPOINTS
# ============================================

@router.get("/analyses")
async def list_analyses(
    source_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=200)
):
    """Analiz gecmisini listele"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM ai_analyses WHERE 1=1"
        params = []

        if source_type:
            query += " AND source_type = ?"
            params.append(source_type)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        results = cursor.fetchall()

        analyses = [dict(row) for row in results]

        return {
            "count": len(analyses),
            "analyses": analyses
        }


@router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Belirli bir analizi getir"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM ai_analyses WHERE id = ?",
            [analysis_id]
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Analysis not found")

        return dict(result)


@router.post("/analyses/{analysis_id}/review")
async def review_analysis(analysis_id: str, request: ReviewRequest):
    """Analizi incele ve onayla/reddet"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Analizi kontrol et
        cursor.execute(
            "SELECT * FROM ai_analyses WHERE id = ?",
            [analysis_id]
        )
        existing = cursor.fetchone()

        if not existing:
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Guncelle
        cursor.execute("""
            UPDATE ai_analyses
            SET status = ?, reviewed_by = ?, reviewed_at = ?, review_notes = ?, updated_at = ?
            WHERE id = ?
        """, [
            request.status,
            request.reviewed_by,
            datetime.utcnow().isoformat(),
            request.notes,
            datetime.utcnow().isoformat(),
            analysis_id
        ])

        # Eger onaylandiysa ve parametre degisikligi varsa, kuyruga ekle
        if request.status == "approved" and existing['proposed_changes']:
            proposed = existing['proposed_changes']
            if isinstance(proposed, str):
                try:
                    proposed = json.loads(proposed)
                except json.JSONDecodeError:
                    proposed = []

            for change in proposed:
                if change.get("param_key") and change.get("new_value") is not None:
                    cursor.execute("""
                        INSERT INTO parameter_update_queue
                        (id, analysis_id, param_key, current_value, proposed_value,
                         effective_date, legal_reference, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, [
                        str(uuid.uuid4()),
                        analysis_id,
                        change["param_key"],
                        change.get("current_value"),
                        change["new_value"],
                        change.get("effective_date"),
                        change.get("legal_reference"),
                        "pending"
                    ])

        conn.commit()

        return {"status": "reviewed", "new_status": request.status}


# ============================================
# PARAMETER UPDATE QUEUE ENDPOINTS
# ============================================

@router.get("/queue")
async def list_update_queue(status: Optional[str] = None):
    """Parametre guncelleme kuyrugunu listele"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM parameter_update_queue WHERE 1=1"
        params = []

        if status:
            query += " AND status = ?"
            params.append(status)

        query += " ORDER BY created_at DESC"

        cursor.execute(query, params)
        results = cursor.fetchall()

        return {
            "count": len(results),
            "queue": [dict(row) for row in results]
        }


@router.post("/queue/{queue_id}/approve")
async def approve_queue_item(queue_id: str, approved_by: str = "admin"):
    """Kuyruk ogesini onayla"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM parameter_update_queue WHERE id = ?",
            [queue_id]
        )
        queue_item = cursor.fetchone()

        if not queue_item:
            raise HTTPException(status_code=404, detail="Queue item not found")

        cursor.execute("""
            UPDATE parameter_update_queue
            SET status = 'approved', approved_by = ?, approved_at = ?
            WHERE id = ?
        """, [approved_by, datetime.utcnow().isoformat(), queue_id])

        conn.commit()

        return {"status": "approved", "queue_id": queue_id}


@router.post("/queue/{queue_id}/apply")
async def apply_parameter_update(queue_id: str, approved_by: str = "admin"):
    """Onaylanan parametre guncellemesini uygula"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM parameter_update_queue WHERE id = ?",
            [queue_id]
        )
        queue_item = cursor.fetchone()

        if not queue_item:
            raise HTTPException(status_code=404, detail="Queue item not found")

        if queue_item['status'] != "approved":
            raise HTTPException(status_code=400, detail="Item must be approved before applying")

        # Mevcut parametreyi guncelle
        cursor.execute("""
            UPDATE tax_parameters
            SET param_value = ?, legal_reference = ?, updated_at = ?, updated_by = ?
            WHERE param_key = ?
        """, [
            queue_item['proposed_value'],
            queue_item['legal_reference'],
            datetime.utcnow().isoformat(),
            f"ai_queue_{approved_by}",
            queue_item['param_key']
        ])

        # Kuyruk durumunu guncelle
        cursor.execute("""
            UPDATE parameter_update_queue
            SET status = 'applied', applied_at = ?
            WHERE id = ?
        """, [datetime.utcnow().isoformat(), queue_id])

        conn.commit()

        return {
            "status": "applied",
            "param_key": queue_item['param_key'],
            "new_value": queue_item['proposed_value']
        }


@router.post("/queue/{queue_id}/reject")
async def reject_queue_item(queue_id: str, reason: Optional[str] = None):
    """Kuyruk ogesini reddet"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE parameter_update_queue
            SET status = 'rejected'
            WHERE id = ?
        """, [queue_id])

        conn.commit()

        return {"status": "rejected", "queue_id": queue_id}


# ============================================
# STATS & MONITORING
# ============================================

@router.get("/stats")
async def get_ai_stats():
    """AI analiz istatistikleri"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM ai_analyses")
        all_analyses = cursor.fetchall()

        stats = {
            "total_analyses": len(all_analyses),
            "by_status": {},
            "by_severity": {},
            "by_source_type": {},
            "total_tokens_used": 0,
            "avg_processing_time_ms": 0
        }

        processing_times = []

        for a in all_analyses:
            row = dict(a)

            # Status
            status = row.get('status') or "unknown"
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1

            # Severity
            severity = row.get('severity') or "unknown"
            stats["by_severity"][severity] = stats["by_severity"].get(severity, 0) + 1

            # Source type
            source = row.get('source_type') or "unknown"
            stats["by_source_type"][source] = stats["by_source_type"].get(source, 0) + 1

            # Tokens
            if row.get('tokens_used'):
                stats["total_tokens_used"] += row['tokens_used']

            # Processing time
            if row.get('processing_time_ms'):
                processing_times.append(row['processing_time_ms'])

        if processing_times:
            stats["avg_processing_time_ms"] = sum(processing_times) / len(processing_times)

        return stats


@router.get("/health")
async def check_ai_health():
    """AI servis durumu"""
    return {
        "status": "healthy",
        "anthropic_available": analyzer.client is not None,
        "model": analyzer.model,
        "mode": "live" if analyzer.client else "demo"
    }
