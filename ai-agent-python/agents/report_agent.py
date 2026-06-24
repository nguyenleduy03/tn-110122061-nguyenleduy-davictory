import asyncio
import json
import math
import re
from datetime import datetime, timedelta

from loguru import logger

from core.base import AgentResult, BaseAgent
from core.schema import get_schema_text, find_relevant_tables
from tools.tools_library import (
    GetCenterStats, GetWritingStats, GetRevenueData, GetPeriodStats,
    GetSpeakingStats, GetExamSchedule, GetAllClasses, GetTeacherProductivity,
    GetStudentScores, GetClassScores, GetExamScores, GetTestTypeStats,
)
from tools.web_tools import ResearchTopicTool
from infrastructure.llm_client import get_groq_client

PERIOD_NAMES = {"week": "tuần", "month": "tháng", "quarter": "quý", "year": "năm"}
TOOL_LIST_STR = (
    "- `get_center_stats`: Tổng users, classes, tests, submissions (số tổng quan)\n"
    "- `get_period_stats`: Users mới, exam attempts, avg band score, completion rate\n"
    "- `get_revenue_data`: Số exam attempts, active students\n"
    "- `get_writing_stats`: Số bài nộp writing, avg score\n"
    "- `get_speaking_stats`: Số sessions, avg band, FC/LR/GRA/P\n"
    "- `get_all_classes`: Danh sách lớp\n"
    "- `get_teacher_productivity`: Số đề thi IELTS mỗi giảng viên tạo, số lớp phụ trách\n"
    "- `get_student_scores`: Điểm band của từng sinh viên (avg, best, worst, attempts)\n"
    "- `get_class_scores`: Điểm TB, số học viên, số bài thi theo lớp\n"
    "- `get_exam_scores`: Điểm TB, số lượt thi, số sinh viên theo kỳ thi\n"
    "- `get_test_type_stats`: **Số đề full test, single skill, theo kỹ năng (Listening/Reading/Writing/Speaking). Dùng khi hỏi về loại đề thi, cấu trúc đề.**\n"
)

def _clamp(v, lo, hi):
    return max(lo, min(hi, v or 0))

def _rating(val, good, ok):
    if val is None or val == 0: return "⚪"
    if val >= good: return "🟢 Tốt"
    if val >= ok: return "🟡 Trung bình"
    return "🔴 Yếu"

def _trend(growth):
    if growth is None: return "→"
    if growth > 5: return "↑"
    if growth < -5: return "↓"
    return "→"

def _pct(v, total):
    if not total: return 0
    return round(v / total * 100, 1)

def _fmt(v):
    if v is None: return "Chưa có dữ liệu"
    if isinstance(v, float):
        return f"{v:.2f}" if v < 10 else f"{v:.1f}"
    return str(v)

def _has_numbers(text):
    return len(re.findall(r'\d+[.,]?\d*', text)) >= 2


def _detect_period(text: str) -> str:
    t = text.lower()
    if any(kw in t for kw in ["tuần", "week", "7 ngày"]):
        return "week"
    if any(kw in t for kw in ["quý", "quarter", "3 tháng"]):
        return "quarter"
    if any(kw in t for kw in ["năm", "year", "12 tháng"]):
        return "year"
    if any(kw in t for kw in ["tháng", "month", "30 ngày"]):
        return "month"
    return "month"


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


def _get_tool_by_name(name: str):
    _tools = [
        GetCenterStats(), GetWritingStats(), GetRevenueData(), GetPeriodStats(),
        GetSpeakingStats(), GetExamSchedule(), GetAllClasses(), GetTeacherProductivity(),
        GetStudentScores(), GetClassScores(), GetExamScores(), GetTestTypeStats(),
    ]
    for t in _tools:
        if t.name == name:
            return t
    return None


def _preprocess(stats: dict) -> dict:
    items = []
    speaking = {}
    test_types = {}
    teachers = []
    students = []
    classes_data = []
    exams = []

    def add(k, v, max_v, good, ok, unit=""):
        if v is None or v == 0:
            return
        items.append({
            "key": k, "value": v, "max": max_v,
            "rating": _rating(v, good, ok),
            "display": _fmt(v) + unit,
        })

    c = stats.get("get_center_stats", {})
    if c:
        add("Tổng người dùng", c.get("total_users"), 100, 50, 20)
        add("Lớp học", c.get("total_classes"), 20, 15, 8)
        add("Bài kiểm tra", c.get("total_tests"), 100, 50, 20)
        add("Bài nộp", c.get("total_submissions"), 50, 20, 10)

    p = stats.get("get_period_stats", {})
    if p:
        add("Lượt thi", p.get("total_exam_attempts"), 100, 50, 20)
        add("Điểm TB band", p.get("avg_band_score"), 9, 5.0, 3.0)
        add("Tỉ lệ hoàn thành", p.get("completion_rate"), 100, 80, 50, "%")

    r = stats.get("get_revenue_data", {})
    if r:
        add("Học viên active", r.get("active_students"), 50, 20, 10)

    w = stats.get("get_writing_stats", {})
    if w:
        add("Writing submissions", w.get("total_submissions"), 30, 10, 5)

    s = stats.get("get_speaking_stats", {})
    if s:
        add("Speaking sessions", s.get("total_sessions"), 30, 10, 5)
        if s.get("avg_overall_band") is not None:
            speaking = {
                "avg_overall": _fmt(s.get("avg_overall_band")),
                "fc": _fmt(s.get("avg_fluency_coherence")),
                "lr": _fmt(s.get("avg_lexical_resource")),
                "gra": _fmt(s.get("avg_grammatical_range")),
                "p": _fmt(s.get("avg_pronunciation")),
            }

    tp = stats.get("get_teacher_productivity", {})
    if tp:
        teachers = tp.get("teachers", [])

    ss = stats.get("get_student_scores", {})
    if ss:
        students = ss.get("students", [])

    cs = stats.get("get_class_scores", {})
    if cs:
        classes_data = cs.get("classes", [])

    es = stats.get("get_exam_scores", {})
    if es:
        exams = es.get("exams", [])

    tt = stats.get("get_test_type_stats", {})
    if tt and tt.get("total_tests", 0) > 0:
        test_types = tt

    return {"items": items, "speaking": speaking, "teachers": teachers,
            "students": students, "classes_data": classes_data,
            "exams": exams, "test_types": test_types}


def _build_table(items):
    rows = ["| Chỉ số | Giá trị | Đánh giá |", "|--------|---------|----------|"]
    for it in items:
        rows.append(f"| {it['key']} | {it['display']} | {it['rating']} |")
    return "\n".join(rows)


async def _llm_analyze(text: str, client) -> dict:
    prompt = f"""Người dùng yêu cầu báo cáo: "{text}"

Tools:
{TOOL_LIST_STR}

Phân tích:
1. Kỳ báo cáo (week/month/quarter/year)?
2. Cần tool nào để lấy dữ liệu?
3. Người dùng muốn xem thông tin gì cụ thể?

Trả về JSON:
{{"period": "week/month/quarter/year", "tools": ["tool1","tool2"], "metrics": ["mô tả metric 1", "mô tả metric 2"]}}
CHỈ trả về JSON, không giải thích."""

    try:
        resp = await client.create_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800, response_format={"type": "json_object"},
        )
        return json.loads(re.sub(r'^```(?:json)?\s*|\s*```$', '', (resp.content or "").strip(), flags=re.DOTALL))
    except Exception as e:
        logger.warning(f"LLM analyze failed: {e}")
        return {"period": "month", "tools": ["get_center_stats", "get_period_stats"], "metrics": ["Tổng quan trung tâm"]}


class ReportAgent(BaseAgent):
    name = "report"
    description = "Tạo báo cáo: thống kê trung tâm, phân tích dữ liệu, performance học sinh"
    capabilities = ["báo cáo", "report", "thống kê", "phân tích", "số liệu", "tổng quan"]

    def __init__(self):
        super().__init__()
        self.tools = [
            GetCenterStats(), GetWritingStats(), GetRevenueData(), GetPeriodStats(),
            GetSpeakingStats(), GetExamSchedule(), GetAllClasses(), GetTeacherProductivity(),
            GetStudentScores(), GetClassScores(), GetExamScores(), GetTestTypeStats(),
            ResearchTopicTool(),
        ]

    async def run_tool(self, tool_name: str, params: dict, user_context: dict):
        for t in self.tools:
            if t.name == tool_name:
                return await t.execute(params, user_context)
        raise ValueError(f"Tool '{tool_name}' not found")

    async def process(self, input_text: str, user_context: dict, session_context: dict | None = None) -> AgentResult:
        pending = (session_context or {}).get("_pending_action") if session_context else None
        client = get_groq_client()

        if pending:
            return await self._handle_pending(pending, input_text, user_context, client)

        return await self._start(input_text, user_context, client)

    async def _start(self, input_text: str, user_context: dict, client) -> AgentResult:
        analysis = await _llm_analyze(input_text, client)
        period = analysis.get("period", "month")
        period_label = PERIOD_NAMES.get(period, "tháng")
        start_date, end_date = _calc_date_range(period)
        date_str = f"{start_date.strftime('%d/%m/%Y')} – {end_date.strftime('%d/%m/%Y')}"
        metrics = analysis.get("metrics", ["Tổng quan trung tâm"])
        tools = analysis.get("tools", ["get_center_stats", "get_period_stats"])

        metric_lines = "\n".join(f"  • {m}" for m in metrics)

        pending = {
            "agent_name": "report",
            "action": "confirm",
            "period": period,
            "period_label": period_label,
            "date_str": date_str,
            "tools": tools,
            "metrics": metrics,
            "original_input": input_text,
        }

        response = (
            f"📊 **BÁO CÁO {period_label.upper()}** ({date_str})\n\n"
            f"Dựa trên yêu cầu của bạn, tôi sẽ tạo báo cáo gồm:\n"
            f"{metric_lines}\n\n"
            f"✅ **Bạn có muốn thêm hoặc bỏ thông tin gì không?**\n"
            f'*(Trả lời: thêm X, bỏ Y, hoặc "không, đủ rồi")*'
        )

        return AgentResult(success=True, agent_type=self.name, response=response, pending_action=pending)

    async def _handle_pending(self, pending: dict, user_input: str, user_context: dict, client) -> AgentResult:
        action = pending.get("action")
        u = user_input.lower().strip()

        if action == "confirm":
            if any(kw in u for kw in ["không", "đủ", "ok", "được", "ừ", "rồi", "yes", "y"]):
                return await self._collect_and_generate(pending, user_context, client)

            if "thêm" in u or "add" in u:
                new_text = re.sub(r'(thêm|add)\s*', '', u, count=1).strip()
                combined = new_text + " " + pending.get("original_input", "")
                new_analysis = await _llm_analyze(combined, client)
                existing = set(pending["metrics"])
                for m in new_analysis.get("metrics", []):
                    if m not in existing:
                        pending["metrics"].append(m)
                        existing.add(m)
                for t in new_analysis.get("tools", []):
                    if t not in pending["tools"]:
                        pending["tools"].append(t)

            if "bỏ" in u or "remove" in u or "xóa" in u:
                remove_text = re.sub(r'(bỏ|remove|xóa)\s*', '', u, count=1).strip()
                pending["metrics"] = [m for m in pending["metrics"] if remove_text.lower() not in m.lower()]
                pending["tools"] = [t for t in pending["tools"] if remove_text.lower() not in t]

            if not pending["metrics"]:
                pending["metrics"] = ["Tổng quan trung tâm"]
                pending["tools"] = ["get_center_stats", "get_period_stats"]

            metric_lines = "\n".join(f"  • {m}" for m in pending["metrics"])
            pending["agent_name"] = "report"

            return AgentResult(
                success=True,
                agent_type=self.name,
                response=(
                    f"📊 **BÁO CÁO {pending['period_label'].upper()}** ({pending['date_str']})\n\n"
                    f"Báo cáo sẽ gồm:\n{metric_lines}\n\n"
                    f"✅ **Còn muốn thay đổi gì không?**\n"
                    f'*(thêm/bỏ, hoặc "không, đủ rồi")*'
                ),
                pending_action=pending,
            )

        return AgentResult(success=True, agent_type=self.name, response="Không thể xử lý. Vui lòng thử lại.")

    async def _collect_and_generate(self, pending: dict, user_context: dict, client) -> AgentResult:
        # Step 1: Collect data
        stats = {}
        errors = []
        original_input = pending.get("original_input", "")
        period = pending.get("period", "month")

        async def _call(name: str):
            try:
                tool = _get_tool_by_name(name)
                if not tool:
                    return
                params = {}
                if name in ("get_center_stats", "get_writing_stats", "get_revenue_data", "get_period_stats",
                            "get_test_type_stats", "get_student_scores", "get_class_scores", "get_exam_scores"):
                    params["period"] = period
                result = await tool.execute(params, user_context)
                if isinstance(result, dict):
                    stats[name] = result
            except Exception as e:
                errors.append(f"{name}: {e}")

        tools = pending.get("tools", ["get_center_stats", "get_period_stats"])
        if not tools or tools == ["get_center_stats", "get_period_stats"]:
            tools = ["get_center_stats", "get_period_stats"]
        await asyncio.gather(*[_call(t) for t in tools])

        # Step 2: Preprocess + separate good/bad items
        processed = _preprocess(stats)
        good_items = [it for it in processed["items"] if "🟢" in it["rating"]]
        bad_items = [it for it in processed["items"] if "🔴" in it["rating"] or "🟡" in it["rating"]]
        table = _build_table(processed["items"])
        date_str = pending["date_str"]
        period_label = pending["period_label"]

        # Build sql_context
        import json as _json
        sql_parts = []
        for key, label in [("test_types", "THỐNG KÊ ĐỀ THI"), ("teachers", "GIẢNG VIÊN"),
                           ("students", "ĐIỂM SINH VIÊN"), ("classes_data", "ĐIỂM LỚP"),
                           ("exams", "ĐIỂM KỲ THI")]:
            val = processed.get(key, {}) if key == "test_types" else processed.get(key, [])
            if isinstance(val, list) and val:
                sql_parts.append(f"{label}:\n" + _json.dumps(val, ensure_ascii=False, indent=2))
            elif isinstance(val, dict) and val.get("total_tests", 0):
                sql_parts.append(f"{label}:\n" + _json.dumps(val, ensure_ascii=False, indent=2))
        speaking = processed.get("speaking", {})
        if speaking:
            sql_parts.append("SPEAKING:\n" + _json.dumps(speaking, ensure_ascii=False, indent=2))
        sql_context = "\n".join(sql_parts)

        has_any = bool(processed["items"] or sql_parts)
        if not has_any:
            full = f"📊 **BÁO CÁO {period_label.upper()}** ({date_str})\n\n*Không có dữ liệu.*"
            if errors:
                full += f"\n\n⚠️ Lỗi: {', '.join(e[:60] for e in errors)}"
            return AgentResult(success=True, agent_type=self.name, response=full)

        # Step 3: Generate 6 focused sections
        sections = []

        # Section 1: Overview
        overview = await self._gen_section(
            "TỔNG QUAN",
            f"Viết 5-7 dòng tổng quan {period_label} ({date_str}). PHÂN TÍCH SÂU.\n\n{table}\n\n{sql_context}\n\nYêu cầu: Tóm tắt tổng thể, nêu bật nhất/tệ nhất, so sánh tương quan giữa các chỉ số, kết luận. CHỈ dùng số liệu từ dữ liệu trên.",
            client,
        )
        sections.append(f"## 1. 📊 TỔNG QUAN\n\n{overview}")

        # Section 2: Điểm mạnh
        if good_items:
            strong_table = _build_table(good_items)
            strong = await self._gen_section(
                "ĐIỂM MẠNH",
                f"Phân tích các chỉ số đạt 🟢 Tốt:\n{strong_table}\n\nYêu cầu: Mỗi chỉ số phân tích chi tiết 2-3 câu: vì sao tốt, ý nghĩa, tác động. Viết sâu, có số liệu cụ thể.",
                client,
            )
            sections.append(f"## 2. 💪 ĐIỂM MẠNH\n\n{strong}\n")
            sec_num = 3
        else:
            sec_num = 2

        # Section 3 (or 2): Điểm yếu
        if bad_items:
            weak_table = _build_table(bad_items)
            weak = await self._gen_section(
                "ĐIỂM YẾU",
                f"Phân tích các chỉ số đạt 🔴🟡:\n{weak_table}\n\nYêu cầu: Mỗi chỉ số phân tích chi tiết 2-3 câu: nguyên nhân, tác động, gợi ý cải thiện. Có số liệu cụ thể.",
                client,
            )
            sections.append(f"## {sec_num}. ⚠️ ĐIỂM YẾU\n\n{weak}\n")
            sec_num += 1

        # Section: Chi tiết chủ đề (nếu có dữ liệu phức tạp)
        if sql_parts and (processed.get("students") or processed.get("teachers") or processed.get("test_types", {}).get("total_tests", 0)):
            detail = await self._gen_section(
            "PHÂN TÍCH CHI TIẾT",
            f"Dữ liệu:\n{sql_context}\n\nYêu cầu: Phân tích sâu 7-10 dòng. So sánh, xếp hạng, chỉ ra bất thường. Phân tích từng nhóm: giảng viên, sinh viên, đề thi, lớp.",
            client,)
            sections.append(f"## {sec_num}. 📈 PHÂN TÍCH CHI TIẾT\n\n{detail}\n")
            sec_num += 1

        # Section: Xu hướng & So sánh
        trend = await self._gen_section(
            "XU HƯỚNG & SO SÁNH",
            f"Dựa trên bảng số liệu:\n{table}\n\nYêu cầu: Phân tích xu hướng 5-7 dòng. So sánh tương quan giữa các chỉ số. Ví dụ: attempts cao nhưng band thấp → chất lượng đề hay năng lực SV? submissions thấp nhưng tests cao → SV không nộp bài?",
            client,
        )
        sections.append(f"## {sec_num}. 📈 XU HƯỚNG & SO SÁNH\n\n{trend}\n")
        sec_num += 1

        # Insight + Recommendations
        insight = await self._gen_section(
            "INSIGHT",
            f"Từ dữ liệu:\n{table}\n{sql_context}\n\nNêu 4-5 phát hiện quan trọng. Mỗi insight 2-3 câu, có số liệu, phân tích nguyên nhân. VD: 'Điểm band TB 1.09 thấp hơn mục tiêu 3.0, nguyên nhân do SV ít luyện writing/speaking'.",
            client,
        )
        sections.append(f"## {sec_num}. 💡 INSIGHT\n\n{insight}\n")
        sec_num += 1

        recs = await self._gen_section(
            "ĐỀ XUẤT",
            f"Dựa trên:\n{table}\n{sql_context}\n\nĐưa ra 4-5 đề xuất cải thiện. Mỗi đề xuất: vấn đề → nguyên nhân → giải pháp. Có số liệu cụ thể, khả thi, phân tích sâu.",
            client,
        )
        sections.append(f"## {sec_num}. 🎯 ĐỀ XUẤT\n\n{recs}")

        report = "\n\n".join(sections)
        error_note = f"\n\n⚠️ Lỗi: {', '.join(e[:60] for e in errors)}" if errors else ""
        full = f"📊 **BÁO CÁO {period_label.upper()}** ({date_str})\n\n{report}{error_note}"

        # Save
        try:
            import os
            os.makedirs("reports", exist_ok=True)
            fname = f"report_{period}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            with open(os.path.join("reports", fname), "w", encoding="utf-8") as f:
                f.write(full)
        except Exception as e:
            logger.warning(f"Save report failed: {e}")

        # Chart groups
        chart_groups = []
        overview_bars = [{"label": it["key"], "value": float(it["value"] or 0), "max": float(it["max"])}
                        for it in processed["items"] if it["value"] is not None]
        if overview_bars:
            chart_groups.append({"type": "bar", "title": "📊 Chỉ số chính", "suggest": "overview", "data": overview_bars})

        period_stats = stats.get("get_period_stats", {})
        comp_val = period_stats.get("completion_rate")
        if comp_val is not None:
            chart_groups.append({"type": "donut", "title": "🎯 Tỉ lệ hoàn thành", "suggest": "overview",
                                 "data": [{"label": "Hoàn thành", "value": float(comp_val)},
                                          {"label": "Chưa hoàn thành", "value": 100 - float(comp_val)}]})

        for key, title, suggest, val_key, max_fn in [
            ("students", "👤 Điểm sinh viên", "student", "avg_band", lambda: 9),
            ("classes_data", "🏫 Điểm TB theo lớp", "class", "avg_band", lambda: 9),
            ("teachers", "👨‍🏫 Năng suất GV", "teacher", "total_tests_created", 200),
            ("exams", "📝 Điểm TB kỳ thi", "exam", "avg_band", lambda: 9),
        ]:
            items = processed.get(key, [])
            if items:
                max_v = max_fn() if callable(max_fn) else max_fn
                chart_groups.append({
                    "type": "bar", "title": title, "suggest": suggest,
                    "data": [{"label": str(it.get("full_name") or it.get("name") or it.get("title", ""))[:15],
                              "value": float(it.get(val_key) or 0), "max": float(max_v)}
                             for it in items[:8]]
                })

        test_types = processed.get("test_types", {})
        if test_types.get("total_tests", 0):
            skill_data = [{"label": k, "value": float(v), "max": float(max(test_types.get("by_skill", {}).values()) or 1)}
                         for k, v in test_types.get("by_skill", {}).items() if v]
            if skill_data:
                chart_groups.append({"type": "bar", "title": "📋 Đề thi theo kỹ năng", "suggest": "exam", "data": skill_data})
            chart_groups.append({"type": "bar", "title": "📋 Full vs Single", "suggest": "exam",
                                 "data": [{"label": "Full test", "value": float(test_types.get("full_tests", 0)),
                                           "max": float(test_types.get("total_tests", 1))},
                                          {"label": "Single skill", "value": float(test_types.get("single_skill_tests", 0)),
                                           "max": float(test_types.get("total_tests", 1))}]})

        if period_stats.get("total_exam_attempts"):
            chart_groups.append({"type": "bar", "title": "📈 Lượt thi trong kỳ", "suggest": "trend",
                                 "data": [{"label": "Attempts", "value": float(period_stats.get("total_exam_attempts")), "max": 200}]})

        speaking_chart = processed.get("speaking", {})
        if speaking_chart and any(v and v not in ("Chưa có dữ liệu", "?") for v in speaking_chart.values()):
            radar_data = []
            for label, key in [("Fluency", "fc"), ("Lexical", "lr"), ("Grammar", "gra"), ("Pronunciation", "p")]:
                v = speaking_chart.get(key)
                if v and v != "Chưa có dữ liệu":
                    try:
                        radar_data.append({"label": label, "value": float(v), "max": 9})
                    except (ValueError, TypeError):
                        pass
            if radar_data:
                chart_groups.append({"type": "radar", "title": "🎤 Kỹ năng Speaking", "suggest": "speaking", "data": radar_data})

        return AgentResult(success=True, agent_type=self.name, response=full, data={"chart_groups": chart_groups})

    async def _gen_section(self, label: str, instruction: str, client) -> str:
        for attempt in range(2):
            try:
                result = await client.create_completion(
                    messages=[{
                        "role": "system",
                        "content": f"Bạn là chuyên gia phân tích dữ liệu giáo dục. Viết section '{label}' của báo cáo.\nLuật: CHỈ dùng số liệu được cung cấp. KHÔNG tự bịa. Viết tiếng Việt ngắn gọn, chuyên nghiệp. KHÔNG có thẻ think."
                    }, {
                        "role": "user",
                        "content": instruction if attempt == 0 else instruction + "\n\n⚠️ Lần trước chưa có số liệu cụ thể. PHẢI dùng số liệu từ bảng!"
                    }],
                    max_tokens=1024,
                )
                text = (result.content or "").strip()
                # Strip <think> blocks
                text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
                text = re.sub(r'</?think>', '', text).strip()
                if _has_numbers(text) or attempt == 1:
                    return text
            except Exception as e:
                logger.warning(f"_gen_section '{label}' failed: {e}")
                if attempt == 1:
                    return f"*Không thể tạo nội dung.*"
        return "*Không thể tạo nội dung.*"
