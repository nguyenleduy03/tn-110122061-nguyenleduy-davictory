"""TTL cache for AI Speaking Service."""

import time
import threading
from collections import OrderedDict
from typing import Any


class TTLCache:
    def __init__(self, max_size: int = 500, ttl_seconds: int = 86400):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            self._cleanup()
            entry = self._cache.get(key)
            if entry is None:
                return None
            value, expires = entry
            if expires <= time.time():
                del self._cache[key]
                return None
            self._cache.move_to_end(key)
            return value

    def put(self, key: str, value: Any):
        with self._lock:
            self._cleanup()
            if key in self._cache:
                del self._cache[key]
            elif len(self._cache) >= self.max_size:
                self._cache.popitem(last=False)
            self._cache[key] = (value, time.time() + self.ttl_seconds)

    def clear(self):
        with self._lock:
            self._cache.clear()

    @property
    def stats(self) -> dict:
        with self._lock:
            self._cleanup()
            return {"size": len(self._cache), "max_size": self.max_size}

    def _cleanup(self):
        now = time.time()
        for k in [k for k, (_, exp) in self._cache.items() if exp <= now]:
            del self._cache[k]
