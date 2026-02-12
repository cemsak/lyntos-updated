"""
LYNTOS Kural Yönetimi Servisi
=============================
Merkezi kural kütüphanesi yönetimi için servis.

Fonksiyonlar:
- Kural CRUD operasyonları
- Kural arama ve filtreleme
- Duplicate yönetimi
- Mevzuat referans bağlama
- Kural versiyon kontrolü

KUTSAL KİTAP KURALLARI:
- ❌ Demo modu YASAK
- ❌ Hallucination YASAK
- ⚠️ Yanlış kural = MALİYE CEZASI riski
"""

import json
import sqlite3
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

from database.db import get_connection


class RuleManager:
    """Kural yönetim sınıfı"""

    # ═══════════════════════════════════════════════════════════
    # KURAL CRUD OPERASYONLARİ
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_all_rules(
        category: Optional[str] = None,
        priority: Optional[str] = None,
        severity: Optional[str] = None,
        is_active: bool = True,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Tüm kuralları getir (filtreli)"""
        with get_connection() as conn:
            cursor = conn.cursor()

            # Base query
            query = "SELECT * FROM rules WHERE 1=1"
            count_query = "SELECT COUNT(*) FROM rules WHERE 1=1"
            params = []

            # Filters
            if is_active is not None:
                query += " AND is_active = ?"
                count_query += " AND is_active = ?"
                params.append(1 if is_active else 0)

            if category:
                query += " AND category = ?"
                count_query += " AND category = ?"
                params.append(category)

            if priority:
                query += " AND priority = ?"
                count_query += " AND priority = ?"
                params.append(priority)

            if severity:
                query += " AND severity = ?"
                count_query += " AND severity = ?"
                params.append(severity)

            if search:
                query += " AND (name LIKE ? OR name_tr LIKE ? OR description LIKE ? OR rule_id LIKE ?)"
                count_query += " AND (name LIKE ? OR name_tr LIKE ? OR description LIKE ? OR rule_id LIKE ?)"
                search_param = f"%{search}%"
                params.extend([search_param, search_param, search_param, search_param])

            # Count
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            # Order and pagination
            query += " ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, rule_id"
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            rows = cursor.fetchall()

            rules = []
            for row in rows:
                rule = dict(row)
                # JSON alanları parse et
                for field in ['thresholds', 'inputs', 'outputs', 'accounts', 'sector_thresholds',
                              'inspector_questions', 'answer_templates', 'required_documents',
                              'legal_refs', 'test_cases', 'evidence_required']:
                    if rule.get(field):
                        try:
                            rule[field] = json.loads(rule[field])
                        except (json.JSONDecodeError, TypeError) as e:
                            logger.warning(f"Failed to parse JSON field '{field}' for rule {rule.get('rule_id')}: {e}")
                            # Keep original value if parsing fails
                rules.append(rule)

            return rules, total

    @staticmethod
    def get_rule_by_id(rule_id: str) -> Optional[Dict[str, Any]]:
        """Tek bir kuralı getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM rules WHERE rule_id = ?", (rule_id,))
            row = cursor.fetchone()

            if not row:
                return None

            rule = dict(row)
            # JSON alanları parse et
            for field in ['thresholds', 'inputs', 'outputs', 'accounts', 'sector_thresholds',
                          'inspector_questions', 'answer_templates', 'required_documents',
                          'legal_refs', 'test_cases', 'evidence_required']:
                if rule.get(field):
                    try:
                        rule[field] = json.loads(rule[field])
                    except (json.JSONDecodeError, TypeError) as e:
                        logger.warning(f"Failed to parse JSON field '{field}' for rule {rule_id}: {e}")
                        # Keep original value if parsing fails

            return rule

    @staticmethod
    def create_rule(rule_data: Dict[str, Any], created_by: str = "system") -> Dict[str, Any]:
        """Yeni kural oluştur"""
        with get_connection() as conn:
            cursor = conn.cursor()
            try:
                # JSON alanlarını string'e çevir
                def to_json(val):
                    if isinstance(val, (list, dict)):
                        return json.dumps(val, ensure_ascii=False)
                    return val or '[]' if isinstance(val, list) else '{}'

                now = datetime.now().isoformat()

                cursor.execute("""
                    INSERT INTO rules (
                        rule_id, name, name_tr, version, category, priority, severity,
                        description, algorithm, thresholds, inputs, outputs, accounts,
                        sector_thresholds, inspector_questions, answer_templates,
                        required_documents, legal_refs, test_cases, evidence_required,
                        source_type, source_file, is_active, created_at, updated_at, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    rule_data.get('rule_id'),
                    rule_data.get('name'),
                    rule_data.get('name_tr', rule_data.get('name')),
                    rule_data.get('version', '1.0.0'),
                    rule_data.get('category', 'UNKNOWN'),
                    rule_data.get('priority', 'MEDIUM').upper(),
                    rule_data.get('severity', 'MEDIUM').upper(),
                    rule_data.get('description', ''),
                    rule_data.get('algorithm', ''),
                    to_json(rule_data.get('thresholds', {})),
                    to_json(rule_data.get('inputs', [])),
                    to_json(rule_data.get('outputs', [])),
                    to_json(rule_data.get('accounts', [])),
                    to_json(rule_data.get('sector_thresholds', {})),
                    to_json(rule_data.get('inspector_questions', [])),
                    to_json(rule_data.get('answer_templates', [])),
                    to_json(rule_data.get('required_documents', [])),
                    to_json(rule_data.get('legal_refs', [])),
                    to_json(rule_data.get('test_cases', [])),
                    to_json(rule_data.get('evidence_required', [])),
                    rule_data.get('source_type', 'db'),
                    rule_data.get('source_file', ''),
                    1,
                    now,
                    now,
                    created_by
                ))
                conn.commit()
                return RuleManager.get_rule_by_id(rule_data.get('rule_id'))
            except sqlite3.Error:
                conn.rollback()
                raise

    @staticmethod
    def update_rule(rule_id: str, updates: Dict[str, Any], updated_by: str = "system") -> Optional[Dict[str, Any]]:
        """Kural güncelle"""
        with get_connection() as conn:
            cursor = conn.cursor()
            try:
                # Mevcut kuralı kontrol et
                cursor.execute("SELECT * FROM rules WHERE rule_id = ?", (rule_id,))
                if not cursor.fetchone():
                    return None

                # Güncellenebilir alanlar
                allowed_fields = [
                    'name', 'name_tr', 'version', 'category', 'priority', 'severity',
                    'description', 'algorithm', 'thresholds', 'inputs', 'outputs',
                    'accounts', 'sector_thresholds', 'inspector_questions',
                    'answer_templates', 'required_documents', 'legal_refs',
                    'test_cases', 'evidence_required', 'is_active', 'is_deprecated',
                    'deprecated_by', 'effective_from', 'effective_until'
                ]

                set_clauses = []
                params = []

                for field in allowed_fields:
                    if field in updates:
                        val = updates[field]
                        if isinstance(val, (list, dict)):
                            val = json.dumps(val, ensure_ascii=False)
                        set_clauses.append(f"{field} = ?")
                        params.append(val)

                if not set_clauses:
                    return RuleManager.get_rule_by_id(rule_id)

                set_clauses.append("updated_at = ?")
                params.append(datetime.now().isoformat())

                set_clauses.append("updated_by = ?")
                params.append(updated_by)

                params.append(rule_id)

                query = f"UPDATE rules SET {', '.join(set_clauses)} WHERE rule_id = ?"
                cursor.execute(query, params)
                conn.commit()
                return RuleManager.get_rule_by_id(rule_id)
            except sqlite3.Error:
                conn.rollback()
                raise

    @staticmethod
    def deprecate_rule(rule_id: str, deprecated_by: str = None, reason: str = None) -> bool:
        """Kuralı deprecated yap (silme yerine)"""
        with get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    UPDATE rules
                    SET is_deprecated = 1, deprecated_by = ?, updated_at = ?
                    WHERE rule_id = ?
                """, (deprecated_by, datetime.now().isoformat(), rule_id))
                conn.commit()
                return cursor.rowcount > 0
            except sqlite3.Error:
                conn.rollback()
                raise

    # ═══════════════════════════════════════════════════════════
    # KATEGORİ VE İSTATİSTİK
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_categories() -> List[Dict[str, Any]]:
        """Kategorileri ve sayılarını getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT category, COUNT(*) as count,
                       SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical,
                       SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high,
                       SUM(CASE WHEN severity = 'MEDIUM' THEN 1 ELSE 0 END) as medium,
                       SUM(CASE WHEN severity = 'LOW' THEN 1 ELSE 0 END) as low
                FROM rules
                WHERE is_active = 1
                GROUP BY category
                ORDER BY count DESC
            """)
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def get_statistics() -> Dict[str, Any]:
        """Genel istatistikleri getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            stats = {}

            # Toplam kural
            cursor.execute("SELECT COUNT(*) FROM rules")
            stats['total'] = cursor.fetchone()[0]

            # Aktif kural
            cursor.execute("SELECT COUNT(*) FROM rules WHERE is_active = 1")
            stats['active'] = cursor.fetchone()[0]

            # Deprecated
            cursor.execute("SELECT COUNT(*) FROM rules WHERE is_deprecated = 1")
            stats['deprecated'] = cursor.fetchone()[0]

            # Severity dağılımı
            cursor.execute("""
                SELECT severity, COUNT(*) as count
                FROM rules WHERE is_active = 1
                GROUP BY severity
            """)
            stats['by_severity'] = {row[0]: row[1] for row in cursor.fetchall()}

            # Kaynak türü dağılımı
            cursor.execute("""
                SELECT source_type, COUNT(*) as count
                FROM rules
                GROUP BY source_type
            """)
            stats['by_source'] = {row[0]: row[1] for row in cursor.fetchall()}

            # Duplicate sayısı
            cursor.execute("SELECT COUNT(*) FROM rule_duplicates WHERE resolution = 'pending'")
            stats['pending_duplicates'] = cursor.fetchone()[0]

            return stats

    # ═══════════════════════════════════════════════════════════
    # DUPLİCATE YÖNETİMİ
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_duplicates(status: str = 'pending') -> List[Dict[str, Any]]:
        """Duplicate kuralları getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT d.*,
                       r1.name as rule1_name, r1.category as rule1_category,
                       r2.name as rule2_name, r2.category as rule2_category
                FROM rule_duplicates d
                LEFT JOIN rules r1 ON d.rule_id_1 = r1.rule_id
                LEFT JOIN rules r2 ON d.rule_id_2 = r2.rule_id
            """

            if status:
                query += " WHERE d.resolution = ?"
                cursor.execute(query, (status,))
            else:
                cursor.execute(query)

            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def resolve_duplicate(
        rule_id_1: str,
        rule_id_2: str,
        resolution: str,
        resolved_by: str = "system"
    ) -> bool:
        """Duplicate çözümle"""
        with get_connection() as conn:
            cursor = conn.cursor()
            try:
                now = datetime.now().isoformat()

                # Duplicate kaydını güncelle
                cursor.execute("""
                    UPDATE rule_duplicates
                    SET resolution = ?, resolved_at = ?, resolved_by = ?
                    WHERE (rule_id_1 = ? AND rule_id_2 = ?)
                       OR (rule_id_1 = ? AND rule_id_2 = ?)
                """, (resolution, now, resolved_by, rule_id_1, rule_id_2, rule_id_2, rule_id_1))

                # Eğer deprecate kararı verildiyse
                if resolution == 'deprecate_1':
                    cursor.execute("""
                        UPDATE rules SET is_deprecated = 1, deprecated_by = ?, updated_at = ?
                        WHERE rule_id = ?
                    """, (rule_id_2, now, rule_id_1))
                elif resolution == 'deprecate_2':
                    cursor.execute("""
                        UPDATE rules SET is_deprecated = 1, deprecated_by = ?, updated_at = ?
                        WHERE rule_id = ?
                    """, (rule_id_1, now, rule_id_2))

                conn.commit()
                return cursor.rowcount > 0
            except sqlite3.Error:
                conn.rollback()
                raise

    # ═══════════════════════════════════════════════════════════
    # MEVZUAT REFERANS YÖNETİMİ
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def get_rule_legal_refs(rule_id: str) -> List[Dict[str, Any]]:
        """Kural için mevzuat referanslarını getir"""
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m.*, l.link_type, l.notes as link_notes
                FROM mevzuat_refs m
                JOIN rule_mevzuat_link l ON m.id = l.mevzuat_id
                WHERE l.rule_id = ?
                ORDER BY l.link_type, m.yururluk_tarih DESC
            """, (rule_id,))
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def link_rule_to_mevzuat(
        rule_id: str,
        mevzuat_id: str,
        link_type: str = 'primary',
        notes: str = None
    ) -> bool:
        """Kuralı mevzuata bağla"""
        with get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO rule_mevzuat_link (rule_id, mevzuat_id, link_type, notes)
                    VALUES (?, ?, ?, ?)
                """, (rule_id, mevzuat_id, link_type, notes))
                conn.commit()
                return True
            except sqlite3.Error as e:
                conn.rollback()
                logger.error(f"Error linking rule {rule_id} to mevzuat {mevzuat_id}: {e}")
                return False

    # ═══════════════════════════════════════════════════════════
    # KURAL ÇALIŞTIRMA LOGLARİ
    # ═══════════════════════════════════════════════════════════

    @staticmethod
    def log_execution(
        rule_id: str,
        client_id: str = None,
        period_id: str = None,
        result_status: str = 'pass',
        result_score: float = None,
        result_data: Dict[str, Any] = None,
        execution_time_ms: int = None,
        triggered_by: str = 'system'
    ) -> int:
        """Kural çalışma sonucunu logla"""
        with get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO rule_execution_log (
                        rule_id, client_id, period_id, result_status, result_score,
                        result_data, execution_time_ms, triggered_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    rule_id, client_id, period_id, result_status, result_score,
                    json.dumps(result_data or {}), execution_time_ms, triggered_by
                ))
                conn.commit()
                return cursor.lastrowid
            except sqlite3.Error:
                conn.rollback()
                raise

    @staticmethod
    def get_execution_stats(rule_id: str, days: int = 30) -> Dict[str, Any]:
        """Kural çalışma istatistiklerini getir"""
        with get_connection() as conn:
            cursor = conn.cursor()

            stats = {'rule_id': rule_id}

            # Toplam çalışma
            cursor.execute("""
                SELECT COUNT(*) FROM rule_execution_log
                WHERE rule_id = ?
                  AND created_at >= datetime('now', ?)
            """, (rule_id, f'-{days} days'))
            stats['total_executions'] = cursor.fetchone()[0]

            # Durum dağılımı
            cursor.execute("""
                SELECT result_status, COUNT(*) as count
                FROM rule_execution_log
                WHERE rule_id = ?
                  AND created_at >= datetime('now', ?)
                GROUP BY result_status
            """, (rule_id, f'-{days} days'))
            stats['by_status'] = {row[0]: row[1] for row in cursor.fetchall()}

            # Ortalama süre
            cursor.execute("""
                SELECT AVG(execution_time_ms) FROM rule_execution_log
                WHERE rule_id = ?
                  AND execution_time_ms IS NOT NULL
                  AND created_at >= datetime('now', ?)
            """, (rule_id, f'-{days} days'))
            stats['avg_execution_time_ms'] = cursor.fetchone()[0]

            return stats


# ═══════════════════════════════════════════════════════════
# AJAN FONKSİYONLARİ (AI entegrasyonu için)
# ═══════════════════════════════════════════════════════════

def get_rules_for_analysis(client_nace: str = None) -> List[Dict[str, Any]]:
    """
    Analiz için uygun kuralları getir.
    NACE koduna göre sector_thresholds varsa bunları kullan.
    """
    rules, _ = RuleManager.get_all_rules(is_active=True, limit=200)

    # NACE'e özel threshold'ları uygula
    if client_nace:
        for rule in rules:
            sector_th = rule.get('sector_thresholds', {})
            if client_nace in sector_th:
                rule['active_thresholds'] = sector_th[client_nace]
            elif 'default' in sector_th:
                rule['active_thresholds'] = sector_th['default']
            else:
                rule['active_thresholds'] = rule.get('thresholds', {})

    return rules


def search_rules_by_topic(topic: str) -> List[Dict[str, Any]]:
    """
    Konuya göre kural ara.
    Örn: "kasa", "ortaklar", "KDV", "stok" vb.
    """
    rules, _ = RuleManager.get_all_rules(search=topic, is_active=True, limit=50)
    return rules


def get_inspector_prep_for_rule(rule_id: str) -> Optional[Dict[str, Any]]:
    """
    Müfettiş hazırlık bilgilerini getir:
    - Sorular
    - Cevap şablonları
    - Gerekli belgeler
    - Mevzuat referansları
    """
    rule = RuleManager.get_rule_by_id(rule_id)
    if not rule:
        return None

    return {
        'rule_id': rule['rule_id'],
        'name': rule['name'],
        'name_tr': rule.get('name_tr', rule['name']),
        'category': rule['category'],
        'severity': rule['severity'],
        'description': rule.get('description', ''),
        'inspector_questions': rule.get('inspector_questions', []),
        'answer_templates': rule.get('answer_templates', []),
        'required_documents': rule.get('required_documents', []),
        'evidence_required': rule.get('evidence_required', []),
        'legal_refs': rule.get('legal_refs', [])
    }


# ═══════════════════════════════════════════════════════════
# KURAL VERSİYONLAMA SİSTEMİ
# ═══════════════════════════════════════════════════════════

class RuleVersionManager:
    """
    Kural versiyonlama yöneticisi.
    Mevzuat değişikliklerinde otomatik versiyon artırma sağlar.

    Versiyon formatı: MAJOR.MINOR.PATCH
    - MAJOR: Kuralın temel mantığı değiştiğinde
    - MINOR: Mevzuat referansları güncellendiğinde
    - PATCH: Açıklama/düzeltme güncellemelerinde
    """

    @staticmethod
    def parse_version(version_str: str) -> Tuple[int, int, int]:
        """Versiyon string'ini parse et"""
        try:
            parts = version_str.split('.')
            return (
                int(parts[0]) if len(parts) > 0 else 1,
                int(parts[1]) if len(parts) > 1 else 0,
                int(parts[2]) if len(parts) > 2 else 0
            )
        except (ValueError, AttributeError) as e:
            logger.warning(f"Failed to parse version '{version_str}': {e}. Using default 1.0.0")
            return (1, 0, 0)

    @staticmethod
    def format_version(major: int, minor: int, patch: int) -> str:
        """Versiyonu string formatına çevir"""
        return f"{major}.{minor}.{patch}"

    @staticmethod
    def increment_version(current_version: str, increment_type: str = 'patch') -> str:
        """
        Versiyonu artır.
        increment_type: 'major', 'minor', veya 'patch'
        """
        major, minor, patch = RuleVersionManager.parse_version(current_version)

        if increment_type == 'major':
            return RuleVersionManager.format_version(major + 1, 0, 0)
        elif increment_type == 'minor':
            return RuleVersionManager.format_version(major, minor + 1, 0)
        else:  # patch
            return RuleVersionManager.format_version(major, minor, patch + 1)

    @staticmethod
    def update_rule_version(
        rule_id: str,
        increment_type: str = 'patch',
        reason: str = None,
        updated_by: str = 'system'
    ) -> Optional[Dict[str, Any]]:
        """
        Kuralın versiyonunu artır ve güncelle.
        Versiyon geçmişini de saklar.
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()

            # Mevcut kuralı al
            cursor.execute("SELECT rule_id, version FROM rules WHERE rule_id = ?", (rule_id,))
            row = cursor.fetchone()
            if not row:
                return None

            old_version = row['version'] or '1.0.0'
            new_version = RuleVersionManager.increment_version(old_version, increment_type)

            now = datetime.now().isoformat()

            # Versiyonu güncelle
            cursor.execute("""
                UPDATE rules
                SET version = ?, updated_at = ?, updated_by = ?
                WHERE rule_id = ?
            """, (new_version, now, updated_by, rule_id))

            # Versiyon geçmişini logla (execution log'a ekle)
            log_data = {
                'event': 'version_update',
                'old_version': old_version,
                'new_version': new_version,
                'increment_type': increment_type,
                'reason': reason
            }
            cursor.execute("""
                INSERT INTO rule_execution_log (
                    rule_id, result_status, result_data, triggered_by
                ) VALUES (?, 'version_update', ?, ?)
            """, (rule_id, json.dumps(log_data), updated_by))

            conn.commit()

            logger.info(f"Rule {rule_id} version updated: {old_version} -> {new_version} ({increment_type})")

            return {
                'rule_id': rule_id,
                'old_version': old_version,
                'new_version': new_version,
                'increment_type': increment_type,
                'reason': reason,
                'updated_at': now
            }

        except Exception as e:
            logger.error(f"Error updating version for rule {rule_id}: {e}")
            return None
        finally:
            conn.close()

    @staticmethod
    def on_mevzuat_change(mevzuat_id: str, change_type: str = 'update') -> List[Dict[str, Any]]:
        """
        Mevzuat değişikliğinde ilgili kuralların versiyonlarını artır.

        change_type:
        - 'update': Mevzuat güncellendi -> MINOR artır
        - 'repeal': Mevzuat yürürlükten kalktı -> MAJOR artır
        - 'correction': Düzeltme -> PATCH artır
        """
        conn = get_connection()
        updated_rules = []

        try:
            cursor = conn.cursor()

            # Bu mevzuata bağlı kuralları bul
            cursor.execute("""
                SELECT DISTINCT r.rule_id, r.version, r.name
                FROM rules r
                JOIN rule_mevzuat_link l ON r.rule_id = l.rule_id
                WHERE l.mevzuat_id = ?
                  AND r.is_active = 1
            """, (mevzuat_id,))

            affected_rules = cursor.fetchall()

            # Her kural için versiyon artır
            increment_map = {
                'update': 'minor',
                'repeal': 'major',
                'correction': 'patch'
            }
            increment_type = increment_map.get(change_type, 'patch')

            for row in affected_rules:
                result = RuleVersionManager.update_rule_version(
                    rule_id=row['rule_id'],
                    increment_type=increment_type,
                    reason=f"Mevzuat değişikliği: {mevzuat_id} ({change_type})",
                    updated_by='mevzuat_sync'
                )
                if result:
                    result['rule_name'] = row['name']
                    updated_rules.append(result)

            logger.info(f"Mevzuat {mevzuat_id} değişikliği: {len(updated_rules)} kural güncellendi")

            return updated_rules

        except Exception as e:
            logger.error(f"Error processing mevzuat change {mevzuat_id}: {e}")
            return []
        finally:
            conn.close()

    @staticmethod
    def get_version_history(rule_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Kuralın versiyon geçmişini getir"""
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT result_data, triggered_by, created_at
                FROM rule_execution_log
                WHERE rule_id = ? AND result_status = 'version_update'
                ORDER BY created_at DESC
                LIMIT ?
            """, (rule_id, limit))

            history = []
            for row in cursor.fetchall():
                try:
                    data = json.loads(row['result_data'])
                    data['triggered_by'] = row['triggered_by']
                    data['created_at'] = row['created_at']
                    history.append(data)
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"Failed to parse version history for rule {rule_id}: {e}")

            return history

        finally:
            conn.close()
