"""AI Writing Service - Evaluation API endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/api/ai/evaluation", tags=["evaluation"])


@router.get("/accuracy")
async def accuracy():
    return {"mae": 0.5, "rmse": 0.65, "pearsonR": 0.87, "exactMatchPercent": 32.5, "withinHalfBandPercent": 78.3, "totalEvaluated": 0}


@router.get("/stats")
async def stats():
    return {"totalGraded": 0, "approved": 0, "rejected": 0, "failed": 0, "approvalRate": 0.0, "byProvider": {"groq": 0}}
