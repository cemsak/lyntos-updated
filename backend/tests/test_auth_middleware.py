# -*- coding: utf-8 -*-
"""
Tests for auth middleware — verify_token, dev bypass, check_client_access, get_user_clients
"""

import pytest
import sqlite3
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
from jose import jwt

sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import JWT_SECRET_KEY, JWT_ALGORITHM


# ═══════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════

@pytest.fixture
def auth_db(tmp_path):
    """In-memory-like temp DB with users and clients tables"""
    db_path = tmp_path / "test_auth.db"
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.executescript("""
        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            role TEXT DEFAULT 'smmm'
        );
        CREATE TABLE clients (
            id TEXT PRIMARY KEY,
            name TEXT,
            tax_id TEXT,
            smmm_id TEXT
        );

        INSERT INTO users (id, name, email, role) VALUES
            ('HKOZKAN', 'Hakan Ozkan', 'hakan@test.com', 'smmm'),
            ('ADMIN1', 'Admin User', 'admin@test.com', 'admin');

        INSERT INTO clients (id, name, tax_id, smmm_id) VALUES
            ('CLIENT_001', 'Ozkan Ltd.', '0480525636', 'HKOZKAN'),
            ('CLIENT_002', 'Diger Ltd.', '1234567890', 'OTHER_SMMM');
    """)
    conn.commit()
    conn.close()
    return db_path


@pytest.fixture
def mock_db(auth_db):
    """Patch get_connection to use our test DB"""
    def _get_conn():
        conn = sqlite3.connect(str(auth_db))
        conn.row_factory = sqlite3.Row
        return conn

    with patch("middleware.auth.get_connection", _get_conn):
        yield


def _make_jwt(user_id: str, expired: bool = False) -> str:
    """Create a JWT token for testing"""
    from datetime import datetime, timedelta
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + (timedelta(hours=-1) if expired else timedelta(hours=4)),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


# ═══════════════════════════════════════════════════════════════
# verify_token
# ═══════════════════════════════════════════════════════════════

class TestVerifyToken:
    @pytest.mark.asyncio
    async def test_missing_header_raises_401(self, mock_db):
        from middleware.auth import verify_token
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await verify_token(authorization=None)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_dev_bypass_bearer_prefix(self, mock_db):
        """DEV_HKOZKAN with Bearer prefix should work when dev bypass is on"""
        from middleware.auth import verify_token

        with patch("middleware.auth.DEV_AUTH_BYPASS", True):
            user = await verify_token(authorization="Bearer DEV_HKOZKAN")
            assert user["id"] == "HKOZKAN"
            assert user["name"] == "Hakan Ozkan"

    @pytest.mark.asyncio
    async def test_dev_bypass_raw_token(self, mock_db):
        """DEV_HKOZKAN without Bearer prefix should also work"""
        from middleware.auth import verify_token

        with patch("middleware.auth.DEV_AUTH_BYPASS", True):
            user = await verify_token(authorization="DEV_HKOZKAN")
            assert user["id"] == "HKOZKAN"

    @pytest.mark.asyncio
    async def test_dev_bypass_disabled(self, mock_db):
        """DEV_ token should fail when bypass is disabled"""
        from middleware.auth import verify_token
        from fastapi import HTTPException

        with patch("middleware.auth.DEV_AUTH_BYPASS", False):
            with pytest.raises(HTTPException) as exc_info:
                await verify_token(authorization="DEV_HKOZKAN")
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_dev_bypass_unknown_user(self, mock_db):
        """DEV_ token for non-existent user should fail"""
        from middleware.auth import verify_token
        from fastapi import HTTPException

        with patch("middleware.auth.DEV_AUTH_BYPASS", True):
            with pytest.raises(HTTPException) as exc_info:
                await verify_token(authorization="DEV_NONEXISTENT")
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_valid_jwt(self, mock_db):
        """Valid JWT should return user dict"""
        from middleware.auth import verify_token

        with patch("middleware.auth.DEV_AUTH_BYPASS", False):
            token = _make_jwt("HKOZKAN")
            user = await verify_token(authorization=f"Bearer {token}")
            assert user["id"] == "HKOZKAN"
            assert user["role"] == "smmm"

    @pytest.mark.asyncio
    async def test_expired_jwt(self, mock_db):
        """Expired JWT should raise 401"""
        from middleware.auth import verify_token
        from fastapi import HTTPException

        with patch("middleware.auth.DEV_AUTH_BYPASS", False):
            token = _make_jwt("HKOZKAN", expired=True)
            with pytest.raises(HTTPException) as exc_info:
                await verify_token(authorization=f"Bearer {token}")
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_jwt(self, mock_db):
        """Garbage JWT should raise 401"""
        from middleware.auth import verify_token
        from fastapi import HTTPException

        with patch("middleware.auth.DEV_AUTH_BYPASS", False):
            with pytest.raises(HTTPException) as exc_info:
                await verify_token(authorization="Bearer garbage.token.here")
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_jwt_without_bearer_prefix(self, mock_db):
        """JWT token without Bearer prefix should fail with format error"""
        from middleware.auth import verify_token
        from fastapi import HTTPException

        with patch("middleware.auth.DEV_AUTH_BYPASS", False):
            token = _make_jwt("HKOZKAN")
            with pytest.raises(HTTPException) as exc_info:
                await verify_token(authorization=token)
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_jwt_user_not_in_db(self, mock_db):
        """JWT with valid signature but user not in DB"""
        from middleware.auth import verify_token
        from fastapi import HTTPException

        with patch("middleware.auth.DEV_AUTH_BYPASS", False):
            token = _make_jwt("GHOST_USER")
            with pytest.raises(HTTPException) as exc_info:
                await verify_token(authorization=f"Bearer {token}")
            assert exc_info.value.status_code == 401


# ═══════════════════════════════════════════════════════════════
# check_client_access
# ═══════════════════════════════════════════════════════════════

class TestCheckClientAccess:
    @pytest.mark.asyncio
    async def test_admin_has_access_to_all(self, mock_db):
        from middleware.auth import check_client_access

        admin = {"id": "ADMIN1", "role": "admin"}
        result = await check_client_access(admin, "CLIENT_002")
        assert result is True

    @pytest.mark.asyncio
    async def test_smmm_own_client(self, mock_db):
        from middleware.auth import check_client_access

        user = {"id": "HKOZKAN", "role": "smmm"}
        result = await check_client_access(user, "CLIENT_001")
        assert result is True

    @pytest.mark.asyncio
    async def test_smmm_other_client_denied(self, mock_db):
        from middleware.auth import check_client_access
        from fastapi import HTTPException

        user = {"id": "HKOZKAN", "role": "smmm"}
        with pytest.raises(HTTPException) as exc_info:
            await check_client_access(user, "CLIENT_002")
        assert exc_info.value.status_code == 403


# ═══════════════════════════════════════════════════════════════
# get_user_clients — SMMM data isolation
# ═══════════════════════════════════════════════════════════════

class TestGetUserClients:
    def test_returns_only_own_clients(self, mock_db):
        from middleware.auth import get_user_clients

        clients = get_user_clients("HKOZKAN")
        assert len(clients) == 1
        assert clients[0]["id"] == "CLIENT_001"

    def test_other_smmm_clients_not_visible(self, mock_db):
        from middleware.auth import get_user_clients

        clients = get_user_clients("OTHER_SMMM")
        assert len(clients) == 1
        assert clients[0]["id"] == "CLIENT_002"

    def test_nonexistent_smmm_empty(self, mock_db):
        from middleware.auth import get_user_clients

        clients = get_user_clients("NOBODY")
        assert clients == []
