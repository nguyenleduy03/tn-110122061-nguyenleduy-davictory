import uuid

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.orchestrator import GradingOrchestrator
from core.retriever import SampleRetriever
from core.parser import ParseError
from infrastructure.llm_client import AIProviderError
from infrastructure.quota import QuotaExceeded
from models.grading import GradingResponse, TestGradeRequest, FeedbackRequest, BatchRequest, ApprovalRequest, RejectRequest, ClassifyRequest

router = APIRouter(prefix="/api/ai/writing", tags=["grading"])
orch = GradingOrchestrator()
retriever = SampleRetriever()


class MatchRequest(BaseModel):
    essay_text: str
    task_type: str = "TASK2_ACADEMIC"
    chart_type: str = ""
    essay_type: str = ""
    letter_type: str = ""


@router.post("/match-samples")
async def match_samples(req: MatchRequest):
    try:
        result = retriever.retrieve(req.essay_text, req.task_type)
        return {
            "samples": [
                {
                    "id": s.id,
                    "bandScore": s.band_score,
                    "similarity": round(s.similarity_score, 3),
                    "similarityPercent": f"{s.similarity_score * 100:.0f}%",
                    "topic": s.topic or "",
                    "taskType": s.task_type,
                    "wordCount": s.word_count,
                    "keywords": s.keywords,
                }
                for s in result.samples
            ],
            "total": len(result.samples),
            "avgSimilarity": round(result.avg_similarity, 3),
            "bandSpread": round(result.band_spread, 2),
        }
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/classify")
async def classify_essay(req: ClassifyRequest):
    try:
        result = await orch.classify_essay(req.essay_text, req.prompt_text)
        return result
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/grade/{submission_id}")
async def grade_submission(submission_id: int,
                           x_user_id: str = Header(default="anonymous"),
                           x_user_role: str = Header(default="student"),
                           x_chart_type: str = Header(default=""),
                           x_essay_type: str = Header(default=""),
                           x_letter_type: str = Header(default="")):
    try:
        result = await orch.grade(submission_id, "", x_user_id, x_user_role,
                                  chart_type=x_chart_type, essay_type=x_essay_type,
                                  letter_type=x_letter_type)
        return GradingResponse.from_result(result)
    except QuotaExceeded as e:
        raise HTTPException(429, str(e))
    except ParseError as e:
        return JSONResponse(status_code=400, content={"error": str(e), "rawResponse": e.raw_response})
    except AIProviderError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/test-grade")
async def test_grade(req: TestGradeRequest):
    try:
        result = await orch.grade(0, req.essay_text, "test", "admin", req.prompt_text,
                                  question_group_id=None, task_type=req.task_type,
                                  topic=req.topic, skip_cache=True,
                                  chart_type=req.chart_type, essay_type=req.essay_type,
                                  letter_type=req.letter_type)
        return GradingResponse.from_result(result)
    except QuotaExceeded as e:
        raise HTTPException(429, str(e))
    except ParseError as e:
        return JSONResponse(status_code=400, content={"error": str(e), "rawResponse": e.raw_response})
    except AIProviderError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/feedback")
async def generate_feedback(req: FeedbackRequest):
    try:
        result = await orch.generate_feedback(
            req.essay_text, req.task_type, req.topic,
            req.prompt_text, req.scores,
            req.chart_type, req.essay_type, req.letter_type,
        )
        return result
    except QuotaExceeded as e:
        raise HTTPException(429, str(e))
    except AIProviderError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(400, str(e))


@router.post("/batch")
async def batch_grade(req: BatchRequest, x_user_id: str = Header(default="anonymous")):
    return {"batchId": str(uuid.uuid4()), "total": len(req.submission_ids), "status": "PROCESSING"}


@router.get("/batch/{batch_id}")
async def batch_status(batch_id: str):
    return {"batchId": batch_id, "status": "UNKNOWN"}


@router.get("/result/{submission_id}")
async def get_result(submission_id: int):
    r = orch.get_result(submission_id)
    if r is None:
        return {"submissionId": submission_id, "status": "NOT_GRADED"}
    return GradingResponse.from_result(r)


@router.post("/approve/{submission_id}")
async def approve(submission_id: int, req: ApprovalRequest, x_user_id: str = Header(default="")):
    return {"submissionId": submission_id, "status": "APPROVED", "approvedBy": x_user_id}


@router.post("/reject/{submission_id}")
async def reject(submission_id: int, req: RejectRequest):
    return {"submissionId": submission_id, "status": "REJECTED", "reason": req.reason}
