from core.parser_factory import ParserFactory
from core.pdf_parser import PdfParser
from core.docx_parser import DocxParser
from core.text_parser import TextParser
from core.image_parser import ImageParser


class TestParserFactory:
    def setup_method(self):
        self.factory = ParserFactory()

    def test_pdf_parser(self):
        assert isinstance(self.factory.pdf_parser, PdfParser)

    def test_docx_parser(self):
        assert isinstance(self.factory.docx_parser, DocxParser)

    def test_text_parser(self):
        assert isinstance(self.factory.text_parser, TextParser)

    def test_image_parser(self):
        assert isinstance(self.factory.image_parser, ImageParser)

    async def test_parse_unknown_extension(self):
        result = await self.factory.parse(b"test", "unknown.xyz")
        assert not result.success
