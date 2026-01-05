"""
Quarterly File Manager
Orchestrates Big-6 document ingestion with multi-tenant isolation,
content hashing, format detection, time shield validation, and audit trail.
"""

import os
import uuid
import hashlib
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Dict, Optional, Tuple, List
import json
import logging
import sys

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from database.db import get_connection

logger = logging.getLogger(__name__)

# Doc type enum
DOC_TYPES = ['MIZAN', 'BANKA', 'BEYANNAME', 'TAHAKKUK', 'EDEFTER_BERAT', 'EFATURA_ARSIV']

# Required docs for completeness
REQUIRED_DOCS = ['MIZAN', 'BANKA']
OPTIONAL_DOCS = ['BEYANNAME', 'TAHAKKUK', 'EDEFTER_BERAT', 'EFATURA_ARSIV']

# Period to date range mapping
PERIOD_RANGES = {
    'Q1': (1, 3),   # Jan-Mar
    'Q2': (4, 6),   # Apr-Jun
    'Q3': (7, 9),   # Jul-Sep
    'Q4': (10, 12)  # Oct-Dec
}

# Time Shield rules per doc type
TIME_SHIELD_RULES = {
    'EDEFTER_BERAT': 'HARD',   # Hard reject if date mismatch
    'BEYANNAME': 'HARD',       # Hard reject
    'MIZAN': 'WARN',           # Warn only
    'BANKA': 'WARN',           # Warn (banks may have overflow)
    'TAHAKKUK': 'WARN',        # Warn
    'EFATURA_ARSIV': 'WARN'    # Warn
}


class QuarterlyFileManager:
    """
    Main orchestrator for quarterly document ingestion
    """

    def __init__(self, base_upload_dir: str = "backend/uploads"):
        self.base_upload_dir = Path(base_upload_dir)
        self.base_upload_dir.mkdir(parents=True, exist_ok=True)

    def upload_document(
        self,
        tenant_id: str,
        client_id: str,
        period_id: str,
        file_content: bytes,
        original_filename: str,
        doc_type: Optional[str] = None,
        actor: str = "system"
    ) -> Dict:
        """
        Process document upload with full pipeline:
        1. Calculate content hash
        2. Check dedupe
        3. Classify doc type (if not provided)
        4. Store file
        5. Parse document
        6. Time shield validation
        7. Create DB record
        8. Audit log

        Returns:
            ResponseEnvelope compliant dict
        """

        # 1. Calculate content hash
        content_hash = hashlib.sha256(file_content).hexdigest()
        evidence_id = f"EV-{content_hash[:16]}"

        # 2. Check dedupe
        existing = self._check_dedupe(tenant_id, client_id, period_id, content_hash)
        if existing:
            self._audit_log(tenant_id, client_id, period_id, actor,
                           'UPLOAD_DEDUPE_SKIP', existing['id'],
                           {'reason': 'Duplicate content hash', 'existing_id': str(existing['id'])})
            return {
                "status": "WARN",
                "data": {
                    "upload": existing,
                    "dedupe": True,
                    "message": "Bu dosya zaten yüklü"
                },
                "evidence_refs": [evidence_id],
                "errors": []
            }

        # 3. Classify doc type (Format Detective)
        if not doc_type:
            detected_type, confidence, detection_reason = self._detect_doc_type(
                file_content, original_filename
            )
            doc_type = detected_type
            classification_confidence = confidence
        else:
            classification_confidence = 1.0
            detection_reason = "User specified"

        # Validate doc_type
        if doc_type not in DOC_TYPES:
            return {
                "status": "ERROR",
                "data": None,
                "errors": [{
                    "code": "INVALID_DOC_TYPE",
                    "message": f"Geçersiz döküman tipi: {doc_type}",
                    "details": {"valid_types": DOC_TYPES}
                }]
            }

        # 4. Store file
        upload_id = str(uuid.uuid4())
        stored_path = self._store_file(
            tenant_id, client_id, period_id, doc_type,
            upload_id, original_filename, file_content
        )

        # 5. Parse document
        parse_result = self._parse_document(doc_type, file_content, original_filename)

        # 6. Time shield validation
        time_shield_result = self._validate_time_shield(
            doc_type, period_id,
            parse_result.get('doc_date_min'),
            parse_result.get('doc_date_max')
        )

        # 7. Create DB record
        record = self._create_db_record(
            upload_id=upload_id,
            tenant_id=tenant_id,
            client_id=client_id,
            period_id=period_id,
            doc_type=doc_type,
            original_filename=original_filename,
            stored_path=stored_path,
            content_hash=content_hash,
            file_size=len(file_content),
            classification_confidence=classification_confidence,
            parse_result=parse_result,
            time_shield_result=time_shield_result,
            actor=actor
        )

        # 8. Audit log
        self._audit_log(tenant_id, client_id, period_id, actor,
                       'UPLOAD_RECEIVED', record['id'],
                       {'filename': original_filename, 'doc_type': doc_type, 'hash': content_hash[:16]})

        if parse_result['status'] == 'OK':
            self._audit_log(tenant_id, client_id, period_id, actor,
                           'PARSE_OK', record['id'], parse_result.get('metadata', {}))
        elif parse_result['status'] == 'WARN':
            self._audit_log(tenant_id, client_id, period_id, actor,
                           'PARSE_WARN', record['id'], {'warnings': parse_result.get('warnings', [])})
        else:
            self._audit_log(tenant_id, client_id, period_id, actor,
                           'PARSE_ERROR', record['id'], {'error': parse_result.get('error')})

        self._audit_log(tenant_id, client_id, period_id, actor,
                       f'TIME_SHIELD_{time_shield_result["status"]}', record['id'],
                       {'reason': time_shield_result.get('reason')})

        # Determine overall status
        overall_status = 'OK'
        if time_shield_result['status'] == 'REJECT':
            overall_status = 'ERROR'
        elif time_shield_result['status'] == 'WARN' or parse_result['status'] == 'WARN':
            overall_status = 'WARN'
        elif classification_confidence < 0.8:
            overall_status = 'WARN'

        return {
            "status": overall_status,
            "data": {
                "upload": record,
                "classification": {
                    "doc_type": doc_type,
                    "confidence": classification_confidence,
                    "reason": detection_reason
                },
                "time_shield": time_shield_result,
                "parse": {
                    "status": parse_result['status'],
                    "doc_date_min": parse_result.get('doc_date_min'),
                    "doc_date_max": parse_result.get('doc_date_max'),
                    "warnings": parse_result.get('warnings', [])
                }
            },
            "evidence_refs": [evidence_id],
            "errors": [] if overall_status != 'ERROR' else [{
                "code": "TIME_SHIELD_REJECT",
                "message": time_shield_result.get('reason', 'Dönem uyumsuzluğu'),
                "details": time_shield_result
            }]
        }

    def _check_dedupe(self, tenant_id: str, client_id: str, period_id: str,
                      content_hash: str) -> Optional[Dict]:
        """Check if document already exists (dedupe by hash)"""
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT * FROM document_uploads
                WHERE tenant_id = ? AND client_id = ? AND period_id = ?
                AND content_hash_sha256 = ? AND is_active = 1
            """, [tenant_id, client_id, period_id, content_hash])

            result = cursor.fetchone()

            if result:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, result))
            return None

    def _detect_doc_type(self, content: bytes, filename: str) -> Tuple[str, float, str]:
        """
        Format Detective: Detect document type from content and filename
        Returns: (doc_type, confidence, reason)
        """

        filename_lower = filename.lower()

        # Try to decode content
        try:
            text_content = content.decode('utf-8', errors='ignore').lower()
        except Exception:
            text_content = ""

        # Detection signals
        signals = {
            'MIZAN': 0.0,
            'BANKA': 0.0,
            'BEYANNAME': 0.0,
            'TAHAKKUK': 0.0,
            'EDEFTER_BERAT': 0.0,
            'EFATURA_ARSIV': 0.0
        }

        # Filename signals
        if 'mizan' in filename_lower:
            signals['MIZAN'] += 0.5
        if 'banka' in filename_lower or 'ekstre' in filename_lower:
            signals['BANKA'] += 0.5
        if 'beyan' in filename_lower or 'kdv' in filename_lower or 'muhtasar' in filename_lower:
            signals['BEYANNAME'] += 0.5
        if 'tahakkuk' in filename_lower:
            signals['TAHAKKUK'] += 0.5
        if 'berat' in filename_lower or 'edefter' in filename_lower:
            signals['EDEFTER_BERAT'] += 0.5
        if 'efatura' in filename_lower or 'fatura' in filename_lower:
            signals['EFATURA_ARSIV'] += 0.5

        # Content signals
        # MIZAN: hesap kodu + borç/alacak
        if ('hesap' in text_content or 'borç' in text_content or 'borc' in text_content) and \
           ('alacak' in text_content or 'bakiye' in text_content):
            signals['MIZAN'] += 0.4

        # BANKA: valör, dekont, banka terimleri
        if 'valör' in text_content or 'valor' in text_content or 'dekont' in text_content:
            signals['BANKA'] += 0.4
        if any(bank in text_content for bank in ['garanti', 'işbank', 'isbank', 'akbank', 'yapıkredi', 'ziraat']):
            signals['BANKA'] += 0.3

        # BERAT: XML tags
        if '<berat' in text_content or '<edefter' in text_content or 'baslangictarihi' in text_content:
            signals['EDEFTER_BERAT'] += 0.6

        # BEYANNAME: beyan terimleri
        if 'beyanname' in text_content or 'matrah' in text_content or 'vergi dairesi' in text_content:
            signals['BEYANNAME'] += 0.4

        # Find best match
        best_type = max(signals, key=signals.get)
        confidence = min(signals[best_type], 1.0)

        # If no strong signal, default to MIZAN with low confidence
        if confidence < 0.3:
            return ('MIZAN', 0.3, 'Düşük güvenli tahmin (varsayılan MIZAN)')

        reason = f"Otomatik sınıflandırma: {best_type} (dosya adı ve içerik analizi)"
        return (best_type, confidence, reason)

    def _store_file(self, tenant_id: str, client_id: str, period_id: str,
                    doc_type: str, upload_id: str, filename: str, content: bytes) -> str:
        """
        Store file with multi-tenant path structure:
        uploads/{SMMM_ID}/{CLIENT_ID}/{PERIOD_ID}/{DOC_TYPE}/{YYYYMMDD}/{UPLOAD_ID}/{FILENAME}
        """

        date_folder = datetime.now().strftime('%Y%m%d')

        path = self.base_upload_dir / tenant_id / client_id / period_id / doc_type / date_folder / upload_id
        path.mkdir(parents=True, exist_ok=True)

        # Sanitize filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in '._-')
        file_path = path / safe_filename

        with open(file_path, 'wb') as f:
            f.write(content)

        return str(file_path)

    def _parse_document(self, doc_type: str, content: bytes, filename: str) -> Dict:
        """
        Parse document using appropriate parser
        Returns: {status, doc_date_min, doc_date_max, metadata, warnings, error}
        """

        try:
            if doc_type == 'MIZAN':
                from services.parsers.mizan_parser import MizanParser
                parser = MizanParser()
            elif doc_type == 'BANKA':
                from services.parsers.banka_parser import BankaParser
                parser = BankaParser()
            elif doc_type == 'EDEFTER_BERAT':
                from services.parsers.berat_parser import BeratParser
                parser = BeratParser()
            else:
                # Minimal parser for other types
                return {
                    'status': 'OK',
                    'doc_date_min': None,
                    'doc_date_max': None,
                    'metadata': {'parser': 'minimal'},
                    'warnings': ['Detaylı parse yapılmadı (gelecek sürümde)']
                }

            return parser.parse(content, filename)

        except Exception as e:
            logger.error(f"Parse error for {doc_type}: {e}", exc_info=True)
            return {
                'status': 'ERROR',
                'error': str(e),
                'warnings': []
            }

    def _validate_time_shield(self, doc_type: str, period_id: str,
                              doc_date_min: Optional[str], doc_date_max: Optional[str]) -> Dict:
        """
        Time Shield: Validate document dates against period
        """

        if not doc_date_min and not doc_date_max:
            return {
                'status': 'WARN',
                'reason': 'Tarih bilgisi çıkarılamadı'
            }

        # Parse period
        try:
            year = int(period_id.split('-')[0])
            quarter = period_id.split('-')[1]  # Q1, Q2, etc.

            start_month, end_month = PERIOD_RANGES.get(quarter, (1, 12))
            period_start = date(year, start_month, 1)

            # End of quarter
            if end_month == 12:
                period_end = date(year, 12, 31)
            else:
                period_end = date(year, end_month + 1, 1) - timedelta(days=1)

        except Exception as e:
            return {
                'status': 'WARN',
                'reason': f'Period parse hatası: {e}'
            }

        # Parse document dates
        try:
            doc_min = datetime.strptime(doc_date_min, '%Y-%m-%d').date() if doc_date_min else None
            doc_max = datetime.strptime(doc_date_max, '%Y-%m-%d').date() if doc_date_max else None
        except Exception:
            return {
                'status': 'WARN',
                'reason': 'Döküman tarihi parse edilemedi'
            }

        # Check if document dates fall within period
        in_range = True

        if doc_min and doc_min < period_start:
            in_range = False
        if doc_max and doc_max > period_end:
            in_range = False

        if in_range:
            return {
                'status': 'PASS',
                'reason': 'Döküman tarihleri dönem aralığında'
            }

        # Apply rule based on doc type
        rule = TIME_SHIELD_RULES.get(doc_type, 'WARN')

        if rule == 'HARD':
            return {
                'status': 'REJECT',
                'reason': f'Döküman tarihleri ({doc_date_min} - {doc_date_max}) dönem aralığı dışında ({period_start} - {period_end}). {doc_type} için kesin red.'
            }
        else:
            return {
                'status': 'WARN',
                'reason': f'Döküman tarihleri ({doc_date_min} - {doc_date_max}) dönem sınırlarını aşıyor. Kontrol edin.'
            }

    def _create_db_record(self, upload_id: str, tenant_id: str, client_id: str,
                          period_id: str, doc_type: str, original_filename: str,
                          stored_path: str, content_hash: str, file_size: int,
                          classification_confidence: float, parse_result: Dict,
                          time_shield_result: Dict, actor: str) -> Dict:
        """Create database record for upload"""

        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO document_uploads (
                    id, tenant_id, client_id, period_id, doc_type, original_filename,
                    stored_path, size_bytes, content_hash_sha256, received_by,
                    parser_name, parser_version, parse_status, parse_error,
                    doc_date_min, doc_date_max, time_shield_status, time_shield_reason,
                    classification_confidence, metadata
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            """, [
                upload_id, tenant_id, client_id, period_id, doc_type, original_filename,
                stored_path, file_size, content_hash, actor,
                parse_result.get('parser_name', 'unknown'),
                parse_result.get('parser_version', '1.0'),
                parse_result.get('status', 'OK'),
                parse_result.get('error'),
                parse_result.get('doc_date_min'),
                parse_result.get('doc_date_max'),
                time_shield_result['status'],
                time_shield_result.get('reason'),
                classification_confidence,
                json.dumps(parse_result.get('metadata', {}))
            ])

            conn.commit()

            # Fetch the created record
            cursor.execute("SELECT * FROM document_uploads WHERE id = ?", [upload_id])
            row = cursor.fetchone()
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, row))

    def _audit_log(self, tenant_id: str, client_id: str, period_id: str,
                   actor: str, action: str, target_id: Optional[str], details: Dict):
        """Write to audit log"""

        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO ingestion_audit_log
                (tenant_id, client_id, period_id, actor, action, target_id, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [tenant_id, client_id, period_id, actor, action, target_id, json.dumps(details)])

            conn.commit()

    def get_period_completeness(self, tenant_id: str, client_id: str, period_id: str) -> Dict:
        """
        Get completeness status for a period
        Returns fail-soft missing_data contract
        """

        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT doc_type, COUNT(*) as count,
                       MAX(parse_status) as parse_status,
                       MAX(time_shield_status) as time_shield_status
                FROM document_uploads
                WHERE tenant_id = ? AND client_id = ? AND period_id = ? AND is_active = 1
                GROUP BY doc_type
            """, [tenant_id, client_id, period_id])

            results = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in results]

        present = [r['doc_type'] for r in results]
        missing_required = [dt for dt in REQUIRED_DOCS if dt not in present]
        missing_optional = [dt for dt in OPTIONAL_DOCS if dt not in present]

        # Generate actions for missing required
        actions = []
        for dt in missing_required:
            actions.append({
                "code": f"UPLOAD_{dt}",
                "label": f"{dt} yükleyin",
                "eta_minutes": 30,
                "risk": "HIGH"
            })

        # Generate reasons
        reasons = []
        if 'BANKA' in missing_required:
            reasons.append("BANKA eksik: 102 hesap mutabakatı yapılamaz")
        if 'MIZAN' in missing_required:
            reasons.append("MIZAN eksik: Dönem analizi yapılamaz")

        return {
            "required": REQUIRED_DOCS,
            "optional": OPTIONAL_DOCS,
            "present": present,
            "missing_required": missing_required,
            "missing_optional": missing_optional,
            "is_complete": len(missing_required) == 0,
            "reason": "; ".join(reasons) if reasons else "Tüm zorunlu dökümanlar mevcut",
            "actions": actions,
            "doc_details": results
        }

    def list_documents(self, tenant_id: str, client_id: str, period_id: str,
                       doc_type: Optional[str] = None) -> List[Dict]:
        """List documents for a period"""

        with get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT * FROM document_uploads
                WHERE tenant_id = ? AND client_id = ? AND period_id = ? AND is_active = 1
            """
            params = [tenant_id, client_id, period_id]

            if doc_type:
                query += " AND doc_type = ?"
                params.append(doc_type)

            query += " ORDER BY received_at DESC"

            cursor.execute(query, params)
            results = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]

            return [dict(zip(columns, row)) for row in results]

    def override_doc_type(self, document_id: str, new_doc_type: str,
                          reason: str, actor: str) -> Dict:
        """Override document type with audit trail"""

        if new_doc_type not in DOC_TYPES:
            return {
                "status": "ERROR",
                "error": f"Geçersiz döküman tipi: {new_doc_type}"
            }

        with get_connection() as conn:
            cursor = conn.cursor()

            # Get current record
            cursor.execute("SELECT * FROM document_uploads WHERE id = ?", [document_id])
            row = cursor.fetchone()

            if not row:
                return {"status": "ERROR", "error": "Döküman bulunamadı"}

            columns = [desc[0] for desc in cursor.description]
            record = dict(zip(columns, row))

            # Update record
            cursor.execute("""
                UPDATE document_uploads
                SET user_doc_type_override = ?, override_reason = ?, doc_type = ?,
                    updated_at = datetime('now')
                WHERE id = ?
            """, [new_doc_type, reason, new_doc_type, document_id])

            conn.commit()

            # Audit log
            self._audit_log(
                record['tenant_id'], record['client_id'], record['period_id'],
                actor, 'OVERRIDE_DOC_TYPE', document_id,
                {'old_type': record['doc_type'], 'new_type': new_doc_type, 'reason': reason}
            )

            # Fetch updated record
            cursor.execute("SELECT * FROM document_uploads WHERE id = ?", [document_id])
            row = cursor.fetchone()
            updated = dict(zip(columns, row))

            return {
                "status": "OK",
                "data": updated
            }
