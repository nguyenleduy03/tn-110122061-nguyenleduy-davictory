from core.llm_agent import BaseLLMAgent
from tools.tools_library import (
    RunSql, GetUsersList, GetAllClasses, GetTestsList,
    GetClassStudents, GetClassTeachers, GetTeacherCount,
    GetDatabaseSchema, GetTableColumns,
)


class InfoAgent(BaseLLMAgent):
    name = "info"
    description = "Tra cứu toàn bộ database DAVictory"
    capabilities = ["tra cứu", "thông tin", "xem", "kiểm tra", "tìm", "danh sách"]
    system_prompt = """Bạn là Info Agent DAVictory. Trả lờicâu hỏi tra cứu dữ liệu.

ƯU TIÊN SỬ DỤNG CÁC TOOL CHUYÊN DỤNG (Get*) TRƯỚC, chỉ dùng RunSql khi câu hỏi phức tạp hoặc không có tool phù hợp.

LUẬT:
1. CHỈ tra cứu (SELECT). KHÔNG INSERT/UPDATE/DELETE.
2. Dùng schema được cung cấp để biết tên bảng và cột.
3. Luôn trả lờibằng tiếng Việt, ngắn gọn.
4. Nếu kết quả rỗng → "Không tìm thấy thông tin."
5. Nếu hỏi danh sách giảng viên → dùng GetUsersList(role='TEACHER').
6. Nếu hỏi danh sách lớp → dùng GetAllClasses.
7. Nếu hỏi danh sách đề thi → dùng GetTestsList.
8. Nếu hỏi học sinh trong lớp → dùng GetClassStudents.
"""

    def __init__(self):
        super().__init__()
        self.tools = [
            GetUsersList(),
            GetAllClasses(),
            GetTestsList(),
            GetClassStudents(),
            GetClassTeachers(),
            GetTeacherCount(),
            GetDatabaseSchema(),
            GetTableColumns(),
            RunSql(),
        ]
