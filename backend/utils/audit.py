"""
Audit Log Utility

Logs all operations to audit_log table for compliance and traceability.
"""

import json
import sys
from pathlib import Path
from typing import Optional, Dict, List

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection


def log_action(
    user_id: str,
    action: str,
    client_id: Optional[str] = None,
    period_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Log an action to audit_log table

    Args:
        user_id: User who performed action
        action: Action name (e.g., 'get_quarterly_tax', 'upload_mizan')
        client_id: Related client (optional)
        period_id: Related period (optional)
        resource_type: Type of resource (e.g., 'mizan', 'beyanname')
        resource_id: Resource identifier
        details: Additional details as dict
        ip_address: Client IP
        user_agent: User agent string
    """

    try:
        with get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO audit_log
                (user_id, client_id, period_id, action, resource_type, resource_id,
                 details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    user_id,
                    client_id,
                    period_id,
                    action,
                    resource_type,
                    resource_id,
                    json.dumps(details) if details else None,
                    ip_address,
                    user_agent
                ]
            )

            conn.commit()
    except Exception as e:
        # Don't raise - audit failure shouldn't break the request
        print(f"Audit log error: {e}")


def get_audit_trail(
    user_id: Optional[str] = None,
    client_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100
) -> List[Dict]:
    """Get audit trail with filters"""

    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM audit_log WHERE 1=1"
        params = []

        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)

        if client_id:
            query += " AND client_id = ?"
            params.append(client_id)

        if action:
            query += " AND action = ?"
            params.append(action)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for row in rows:
            row_dict = dict(row)
            # Parse JSON details if present
            if row_dict.get("details"):
                try:
                    row_dict["details"] = json.loads(row_dict["details"])
                except:
                    pass
            results.append(row_dict)

        return results


def get_audit_stats(days: int = 7) -> Dict:
    """Get audit statistics for dashboard"""

    with get_connection() as conn:
        cursor = conn.cursor()

        # Total actions in period
        cursor.execute(
            """
            SELECT COUNT(*) FROM audit_log
            WHERE timestamp >= datetime('now', ?)
            """,
            [f'-{days} days']
        )
        total = cursor.fetchone()[0]

        # Actions by type
        cursor.execute(
            """
            SELECT action, COUNT(*) as count FROM audit_log
            WHERE timestamp >= datetime('now', ?)
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10
            """,
            [f'-{days} days']
        )
        by_action = [{"action": row[0], "count": row[1]} for row in cursor.fetchall()]

        # Actions by user
        cursor.execute(
            """
            SELECT user_id, COUNT(*) as count FROM audit_log
            WHERE timestamp >= datetime('now', ?)
            GROUP BY user_id
            ORDER BY count DESC
            LIMIT 10
            """,
            [f'-{days} days']
        )
        by_user = [{"user_id": row[0], "count": row[1]} for row in cursor.fetchall()]

        return {
            "period_days": days,
            "total_actions": total,
            "by_action": by_action,
            "by_user": by_user
        }
