"""Image parser - OCR for screenshot JPG/PNG files."""

import io
from pathlib import Path
from loguru import logger

from models.import_models import ParseResult
from core.ocr_utils import ocr_with_table_detection


class ImageParser:
    async def parse(self, content: bytes, filename: str) -> ParseResult:
        result = ParseResult(success=True, filename=filename, file_type=Path(filename).suffix.lower().lstrip("."))
        try:
            text = self._ocr_extract(content)
            result.raw_text = text
            result.text_length = len(text)
            result.ocr_used = True
            logger.info(f"Image OCR: {result.text_length} chars from {filename}")
        except Exception as e:
            logger.error(f"Image OCR failed: {e}")
            result.success = False
            result.raw_text = str(e)
        return result

    def _ocr_extract(self, content: bytes) -> str:
        from PIL import Image
        from config import get_settings

        settings = get_settings()
        img = Image.open(io.BytesIO(content))
        text = ocr_with_table_detection(img, settings.ocr_language)
        return text.strip()
