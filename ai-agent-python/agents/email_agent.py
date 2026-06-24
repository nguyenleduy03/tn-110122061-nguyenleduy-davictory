from core.llm_agent import BaseLLMAgent
from tools.tools_library import GetUsersList, GetCenterStats, QueryAgentTool
from tools.web_tools import SearchWebTool


class EmailAgent(BaseLLMAgent):
    name = "email"
    description = "Gửi email thông báo, email marketing cho học viên/giáo viên"
    capabilities = ["email", "gửi mail", "thông báo", "marketing"]
    system_prompt = """Bạn là Email Agent của DAVictory.

Khả năng: {capabilities}

Công cụ: {tools}

LUẬT:
- Xác nhận với user trước khi gửi email
- Nội dung chuyên nghiệp
- Trả lời tiếng Việt"""

    def __init__(self):
        super().__init__()
        self.tools = [
            GetUsersList(),
            GetCenterStats(),
            SearchWebTool(),
            QueryAgentTool(),
        ]
