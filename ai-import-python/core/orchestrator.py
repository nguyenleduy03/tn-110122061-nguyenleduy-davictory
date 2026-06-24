"""Main orchestrator for AI Import Service."""

import uuid
from pathlib import Path

from loguru import logger

from models.import_models import ParseResult, ParseResponse, PreviewResponse, CreateResponse, StatusResponse, SectionPreview
from core.parser_factory import ParserFactory
from core.ai_structurer import AIStructurer, StructurerError
from core.test_mapper import TestMapper
from infrastructure.backend_client import BackendClient, BackendClientError
from infrastructure.cache import TTLCache
from config import get_settings

_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"}


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

    async def parse_file(self, content: bytes, filename: str, mode: str = "ocr") -> ParseResponse:
        task_id = str(uuid.uuid4())[:8]
        self._tasks[task_id] = {"status": "PARSED"}
        logger.info(f"[{task_id}] Bắt đầu parse: {filename} ({len(content)} bytes), mode={mode}")

        ext = Path(filename).suffix.lower()
        is_image = ext in _IMAGE_EXTS

        if mode == "vision" and is_image:
            self.cache.put(f"img_{task_id}", content)
            mime = "image/png" if ext == ".png" else "image/jpeg"
            logger.info(f"[{task_id}] Vision mode: cached image, mime={mime}")
            return ParseResponse(
                task_id=task_id,
                status="PARSED",
                raw_text="",
                text_length=0,
                filename=filename,
                file_type=ext.lstrip("."),
                ocr_used=False,
            )

        parse_result = await self.parser.parse(content, filename)
        logger.debug(f"[{task_id}] Parse kết quả: success={parse_result.success}, text_length={parse_result.text_length}, ocr={parse_result.ocr_used}")

        if not parse_result.success:
            self._tasks[task_id] = {"status": "FAILED"}
            logger.error(f"[{task_id}] Parse file thất bại: {filename}")
            return ParseResponse(task_id=task_id, status="FAILED", filename=filename)

        self.cache.put(f"raw_{task_id}", parse_result.raw_text)
        self._tasks[task_id] = {"status": "PARSED"}
        logger.info(f"[{task_id}] Parse thành công: {parse_result.text_length} chars, ocr={parse_result.ocr_used}")
        return ParseResponse(
            task_id=task_id,
            status="PARSED",
            raw_text=parse_result.raw_text,
            text_length=parse_result.text_length,
            filename=parse_result.filename,
            file_type=parse_result.file_type,
            ocr_used=parse_result.ocr_used,
        )

    async def structure_text(self, task_id: str, text: str,
                             skill_hint: str = "", test_type: str = "ACADEMIC",
                             part: str = "",
                             question_type: str = "") -> PreviewResponse:
        self._tasks[task_id] = {"status": "PROCESSING"}
        logger.info(f"[{task_id}] Bắt đầu structure: text_len={len(text)}, skill_hint={skill_hint}, test_type={test_type}, part={part}, qtype={question_type}")

        try:
            img_data = self.cache.get(f"img_{task_id}")
            if img_data:
                detected_skill = skill_hint or "READING"
                ext = ""
                mime = "image/jpeg"
                preview = await self.structurer.structure_from_image(
                    img_data, mime, detected_skill, test_type, part)
            else:
                detected_skill = skill_hint or self._detect_skill(text)
                logger.debug(f"[{task_id}] Skill detected: {detected_skill}")
                preview = await self.structurer.structure(text, detected_skill, test_type, part, question_type)

            preview.task_id = task_id
            preview.skill = detected_skill

            self._tasks[task_id] = {"status": "COMPLETED", "result": preview}
            self.cache.put(task_id, preview)
            logger.info(f"[{task_id}] Structure thành công: {preview.total_questions} questions, skill={preview.skill}")
            return preview
        except StructurerError as e:
            self._tasks[task_id] = {"status": "FAILED"}
            logger.error(f"[{task_id}] Structure thất bại: {e}")
            raise

    async def create_test(self, preview: PreviewResponse, test_type: str,
                          title: str, user_id: int,
                          target_band: str = "7.0") -> CreateResponse:
        try:
            save_data = self.mapper.map_to_save_request(
                preview, test_type, title, user_id, target_band)
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

    def get_parsed_text(self, task_id: str) -> str | None:
        return self.cache.get(f"raw_{task_id}")

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
