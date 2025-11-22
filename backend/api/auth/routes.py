from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordRequestForm

DEMO_USER = {"username": "admin", "password": "12345"}

SECRET_KEY = "lyntos_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

router = APIRouter(prefix="/v1/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

class User(BaseModel):
    username: str

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

@router.post("/login", response_model=Token, summary="JSON body ile login")
async def login(req: LoginRequest):
    if req.username != DEMO_USER["username"] or req.password != DEMO_USER["password"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı adı veya şifre hatalı")
    token = create_access_token(subject=req.username)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/token", response_model=Token, summary="Form-Data (OAuth2) ile login")
async def login_token(form: OAuth2PasswordRequestForm = Depends()):
    if form.username != DEMO_USER["username"] or form.password != DEMO_USER["password"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı adı veya şifre hatalı")
    token = create_access_token(subject=form.username)
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", summary="Aktif kullanıcıyı getir")
async def me(user: User = Depends(get_current_user)):
    return {"username": user.username}

@router.post("/register", summary="Demo register (placebo)")
async def register(req: LoginRequest):
    # Bu demo; gerçek kayıt yok
    if req.username == DEMO_USER["username"]:
        raise HTTPException(status_code=400, detail="Kullanıcı zaten var (demo)")
    return {"ok": True, "username": req.username}
