"""In-memory session manager for AI Speaking Service."""

import uuid
import threading
from models.session import SpeakingSession, SessionConfig


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, SpeakingSession] = {}
        self._lock = threading.Lock()

    def create(self, user_id: str, user_name: str = "", user_role: str = "student",
               config: SessionConfig | None = None) -> SpeakingSession:
        sid = str(uuid.uuid4())
        s = SpeakingSession(id=sid, user_id=str(user_id), user_name=user_name,
                           user_role=user_role, config=config or SessionConfig())
        with self._lock:
            self._sessions[sid] = s
        return s

    def get(self, session_id: str) -> SpeakingSession | None:
        with self._lock:
            return self._sessions.get(session_id)

    def update(self, session: SpeakingSession):
        with self._lock:
            self._sessions[session.id] = session

    def delete(self, session_id: str):
        with self._lock:
            self._sessions.pop(session_id, None)
