import asyncio
import json
import re
from datetime import datetime, timedelta

from loguru import logger

from infrastructure.llm_client import get_groq_client
from tools.tools_library import (
    GetCenterStats, GetPeriodStats, GetRevenueData,
    GetWritingStats, GetSpeakingStats, GetStudentScores,
    GetClassScores, GetExamScores, GetTeacherProductivity,
    GetTestTypeStats, GetAllClasses,
)
from tools.overview_stats import GetOverviewDashboard

TOOL_MAP = {
    "GetCenterStats": GetCenterStats(),
    "GetPeriodStats": GetPeriodStats(),
    "GetRevenueData": GetRevenueData(),
    "GetWritingStats": GetWritingStats(),
    "GetSpeakingStats": GetSpeakingStats(),
    "GetStudentScores": GetStudentScores(),
    "GetClassScores": GetClassScores(),
    "GetExamScores": GetExamScores(),
    "GetTeacherProductivity": GetTeacherProductivity(),
    "GetTestTypeStats": GetTestTypeStats(),
    "GetAllClasses": GetAllClasses(),
    "GetOverviewDashboard": GetOverviewDashboard(),
}

PERIOD_LABELS = {"week": "tuần", "month": "tháng", "quarter": "quý", "year": "năm"}

SYSTEM_PROMPT = (
    "Bạn là chuyên gia phân tích dữ liệu giáo dục tại trung tâm Anh ngữ DAVictory. "
    "Viết báo cáo hoàn toàn bằng tiếng Việt, chuyên nghiệp, dễ đọc. "
    "CHỈ dùng số liệu được cung cấp. KHÔNG tự bịa số. "
    "Dùng markdown cơ bản (**, bảng, bullet). "
    "KHÔNG dùng emoji, KHÔNG có thẻ think, KHÔNG có HTML. "
    "KHÔNG dùng tên tiếng Anh kỹ thuật như GetExamScores, GetStudentScores, total_attempts, avg_band, raw_score, unique_students. "
    "Dùng tiếng Việt thuần túy cho mọi nhãn, tên cột và tiêu đề."
)

# Bảng dịch các key/cột dữ liệu từ tiếng Anh sang tiếng Việt để báo cáo sạch sẽ
_VI_TRANSLATIONS = {
    # Tên cột dữ liệu
    "total_attempts": "Tổng lượt thi",
    "avg_band": "Điểm TB",
    "unique_students": "Số HV",
    "full_name": "Họ tên",
    "name": "Tên",
    "title": "Tên",
    "exam_type": "Loại kỳ thi",
    "test_type": "Loại đề",
    "total_tests": "Tổng đề thi",
    "full_tests": "Đề full test",
    "single_skill_tests": "Đề đơn kỹ năng",
    "single_skill": "Đề đơn kỹ năng",
    "by_skill": "Theo kỹ năng",
    "total_submissions": "Bài nộp",
    "avg_score": "Điểm TB",
    "completion_rate": "Tỉ lệ hoàn thành",
    "completed_attempts": "Lượt hoàn thành",
    "new_users": "HV mới",
    "total_users": "Tổng người dùng",
    "total_classes": "Tổng lớp học",
    "total_exam_attempts": "Tổng lượt thi",
    "avg_raw_score": "Điểm thô TB",
    "avg_band_score": "Điểm band TB",
    "best_band": "Điểm cao nhất",
    "worst_band": "Điểm thấp nhất",
    "student_count": "Số học viên",
    "teacher_count": "Số giáo viên",
    "total_tests_created": "Số đề đã tạo",
    "total_classes_teaching": "Số lớp phụ trách",
    "total_teachers": "Tổng giáo viên",
    "period": "Kỳ",
    "description": "Mô tả",
    "status": "Trạng thái",
    "created_at": "Ngày tạo",
    "updated_at": "Ngày cập nhật",
    # Kỹ năng IELTS
    "LISTENING": "Nghe",
    "READING": "Đọc",
    "WRITING": "Viết",
    "SPEAKING": "Nói",
    "UNKNOWN": "Khác",
    # Loại đề thi
    "ACADEMIC": "Academic",
    "GENERAL": "General",
    # Vai trò
    "STUDENT": "Học viên",
    "TEACHER": "Giáo viên",
    "MANAGER": "Quản lý",
    "ADMIN": "Admin",
    # Nhóm dữ liệu
    "students": "Học viên",
    "classes": "Lớp học",
    "exams": "Kỳ thi",
    "teachers": "Giáo viên",
    "test_types": "Loại đề thi",
    "kpi": "KPI",
    "test_stats": "Thống kê đề thi",
    "items": "Chỉ số",
    "speaking": "Speaking",
    # Tiêu chí Speaking
    "avg_fluency_coherence": "Trôi chảy & Mạch lạc",
    "avg_lexical_resource": "Vốn từ vựng",
    "avg_grammatical_range": "Ngữ pháp & Chính xác",
    "avg_pronunciation": "Phát âm",
    "avg_overall_band": "Điểm tổng",
    "total_sessions": "Số phiên",
}


def _translate_to_vietnamese(obj):
    """Dịch các key/cột tiếng Anh sang tiếng Việt trong dữ liệu."""
    if isinstance(obj, dict):
        return {
            _VI_TRANSLATIONS.get(k, k): _translate_to_vietnamese(v)
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_translate_to_vietnamese(item) for item in obj]
    return _VI_TRANSLATIONS.get(obj, obj)


def _calc_date_range(period: str) -> tuple[datetime, datetime]:
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "week":
        start = today - timedelta(days=today.weekday())
    elif period == "month":
        start = today.replace(day=1)
    elif period == "quarter":
        q = (today.month - 1) // 3
        start = today.replace(month=q * 3 + 1, day=1)
    elif period == "year":
        start = today.replace(month=1, day=1)
    else:
        start = today.replace(day=1)
    return start, today


class ReportGenerator:
    def __init__(self):
        self.client = get_groq_client()

    async def generate(self, template: dict) -> dict:
        period = template.get("period", "month")
        period_label = PERIOD_LABELS.get(period, "tháng")
        start_date, end_date = _calc_date_range(period)
        date_range = f"{start_date.strftime('%d/%m/%Y')} \u2013 {end_date.strftime('%d/%m/%Y')}"

        is_overview = template.get("category") == "tong_quan"
        dashboard_data = None
        all_data = {}

        if is_overview:
            try:
                tool = TOOL_MAP["GetOverviewDashboard"]
                dashboard_data = await tool.execute({"period": period}, {})
            except Exception as e:
                logger.error(f"Failed to fetch overview dashboard: {e}")

        if not dashboard_data:
            all_data = await self._collect_all_data(template["sections"], period)

        result = dict(template)
        result["generated_at"] = datetime.now().isoformat()
        result["period_label"] = period_label
        result["period_label_upper"] = period_label.upper()
        result["date_range"] = date_range
        result["sections"] = []

        if is_overview and dashboard_data:
            result["kpi_cards"] = dashboard_data.get("kpi_cards", [])
            result["dashboard_charts"] = dashboard_data.get("charts", {})

        for section in template["sections"]:
            if is_overview and dashboard_data:
                # Use raw database data from the dashboard to guarantee 100% accurate LLM analysis
                section_data = _translate_to_vietnamese(dashboard_data.get("raw_data", {}))
            else:
                section_data = self._extract_section_data(section, all_data)
                
            data_str = json.dumps(section_data, indent=2, ensure_ascii=False)
            prompt = section["llm_prompt"].format(
                period_label=period_label,
                period_label_upper=period_label.upper(),
                date_range=date_range,
                data=data_str,
            )
            content = await self._call_llm(section["heading"], prompt)

            charts_with_data = []
            if not is_overview:
                # Backward compatibility for non-overview reports
                for chart_def in section.get("charts", []):
                    chart_data = self._build_chart_data(chart_def, all_data)
                    if chart_data:
                        charts_with_data.append({
                            "type": chart_def["type"],
                            "title": chart_def["title"],
                            "data": chart_data,
                        })

            result["sections"].append({
                "heading": section["heading"],
                "content": content,
                "charts": charts_with_data,
            })

        return result

    async def _collect_all_data(self, sections: list, period: str) -> dict:
        tool_set = {}
        for section in sections:
            for hint in section.get("data_hints", []):
                key = (hint["tool"], json.dumps(hint.get("params", {}), sort_keys=True))
                if key not in tool_set:
                    tool_set[key] = hint

        results = {}

        async def fetch(key_tuple, hint):
            try:
                tool = TOOL_MAP.get(hint["tool"])
                if not tool:
                    logger.warning(f"Unknown tool: {hint['tool']}")
                    return
                params = dict(hint.get("params", {}))
                if "period" not in params:
                    params["period"] = period
                res = await tool.execute(params, {})
                results[key_tuple[0]] = res
            except Exception as e:
                logger.warning(f"Tool {hint['tool']} failed: {e}")

        await asyncio.gather(*[fetch(k, v) for k, v in tool_set.items()])
        return results

    @staticmethod
    def _extract_section_data(section: dict, all_data: dict) -> dict:
        data = {}
        for hint in section.get("data_hints", []):
            tool_name = hint["tool"]
            if tool_name in all_data:
                data[tool_name] = all_data[tool_name]
        return _translate_to_vietnamese(data)

    @staticmethod
    def _build_chart_data(chart_def: dict, all_data: dict) -> list:
        ds = chart_def.get("data_source", {})
        tool_result = all_data.get(ds.get("tool"))
        if not tool_result:
            return []

        fields = ds.get("fields")
        if fields:
            items = []
            for f in fields:
                val = tool_result.get(f["key"])
                if val is not None:
                    complement_of = f.get("complement_of")
                    if complement_of:
                        total = tool_result.get(complement_of, 0)
                        if total is not None:
                            val = max(0, float(total) - float(val))
                    items.append({
                        "label": f["label"],
                        "value": float(val),
                        "max": float(f.get("max", 100)),
                    })
            return items

        source_key = ds.get("source_key")
        items = tool_result.get(source_key, []) if source_key else tool_result
        if isinstance(items, list) and items:
            max_val = ds.get("max", 9)
            result = []
            for item in items[:10]:
                val = item.get(ds.get("value_key", "value"))
                if val is not None:
                    result.append({
                        "label": item.get(ds.get("label_key", "name"), ""),
                        "value": float(val),
                        "max": float(item.get(ds.get("max_key", ""), max_val)) if ds.get("max_key") else float(max_val),
                    })
            return result

        return []

    async def _call_llm(self, heading: str, prompt: str) -> str:
        for attempt in range(2):
            try:
                result = await self.client.create_completion(
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": (
                                prompt
                                if attempt == 0
                                else prompt + "\n\n\u26a0\ufe0f Lần trước thiếu số liệu cụ thể. PHẢI dùng số liệu từ dữ liệu!"
                            ),
                        },
                    ],
                    max_tokens=1024,
                )
                text = (result.content or "").strip()
                text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
                text = re.sub(r"</?think>", "", text).strip()
                if text:
                    return text
            except Exception as e:
                logger.warning(f"LLM section '{heading}' failed (attempt {attempt}): {e}")
                if attempt == 1:
                    return f"*Không thể tạo nội dung cho mục {heading}.*"
        return f"*Không thể tạo nội dung cho mục {heading}.*"
