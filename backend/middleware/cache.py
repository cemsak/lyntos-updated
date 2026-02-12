"""
P-10: In-Memory Response Cache

TTL-based in-memory cache for heavy read endpoints.
Thread-safe, auto-cleanup, invalidation support.

Usage:
    from middleware.cache import response_cache

    # Cache decorator
    @response_cache.cached(ttl=3600, prefix="cross_check")
    async def get_cross_check(client_id: str, period_id: str):
        ...

    # Manual invalidation (after ingest/upload)
    response_cache.invalidate_prefix("cross_check")
    response_cache.invalidate_key("cross_check:CLIENT123:2025_Q1")
"""

import time
import hashlib
import logging
import threading
from typing import Any, Optional, Callable
from functools import wraps

logger = logging.getLogger(__name__)


class InMemoryCache:
    """
    Simple TTL-based in-memory cache.

    - Thread-safe via Lock
    - Auto-cleanup of expired entries (lazy + periodic)
    - Max 1000 entries to prevent memory bloat
    - Prefix-based invalidation for bulk clear
    """

    MAX_ENTRIES = 1000

    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expires_at)
        self._lock = threading.Lock()
        self._hit_count = 0
        self._miss_count = 0

    def get(self, key: str) -> Optional[Any]:
        """Get cached value if exists and not expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._miss_count += 1
                return None

            value, expires_at = entry
            if time.time() > expires_at:
                del self._store[key]
                self._miss_count += 1
                return None

            self._hit_count += 1
            return value

    def set(self, key: str, value: Any, ttl: int = 300):
        """Set cache value with TTL (seconds)."""
        with self._lock:
            # Evict expired entries if we're at capacity
            if len(self._store) >= self.MAX_ENTRIES:
                self._evict_expired()

            # If still full, evict oldest
            if len(self._store) >= self.MAX_ENTRIES:
                oldest_key = min(self._store, key=lambda k: self._store[k][1])
                del self._store[oldest_key]

            self._store[key] = (value, time.time() + ttl)

    def invalidate_key(self, key: str):
        """Remove specific cache entry."""
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str):
        """Remove all entries matching prefix."""
        with self._lock:
            keys_to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._store[k]
            if keys_to_remove:
                logger.info(f"[Cache] Invalidated {len(keys_to_remove)} entries with prefix '{prefix}'")

    def invalidate_client(self, client_id: str):
        """Remove all cache entries for a specific client."""
        with self._lock:
            keys_to_remove = [k for k in self._store if f":{client_id}:" in k]
            for k in keys_to_remove:
                del self._store[k]
            if keys_to_remove:
                logger.info(f"[Cache] Invalidated {len(keys_to_remove)} entries for client '{client_id}'")

    def clear(self):
        """Clear entire cache."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            logger.info(f"[Cache] Cleared {count} entries")

    def stats(self) -> dict:
        """Return cache statistics."""
        with self._lock:
            total = self._hit_count + self._miss_count
            return {
                "entries": len(self._store),
                "max_entries": self.MAX_ENTRIES,
                "hits": self._hit_count,
                "misses": self._miss_count,
                "hit_rate": f"{(self._hit_count / total * 100):.1f}%" if total > 0 else "0%",
            }

    def _evict_expired(self):
        """Remove all expired entries (called under lock)."""
        now = time.time()
        expired = [k for k, (_, exp) in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]

    # ---- Decorator ----

    def cached(self, ttl: int = 300, prefix: str = ""):
        """
        Decorator for caching async endpoint responses.

        Cache key = prefix:arg1:arg2:...
        Only caches successful (non-exception) responses.

        Args:
            ttl: Time-to-live in seconds (default 5 min)
            prefix: Cache key prefix (e.g. "cross_check", "rules")
        """
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Build cache key from function args
                key_parts = [prefix or func.__name__]
                key_parts.extend(str(v) for v in args if isinstance(v, (str, int, float, bool)))
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items())
                                 if isinstance(v, (str, int, float, bool, type(None))))
                cache_key = ":".join(key_parts)

                # Check cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value

                # Execute function
                result = await func(*args, **kwargs)

                # Cache result
                self.set(cache_key, result, ttl)
                return result

            # Expose cache key builder for manual invalidation
            wrapper.cache_prefix = prefix or func.__name__
            return wrapper

        return decorator


# Singleton instance
response_cache = InMemoryCache()
