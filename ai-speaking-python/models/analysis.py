"""AI Speaking Service - NLP analysis models."""

from dataclasses import dataclass, field


@dataclass
class FeatureAnalysis:
    word_count: int = 0
    sentence_count: int = 0
    unique_word_count: int = 0
    lexical_diversity: float = 0.0
    avg_sentence_length: float = 0.0
    hesitation_count: int = 0
    hesitation_markers: list[str] = field(default_factory=list)
    discourse_marker_count: int = 0
    discourse_markers: list[str] = field(default_factory=list)
    advanced_vocabulary: list[str] = field(default_factory=list)
    advanced_vocab_count: int = 0
    speech_rate: float = 0.0
    dominant_tense: str = "present"
    repetition_count: int = 0
    complex_sentence_ratio: float = 0.0


@dataclass
class PronunciationResult:
    band: float = 5.0
    confidence_ratio: float = 0.0
    speech_rate: float = 0.0
    hesitation_ratio: float = 0.0
    low_confidence_word_count: int = 0
    total_word_count: int = 0
    pause_ratio: float = 0.0
    word_duration_std: float = 0.0
    issues: list[str] = field(default_factory=list)
    has_audio: bool = False
