"""Plain text file parser."""

from models.import_models import ParseResult


class TextParser:
    def parse(self, content: bytes, filename: str) -> ParseResult:
        result = ParseResult(success=True, filename=filename, file_type="txt")
        try:
            text = content.decode("utf-8", errors="replace")
            result.raw_text = text
            result.text_length = len(text)
        except Exception as e:
            result.success = False
            result.raw_text = str(e)
        return result
