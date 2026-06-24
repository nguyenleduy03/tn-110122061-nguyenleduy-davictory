"""AI Import Service - REST API endpoints."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from loguru import logger

from core.orchestrator import ImportOrchestrator
from core.ai_structurer import StructurerError
from infrastructure.backend_client import BackendClientError
from models.import_models import CreateRequest, StructureRequest

router = APIRouter(prefix="/api/ai/import", tags=["ai-import"])
orch = ImportOrchestrator()


@router.post("/parse")
async def parse_document(
    file: UploadFile = File(...),
):
    logger.info(f"POST /parse - file={file.filename}, content_type={file.content_type}")
    try:
        content = await file.read()
        logger.debug(f"  Đọc file: {len(content)} bytes")
        if not content:
            logger.warning("  File rỗng")
            raise HTTPException(400, "Empty file")
        result = await orch.parse_file(content, file.filename or "upload")
        logger.info(f"  Kết quả: task_id={result.task_id}, status={result.status}, text_length={result.text_length}")
        return result.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"  Lỗi parse: {e}")
        raise HTTPException(500, str(e))


@router.post("/structure")
async def structure_document(req: StructureRequest):
    logger.info(f"POST /structure - task_id={req.task_id}, text_len={len(req.text)}, skill_hint={req.skill_hint}")
    try:
        preview = await orch.structure_text(
            req.task_id, req.text, req.skill_hint, req.test_type)
        logger.info(f"  Kết quả: status={preview.status}, questions={preview.total_questions}, skill={preview.skill}")
        return preview.model_dump()
    except StructurerError as e:
        logger.error(f"  Lỗi structure: {e}")
        raise HTTPException(422, str(e))
    except Exception as e:
        logger.error(f"  Lỗi structure: {e}")
        raise HTTPException(500, str(e))


@router.post("/create")
async def create_test(req: CreateRequest):
    logger.info(f"POST /create - task_id={req.task_id}, title={req.title}")
    try:
        preview = orch.cache.get(req.task_id)
        if not preview:
            logger.warning(f"  Task {req.task_id} không tìm thấy trong cache")
            raise HTTPException(404, f"Task {req.task_id} not found. Parse first.")
        if req.sections:
            logger.debug(f"  Override {len(req.sections)} sections từ request")
            preview.sections = req.sections
        result = await orch.create_test(preview, req.test_type, req.title,
                                        req.created_by_user_id, req.target_band)
        logger.info(f"  Kết quả: success={result.success}, test_id={result.test_id}")
        return result.model_dump()
    except BackendClientError as e:
        logger.error(f"  Lỗi backend: {e}")
        raise HTTPException(502, str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"  Lỗi create: {e}")
        raise HTTPException(500, str(e))


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    logger.debug(f"GET /status/{task_id}")
    status = orch.get_status(task_id)
    return status.model_dump()
