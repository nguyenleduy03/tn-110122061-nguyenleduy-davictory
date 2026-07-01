from core.pronunciation import PronunciationEngine
from models.session import SpeakingTurn


def make_turn(text: str, duration_ms: int = 30000) -> SpeakingTurn:
    return SpeakingTurn(
        id="t1", session_id="s1", turn_number=1,
        question_text="Describe your hometown.",
        answer_text=text,
        answer_duration_ms=duration_ms,
        part="PART1",
    )


class TestPronunciationEngine:
    def setup_method(self):
        self.engine = PronunciationEngine()

    def test_empty_turns(self):
        result = self.engine.analyze([])
        assert result.total_word_count == 0
        assert not result.has_audio
        assert result.hesitation_ratio == 0.0

    def test_text_only_no_hesitation(self):
        text = "I am from Hanoi. It is a beautiful city. I love living there."
        result = self.engine.analyze([make_turn(text)])
        assert result.total_word_count == 13
        assert not result.has_audio
        assert result.hesitation_ratio >= 0
        assert result.band > 0

    def test_text_with_hesitation(self):
        text = "Well um I am from Hanoi. Like it is a beautiful city. Uh I love living there."
        result = self.engine.analyze([make_turn(text)])
        assert result.hesitation_ratio > 0
        assert result.band <= 7.0

    def test_speech_rate_calculation(self):
        text = "I am from Hanoi. It is a beautiful city. I love living there."
        result = self.engine.analyze([make_turn(text, duration_ms=30000)])
        assert result.speech_rate > 0

    def test_multiple_turns_aggregation(self):
        turns = [
            make_turn("I am from Hanoi.", 10000),
            make_turn("It is a beautiful city.", 10000),
        ]
        result = self.engine.analyze(turns)
        assert result.total_word_count > 0
