"""Main orchestrator for AI Speaking Service."""

from loguru import logger
from config import get_settings
from infrastructure.cache import TTLCache
from infrastructure.quota import QuotaManager, QuotaExceeded
from core.session_mgr import SessionManager
from core.conversation import ConversationManager
from core.scorer import ScoringPipeline
from core.analyzer import FeatureAnalyzer
from core.pronunciation import PronunciationEngine
from models.session import SpeakingSession, SessionConfig
from models.scoring import SpeakingResult


class SessionNotFound(Exception):
    pass


class SpeakingOrchestrator:
    def __init__(self):
        self.s = get_settings()
        self.sessions = SessionManager()
        self.conversation = ConversationManager()
        self.scorer = ScoringPipeline()
        self.analyzer = FeatureAnalyzer()
        self.pron = PronunciationEngine()
        self.cache = TTLCache(max_size=self.s.cache_max_size, ttl_seconds=self.s.cache_ttl_minutes * 60)
        self.quota = QuotaManager()

    def create_session(self, user_id: str, user_name: str = "", user_role: str = "student",
                       config: dict | None = None) -> SpeakingSession:
        self.quota.check(user_id, user_role)
        self.quota.increment(user_id, user_role)
        cfg = SessionConfig()
        if config:
            cfg.topic = config.get("topic", "")
            cfg.focus_area = config.get("focusArea", "general")
            cfg.practice_mode = config.get("practiceMode", "mock_test")
        s = self.sessions.create(user_id, user_name, user_role, cfg)
        logger.info(f"Session {s.id} created for {user_id}")
        return s

    def get_session(self, session_id: str) -> SpeakingSession:
        s = self.sessions.get(session_id)
        if not s:
            raise SessionNotFound(f"Session {session_id} not found")
        return s

    async def generate_question(self, session_id: str) -> dict:
        s = self.get_session(session_id)
        q = await self.conversation.generate_question(s)
        t = s.add_turn(q, s.current_phase)
        self.sessions.update(s)
        return {"sessionId": s.id, "turnNumber": t.turn_number, "question": q, "part": s.current_phase}

    async def submit_answer(self, session_id: str, answer_text: str, duration_ms: int = 0) -> dict:
        s = self.get_session(session_id)
        t = s.get_current_turn()
        if not t:
            raise SessionNotFound("No active question")
        t.answer_text = answer_text
        t.answer_duration_ms = duration_ms
        self.sessions.update(s)
        return {"sessionId": s.id, "turnNumber": t.turn_number, "answered": True}

    async def submit_audio(self, session_id: str, audio_data: bytes, duration_ms: int = 0,
                           whisper_result: dict | None = None) -> dict:
        s = self.get_session(session_id)
        t = s.get_current_turn()
        if not t:
            raise SessionNotFound("No active question")
        if whisper_result:
            t.answer_text = whisper_result.get("text", "")
        t.answer_duration_ms = duration_ms
        self.sessions.update(s)
        return {"sessionId": s.id, "transcribed": bool(whisper_result), "text": t.answer_text}

    async def next_phase(self, session_id: str) -> dict:
        s = self.get_session(session_id)
        phases = ["INTRODUCTION", "PART1", "PART2", "PART3", "COMPLETED"]
        idx = phases.index(s.current_phase) if s.current_phase in phases else 0
        s.current_phase = phases[min(idx + 1, len(phases) - 1)]
        self.sessions.update(s)
        return {"sessionId": s.id, "phase": s.current_phase}

    def end_session(self, session_id: str) -> dict:
        s = self.get_session(session_id)
        s.status = "COMPLETED"
        self.sessions.update(s)
        return {"sessionId": s.id, "status": "COMPLETED"}

    async def evaluate(self, session_id: str, user_id: str = "") -> SpeakingResult:
        ck = f"speaking_result:{session_id}"
        cached = self.cache.get(ck)
        if cached:
            return cached

        s = self.get_session(session_id)
        turns = s.get_answered_turns()
        if not turns:
            return SpeakingResult(session_id=session_id, user_id=user_id or s.user_id, status="FAILED", error_message="No answered turns")

        features = self.analyzer.analyze(turns)
        pron = self.pron.analyze(turns)

        result = await self.scorer.evaluate(session_id, user_id or s.user_id, turns, features, pron, s.current_phase)
        if result.status == "COMPLETED":
            self.cache.put(ck, result)
        return result

    def get_result(self, session_id: str) -> SpeakingResult | None:
        return self.cache.get(f"speaking_result:{session_id}")

    def clear_cache(self):
        self.cache.clear()

    def cache_stats(self) -> dict:
        return self.cache.stats
