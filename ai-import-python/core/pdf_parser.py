"""PDF parser with OCR fallback for scanned documents."""

import io
from loguru import logger

from models.import_models import ParseResult
from core.ocr_utils import ocr_with_table_detection


class PdfParser:
    async def parse(self, content: bytes, filename: str) -> ParseResult:
        result = ParseResult(success=True, filename=filename, file_type="pdf")
        try:
            text = self._extract_text_pymupdf(content)
            tables_text = self._extract_tables_pdfplumber(content)
            if tables_text:
                text = text + "\n\n" + tables_text if text else tables_text
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

    def _extract_tables_pdfplumber(self, content: bytes) -> str:
        try:
            import pdfplumber
            table_parts = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    tables = page.extract_tables()
                    for ti, table in enumerate(tables):
                        if not table or len(table) < 2:
                            continue
                        col_count = max(len(row) for row in table if row)
                        if col_count < 2:
                            continue
                        lines = []
                        for ri, row in enumerate(table):
                            cells = [str(c).strip() if c else "" for c in (row or [])]
                            while len(cells) < col_count:
                                cells.append("")
                            line = " | ".join(cells)
                            lines.append(line)
                            if ri == 0:
                                lines.append(" | ".join(["---"] * col_count))
                        if lines:
                            table_parts.append(f"[Table from page {page_num + 1}]\n" + "\n".join(lines))
            if table_parts:
                logger.info(f"Extracted {len(table_parts)} table(s) from PDF")
            return "\n\n".join(table_parts)
        except ImportError:
            return ""
        except Exception as e:
            logger.warning(f"Table extraction failed: {e}")
            return ""

    def _ocr_extract(self, content: bytes) -> str:
        try:
            import fitz
            from PIL import Image
            from config import get_settings

            settings = get_settings()
            doc = fitz.open(stream=content, filetype="pdf")
            parts = []
            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                text = ocr_with_table_detection(img, settings.ocr_language)
                if text.strip():
                    parts.append(text.strip())
            doc.close()
            logger.info(f"OCR extracted {sum(len(p) for p in parts)} chars from {len(parts)} pages")
            return "\n\n".join(parts)
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return ""
