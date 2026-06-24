from core.llm_agent import BaseLLMAgent
from tools.tools_library import RunSql


class InfoAgent(BaseLLMAgent):
    name = "info"
    description = "Tra cứu toàn bộ database DAVictory"
    capabilities = ["tra cứu", "thông tin", "xem", "kiểm tra", "tìm", "danh sách"]
    system_prompt = """Bạn là Info Agent DAVictory. Viết SQL SELECT để trả lời câu hỏi.

LUẬT:
1. CHỈ viết SQL SELECT. KHÔNG INSERT/UPDATE/DELETE.
2. Dùng schema được cung cấp để biết tên bảng và cột.
3. Luôn trả lời bằng tiếng Việt, ngắn gọn.
4. Nếu kết quả rỗng → "Không tìm thấy thông tin."
"""

    def __init__(self):
        super().__init__()
        self.tools = [RunSql()]
