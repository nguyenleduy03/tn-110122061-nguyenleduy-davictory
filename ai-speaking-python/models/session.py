"""AI Speaking Service - Session models."""

from datetime import datetime, timezone
from dataclasses import dataclass, field


@dataclass
class SessionConfig:
    target_language: str = "en"
    topic: str = ""
    focus_area: str = "general"
    practice_mode: str = "mock_test"
    current_level: float = 5.0
    target_level: float = 7.0


@dataclass
class SpeakingTurn:
    id: str = ""
    session_id: str = ""
    turn_number: int = 0
    question_text: str = ""
    answer_text: str = ""
    audio_url: str = ""
    answer_duration_ms: int = 0
    asked_at: str = ""
    answered_at: str = ""
    part: str = "PART1"

    @classmethod
    def create(cls, session_id: str, turn_number: int, question: str, part: str) -> "SpeakingTurn":
        return cls(id=f"{session_id}_t{turn_number}", session_id=session_id,
                   turn_number=turn_number, question_text=question, part=part,
                   asked_at=datetime.now(timezone.utc).isoformat())


@dataclass
class SpeakingSession:
    id: str
    user_id: str
    user_name: str = ""
    user_role: str = "student"
    config: SessionConfig = field(default_factory=SessionConfig)
    status: str = "ACTIVE"
    current_phase: str = "INTRODUCTION"
    turns: list[SpeakingTurn] = field(default_factory=list)
    total_turns: int = 0

    def add_turn(self, question: str, part: str) -> SpeakingTurn:
        self.total_turns += 1
        t = SpeakingTurn.create(self.id, self.total_turns, question, part)
        self.turns.append(t)
        return t

    def get_answered_turns(self) -> list[SpeakingTurn]:
        return [t for t in self.turns if t.answer_text.strip()]

    def get_current_turn(self) -> SpeakingTurn | None:
        return self.turns[-1] if self.turns else None
