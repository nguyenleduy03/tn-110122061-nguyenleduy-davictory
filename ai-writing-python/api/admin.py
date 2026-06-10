"""AI Writing Service - Admin API endpoints."""

import time

import httpx
from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from core.orchestrator import GradingOrchestrator
from api.grading import orch as grading_orch
from core.retriever import SampleRetriever
from config import get_settings, get_active_model, set_active_model

router = APIRouter(prefix="/api/admin/ai", tags=["admin"])

GROQ_API_BASE = "https://api.groq.com/openai/v1"

_model_cache = {"models": [], "timestamp": 0.0, "error": ""}
CACHE_TTL = 300  # 5 minutes

EXCLUDED_MODEL_SUBSTRINGS = ("whisper", "prompt-guard", "safeguard", "distil-whisper", "orpheus")


class ModelSwitch(BaseModel):
    model: str
    provider: str | None = None


async def fetch_groq_models() -> list[dict]:
    settings = get_settings()
    api_keys = settings.groq_api_keys
    if not api_keys:
        return []

    api_key = api_keys[0]
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{GROQ_API_BASE}/models", headers=headers)

    if resp.status_code == 401:
        raise HTTPException(401, "Invalid GROQ API key")
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"GROQ API error: {resp.text}")

    data = resp.json()
    raw = data.get("data") or data.get("models") or []

    models = []
    for m in raw:
        m_id = m.get("id", "")
        if any(ex in m_id for ex in EXCLUDED_MODEL_SUBSTRINGS):
            continue
        models.append({
            "id": m_id,
            "active": m.get("active", True),
            "owned_by": m.get("owned_by", "groq"),
            "created": m.get("created", 0),
        })

    models.sort(key=lambda x: (not x["active"], x["id"]))
    return models


@router.get("/models")
async def list_models():
    now = time.time()
    if now - _model_cache["timestamp"] < CACHE_TTL and _model_cache["models"]:
        return {"models": _model_cache["models"], "cached": True, "total": len(_model_cache["models"])}

    try:
        models = await fetch_groq_models()
        _model_cache["models"] = models
        _model_cache["timestamp"] = now
        _model_cache["error"] = ""
        return {"models": models, "cached": False, "total": len(models)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch GROQ models: {e}")
        if _model_cache["models"]:
            return {"models": _model_cache["models"], "cached": True, "total": len(_model_cache["models"]), "stale": True}
        return {"models": [], "error": str(e), "total": 0}


@router.get("/config")
async def get_config():
    s = get_settings()
    active = get_active_model() or s.groq_model
    return {
        "provider": "groq", "model": active, "configModel": s.groq_model,
        "features": {"writingGrading": True, "speakingGrading": False, "questionExplain": False},
        "quota": {"studentPerDay": s.quota_student_per_day, "teacherPerDay": s.quota_teacher_per_day, "adminPerDay": s.quota_admin_per_day},
        "cache": {"enabled": True, "ttlMinutes": s.cache_ttl_minutes, "maxSize": s.cache_max_size},
    }


@router.get("/stats")
async def get_stats():
    orch = GradingOrchestrator()
    retriever = SampleRetriever()
    return {"cache": orch.cache_stats(), "vectorStore": {"count": retriever.count(), "initialized": retriever.is_initialized}}


@router.get("/samples")
async def list_samples(page: int = 0, size: int = 20):
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from config import get_settings
        s = get_settings()
        db_url = f"mysql+aiomysql://{s.db_user}:{s.db_password}@{s.db_host}:{s.db_port}/{s.db_name}"
        engine = create_async_engine(db_url, pool_pre_ping=True)

        offset = page * size
        async with engine.connect() as conn:
            rows = await conn.execute(text("""
                SELECT wsa.id, wt.code as task_type, wp.title as topic,
                       wp.prompt_text, wsa.answer_text, wsa.band_score,
                       wsa.word_count, wsa.annotation, wsa.created_at,
                       wp.title as prompt_title
                FROM writing_sample_answers wsa
                JOIN writing_prompts wp ON wp.id = wsa.writing_prompt_id
                JOIN writing_tasks wt ON wt.id = wp.writing_task_id
                WHERE wsa.is_active = true
                ORDER BY wsa.band_score DESC, wsa.created_at DESC
                LIMIT :lim OFFSET :off
            """), {"lim": size, "off": offset})

            total_row = await conn.execute(text("""
                SELECT COUNT(*) FROM writing_sample_answers WHERE is_active = true
            """))
            total = total_row.scalar() or 0

        await engine.dispose()

        samples = []
        for r in rows:
            samples.append({
                "id": r[0],
                "taskType": r[1],
                "topic": r[2],
                "promptText": r[3] or "",
                "essayText": r[4] or "",
                "bandScore": float(r[5]) if r[5] is not None else 0.0,
                "wordCount": r[6] or 0,
                "annotation": r[7] or "",
                "createdAt": str(r[8]) if r[8] is not None else "",
                "promptTitle": r[9] or "",
            })

        return {
            "samples": samples,
            "total": total,
            "page": page,
            "size": size,
            "totalPages": (total + size - 1) // size if size > 0 else 0,
        }
    except Exception as e:
        logger.error(f"Failed to load samples: {e}")
        return {"samples": [], "total": 0, "page": page, "size": size, "totalPages": 0, "error": str(e)}


@router.get("/samples/count")
async def samples_count():
    r = SampleRetriever()
    return {"dbCount": 0, "vectorStoreCount": r.count(), "vectorStoreInitialized": r.is_initialized}


@router.post("/reindex")
async def reindex():
    return {"message": "Use scripts/seed_samples.py to populate ChromaDB with sample essays.", "status": "pending"}


@router.post("/cache/clear")
async def clear_cache():
    grading_orch.clear_cache()
    return {"message": "Cache cleared", "status": "success"}


@router.post("/model")
async def switch_model(req: ModelSwitch):
    settings = get_settings()
    provider = req.provider or "groq"

    if provider == "groq":
        try:
            models = await fetch_groq_models()
            available = {m["id"] for m in models}
        except Exception:
            available = set()

        if available and req.model not in available:
            raise HTTPException(400, f"Model '{req.model}' not found in available GROQ models")

        set_active_model(req.model)
        logger.info(f"Switched GROQ model to {req.model}")
        return {"message": f"Switched to groq/{req.model}", "currentModel": req.model}

    set_active_model(req.model)
    return {"message": f"Switched to {provider}/{req.model}", "currentModel": req.model}
