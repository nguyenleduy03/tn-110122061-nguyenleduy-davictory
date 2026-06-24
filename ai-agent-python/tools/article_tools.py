import json
import re
from datetime import datetime

from core.tool_base import BaseTool, ToolParameter
from infrastructure.llm_client import get_groq_client

# ─── Topic detection ─────────────────────────────────────────────
_IELTS_KEYWORDS = [
    "ielts", "writing task", "band score", "general training",
    "thi ielts", "luyện thi ielts",
    "task 1", "task 2", "speaking part",
    "ielts writing", "ielts speaking", "ielts listening", "ielts reading",
]


def _detect_topic_type(topic: str) -> str:
    t = topic.lower()
    for kw in _IELTS_KEYWORDS:
        if kw in t:
            return "ielts"
    return "general"


# ─── IELTS outline prompt ────────────────────────────────────────
OUTLINE_PROMPT_IELTS = """Bạn là chuyên gia SEO content và IELTS. Tạo dàn bài chi tiết cho bài viết về: "{topic}"

Dữ liệu tham khảo:
{source_text}

Gợi ý người dùng: {prompt_hint}

YÊU CẦU:
- 5-7 sections với tiêu đề H2
- Mỗi section có 3-5 key_points chi tiết
- Section đầu là "Mở đầu" (introduction), section cuối là "Kết luận"
- Nếu có thông số/số liệu so sánh, đặt has_specs=true để tạo bảng
- Gợi ý image_alt cho mỗi section (tối ưu SEO hình ảnh)
- Citation IDs từ dữ liệu tham khảo
- Meta description dưới 155 ký tự, hấp dẫn click
- 5-8 SEO keywords (từ khóa chính + từ khóa phụ + long-tail)
- Target: 1200-2000 từ
- Có ví dụ cụ thể cho người học IELTS (sample, tips, số liệu)
- **Ưu tiên thông tin mới nhất, trích dẫn năm tháng cụ thể từ dữ liệu tham khảo**
- **Chỉ dùng thông tin có trong dữ liệu tham khảo, KHÔNG tự bịa thông tin, sự kiện hay số liệu**
- **Nếu dữ liệu tham khảo có sự kiện mới (2025-2026), ưu tiên đưa lên đầu**
- **Đề cập xu hướng, thay đổi mới nhất trong kỳ thi IELTS dựa trên dữ liệu search**

QUAN TRỌNG: Chỉ trả về JSON, không kèm giải thích hay markdown.

Trả về JSON:
{{
  "title": "Tiêu đề hấp dẫn (có thể có số hoặc câu hỏi)",
  "meta_description": "Mô tả SEO dưới 155 ký tự, chứa từ khóa chính",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"],
  "sections": [
    {{
      "heading": "Tiêu đề section H2",
      "key_points": ["point1 chi tiết", "point2 chi tiết", "point3 chi tiết"],
      "citation_ids": [1, 2],
      "image_alt": "mô tả ảnh tối ưu SEO",
      "has_specs": false
    }}
  ]
}}"""

# ─── General outline prompt (no IELTS bias) ──────────────────────
OUTLINE_PROMPT_GENERAL = """Bạn là chuyên gia SEO content. Tạo dàn bài chi tiết cho bài viết về: "{topic}"

Dữ liệu tham khảo:
{source_text}

Gợi ý người dùng: {prompt_hint}

YÊU CẦU:
- 4-6 sections với tiêu đề H2
- Mỗi section có 3-5 key_points chi tiết
- Section đầu là "Mở đầu" (introduction), section cuối là "Kết luận"
- Nếu có thông số/số liệu so sánh, đặt has_specs=true để tạo bảng
- Gợi ý image_alt cho mỗi section (tối ưu SEO hình ảnh)
- Citation IDs từ dữ liệu tham khảo
- Meta description dưới 155 ký tự, hấp dẫn click
- 4-7 SEO keywords (từ khóa chính + từ khóa phụ + long-tail)
- Target: 800-1500 từ
- **Ưu tiên thông tin mới nhất, trích dẫn năm tháng cụ thể từ dữ liệu tham khảo**
- **Chỉ dùng thông tin có trong dữ liệu tham khảo, KHÔNG tự bịa thông tin, sự kiện hay số liệu**
- **Nếu dữ liệu tham khảo có sự kiện mới (2025-2026), ưu tiên đưa lên đầu**
- **Đề cập xu hướng hiện tại dựa trên dữ liệu search**

QUAN TRỌNG: Chỉ trả về JSON, không kèm giải thích hay markdown.

Trả về JSON:
{{
  "title": "Tiêu đề hấp dẫn (có thể có số hoặc câu hỏi)",
  "meta_description": "Mô tả SEO dưới 155 ký tự, chứa từ khóa chính",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"],
  "sections": [
    {{
      "heading": "Tiêu đề section H2",
      "key_points": ["point1 chi tiết", "point2 chi tiết", "point3 chi tiết"],
      "citation_ids": [1, 2],
      "image_alt": "mô tả ảnh tối ưu SEO",
      "has_specs": false
    }}
  ]
}}"""

SIMPLIFIED_OUTLINE_PROMPT = """Trả về JSON thuần túy (không markdown, không giải thích) cho dàn bài:
{{"title": "...", "meta_description": "...", "seo_keywords": [...], "sections": [{{"heading": "...", "key_points": [...], "citation_ids": [...], "has_specs": false, "image_alt": "..."}}]}}

Chủ đề: {topic}"""

# ─── IELTS section prompt ────────────────────────────────────────
SECTION_PROMPT_IELTS = """Viết nội dung HTML cho section "{heading}" của bài viết "{title}".

Các ý chính: {key_points}

Citations: {citations}

QUY TẮC:
- Dùng <h2> cho tiêu đề section
- Dùng <p> cho đoạn văn, <ul>/<li> cho danh sách
- Chèn <blockquote> cho trích dẫn quan trọng
- Dùng <strong> cho từ khóa chính, <em> cho nhấn mạnh
- Chỗ nào cần ảnh, đặt IMAGE_PLACEHOLDER với alt="..."
{table_instruction}- Mỗi section dài 300-500 từ
- Viết bằng tiếng Việt, giọng văn tự nhiên, chuyên nghiệp
- Có ví dụ cụ thể cho người học IELTS (sample, tips, số liệu)
- Kết thúc section bằng câu chuyển tiếp sang phần sau
- Nếu có số liệu, dùng <table> hoặc danh sách có đánh số
- **Chỉ dùng thông tin từ citations, KHÔNG tự bịa số liệu hay sự kiện**
- **Ưu tiên thông tin mới nhất, đề cập năm tháng nếu có**

CHỈ trả về HTML hợp lệ, không kèm giải thích."""

# ─── General section prompt (no IELTS bias) ──────────────────────
SECTION_PROMPT_GENERAL = """Viết nội dung HTML cho section "{heading}" của bài viết "{title}".

Các ý chính: {key_points}

Citations: {citations}

QUY TẮC:
- Dùng <h2> cho tiêu đề section
- Dùng <p> cho đoạn văn, <ul>/<li> cho danh sách
- Chèn <blockquote> cho trích dẫn quan trọng
- Dùng <strong> cho từ khóa chính, <em> cho nhấn mạnh
- Chỗ nào cần ảnh, đặt IMAGE_PLACEHOLDER với alt="..."
{table_instruction}- Mỗi section dài 200-400 từ
- Viết bằng tiếng Việt, giọng văn tự nhiên, chuyên nghiệp, dễ hiểu
- Kết thúc section bằng câu chuyển tiếp sang phần sau
- **Chỉ dùng thông tin từ citations, KHÔNG tự bịa số liệu hay sự kiện**
- **Ưu tiên thông tin mới nhất, đề cập năm tháng nếu có**
- Nếu có số liệu, dùng <table> hoặc danh sách có đánh số

CHỈ trả về HTML hợp lệ, không kèm giải thích."""


def _extract_json(text: str) -> str:
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    text = re.sub(r'<Thought>.*?</Thought>', '', text, flags=re.DOTALL)
    text = re.sub(r'</?think>', '', text)
    text = re.sub(r'</?Thought>', '', text)
    if "```" in text:
        m = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if m:
            text = m.group(1).strip()
        else:
            text = text.replace("```json", "").replace("```", "").strip()
    brace_start = text.find('{')
    if brace_start >= 0:
        brace_end = text.rfind('}')
        if brace_end > brace_start:
            text = text[brace_start:brace_end + 1]
    return text.strip()


class GenerateOutline(BaseTool):
    name = "generate_outline"
    description = "Tạo dàn bài SEO từ dữ liệu nghiên cứu"
    parameters = [
        ToolParameter("research_data", "string", "JSON string chứa dữ liệu nghiên cứu (topic, sources)"),
        ToolParameter("prompt_hint", "string", "Gợi ý bổ sung từ người dùng", required=False),
        ToolParameter("topic", "string", "Chủ đề gốc (dùng làm fallback khi research_data bị lỗi)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        research_data = params.get("research_data", "{}")
        fallback_topic = params.get("topic", "") or "Bài viết"
        original_raw = research_data
        if isinstance(research_data, str):
            try:
                research_data = json.loads(research_data)
            except json.JSONDecodeError:
                # Try to extract topic from raw JSON string
                m = re.search(r'"topic"\s*:\s*"([^"]+)"', original_raw)
                research_data = {"topic": m.group(1) if m else fallback_topic, "sources": []}

        topic = research_data.get("topic", fallback_topic)
        sources = research_data.get("sources", [])
        source_text = "\n".join(f"- {s.get('title','')}: {s.get('content','')[:500]}" for s in sources[:5])
        prompt_hint = params.get("prompt_hint", "").strip()
        topic_type = _detect_topic_type(topic)

        outline_prompt = OUTLINE_PROMPT_IELTS if topic_type == "ielts" else OUTLINE_PROMPT_GENERAL
        fallback_keywords = ["ielts", topic] if topic_type == "ielts" else [topic]

        client = get_groq_client()
        last_error = None

        for attempt in range(3):
            try:
                if attempt == 0:
                    prompt = outline_prompt.format(topic=topic, source_text=source_text, prompt_hint=prompt_hint)
                else:
                    prompt = SIMPLIFIED_OUTLINE_PROMPT.format(topic=topic)

                result = await client.create_completion(
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                )
                content = result.content or ""
                content = _extract_json(content)
                parsed = json.loads(content)
                if parsed.get("sections"):
                    return parsed
                last_error = "No sections in response"
            except (json.JSONDecodeError, Exception) as e:
                last_error = str(e)
                continue

        return {"title": topic, "meta_description": f"Bài viết về {topic}", "seo_keywords": fallback_keywords, "sections": [{"heading": "Mở đầu", "key_points": [f"Giới thiệu về {topic}"], "citation_ids": [], "image_alt": topic, "has_specs": False}, {"heading": f"Tầm quan trọng của {topic}", "key_points": [f"Tại sao {topic} quan trọng"], "citation_ids": [], "image_alt": topic, "has_specs": False}, {"heading": "Kết luận", "key_points": ["Tổng kết và lời khuyên"], "citation_ids": [], "image_alt": topic, "has_specs": False}]}


class WriteSection(BaseTool):
    name = "write_section"
    description = "Viết nội dung HTML cho một section của bài viết"
    parameters = [
        ToolParameter("title", "string", "Tiêu đề bài viết"),
        ToolParameter("heading", "string", "Tiêu đề section"),
        ToolParameter("key_points", "string", "Các ý chính, phân cách bằng |"),
        ToolParameter("citations", "string", "Citations từ research", required=False),
        ToolParameter("has_specs", "string", "true/false: có bảng thông số kỹ thuật không", required=False),
        ToolParameter("topic_type", "string", "ielts hoặc general", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> str:
        has_specs = params.get("has_specs", "").lower() == "true"
        table_instruction = ""
        if has_specs:
            table_instruction = """- Tạo <table> với <thead> và <tbody> để so sánh dữ liệu
- Dùng <th> cho tiêu đề cột, <td> cho dữ liệu
- Thêm class="table table-bordered" vào <table>
"""

        topic_type = params.get("topic_type", "") or _detect_topic_type(params.get("title", ""))
        section_prompt = SECTION_PROMPT_IELTS if topic_type == "ielts" else SECTION_PROMPT_GENERAL
        prompt = section_prompt.format(
            title=params['title'],
            heading=params['heading'],
            key_points=params['key_points'],
            citations=params.get('citations', ''),
            table_instruction=table_instruction,
        )

        client = get_groq_client()
        result = await client.create_completion(
            messages=[{"role": "user", "content": prompt}],
        )
        html = result.content or ""
        html = re.sub(r'<think>.*?</think>', '', html, flags=re.DOTALL)
        html = re.sub(r'<Thought>.*?</Thought>', '', html, flags=re.DOTALL)
        return html.strip()


class ValidateArticle(BaseTool):
    name = "validate_article"
    description = "Kiểm tra chất lượng bài viết (số từ, số H2, số ảnh, citations, SEO keywords)"
    parameters = [
        ToolParameter("content_html", "string", "Nội dung HTML của bài viết"),
        ToolParameter("citations_json", "string", "JSON citations", required=False),
        ToolParameter("seo_keywords_json", "string", "JSON array SEO keywords", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        html = params.get("content_html", "")
        citations_str = params.get("citations_json", "[]")
        seo_str = params.get("seo_keywords_json", "[]")
        try:
            citations = json.loads(citations_str) if isinstance(citations_str, str) else citations_str
        except json.JSONDecodeError:
            citations = []
        try:
            seo_keywords = json.loads(seo_str) if isinstance(seo_str, str) else seo_str
        except json.JSONDecodeError:
            seo_keywords = []

        word_count = len(html.split())
        h2_count = len(re.findall(r'<h2[^>]*>', html))
        h3_count = len(re.findall(r'<h3[^>]*>', html))
        img_count = len(re.findall(r'<img[^>]*>', html))
        img_src_count = len(re.findall(r'<img[^>]*src=[\'"]', html))
        blockquote_count = len(re.findall(r'<blockquote[^>]*>', html))
        list_count = len(re.findall(r'<(ul|ol)[^>]*>', html))
        issues = []

        if word_count < 1000:
            issues.append(f"Ít từ: {word_count}/1000")
        if h2_count < 4:
            issues.append(f"Ít H2: {h2_count}/4")
        if img_src_count < 3:
            issues.append(f"Ít ảnh: {img_src_count}/3")
        if len(citations) < 3:
            issues.append(f"Ít citations: {len(citations)}/3")
        if blockquote_count < 1:
            issues.append(f"Thiếu blockquote: {blockquote_count}/1")
        if list_count < 1:
            issues.append(f"Thiếu danh sách (ul/ol): {list_count}/1")

        kw_in_content = 0
        if seo_keywords:
            html_lower = html.lower()
            for kw in seo_keywords:
                if kw.lower() in html_lower:
                    kw_in_content += 1
            if kw_in_content < len(seo_keywords) * 0.5:
                issues.append(f"SEO keywords: chỉ {kw_in_content}/{len(seo_keywords)} xuất hiện trong bài")

        score = 100
        score -= max(0, (1000 - word_count) // 10)
        score -= max(0, (4 - h2_count) * 10)
        score -= max(0, (3 - img_src_count) * 10)
        score = max(0, score)

        return {
            "word_count": word_count,
            "h2_count": h2_count,
            "h3_count": h3_count,
            "img_count": img_src_count,
            "blockquote_count": blockquote_count,
            "list_count": list_count,
            "citations_count": len(citations),
            "seo_keywords_count": len(seo_keywords),
            "seo_keywords_in_content": kw_in_content,
            "issues": issues,
            "score": score,
            "passed": score >= 60,
        }


class CreateStructuredArticle(BaseTool):
    name = "create_structured_article"
    description = "Lưu bài viết hoàn chỉnh vào database với đầy đủ metadata"
    parameters = [
        ToolParameter("title", "string", "Tiêu đề"),
        ToolParameter("content_html", "string", "Nội dung HTML"),
        ToolParameter("summary", "string", "Tóm tắt"),
        ToolParameter("meta_description", "string", "Mô tả SEO", required=False),
        ToolParameter("seo_keywords_json", "string", "JSON array SEO keywords", required=False),
        ToolParameter("citations_json", "string", "JSON array citations", required=False),
        ToolParameter("tags", "string", "Tags", required=False),
        ToolParameter("image", "string", "URL ảnh đại diện", required=False),
        ToolParameter("author_name", "string", "Tên tác giả", required=False),
        ToolParameter("images_json", "string", "JSON array ảnh đã dùng (url, alt, photographer)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        from tools.tools_library import _run_sql, _execute_sql

        title = params.get("title", "")
        content = params.get("content_html", "")
        summary = params.get("summary", "")[:500]
        meta_desc = (params.get("meta_description") or params.get("summary", ""))[:300]
        tags = params.get("tags", "ielts")
        image = params.get("image", "")
        author = params.get("author_name", "AI Agent")

        slug = title.lower().replace(" ", "-").replace("--", "-")[:200]
        slug = re.sub(r'[^a-z0-9-]', '', slug.strip('-'))

        reading_time = max(1, round(len(content.split()) / 200))

        existing = await _run_sql("SELECT id FROM blog_posts WHERE slug = :slug", {"slug": slug})
        if existing:
            slug = f"{slug}-{int(datetime.now().timestamp())}"

        await _execute_sql(
            "INSERT INTO blog_posts (title, slug, content, excerpt, thumbnail, tags, meta_description, status, reading_time, source, created_at, updated_at) "
            "VALUES (:title, :slug, :content, :excerpt, :thumbnail, :tags, :meta, 'draft', :rt, 'agent', NOW(), NOW())",
            {
                "title": title,
                "slug": slug,
                "content": content,
                "excerpt": summary or title[:100],
                "thumbnail": image or "",
                "tags": tags[:500],
                "meta": meta_desc,
                "rt": reading_time,
            },
        )

        found = await _run_sql("SELECT id FROM blog_posts WHERE slug = :slug ORDER BY id DESC LIMIT 1", {"slug": slug})
        article_id = found[0]["id"] if found else 0

        result = {
            "id": article_id,
            "title": title,
            "slug": slug,
            "status": "draft",
            "reading_time": reading_time,
            "tags": tags,
            "word_count": len(content.split()),
        }
        if params.get("images_json"):
            try:
                result["images_used"] = json.loads(params["images_json"])
            except json.JSONDecodeError:
                pass
        if params.get("citations_json"):
            try:
                result["citations"] = json.loads(params["citations_json"])
            except json.JSONDecodeError:
                pass
        return result
