"""AI Import Service - REST API endpoints."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from core.orchestrator import ImportOrchestrator
from core.ai_structurer import StructurerError
from infrastructure.backend_client import BackendClientError
from models.import_models import CreateRequest

router = APIRouter(prefix="/api/ai/import", tags=["ai-import"])
orch = ImportOrchestrator()


@router.post("/parse")
async def parse_document(
    file: UploadFile = File(...),
    skill_hint: str = Form(default=""),
    test_type: str = Form(default="ACADEMIC"),
):
    try:
        content = await file.read()
        if not content:
            raise HTTPException(400, "Empty file")
        preview = await orch.parse_document(content, file.filename or "upload",
                                            skill_hint, test_type)
        return preview.model_dump()
    except StructurerError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/create")
async def create_test(req: CreateRequest):
    try:
        preview = orch.cache.get(req.task_id)
        if not preview:
            raise HTTPException(404, f"Task {req.task_id} not found. Parse first.")
        if req.sections:
            preview.sections = req.sections
        result = await orch.create_test(preview, req.test_type, req.title,
                                        req.created_by_user_id)
        return result.model_dump()
    except BackendClientError as e:
        raise HTTPException(502, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    status = orch.get_status(task_id)
    return status.model_dump()
