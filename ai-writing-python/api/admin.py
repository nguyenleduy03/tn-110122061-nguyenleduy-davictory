"""AI Writing Service - Admin API endpoints."""

import asyncio
import time
import uuid

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
NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1"

_model_cache = {"models": [], "timestamp": 0.0, "error": ""}
CACHE_TTL = 300  # 5 minutes

EXCLUDED_MODEL_SUBSTRINGS = ("whisper", "prompt-guard", "safeguard", "distil-whisper", "orpheus")
EXCLUDED_NVIDIA_SUBSTRINGS = (
    "embed", "chatglm", "parakeet", "canary", "stt", "tts", "deepsearch",
    "nv-embed", "nv-rerank", "safety", "guard", "gliner", "riva", "translate",
    "calibration", "reward", "parse", "nemoguard", "content-safety",
)

# Per-skill model configuration
_skill_config: dict[str, str] = {}
# Additional API keys for rotation (beyond .env)
_extra_keys: dict[str, dict] = {}  # {id: {key, provider, label, created_at}}


class ModelSwitch(BaseModel):
    model: str
    provider: str | None = None


class SkillConfig(BaseModel):
    skill: str  # "writing", "speaking", etc.
    model: str


class AddKeyRequest(BaseModel):
    key: str
    provider: str = "groq"
    label: str = ""


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


_nvidia_cache = {"models": [], "timestamp": 0.0, "populating": False}
NVIDIA_CACHE_TTL = 300


async def fetch_nvidia_raw() -> list[dict]:
    from config import get_settings
    key = get_settings().nvidia_api_key
    if not key:
        return []
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{NVIDIA_API_BASE}/models", headers=headers)
        if resp.status_code != 200:
            return []
        data = resp.json()
        raw = data.get("data") or []
        return [
            m for m in raw
            if not any(ex in m.get("id", "") for ex in EXCLUDED_NVIDIA_SUBSTRINGS)
            and "/" in m.get("id", "")
        ]
    except Exception as e:
        logger.warning(f"Failed to fetch NVIDIA models: {e}")
        return []


async def _test_nvidia_model(model_id: str, headers: dict) -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.post(
                f"{NVIDIA_API_BASE}/chat/completions",
                headers=headers,
                json={"model": model_id, "messages": [{"role": "user", "content": "Hi"}], "max_tokens": 1},
            )
            return r.status_code == 200
    except Exception:
        return False


async def refresh_nvidia_models():
    if _nvidia_cache["populating"]:
        return
    _nvidia_cache["populating"] = True
    try:
        key = get_settings().nvidia_api_key
        if not key:
            return
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        candidates = await fetch_nvidia_raw()
        if not candidates:
            return
        sem = asyncio.Semaphore(10)
        async def _check(mid: str) -> bool:
            async with sem:
                return await _test_nvidia_model(mid["id"], headers)
        results = await asyncio.gather(*[_check(m) for m in candidates])
        models = []
        for m, ok in zip(candidates, results):
            if ok:
                models.append({
                    "id": f"nvidia/{m['id']}",
                    "active": True,
                    "owned_by": "nvidia",
                    "created": m.get("created", 0),
                })
        _nvidia_cache["models"] = models
        _nvidia_cache["timestamp"] = time.time()
        logger.info(f"NVIDIA models refreshed: {len(models)} working out of {len(candidates)} candidates")
    except Exception as e:
        logger.warning(f"Failed to refresh NVIDIA models: {e}")
    finally:
        _nvidia_cache["populating"] = False


@router.get("/models")
async def list_models():
    now = time.time()

    if _model_cache["models"] and now - _model_cache["timestamp"] < CACHE_TTL:
        return {"models": _model_cache["models"], "cached": True, "total": len(_model_cache["models"])}

    groq_models = await fetch_groq_models()

    if now - _nvidia_cache["timestamp"] > NVIDIA_CACHE_TTL or not _nvidia_cache["models"]:
        if _nvidia_cache["populating"]:
            while _nvidia_cache["populating"]:
                await asyncio.sleep(0.5)
        else:
            await refresh_nvidia_models()
    nvidia_models = _nvidia_cache["models"]

    models = groq_models + nvidia_models
    _model_cache["models"] = models
    _model_cache["timestamp"] = now
    _model_cache["error"] = ""
    return {"models": models, "cached": False, "total": len(models), "nvidia_total": len(nvidia_models)}


@router.get("/config")
async def get_config(task_type: str = ""):
    from config import MIN_COMPLETION_TOKENS, TOKEN_BUFFER, MODEL_CONTEXT
    from pathlib import Path as _P
    s = get_settings()
    active = get_active_model() or s.groq_model
    provider = "nvidia" if active.startswith("nvidia/") else "groq"

    model_id = active
    ctx = MODEL_CONTEXT.get(model_id, {"context_window": 131072, "max_completion": 32768, "tpm_limit": 8000})

    # Calculate system overhead per task type
    sys_map = {
        "TASK1_ACADEMIC": "sys_role_t1_academic.txt",
        "TASK1_GENERAL": "sys_role_t1_general.txt",
    }
    sys_file = sys_map.get(task_type, "sys_role_t2.txt")
    sys_path = _PROMPT_DIR / sys_file
    sys_tokens = 1500
    try:
        if sys_path.exists():
            sys_tokens = int(len(sys_path.read_text(encoding="utf-8")) / 3.5)
    except Exception:
        pass
    user_overhead = 2700  # rubric + schema + instructions (roughly fixed)
    sys_overhead = sys_tokens + user_overhead

    return {
        "provider": provider, "model": active, "configModel": s.groq_model,
        "skillConfig": dict(_skill_config),
        "features": {"writingGrading": True, "speakingGrading": False, "questionExplain": False},
        "quota": {"studentPerDay": s.quota_student_per_day, "teacherPerDay": s.quota_teacher_per_day, "adminPerDay": s.quota_admin_per_day},
        "cache": {"enabled": True, "ttlMinutes": s.cache_ttl_minutes, "maxSize": s.cache_max_size},
        "keys": {
            "groq": {"env": len(s.groq_api_keys), "extra": sum(1 for v in _extra_keys.values() if v["provider"] == "groq"), "total": len(s.groq_api_keys) + sum(1 for v in _extra_keys.values() if v["provider"] == "groq")},
            "nvidia": {"env": 1 if s.nvidia_api_key else 0, "extra": sum(1 for v in _extra_keys.values() if v["provider"] == "nvidia"), "total": (1 if s.nvidia_api_key else 0) + sum(1 for v in _extra_keys.values() if v["provider"] == "nvidia")},
        },
        "tokenLimits": {
            "maxTotal": ctx.get("tpm_limit", 8000),
            "minCompletion": MIN_COMPLETION_TOKENS,
            "sysOverhead": sys_overhead,
            "buffer": TOKEN_BUFFER,
            "contextWindow": ctx["context_window"],
        },
    }


@router.get("/stats")
async def get_stats():
    orch = GradingOrchestrator()
    retriever = SampleRetriever()
    return {"cache": orch.cache_stats(), "vectorStore": {"count": retriever.count(), "initialized": retriever.is_initialized}}


# ============================================================
# PER-SKILL MODEL CONFIG
# ============================================================


@router.get("/skill-config")
async def get_skill_config():
    return {"config": dict(_skill_config)}


@router.post("/skill-config")
async def set_skill_config(req: SkillConfig):
    _skill_config[req.skill] = req.model
    # Apply immediately if it's the current skill
    if req.skill == "writing":
        set_active_model(req.model)
    logger.info(f"Skill config updated: {req.skill} -> {req.model}")
    return {"message": f"Model for '{req.skill}' set to {req.model}", "config": dict(_skill_config)}


# ============================================================
# API KEY MANAGEMENT
# ============================================================


@router.get("/keys")
async def list_keys():
    s = get_settings()
    env_keys = []
    for i, k in enumerate(s.groq_api_keys):
        env_keys.append({"id": f"env-groq-{i}", "key": k[:8] + "..." + k[-4:], "provider": "groq", "label": f"Env Groq #{i + 1}", "source": "env", "createdAt": ""})
    if s.nvidia_api_key:
        env_keys.append({"id": "env-nvidia-0", "key": s.nvidia_api_key[:8] + "..." + s.nvidia_api_key[-4:], "provider": "nvidia", "label": "Env NVIDIA", "source": "env", "createdAt": ""})
    extra = [
        {"id": k, **v, "key": v["key"][:8] + "..." + v["key"][-4:], "source": "manual"}
        for k, v in _extra_keys.items()
    ]
    return {"keys": env_keys + extra, "envCount": len(env_keys), "extraCount": len(extra)}


@router.post("/keys")
async def add_key(req: AddKeyRequest):
    kid = str(uuid.uuid4())[:8]
    _extra_keys[kid] = {
        "key": req.key,
        "provider": req.provider,
        "label": req.label or f"{req.provider} key #{len(_extra_keys) + 1}",
        "created_at": time.time(),
    }
    # Add to runtime key rotation if groq
    if req.provider == "groq":
        from infrastructure.llm_client import GroqClient
        # Rebuild client key list
        GroqClient._extra_keys = GroqClient._extra_keys if hasattr(GroqClient, '_extra_keys') else []
        GroqClient._extra_keys.append(req.key)
        logger.info(f"Added extra Groq key, total extra keys: {len(GroqClient._extra_keys)}")
    logger.info(f"Key added: {kid} ({req.provider})")
    return {"message": f"Key added: {req.label}", "id": kid, "total": len(_extra_keys)}


@router.delete("/keys/{key_id}")
async def remove_key(key_id: str):
    if key_id.startswith("env-"):
        raise HTTPException(400, "Cannot remove environment keys via API")
    if key_id not in _extra_keys:
        raise HTTPException(404, "Key not found")
    removed = _extra_keys.pop(key_id)
    logger.info(f"Key removed: {key_id} ({removed['provider']})")
    return {"message": "Key removed", "id": key_id, "total": len(_extra_keys)}


# ============================================================
# PROMPT TEMPLATE MANAGEMENT
# ============================================================

from pathlib import Path as _Path

_PROMPT_DIR = _Path(__file__).parent.parent / "templates"

_PROMPT_NAMES = {
    "system_role.txt": "System Role — Hướng dẫn giám khảo IELTS (fallback)",
    "sys_role_t1_academic.txt": "System Role — Task 1 Academic (biểu đồ, bảng, map)",
    "sys_role_t1_general.txt": "System Role — Task 1 General (letter)",
    "sys_role_t2.txt": "System Role — Task 2 (essay)",
    "output_schema.json": "Output Schema — Định dạng JSON đầu ra",
    "rubric_data.json": "Rubric Data — Band descriptors từng loại task",
    "classify_prompt.txt": "Classify Prompt — Prompt phân loại bài viết",
}


@router.get("/prompts")
async def list_prompts():
    files = []
    for fname, desc in _PROMPT_NAMES.items():
        fpath = _PROMPT_DIR / fname
        if fpath.exists():
            files.append({
                "name": fname,
                "description": desc,
                "size": fpath.stat().st_size,
                "lines": len(fpath.read_text(encoding="utf-8").splitlines()),
            })
    return {"templates": files, "directory": str(_PROMPT_DIR)}


@router.get("/prompts/{name}")
async def get_prompt(name: str):
    if name not in _PROMPT_NAMES:
        raise HTTPException(404, f"Prompt '{name}' not found")
    fpath = _PROMPT_DIR / name
    if not fpath.exists():
        raise HTTPException(404, f"File '{name}' not found")
    content = fpath.read_text(encoding="utf-8")
    return {"name": name, "content": content, "size": len(content), "description": _PROMPT_NAMES[name]}


class UpdatePromptRequest(BaseModel):
    content: str


@router.put("/prompts/{name}")
async def update_prompt(name: str, req: UpdatePromptRequest):
    if name not in _PROMPT_NAMES:
        raise HTTPException(404, f"Prompt '{name}' not found")
    fpath = _PROMPT_DIR / name
    fpath.write_text(req.content, encoding="utf-8")
    logger.info(f"Prompt updated: {name} ({len(req.content)} chars)")
    return {"message": f"Prompt '{name}' updated", "name": name, "size": len(req.content)}


@router.post("/prompts/{name}/reset")
async def reset_prompt(name: str):
    if name not in _PROMPT_NAMES:
        raise HTTPException(404, f"Prompt '{name}' not found")
    # If there's a backup with .bak extension, restore it
    fpath = _PROMPT_DIR / name
    bak = _PROMPT_DIR / f"{name}.bak"
    if bak.exists():
        content = bak.read_text(encoding="utf-8")
        fpath.write_text(content, encoding="utf-8")
        return {"message": f"Prompt '{name}' restored from backup", "name": name, "size": len(content)}
    return {"message": f"No backup found for '{name}'", "name": name}


# ============================================================
# SAMPLES & CACHE
# ============================================================


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
    model = req.model

    if model.startswith("nvidia/"):
        provider = "nvidia"
        actual_model = model.replace("nvidia/", "", 1)
    else:
        provider = req.provider or "groq"
        actual_model = model

    if provider == "groq":
        try:
            models = await fetch_groq_models()
            available = {m["id"] for m in models}
        except Exception:
            available = set()

        if available and model not in available:
            raise HTTPException(400, f"Model '{model}' not found in available GROQ models")
        set_active_model(model)
        logger.info(f"Switched to groq/{model}")
        return {"message": f"Switched to groq/{model}", "currentModel": model}

    if provider == "nvidia":
        if not settings.nvidia_api_key:
            raise HTTPException(400, "NVIDIA API key not configured")
        set_active_model(model)
        logger.info(f"Switched to nvidia/{actual_model}")
        return {"message": f"Switched to nvidia/{actual_model}", "currentModel": actual_model}

    set_active_model(model)
    return {"message": f"Switched to {provider}/{model}", "currentModel": model}
