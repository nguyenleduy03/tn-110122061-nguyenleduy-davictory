from core.langchain_agent import LangChainAgent
from tools.tools_library import (
    GetCenterStats, GetTeacherCount, GetAllClasses,
    GetClassStudents,
    GetDatabaseSchema, GetTableColumns, RunSql,
)


class LangChainInfoAgent(LangChainAgent):
    name = "info"
    description = "Tra cứu toàn bộ database DAVictory"
    capabilities = ["tra cứu", "thông tin", "xem", "kiểm tra", "tìm", "danh sách"]
    system_prompt = """Bạn là Info Agent DAVictory. Dùng tool để tra cứu.

- thông tin trung tâm → GetCenterStats
- số giáo viên → GetTeacherCount
- danh sách lớp → GetAllClasses
- học sinh của 1 lớp (vd: học sinh lớp A) → GetClassStudents
- xem bảng trong DB → GetDatabaseSchema
- xem cột 1 bảng → GetTableColumns
- câu hỏi khác: GetTableColumns(xem cột) TRƯỚC, RỒI RunSql

QUAN TRỌNG: Chỉ trả lời nội dung, KHÔNG chứa tên tool trong câu trả lời.
Ko có dữ liệu → "Không tìm thấy". Trả lời tiếng Việt ngắn gọn."""

    def __init__(self):
        super().__init__()
        self.tools = [
            GetCenterStats(),
            GetTeacherCount(),
            GetAllClasses(),
            GetClassStudents(),
            GetDatabaseSchema(),
            GetTableColumns(),
            RunSql(),
        ]