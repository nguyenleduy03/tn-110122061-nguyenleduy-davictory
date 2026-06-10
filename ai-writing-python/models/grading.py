from pydantic import BaseModel, Field


class CriteriaScore(BaseModel):
    code: str = ""
    display_name: str = ""
    band: float = 0.0
    band_justification: str = ""
    boundary_detected: bool = False
    boundary_closer_to: float = 0.0
    boundary_reason: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    evidence_from_essay: list[str] = []
    detailed_feedback: str = ""


class GradingResult(BaseModel):
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
    improvement_priority: list[str] = []
    confidence_score: float = 0.0
    confidence_reason: str = ""
    band_justification: str = ""
    band_boundary_summary: str = ""
    analysis: dict = {}
    reference_sample_ids: list[int] = []
    prompt_version: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0
    status: str = "COMPLETED"
    error_message: str = ""
    full_prompt: str = ""


class GradingResponse(BaseModel):
    grading_id: str
    submission_id: int
    provider: str
    model: str
    overall_band: float
    criteria: dict = {}
    strengths: list[str] = []
    weaknesses: list[str] = []
    overall_feedback: str = ""
    improvement_priority: list[str] = []
    confidence_score: float = 0.0
    confidence_reason: str = ""
    band_justification: str = ""
    band_boundary_summary: str = ""
    analysis: dict = {}
    reference_sample_ids: list[int] = []
    full_prompt: str = ""
    prompt_version: str = ""
    latency_ms: int = 0
    status: str = "COMPLETED"

    @classmethod
    def from_result(cls, r: GradingResult) -> "GradingResponse":
        def _to_criteria_dict(cs: CriteriaScore) -> dict:
            d = {
                "band": cs.band,
                "bandJustification": cs.band_justification,
                "strengths": cs.strengths,
                "weaknesses": cs.weaknesses,
                "evidenceFromEssay": cs.evidence_from_essay,
                "detailedFeedback": cs.detailed_feedback,
            }
            if cs.boundary_detected:
                d["boundary"] = {
                    "detected": True,
                    "closerTo": cs.boundary_closer_to,
                    "reason": cs.boundary_reason,
                }
            return d

        return cls(
            grading_id=r.grading_id, submission_id=r.submission_id,
            provider=r.provider, model=r.model, overall_band=r.overall_band,
            criteria={
                "taskResponse": _to_criteria_dict(r.task_response),
                "coherenceCohesion": _to_criteria_dict(r.coherence_cohesion),
                "lexicalResource": _to_criteria_dict(r.lexical_resource),
                "grammaticalRange": _to_criteria_dict(r.grammatical_range),
            },
            strengths=r.strengths, weaknesses=r.weaknesses,
            overall_feedback=r.overall_feedback,
            improvement_priority=r.improvement_priority,
            confidence_score=r.confidence_score,
            confidence_reason=r.confidence_reason,
            band_justification=r.band_justification,
            band_boundary_summary=r.band_boundary_summary,
            analysis=r.analysis,
            reference_sample_ids=r.reference_sample_ids,
            full_prompt=r.full_prompt,
            prompt_version=r.prompt_version, latency_ms=r.latency_ms, status=r.status,
        )


class TestGradeRequest(BaseModel):
    model_config = {"populate_by_name": True}
    essay_text: str = Field(default="", alias="essayText")
    task_type: str = Field(default="TASK2_ACADEMIC", alias="taskType")
    topic: str = Field(default="", alias="topic")
    prompt_text: str = Field(default="", alias="promptText")


class FeedbackRequest(BaseModel):
    model_config = {"populate_by_name": True}
    essay_text: str = Field(default="", alias="essayText")
    task_type: str = Field(default="TASK2_ACADEMIC", alias="taskType")
    topic: str = Field(default="", alias="topic")
    prompt_text: str = Field(default="", alias="promptText")
    scores: dict = Field(default_factory=dict, alias="scores")


class BatchRequest(BaseModel):
    submission_ids: list[int]


class ApprovalRequest(BaseModel):
    adjustments: dict = {}


class RejectRequest(BaseModel):
    reason: str = ""
