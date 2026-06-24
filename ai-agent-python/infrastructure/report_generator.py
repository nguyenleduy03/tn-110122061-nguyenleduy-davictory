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
}

PERIOD_LABELS = {"week": "tuần", "month": "tháng", "quarter": "quý", "year": "năm"}

SYSTEM_PROMPT = (
    "Bạn là chuyên gia phân tích dữ liệu giáo dục tại trung tâm Anh ngữ DAVictory. "
    "Viết báo cáo bằng tiếng Việt, chuyên nghiệp. "
    "CHỈ dùng số liệu được cung cấp. KHÔNG tự bịa số. "
    "Dùng markdown cơ bản (**, bảng, bullet). "
    "KHÔNG dùng emoji, KHÔNG có thẻ think, KHÔNG có HTML."
)


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

        all_data = await self._collect_all_data(template["sections"], period)

        result = dict(template)
        result["generated_at"] = datetime.now().isoformat()
        result["period_label"] = period_label
        result["period_label_upper"] = period_label.upper()
        result["date_range"] = date_range
        result["sections"] = []

        for section in template["sections"]:
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
        return data

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
