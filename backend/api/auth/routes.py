"""
LYNTOS Authentication Routes
Gerçek veritabanı tabanlı kullanıcı doğrulaması (bcrypt + JWT)
"""

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordRequestForm
import sqlite3
import bcrypt
import os
import uuid
from pathlib import Path

# Veritabanı yolu
DB_PATH = Path(__file__).parent.parent.parent / "database" / "lyntos.db"

from config.settings import JWT_SECRET_KEY as SECRET_KEY, JWT_ALGORITHM as ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/v1/auth", tags=["auth"])


# ---------------------------------------------------------------------------
#  Models
# ---------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "smmm"  # varsayılan: smmm

class User(BaseModel):
    username: str
    name: str | None = None
    email: str | None = None
    role: str | None = None


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

def verify_user_from_db(username: str, password: str) -> dict | None:
    """Veritabanından kullanıcı doğrula — bcrypt hash kontrolü"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Kullanıcıyı bul (id veya email ile)
        cursor.execute("""
            SELECT id, name, email, password_hash, role
            FROM users
            WHERE id = ? OR email = ?
        """, (username, username))

        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        user_data = dict(row)
        stored_hash = user_data.get('password_hash', '')

        if not stored_hash:
            return None

        # bcrypt hash kontrolü
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8')):
            return user_data

        return None
    except Exception as e:
        print(f"[AUTH] Veritabanı hatası: {e}")
        return None


def create_access_token(*, subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(Authorization: str | None = Header(default=None)) -> User:
    if not Authorization or not Authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token")
    token = Authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token")
    if not username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz token")
    return User(username=username)


# ---------------------------------------------------------------------------
#  Endpoints
# ---------------------------------------------------------------------------

@router.post("/login", response_model=Token, summary="JSON body ile login")
async def login(req: LoginRequest):
    """Kullanıcı girişi — users tablosundan bcrypt hash ile doğrulama"""
    user_data = verify_user_from_db(req.username, req.password)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı adı veya şifre hatalı")
    token = create_access_token(subject=user_data['id'])
    return {"access_token": token, "token_type": "bearer"}


@router.post("/token", response_model=Token, summary="Form-Data (OAuth2) ile login")
async def login_token(form: OAuth2PasswordRequestForm = Depends()):
    """OAuth2 uyumlu login — users tablosundan bcrypt hash ile doğrulama"""
    user_data = verify_user_from_db(form.username, form.password)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı adı veya şifre hatalı")
    token = create_access_token(subject=user_data['id'])
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", summary="Aktif kullanıcıyı getir")
async def me(user: User = Depends(get_current_user)):
    """Token'dan kullanıcı bilgilerini döndür"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, role FROM users WHERE id = ?", (user.username,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {"username": row['id'], "name": row['name'], "email": row['email'], "role": row['role']}
    except Exception:
        pass
    return {"username": user.username}


@router.post("/register", summary="Yeni SMMM kullanıcısı oluştur (sadece admin)")
async def register(req: RegisterRequest, current_user: User = Depends(get_current_user)):
    """
    Admin tarafından yeni SMMM kullanıcısı oluşturma.
    Sadece 'admin' rolündeki kullanıcılar bu endpoint'i kullanabilir.
    """
    # Yetki kontrolü: sadece admin
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT role FROM users WHERE id = ?", (current_user.username,))
        row = cursor.fetchone()
        if not row or row['role'] != 'admin':
            conn.close()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu işlem sadece admin tarafından yapılabilir"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Veritabanı hatası: {e}")

    # Email kontrolü
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu email adresi zaten kayıtlı"
        )

    # Yeni kullanıcı oluştur
    user_id = req.name.upper().replace(" ", "").replace("İ", "I")[:10] or f"USER_{uuid.uuid4().hex[:6].upper()}"
    password_hash = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    role = req.role if req.role in ('admin', 'smmm', 'viewer') else 'smmm'

    try:
        cursor.execute("""
            INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (user_id, req.name, req.email, password_hash, role))
        conn.commit()
        conn.close()

        return {
            "success": True,
            "data": {
                "id": user_id,
                "name": req.name,
                "email": req.email,
                "role": role,
            }
        }
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kullanıcı ID'si zaten mevcut"
        )
