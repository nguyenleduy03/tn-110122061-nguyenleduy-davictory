"""AI Speaking Service - Scoring result models."""

from dataclasses import dataclass, field
from pydantic import BaseModel


@dataclass
class CriteriaScore:
    code: str = ""
    display_name: str = ""
    band: float = 0.0
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    detailed_feedback: str = ""


@dataclass
class SpeakingResult:
    id: str = ""
    session_id: str = ""
    user_id: str = ""
    overall_band: float = 0.0
    fluency_coherence: CriteriaScore = field(default_factory=lambda: CriteriaScore(code="FC", display_name="Fluency & Coherence"))
    lexical_resource: CriteriaScore = field(default_factory=lambda: CriteriaScore(code="LR", display_name="Lexical Resource"))
    grammatical_range: CriteriaScore = field(default_factory=lambda: CriteriaScore(code="GRA", display_name="Grammatical Range & Accuracy"))
    pronunciation: CriteriaScore = field(default_factory=lambda: CriteriaScore(code="P", display_name="Pronunciation"))
    overall_feedback: str = ""
    improvement_priority: list[str] = field(default_factory=list)
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    provider: str = ""
    model: str = ""
    confidence_score: float = 0.0
    latency_ms: int = 0
    status: str = "PENDING"
    error_message: str = ""


class SpeakingResultDTO(BaseModel):
    session_id: str
    overall_band: float
    criteria: dict = {}
    strengths: list[str] = []
    weaknesses: list[str] = []
    overall_feedback: str = ""
    improvement_priority: list[str] = []
    confidence_score: float = 0.0
    provider: str = ""
    model: str = ""
    latency_ms: int = 0
    status: str = "COMPLETED"

    @classmethod
    def from_result(cls, r: SpeakingResult) -> "SpeakingResultDTO":
        return cls(
            session_id=r.session_id, overall_band=r.overall_band,
            criteria={
                "fluencyCoherence": {"band": r.fluency_coherence.band, "strengths": r.fluency_coherence.strengths, "weaknesses": r.fluency_coherence.weaknesses, "detailedFeedback": r.fluency_coherence.detailed_feedback},
                "lexicalResource": {"band": r.lexical_resource.band, "strengths": r.lexical_resource.strengths, "weaknesses": r.lexical_resource.weaknesses, "detailedFeedback": r.lexical_resource.detailed_feedback},
                "grammaticalRangeAccuracy": {"band": r.grammatical_range.band, "strengths": r.grammatical_range.strengths, "weaknesses": r.grammatical_range.weaknesses, "detailedFeedback": r.grammatical_range.detailed_feedback},
                "pronunciation": {"band": r.pronunciation.band, "strengths": r.pronunciation.strengths, "weaknesses": r.pronunciation.weaknesses, "detailedFeedback": r.pronunciation.detailed_feedback},
            },
            strengths=r.strengths, weaknesses=r.weaknesses,
            overall_feedback=r.overall_feedback,
            improvement_priority=r.improvement_priority,
            confidence_score=r.confidence_score,
            provider=r.provider, model=r.model, latency_ms=r.latency_ms, status=r.status,
        )
