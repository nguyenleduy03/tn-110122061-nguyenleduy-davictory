from core.langchain_agent import LangChainAgent
from tools.tools_library import (
    GetCenterStats, GetWritingStats, GetRevenueData, QueryAgentTool,
    GetSpeakingStats, GetExamSchedule, QueryDatabase, GetAllClasses,
)
from tools.web_tools import ResearchTopicTool


class LangChainReportAgent(LangChainAgent):
    name = "report"
    description = "Tạo báo cáo: performance học sinh, thống kê trung tâm, phân tích dữ liệu"
    capabilities = ["báo cáo", "report", "thống kê", "phân tích", "số liệu", "tổng quan", "performance"]
    system_prompt = """Bạn là Report Agent của DAVictory.

Khả năng: {capabilities}

Công cụ: {tools}

LUẬT BẮT BUỘC:
1. Dùng get_center_stats để lấy tổng quan users, classes, tests, submissions
2. Dùng get_writing_stats, get_speaking_stats để lấy điểm TB writing/speaking
3. Dùng get_revenue_data để lấy số bài thi, học viên
4. Dùng get_all_classes để lấy danh sách lớp
5. query_database chỉ dùng cho các bảng: users, classes, exam_attempts, questions
6. KHÔNG tự bịa số liệu, chỉ dùng tool results
7. Trả lời tiếng Việt, có số liệu cụ thể, insight, đề xuất"""

    def __init__(self):
        super().__init__()
        self.tools = [
            GetCenterStats(),
            GetWritingStats(),
            GetRevenueData(),
            GetSpeakingStats(),
            GetExamSchedule(),
            GetAllClasses(),
            QueryDatabase(),
            QueryAgentTool(),
        ]
