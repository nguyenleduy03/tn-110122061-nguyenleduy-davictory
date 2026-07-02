import re
from pydantic import BaseModel, Field
from pydantic import ConfigDict

_camel = lambda s: re.sub(r'_([a-z])', lambda m: m.group(1).upper(), s) if '_' in s else s


class CriteriaScore(BaseModel):
    model_config = ConfigDict(alias_generator=_camel, populate_by_name=True)

    code: str = ""
    display_name: str = Field(default="", alias="displayName")
    band: float = 0.0
    band_justification: str = Field(default="", alias="bandJustification")
    boundary_detected: bool = Field(default=False, alias="boundaryDetected")
    boundary_closer_to: float = Field(default=0.0, alias="boundaryCloserTo")
    boundary_reason: str = Field(default="", alias="boundaryReason")
    strengths: list[str] = []
    weaknesses: list[str] = []
    evidence_from_essay: list[str] = Field(default=[], alias="evidenceFromEssay")
    detailed_feedback: str = Field(default="", alias="detailedFeedback")


class GradingResult(BaseModel):
    model_config = ConfigDict(alias_generator=_camel, populate_by_name=True)

    grading_id: str = ""
    submission_id: int = 0
    provider: str = "groq"
    model: str = ""
    overall_band: float = 0.0
    task_response: CriteriaScore = CriteriaScore()
    coherence_cohesion: CriteriaScore = CriteriaScore()
    lexical_resource: CriteriaScore = CriteriaScore()
    grammatical_range: CriteriaScore = CriteriaScore()
    overall_feedback: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    improvement_priority: list[str] = Field(default_factory=list, alias="improvementPriority")
    confidence_score: float = 0.0
    confidence_reason: str = ""
    band_justification: str = ""
    band_boundary_summary: str = ""
    analysis: dict = {}
    strength_summary: str = Field(default="", alias="strengthSummary")
    weakness_summary: str = Field(default="", alias="weaknessSummary")
    reference_sample_ids: list[int] = []
    prompt_version: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0
    status: str = "COMPLETED"
    error_message: str = ""
    full_prompt: str = ""


class GradingResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_camel, populate_by_name=True)

    grading_id: str = ""
    submission_id: int = 0
    provider: str = ""
    model: str = ""
    overall_band: float = 0.0
    task_response: CriteriaScore = CriteriaScore()
    coherence_cohesion: CriteriaScore = CriteriaScore()
    lexical_resource: CriteriaScore = CriteriaScore()
    grammatical_range: CriteriaScore = CriteriaScore()
    strengths: list[str] = []
    weaknesses: list[str] = []
    overall_feedback: str = ""
    improvement_priority: list[str] = Field(default_factory=list, alias="improvementPriority")
    confidence_score: float = 0.0
    confidence_reason: str = ""
    band_justification: str = ""
    band_boundary_summary: str = ""
    analysis: dict = {}
    strength_summary: str = Field(default="", alias="strengthSummary")
    weakness_summary: str = Field(default="", alias="weaknessSummary")
    reference_sample_ids: list[int] = []
    full_prompt: str = ""
    prompt_version: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0
    status: str = "COMPLETED"
    error_message: str = ""

    @classmethod
    def from_result(cls, r: GradingResult) -> "GradingResponse":
        return cls(
            grading_id=r.grading_id, submission_id=r.submission_id,
            provider=r.provider, model=r.model, overall_band=r.overall_band,
            task_response=r.task_response,
            coherence_cohesion=r.coherence_cohesion,
            lexical_resource=r.lexical_resource,
            grammatical_range=r.grammatical_range,
            strengths=r.strengths, weaknesses=r.weaknesses,
            overall_feedback=r.overall_feedback,
            improvement_priority=r.improvement_priority,
            confidence_score=r.confidence_score,
            confidence_reason=r.confidence_reason,
            band_justification=r.band_justification,
            band_boundary_summary=r.band_boundary_summary,
            analysis=r.analysis,
            strength_summary=r.strength_summary,
            weakness_summary=r.weakness_summary,
            reference_sample_ids=r.reference_sample_ids,
            full_prompt=r.full_prompt,
            prompt_version=r.prompt_version,
            prompt_tokens=r.prompt_tokens, completion_tokens=r.completion_tokens,
            latency_ms=r.latency_ms, status=r.status, error_message=r.error_message,
        )


class TestGradeRequest(BaseModel):
    model_config = {"populate_by_name": True}
    essay_text: str = Field(default="", alias="essayText")
    task_type: str = Field(default="TASK2_ACADEMIC", alias="taskType")
    topic: str = Field(default="", alias="topic")
    prompt_text: str = Field(default="", alias="promptText")
    chart_type: str = Field(default="", alias="chartType")
    essay_type: str = Field(default="", alias="essayType")
    letter_type: str = Field(default="", alias="letterType")
    image_url: str = Field(default="", alias="imageUrl")


class DescribeImageRequest(BaseModel):
    image_url: str = Field(default="", alias="imageUrl")


class ClassifyRequest(BaseModel):
    model_config = {"populate_by_name": True}
    essay_text: str = Field(default="", alias="essayText")
    prompt_text: str = Field(default="", alias="promptText")


class ClassifyResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_camel, populate_by_name=True)
    task_type: str = ""
    sub_type: str = ""
    topic: str = ""
    reasoning: str = ""
    confidence: float = 0.0


class FeedbackRequest(BaseModel):
    model_config = {"populate_by_name": True}
    essay_text: str = Field(default="", alias="essayText")
    task_type: str = Field(default="TASK2_ACADEMIC", alias="taskType")
    topic: str = Field(default="", alias="topic")
    prompt_text: str = Field(default="", alias="promptText")
    scores: dict = Field(default_factory=dict, alias="scores")
    chart_type: str = Field(default="", alias="chartType")
    essay_type: str = Field(default="", alias="essayType")
    letter_type: str = Field(default="", alias="letterType")


class BatchRequest(BaseModel):
    submission_ids: list[int]


class ApprovalRequest(BaseModel):
    adjustments: dict = {}


class RejectRequest(BaseModel):
    reason: str = ""
