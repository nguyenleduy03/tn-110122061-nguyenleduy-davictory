"""AI Speaking Service - Admin API endpoints."""

from fastapi import APIRouter
from config import get_settings
from core.orchestrator import SpeakingOrchestrator

router = APIRouter(prefix="/api/admin/speaking", tags=["speaking-admin"])


@router.get("/config")
async def config():
    s = get_settings()
    return {
        "providers": {"conversation": "groq", "scoring": "openai", "stt": "openai", "tts": "openai"},
        "models": {"conversation": s.groq_model, "scoring": s.openai_scoring_model, "stt": s.openai_stt_model, "tts": s.openai_tts_model},
        "features": {"speakingGrading": True, "realtimeStt": True, "realtimeTts": True, "pronunciationFromAudio": True},
        "quota": {"studentPerDay": s.quota_student_per_day, "teacherPerDay": s.quota_teacher_per_day, "adminPerDay": s.quota_admin_per_day},
        "cache": {"enabled": True, "ttlMinutes": s.cache_ttl_minutes, "maxSize": s.cache_max_size},
        "session": {"maxTurns": s.session_max_turns, "maxDurationMinutes": s.session_max_duration_minutes},
    }


@router.get("/rubric")
async def rubric():
    from core.rubric import load_rubric
    r = load_rubric()
    return {
        "criteria": {
            "fluency_coherence": [{"band": b.band, "descriptor": b.descriptor} for b in r.fluency_coherence],
            "lexical_resource": [{"band": b.band, "descriptor": b.descriptor} for b in r.lexical_resource],
            "grammatical_range": [{"band": b.band, "descriptor": b.descriptor} for b in r.grammatical_range],
            "pronunciation": [{"band": b.band, "descriptor": b.descriptor} for b in r.pronunciation],
        }
    }


@router.get("/cache/stats")
async def cache_stats():
    return SpeakingOrchestrator().cache_stats()


@router.post("/cache/clear")
async def clear_cache():
    SpeakingOrchestrator().clear_cache()
    return {"message": "Cache cleared", "status": "success"}
