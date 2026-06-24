import json
import re
import unicodedata

from loguru import logger

from core.llm_agent import BaseLLMAgent, _strip_think
from core.base import AgentResult, PlanStep, AgentPlan
from tools.tools_library import CreateBlogPost, QueryAgentTool
from tools.web_tools import ResearchTopicTool, SearchWebTool, CollectArticleImages, ValidateImageRelevance
from tools.article_tools import GenerateOutline, WriteSection, ValidateArticle, CreateStructuredArticle
from config import get_settings


class ContentAgent(BaseLLMAgent):
    name = "content"
    description = "Viết bài blog IELTS chất lượng cao với research + ảnh minh họa"
    capabilities = ["viết bài", "blog", "nội dung", "content", "seo", "bài viết"]
    system_prompt = """Bạn là Content Agent viết blog IELTS.

Khả năng: {capabilities}

Công cụ: {tools}

QUY TRÌNH (bắt buộc): research → outline → images → write → validate → save

YÊU CẦU:
- Viết tiếng Việt, chuyên nghiệp, có ví dụ cụ thể
- Chuẩn SEO: meta description, keywords, citations [1][2]
- >=1000 từ, >=4 H2, >=3 ảnh
- Dùng query_agent hỏi info agent nếu cần dữ liệu

Trả lời tiếng Việt, thân thiện."""

    def __init__(self):
        super().__init__()
        self.tools = [
            ResearchTopicTool(),
            SearchWebTool(),
            CollectArticleImages(),
            ValidateImageRelevance(),
            GenerateOutline(),
            WriteSection(),
            ValidateArticle(),
            CreateStructuredArticle(),
            CreateBlogPost(),
            QueryAgentTool(),
        ]

    async def think(self, input_text: str, user_context: dict, session_context: dict | None = None) -> AgentPlan:
        return AgentPlan(
            goal=f"Viết bài: {input_text[:80]}",
            steps=[
                PlanStep(1, "research_topic", "Nghiên cứu thông tin từ web", "Tìm kiếm nguồn tin cậy"),
                PlanStep(2, "generate_outline", "Tạo dàn bài chuẩn SEO", "Cấu trúc 4-6 sections"),
                PlanStep(3, "collect_article_images", "Tìm ảnh minh họa", "Tải ảnh về"),
                PlanStep(4, "validate_image_relevance", "Kiểm tra ảnh bằng vision model", "Lọc ảnh không phù hợp"),
                PlanStep(5, "write_section", "Viết nội dung từng section", "Viết với citations"),
                PlanStep(6, "validate_article", "Kiểm tra chất lượng", ">=800 từ, >=3 H2, >=2 ảnh"),
                PlanStep(7, "create_structured_article", "Lưu bài viết vào DB", "Lưu dạng draft"),
            ],
            total_steps=8,
        )

    async def process(self, input_text: str, user_context: dict, session_context: dict | None = None) -> AgentResult:
        text = input_text.lower()
        text = unicodedata.normalize('NFD', text)
        text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
        is_article = bool(re.search(r'(viet|tao|lam|soan) (bai|bai viet|blog|noi dung|content)', text))
        if not is_article:
            try:
                result = await self.run_tool("query_agent", {
                    "agent_name": "info",
                    "question": input_text,
                }, user_context)
                return AgentResult(
                    success=True,
                    agent_type="info",
                    response=result.get("response", str(result)),
                    tool_calls=[{"tool": "query_agent", "arguments": {"agent_name": "info"}, "result_preview": "Chuyển sang InfoAgent"}],
                )
            except Exception as e:
                return AgentResult(
                    success=False, agent_type=self.name,
                    response="", error=f"Không thể chuyển đến InfoAgent: {e}",
                )

        from infrastructure.progress_tracker import set_progress, update_step_status, set_plan
        session_id = user_context.get("session_id", 0)

        plan = await self.think(input_text, user_context, session_context)
        set_plan(session_id, self.name, plan.to_dict())
        tool_log = []

        def track(step: int, total: int, label: str = ""):
            if session_id:
                set_progress(session_id, self.name, plan.steps[step-1].tool if step <= len(plan.steps) else "", step, total, current_label=label)

        def done(step: int, preview: str = ""):
            if session_id:
                update_step_status(session_id, self.name, step, "done", preview)

        # Step 1: Research
        track(1, 8, "Nghiên cứu từ web")
        try:
            research = await self.run_tool("research_topic", {"topic": input_text}, user_context)
        except Exception as e:
            research = {"topic": input_text, "total_sources": 0, "sources": []}
            logger.warning(f"Research failed: {e}")
        tool_log.append({"tool": "research_topic", "result_preview": f"{research.get('total_sources', 0)} nguồn"})
        done(1, f"{research.get('total_sources', 0)} nguồn")

        source_images = research.get("all_source_images", [])
        source_images_json = json.dumps(source_images)

        # Step 2: Outline
        track(2, 8, "Tạo dàn bài SEO")
        try:
            research_json = json.dumps(research, ensure_ascii=False)[:50000]
            outline = await self.run_tool("generate_outline", {
                "research_data": research_json,
                "topic": input_text,
            }, user_context)
        except Exception as e:
            outline = {"title": input_text[:80], "sections": [], "seo_keywords": ["ielts"]}
            logger.warning(f"Outline failed: {e}")
        sections = outline.get("sections", [])
        title = outline.get("title", input_text[:80])
        seo_keywords = outline.get("seo_keywords", [])
        tool_log.append({"tool": "generate_outline", "result_preview": f"Title: {title[:60]}, {len(sections)} sections"})
        done(2, f"{len(sections)} sections")

        if not sections:
            return AgentResult(success=False, agent_type=self.name, response="", error="Outline không có sections", tool_calls=tool_log)

        # Step 3: Images
        track(3, 8, "Tìm ảnh minh họa")
        keyword_set = set()
        for s in sections:
            alt = s.get("image_alt", "").strip()
            if alt and len(alt) > 3:
                keyword_set.add(alt[:50])
            heading = s.get("heading", "").strip()
            if heading and len(heading) > 3:
                keyword_set.add(heading[:50])
        for kw in seo_keywords[:3]:
            keyword_set.add(kw[:50])

        images_data = []
        needed = 4
        # Đợt 1: lấy ảnh từ nguồn báo (chỉ gọi 1 lần với source_images)
        try:
            imgs = await self.run_tool("collect_article_images", {
                "topic": ", ".join(list(keyword_set)[:2]), "count": needed,
                "source_images": source_images_json,
            }, user_context)
            if isinstance(imgs, list):
                images_data.extend(imgs)
        except Exception as e:
            logger.warning(f"Source image collection failed: {e}")

        # Đợt 2: bổ sung bằng Unsplash nếu chưa đủ
        if len(images_data) < needed:
            for kw in list(keyword_set)[:4]:
                try:
                    imgs = await self.run_tool("collect_article_images", {
                        "topic": kw, "count": needed - len(images_data),
                    }, user_context)
                    if isinstance(imgs, list):
                        for img in imgs:
                            if img.get("url") not in [x.get("url") for x in images_data]:
                                images_data.append(img)
                except Exception as e:
                    logger.warning(f"Image collection failed for '{kw}': {e}")
                if len(images_data) >= needed:
                    break

        tool_log.append({"tool": "collect_article_images", "result_preview": f"{len(images_data)} ảnh"})
        done(3, f"{len(images_data)} ảnh")

        # Step 4: Validate images with vision model
        track(4, 8, "Kiểm tra ảnh bằng vision model")
        section_headings = " | ".join(s.get("heading", "") for s in sections if s.get("heading"))
        valid_images = []
        for img in images_data:
            img_url = img.get("url", "")
            if not img_url:
                continue
            try:
                vresult = await self.run_tool("validate_image_relevance", {
                    "image_url": img_url,
                    "topic": title,
                    "context": section_headings,
                }, user_context)
                if vresult.get("matched", True):
                    valid_images.append(img)
                else:
                    logger.info(f"Image rejected by vision: {vresult.get('reason', '')}")
            except Exception as e:
                logger.warning(f"Vision validation failed for image: {e}")
                valid_images.append(img)
        if len(valid_images) >= 2:
            images_data = valid_images
        else:
            logger.warning(f"Only {len(valid_images)} images passed vision validation, keeping originals")
        tool_log.append({"tool": "validate_image_relevance", "result_preview": f"{len(valid_images)}/{len(images_data)} ảnh hợp lệ"})
        done(4, f"{len(valid_images)}/{len(images_data)} ảnh hợp lệ")

        # Step 5: Write sections
        track(5, 8, "Viết nội dung")
        citation_map = {}
        for src in research.get("sources", []):
            cid = src.get("id", 0)
            citation_map[cid] = f"[{cid}] {src.get('title', '')}: {src.get('content', src.get('snippet', ''))[:200]}"

        image_urls = [img.get("url", "") for img in images_data if img.get("url")]
        full_html_parts = []
        from tools.article_tools import _detect_topic_type
        topic_type = _detect_topic_type(input_text)

        for i, section in enumerate(sections):
            heading = section.get("heading", "")
            key_points = section.get("key_points", [])
            citation_ids = section.get("citation_ids", [])
            section_citations = "\n".join(citation_map.get(cid, "") for cid in citation_ids if cid in citation_map)

            try:
                section_html = await self.run_tool("write_section", {
                    "title": title,
                    "heading": heading,
                    "key_points": " | ".join(key_points) if key_points else heading,
                    "citations": section_citations,
                    "has_specs": str(section.get("has_specs", False)).lower(),
                    "topic_type": topic_type,
                }, user_context)
                section_html = _strip_think(section_html)
            except Exception as e:
                section_html = f"<h2>{heading}</h2>\n<p>Lỗi: {str(e)[:100]}</p>"
                logger.warning(f"Write section '{heading}' failed: {e}")

            if i < len(image_urls):
                alt_text = section.get("image_alt", heading)
                img_tag = f'<img src="{image_urls[i]}" alt="{alt_text}" style="max-width:100%;border-radius:8px;margin:16px 0;" />'
                section_html = section_html.replace("IMAGE_PLACEHOLDER", img_tag, 1)
            section_html = re.sub(r'(?:\[alt="[^"]*"\]|\(alt="[^"]*"\)|alt="\.\.\.")', '', section_html)

            full_html_parts.append(section_html)

        full_html = "\n\n".join(full_html_parts)
        full_html = full_html.replace("IMAGE_PLACEHOLDER", "")
        remaining_images = image_urls[len(sections):] if len(image_urls) > len(sections) else []
        for img_url in remaining_images:
            full_html += f'\n<img src="{img_url}" alt="Minh họa" style="max-width:100%;border-radius:8px;margin:16px 0;" />'

        tool_log.append({"tool": "write_section", "result_preview": f"{len(sections)} sections written"})
        done(5, f"{len(sections)} sections")

        # Step 6: Validate
        track(6, 8, "Kiểm tra chất lượng")
        try:
            validation = await self.run_tool("validate_article", {
                "content_html": full_html,
                "citations_json": json.dumps(list(citation_map.values())),
                "seo_keywords_json": json.dumps(seo_keywords),
            }, user_context)
        except Exception as e:
            validation = {"passed": True, "word_count": len(full_html.split()), "h2_count": full_html.count("<h2"), "img_count": full_html.count("<img"), "issues": [], "score": 60}
            logger.warning(f"Validation failed: {e}")
        tool_log.append({"tool": "validate_article", "result_preview": f"Passed: {validation.get('passed', False)}, words: {validation.get('word_count', 0)}"})
        done(6, f"Words: {validation.get('word_count', 0)}")

        # Step 7: Save
        track(7, 8, "Lưu bài viết")
        try:
            save_result = await self.run_tool("create_structured_article", {
                "title": title,
                "content_html": full_html,
                "summary": outline.get("meta_description", title)[:300],
                "meta_description": outline.get("meta_description", ""),
                "seo_keywords_json": json.dumps(seo_keywords),
                "citations_json": json.dumps(list(citation_map.values())),
                "tags": ", ".join(seo_keywords[:5]) if seo_keywords else "ielts",
                "image": images_data[0]["url"] if images_data else "",
                "author_name": "Content Agent",
                "images_json": json.dumps([{"url": img.get("url", ""), "alt": img.get("alt", ""), "photographer": img.get("photographer", "")} for img in images_data]),
            }, user_context)
        except Exception as e:
            save_result = {"slug": "", "id": 0}
            logger.warning(f"Save failed: {e}")
        tool_log.append({"tool": "create_structured_article", "result_preview": f"Title: {title[:40]}"})
        done(7, f"Đã lưu: {title[:40]}")

        slug = save_result.get("slug", "")
        article_id = save_result.get("id", "")
        issues = validation.get("issues", [])
        response_parts = [
            f"\n✅ **Bài viết đã tạo thành công:**\n",
            f"  Tiêu đề: {title}",
            f"  Số sections: {len(sections)}",
            f"  Tổng từ: {validation.get('word_count', 0)}",
            f"  Số ảnh: {validation.get('img_count', 0)}",
            f"  SEO keywords: {len(seo_keywords)}",
        ]
        if issues:
            response_parts.append(f"\n  ⚠️ Cần cải thiện: {'; '.join(issues[:3])}")
        if article_id:
            response_parts.append(f"\n  🔗 ID bài viết: {article_id}")
        if slug:
            response_parts.append(f"\n  Xem tại: /agent/posts")

        return AgentResult(
            success=True,
            agent_type=self.name,
            response="\n".join(response_parts),
            tool_calls=tool_log,
        )

    async def summarize(self, plan: AgentPlan, results: list[dict], input_text: str) -> str:
        parts = ["\n**KẾT QUẢ XỬ LÝ**\n"]
        for r in results:
            tool = r.get("tool", "")
            preview = r.get("result_preview", "")
            parts.append(f"  {tool}: {preview}")
        return "\n".join(parts)
