"""Main orchestrator for AI Import Service."""

import uuid

from loguru import logger

from models.import_models import ParseResult, PreviewResponse, CreateResponse, StatusResponse, SectionPreview
from core.parser_factory import ParserFactory
from core.ai_structurer import AIStructurer, StructurerError
from core.test_mapper import TestMapper
from infrastructure.backend_client import BackendClient, BackendClientError
from infrastructure.cache import TTLCache
from config import get_settings


class ImportOrchestrator:
    def __init__(self):
        self.settings = get_settings()
        self.parser = ParserFactory()
        self.structurer = AIStructurer()
        self.mapper = TestMapper()
        self.backend = BackendClient()
        self.cache = TTLCache(max_size=self.settings.cache_max_size,
                              ttl_seconds=self.settings.cache_ttl_minutes * 60)
        self._tasks: dict[str, dict] = {}

    async def parse_document(self, content: bytes, filename: str,
                             skill_hint: str = "", test_type: str = "ACADEMIC") -> PreviewResponse:
        task_id = str(uuid.uuid4())[:8]
        self._tasks[task_id] = {"status": "PROCESSING"}

        parse_result = await self.parser.parse(content, filename)
        if not parse_result.success:
            return PreviewResponse(task_id=task_id, status="FAILED",
                                   skill=skill_hint, title=filename)

        detected_skill = skill_hint or self._detect_skill(parse_result.raw_text)
        preview = await self.structurer.structure(
            parse_result.raw_text, detected_skill, test_type)
        preview.task_id = task_id
        preview.skill = detected_skill

        self._tasks[task_id] = {"status": "COMPLETED", "result": preview}
        self.cache.put(task_id, preview)
        logger.info(f"Parsed {filename}: {preview.total_questions} questions, skill={preview.skill}")
        return preview

    async def create_test(self, preview: PreviewResponse, test_type: str,
                          title: str, user_id: int) -> CreateResponse:
        try:
            save_data = self.mapper.map_to_save_request(preview, test_type, title, user_id)
            result = await self.backend.save_test(save_data, user_id)
            test_id = result.get("id", 0)
            return CreateResponse(success=True, test_id=test_id,
                                 title=title, message="Test created successfully")
        except BackendClientError as e:
            logger.error(f"Backend error creating test: {e}")
            return CreateResponse(success=False, test_id=0, title=title,
                                 message=f"Backend error: {e}")
        except Exception as e:
            logger.error(f"Test creation failed: {e}")
            return CreateResponse(success=False, test_id=0, title=title,
                                 message=str(e))

    def get_status(self, task_id: str) -> StatusResponse:
        cached = self.cache.get(task_id)
        task = self._tasks.get(task_id, {})
        status = task.get("status", "UNKNOWN")
        result = None
        if cached:
            result = cached
            status = "COMPLETED"
        return StatusResponse(task_id=task_id, status=status,
                             progress=task.get("progress", ""),
                             result=result)

    def _detect_skill(self, text: str) -> str:
        upper = text.upper()[:5000]
        scores = {}
        for skill in ["LISTENING", "READING", "WRITING", "SPEAKING"]:
            scores[skill] = upper.count(skill)
        if "LISTEN" in upper:
            scores["LISTENING"] += 5
        if "PASSAGE" in upper or "PARAGRAPH" in upper:
            scores["READING"] += 10
        if "TASK 1" in upper or "TASK 2" in upper or "ESSAY" in upper:
            scores["WRITING"] += 10
        if "CUE CARD" in upper or "INTERVIEW" in upper:
            scores["SPEAKING"] += 10
        if sum(scores.values()) == 0:
            return "READING"
        return max(scores, key=scores.get)
