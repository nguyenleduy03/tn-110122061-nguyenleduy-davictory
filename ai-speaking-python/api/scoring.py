"""AI Speaking Service - Scoring API endpoints."""

from fastapi import APIRouter, Header, HTTPException

from core.orchestrator import SpeakingOrchestrator, SessionNotFound
from models.scoring import SpeakingResultDTO

router = APIRouter(prefix="/api/ai/speaking/scoring", tags=["speaking-scoring"])
orch = SpeakingOrchestrator()


@router.post("/evaluate/{session_id}")
async def evaluate(session_id: str, x_user_id: str = Header(default="")):
    try:
        result = await orch.evaluate(session_id, x_user_id)
        return SpeakingResultDTO.from_result(result)
    except SessionNotFound:
        raise HTTPException(404, "Session not found")


@router.get("/result/{session_id}")
async def get_result(session_id: str):
    result = orch.get_result(session_id)
    if result is None:
        return {"sessionId": session_id, "status": "NOT_EVALUATED"}
    return SpeakingResultDTO.from_result(result)
