from models.import_models import (
    ParseResult, ParseResponse, PreviewResponse, CreateResponse,
    StatusResponse, SectionPreview, GroupPreview, QuestionPreview,
    CreateRequest, StructureRequest,
)


class TestModels:
    def test_parse_result_defaults(self):
        r = ParseResult(success=True, filename="test.pdf")
        assert r.success
        assert r.filename == "test.pdf"
        assert r.raw_text == ""
        assert r.text_length == 0

    def test_parse_response_minimal(self):
        r = ParseResponse(task_id="abc123", status="PARSED", filename="test.pdf")
        assert r.task_id == "abc123"
        assert r.status == "PARSED"

    def test_question_preview(self):
        q = QuestionPreview(number=1, text="What is the capital of France?")
        assert q.number == 1
        assert q.text == "What is the capital of France?"

    def test_group_preview(self):
        g = GroupPreview(title="Questions 1-5", question_type="MCQ")
        assert g.title == "Questions 1-5"
        assert g.question_type == "MCQ"

    def test_section_preview(self):
        s = SectionPreview(title="Reading Passage 1", skill="READING", part_order=1)
        assert s.title == "Reading Passage 1"
        assert s.skill == "READING"

    def test_preview_response_defaults(self):
        p = PreviewResponse(skill="READING", title="Test", test_type="ACADEMIC")
        assert p.status == "PENDING"
        assert p.total_questions == 0

    def test_create_response(self):
        r = CreateResponse(success=True, test_id=42, title="IELTS Test")
        assert r.success
        assert r.test_id == 42

    def test_status_response(self):
        r = StatusResponse(task_id="abc", status="COMPLETED")
        assert r.task_id == "abc"
        assert r.status == "COMPLETED"

    def test_structure_request(self):
        r = StructureRequest(task_id="abc", text="Sample text", skill_hint="READING")
        assert r.task_id == "abc"
        assert r.skill_hint == "READING"

    def test_create_request(self):
        r = CreateRequest(task_id="abc", title="Test", created_by_user_id=1)
        assert r.task_id == "abc"
        assert r.created_by_user_id == 1
