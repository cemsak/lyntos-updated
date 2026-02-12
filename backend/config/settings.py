"""
LYNTOS Central Configuration — JWT & Auth Settings

Tek kaynak (Single Source of Truth): Tüm JWT/auth ayarları buradan import edilir.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv(Path(__file__).parent.parent / ".env")

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "LYNTOS_SECRET_CHANGE_IN_PRODUCTION")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 240  # 4 saat

# Dev Auth Bypass
DEV_AUTH_BYPASS = os.getenv("LYNTOS_DEV_AUTH_BYPASS", "0") == "1"
