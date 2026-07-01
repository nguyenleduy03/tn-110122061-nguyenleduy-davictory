from core.analyzer import FeatureAnalyzer
from models.session import SpeakingTurn


def make_turn(text: str, duration_ms: int = 30000) -> SpeakingTurn:
    return SpeakingTurn(
        id="t1", session_id="s1", turn_number=1,
        question_text="Describe your hometown.",
        answer_text=text,
        answer_duration_ms=duration_ms,
        part="PART1",
    )


class TestFeatureAnalyzer:
    def setup_method(self):
        self.analyzer = FeatureAnalyzer()

    def test_empty_turns(self):
        result = self.analyzer.analyze([])
        assert result.word_count == 0
        assert result.sentence_count == 0

    def test_basic_analysis(self):
        text = "I am from Hanoi. It is a beautiful city. I love living there."
        result = self.analyzer.analyze([make_turn(text)])
        assert result.word_count == 13
        assert result.sentence_count == 3
        assert result.lexical_diversity > 0
        assert result.dominant_tense == "present"

    def test_hesitation_detection(self):
        text = "Well I am from Hanoi. Um it is a beautiful city. You know I love it."
        result = self.analyzer.analyze([make_turn(text)])
        assert result.hesitation_count > 0
        assert len(result.hesitation_markers) > 0

    def test_discourse_markers(self):
        text = "First, I want to talk about my hometown. However, there are also some problems. Finally, I think it is a great place."
        result = self.analyzer.analyze([make_turn(text)])
        assert result.discourse_marker_count > 0
        assert len(result.discourse_markers) > 0

    def test_speech_rate(self):
        text = "I am from Hanoi. It is a beautiful city. I love living there. The people are friendly. The food is great."
        result = self.analyzer.analyze([make_turn(text, duration_ms=60000)])
        assert result.speech_rate > 0

    def test_multiple_turns(self):
        turns = [
            make_turn("I am from Hanoi.", 10000),
            make_turn("I work as a teacher.", 10000),
        ]
        result = self.analyzer.analyze(turns)
        assert result.word_count > 0
        assert result.sentence_count >= 2
