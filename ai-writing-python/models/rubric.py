from dataclasses import dataclass, field


@dataclass
class RubricBoundary:
    condition: str = ""
    test: str = ""


@dataclass
class RubricBandDetail:
    band: float
    positive: list[str] = field(default_factory=list)
    negative: list[str] = field(default_factory=list)
    boundary_up: RubricBoundary | None = None


@dataclass
class CriterionRubric:
    name: str
    bands: list[RubricBandDetail] = field(default_factory=list)


@dataclass
class WritingRubric:
    task_type: str
    task_response: list[RubricBandDetail] = field(default_factory=list)
    coherence_cohesion: list[RubricBandDetail] = field(default_factory=list)
    lexical_resource: list[RubricBandDetail] = field(default_factory=list)
    grammatical_range: list[RubricBandDetail] = field(default_factory=list)


@dataclass
class SampleEssay:
    id: int
    task_type: str = ""
    topic: str = ""
    prompt_text: str = ""
    essay_text: str = ""
    band_score: float = 0.0
    examiner_comment: str = ""
    has_comment: bool = False
    word_count: int = 0
    similarity_score: float = 0.0
    keywords: list[str] = field(default_factory=list)


@dataclass
class DiversifiedResult:
    samples: list[SampleEssay] = field(default_factory=list)
    avg_similarity: float = 0.0
    band_spread: float = 0.0
