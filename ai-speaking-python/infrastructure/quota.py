"""Quota manager for AI Speaking Service."""

import threading
from datetime import datetime, timezone
from config import get_settings


class QuotaExceeded(Exception):
    pass


class QuotaManager:
    def __init__(self):
        self._s: dict[str, tuple[int, str]] = {}
        self._lk = threading.Lock()

    def _today(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def check(self, user_id: str, role: str):
        s = get_settings()
        m = {"STUDENT": s.quota_student_per_day, "TEACHER": s.quota_teacher_per_day, "ADMIN": s.quota_admin_per_day, "MANAGER": s.quota_admin_per_day}
        mx = m.get(role.upper().strip(), 0)
        with self._lk:
            today = self._today()
            k = f"{user_id}:{role}"
            e = self._s.get(k)
            if e is None or e[1] != today:
                self._s[k] = (0, today)
                return
            if e[0] >= mx:
                raise QuotaExceeded(f"Daily quota exceeded: {e[0]}/{mx}")

    def increment(self, user_id: str, role: str):
        with self._lk:
            today = self._today()
            k = f"{user_id}:{role}"
            e = self._s.get(k)
            if e is None or e[1] != today:
                self._s[k] = (1, today)
            else:
                self._s[k] = (e[0] + 1, today)
