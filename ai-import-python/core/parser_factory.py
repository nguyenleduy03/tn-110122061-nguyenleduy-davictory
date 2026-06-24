"""Parser factory - routes to correct parser based on file type."""

import io
from pathlib import Path

from models.import_models import ParseResult
from core.pdf_parser import PdfParser
from core.docx_parser import DocxParser
from core.text_parser import TextParser
from core.image_parser import ImageParser


class ParserFactory:
    def __init__(self):
        self.pdf_parser = PdfParser()
        self.docx_parser = DocxParser()
        self.text_parser = TextParser()
        self.image_parser = ImageParser()

    async def parse(self, content: bytes, filename: str) -> ParseResult:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return await self.pdf_parser.parse(content, filename)
        elif ext in [".docx", ".doc"]:
            return self.docx_parser.parse(content, filename)
        elif ext == ".txt":
            return self.text_parser.parse(content, filename)
        elif ext in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"]:
            return await self.image_parser.parse(content, filename)
        else:
            return ParseResult(success=False, raw_text="",
                              text_length=0, filename=filename,
                              file_type=ext)
