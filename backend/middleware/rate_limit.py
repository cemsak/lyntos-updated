"""
P-7: Rate Limiting Middleware

IP bazli basit rate limiting — DDoS ve API istismarindan koruma.
Disaridan dependency gerektirmez (in-memory token bucket).

Limitler:
- Genel: 60 istek/dakika (IP basina)
- Ingest: 10 istek/dakika (agir upload islemi)
- Auth: 20 istek/dakika (brute-force koruma)
"""

import time
import logging
from collections import defaultdict
from typing import Dict, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token bucket rate limiter.

    Her IP icin dakika basina istek limiti uygular.
    Farkli endpoint kategorileri icin farkli limitler.
    """

    # Kategori bazli limitler: (max_requests, window_seconds)
    RATE_LIMITS: Dict[str, Tuple[int, int]] = {
        "ingest": (10, 60),       # Upload: 10 req/min
        "auth": (20, 60),         # Login/register: 20 req/min
        "default": (120, 60),     # Genel: 120 req/min
    }

    def __init__(self, app, **kwargs):
        super().__init__(app, **kwargs)
        # {(ip, category): [(timestamp, ...]}
        self._requests: Dict[Tuple[str, str], list] = defaultdict(list)
        self._last_cleanup = time.time()

    def _get_category(self, path: str) -> str:
        """Endpoint kategorisini belirle."""
        if "/ingest" in path or "/upload" in path:
            return "ingest"
        if "/auth/" in path or "/login" in path or "/register" in path:
            return "auth"
        return "default"

    def _cleanup_old_entries(self):
        """5 dakikadan eski kayitlari temizle (memory leak onleme)."""
        now = time.time()
        if now - self._last_cleanup < 60:  # Her dakika temizle
            return
        self._last_cleanup = now
        cutoff = now - 300  # 5 dakika
        keys_to_delete = []
        for key, timestamps in self._requests.items():
            self._requests[key] = [t for t in timestamps if t > cutoff]
            if not self._requests[key]:
                keys_to_delete.append(key)
        for key in keys_to_delete:
            del self._requests[key]

    def _is_rate_limited(self, client_ip: str, category: str) -> bool:
        """Rate limit kontrolu."""
        max_requests, window = self.RATE_LIMITS.get(category, self.RATE_LIMITS["default"])
        now = time.time()
        key = (client_ip, category)

        # Pencere disindaki kayitlari temizle
        self._requests[key] = [t for t in self._requests[key] if t > now - window]

        if len(self._requests[key]) >= max_requests:
            return True

        self._requests[key].append(now)
        return False

    async def dispatch(self, request: Request, call_next):
        # Health check'leri atla
        if request.url.path in ("/health", "/api/v1/health", "/api/v2/health"):
            return await call_next(request)

        # Client IP
        client_ip = request.client.host if request.client else "unknown"

        # Forwarded header'dan gercek IP (reverse proxy arkasinda)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

        category = self._get_category(request.url.path)

        # Periodical cleanup
        self._cleanup_old_entries()

        if self._is_rate_limited(client_ip, category):
            max_requests, window = self.RATE_LIMITS.get(category, self.RATE_LIMITS["default"])
            logger.warning(
                f"[RateLimit] {client_ip} rate limited: {category} "
                f"({max_requests}/{window}s exceeded) path={request.url.path}"
            )
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Cok fazla istek. Lutfen {window} saniye sonra tekrar deneyin.",
                    "retry_after": window,
                },
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
