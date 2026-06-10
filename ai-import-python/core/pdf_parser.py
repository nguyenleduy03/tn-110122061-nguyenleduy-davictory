"""PDF parser with OCR fallback for scanned documents."""

import io
from loguru import logger

from models.import_models import ParseResult


class PdfParser:
    async def parse(self, content: bytes, filename: str) -> ParseResult:
        result = ParseResult(success=True, filename=filename, file_type="pdf")
        try:
            text = self._extract_text_pymupdf(content)
            result.text_length = len(text)
            if result.text_length < 100:
                logger.info(f"PDF has only {result.text_length} chars, trying OCR...")
                ocr_text = self._ocr_extract(content)
                if len(ocr_text) > result.text_length:
                    text = ocr_text
                    result.ocr_used = True
            result.raw_text = text
            result.text_length = len(text)
        except Exception as e:
            logger.error(f"PDF parsing failed: {e}")
            result.success = False
            result.raw_text = str(e)
        return result

    def _extract_text_pymupdf(self, content: bytes) -> str:
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            parts = []
            for page in doc:
                text = page.get_text()
                if text.strip():
                    parts.append(text.strip())
            doc.close()
            return "\n\n".join(parts)
        except ImportError:
            return self._extract_text_pdfplumber(content)

    def _extract_text_pdfplumber(self, content: bytes) -> str:
        try:
            import pdfplumber
            parts = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        parts.append(text)
            return "\n\n".join(parts)
        except ImportError:
            logger.error("No PDF library available (pymupdf or pdfplumber)")
            return ""

    def _ocr_extract(self, content: bytes) -> str:
        try:
            import fitz
            from PIL import Image
            import pytesseract
            from config import get_settings

            settings = get_settings()
            doc = fitz.open(stream=content, filetype="pdf")
            parts = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                text = pytesseract.image_to_string(img, lang=settings.ocr_language,
                                                    config="--psm 6")
                if text.strip():
                    parts.append(text.strip())
            doc.close()
            logger.info(f"OCR extracted {sum(len(p) for p in parts)} chars from {len(parts)} pages")
            return "\n\n".join(parts)
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return ""
