"""Quota manager for AI Writing Service."""

import threading
from datetime import datetime, timezone
from config import get_settings


class QuotaExceeded(Exception):
    pass


class QuotaManager:
    def __init__(self):
        self._storage: dict[str, tuple[int, str]] = {}
        self._lock = threading.Lock()

    def _today(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def check(self, user_id: str, role: str):
        s = get_settings()
        mapping = {"STUDENT": s.quota_student_per_day, "TEACHER": s.quota_teacher_per_day, "ADMIN": s.quota_admin_per_day, "MANAGER": s.quota_admin_per_day}
        max_quota = mapping.get(role.upper().strip(), 0)
        with self._lock:
            today = self._today()
            key = f"{user_id}:{role}"
            entry = self._storage.get(key)
            if entry is None or entry[1] != today:
                self._storage[key] = (0, today)
                return
            count, _ = entry
            if count >= max_quota:
                raise QuotaExceeded(f"Daily quota exceeded: {count}/{max_quota}")

    def increment(self, user_id: str, role: str):
        with self._lock:
            today = self._today()
            key = f"{user_id}:{role}"
            entry = self._storage.get(key)
            if entry is None or entry[1] != today:
                self._storage[key] = (1, today)
            else:
                self._storage[key] = (entry[0] + 1, today)
