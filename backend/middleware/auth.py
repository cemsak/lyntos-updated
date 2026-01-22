"""
Authentication & Authorization Middleware

Supports:
- JWT Bearer tokens (production)
- DEV_* shortcut tokens (development only, when LYNTOS_DEV_AUTH_BYPASS=1)
"""

from fastapi import HTTPException, Header
from typing import Optional
import jwt
import os
import sys
import logging
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.db import get_connection

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "LYNTOS_SECRET_CHANGE_IN_PRODUCTION")
ALGORITHM = "HS256"

# Dev auth bypass - only enabled when LYNTOS_DEV_AUTH_BYPASS=1
DEV_AUTH_BYPASS = os.getenv("LYNTOS_DEV_AUTH_BYPASS", "0") == "1"
DEV_TOKEN = "DEV_HKOZKAN"


def _get_dev_user(user_id: str) -> dict:
    """Get user from DB for dev bypass"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", [user_id])
        row = cursor.fetchone()

        if not row:
            raise HTTPException(401, f"Dev user {user_id} not found in DB")

        return dict(row)


async def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify JWT token and return user info

    For development (LYNTOS_DEV_AUTH_BYPASS=1), accepts:
    - Authorization: Bearer DEV_HKOZKAN
    - Authorization: DEV_HKOZKAN
    """

    if not authorization:
        raise HTTPException(401, "Missing Authorization header")

    # Extract token (handle both "Bearer X" and raw "X" formats)
    if authorization.startswith("Bearer "):
        token = authorization[7:]  # len("Bearer ") == 7
    else:
        token = authorization

    # Dev bypass: accept DEV_HKOZKAN when LYNTOS_DEV_AUTH_BYPASS=1
    if DEV_AUTH_BYPASS and token.startswith("DEV_"):
        user_id = token[4:]  # len("DEV_") == 4
        logger.debug(f"[AUTH] Dev bypass active for user: {user_id}")
        return _get_dev_user(user_id)

    # Production: require Bearer format for JWT
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid Authorization format (expected: Bearer <token>)")

    # Production JWT validation
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub") or payload.get("user_id")

        if not user_id:
            raise HTTPException(401, "Invalid token payload")

        # Get user from DB
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE id = ?", [user_id])
            row = cursor.fetchone()

            if not row:
                raise HTTPException(401, "User not found")

            return dict(row)

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def check_client_access(user: dict, client_id: str) -> bool:
    """Check if user has access to client"""

    # Admin has access to all clients
    if user["role"] == "admin":
        return True

    # SMMM can only access their own clients
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id FROM clients WHERE id = ? AND smmm_id = ?",
            [client_id, user["id"]]
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(403, f"Access denied to client {client_id}")

        return True


def get_user_clients(user_id: str) -> list:
    """Get all clients for a user"""

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM clients WHERE smmm_id = ?",
            [user_id]
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_client_periods(client_id: str) -> list:
    """Get all periods for a client"""

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM periods WHERE client_id = ? ORDER BY start_date DESC",
            [client_id]
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
