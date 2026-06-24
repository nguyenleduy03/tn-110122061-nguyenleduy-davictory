import asyncio
import json
import re
import uuid
from datetime import datetime, timezone

from loguru import logger

_wizard_tasks: dict[str, "BlogWizardTask"] = {}


class BlogWizardTask:
    def __init__(self, topic: str):
        self.task_id = uuid.uuid4().hex[:12]
        self.topic = topic
        self.status = "researching"
        self.step_index = 0
        self.total_steps = 7
        self.error = None

        self.outline = None
        self.content_html = None
        self.images_data = []
        self.citation_map = {}
        self.seo_keywords = []
        self.article_id = None
        self.slug = None

        self._plan = None

    def to_dict(self):
        d = {
            "task_id": self.task_id,
            "topic": self.topic,
            "status": self.status,
            "step_index": self.step_index,
            "total_steps": self.total_steps,
        }
        if self.status == "outline_ready" and self.outline:
            d["outline"] = self.outline
        if self.status in ("content_ready", "done") and self.content_html:
            d["content_html"] = self.content_html
            d["images"] = self.images_data
            d["statistics"] = {
                "word_count": len(self.content_html.split()),
                "img_count": len(self.images_data),
                "seo_keywords": self.seo_keywords[:5],
            }
        if self.status == "done":
            d["article_id"] = self.article_id
            d["slug"] = self.slug
        if self.error:
            d["error"] = self.error
        return d

    async def run_stage_1(self):
        """Research + generate outline, pause for user review."""
        from agents.content_agent import ContentAgent
        agent = ContentAgent()
        user_context = {"user_id": 0, "session_id": 0}

        try:
            # Step 1: Research
            self.step_index = 1
            research = await agent.run_tool("research_topic", {"topic": self.topic}, user_context)
            self.research_source_images = research.get("all_source_images", [])
            logger.info(f"[wizard {self.task_id}] Research done: {research.get('total_sources', 0)} sources")

            # Step 2: Generate outline
            self.step_index = 2
            outline = await agent.run_tool("generate_outline", {
                "research_data": json.dumps(research, ensure_ascii=False)[:50000],
                "topic": self.topic,
            }, user_context)
            logger.info(f"[wizard {self.task_id}] Outline generated: {outline.get('title', '')}")

            sections = outline.get("sections", [])
            if not sections:
                self.status = "error"
                self.error = "Outline không có sections"
                return

            self.outline = {
                "title": outline.get("title", self.topic[:80]),
                "meta_description": outline.get("meta_description", ""),
                "seo_keywords": outline.get("seo_keywords", []),
                "sections": [
                    {
                        "heading": s.get("heading", ""),
                        "key_points": s.get("key_points", []),
                        "image_alt": s.get("image_alt", ""),
                    }
                    for s in sections
                ],
            }

            self.status = "outline_ready"
            self.step_index = 3
            logger.info(f"[wizard {self.task_id}] Outline ready, waiting for user review")

        except Exception as e:
            self.status = "error"
            self.error = f"Stage 1 failed: {str(e)}"
            logger.error(f"[wizard {self.task_id}] Stage 1 error: {e}")

    async def regenerate_outline(self, feedback: str | None = None):
        """Cải thiện outline dựa trên feedback của người dùng."""
        from agents.content_agent import ContentAgent
        agent = ContentAgent()
        user_context = {"user_id": 0, "session_id": 0}

        self.status = "researching"
        self.step_index = 2
        self.error = None

        try:
            research = await agent.run_tool("research_topic", {"topic": self.topic}, user_context)
            self.research_source_images = research.get("all_source_images", [])

            prompt = f"Chủ đề: {self.topic}\n"
            if feedback:
                prompt += f"Phản hồi: {feedback}\n"
            prompt += "Hãy tạo dàn bài chi tiết."

            outline = await agent.run_tool("generate_outline", {
                "research_data": json.dumps(research, ensure_ascii=False)[:50000],
                "prompt_hint": prompt,
                "topic": self.topic,
            }, user_context)

            sections = outline.get("sections", [])
            if not sections:
                self.status = "error"
                self.error = "Outline không có sections"
                return

            self.outline = {
                "title": outline.get("title", self.topic[:80]),
                "meta_description": outline.get("meta_description", ""),
                "seo_keywords": outline.get("seo_keywords", []),
                "sections": [
                    {
                        "heading": s.get("heading", ""),
                        "key_points": s.get("key_points", []),
                        "image_alt": s.get("image_alt", ""),
                    }
                    for s in sections
                ],
            }

            self.status = "outline_ready"
            self.step_index = 3
            logger.info(f"[wizard {self.task_id}] Outline regenerated with feedback")

        except Exception as e:
            self.status = "outline_ready"
            self.error = f"Cải thiện outline thất bại: {str(e)}"
            logger.error(f"[wizard {self.task_id}] regenerate_outline error: {e}")

    async def run_stage_2(self):
        """Collect images + write content, pause for user review."""
        from agents.content_agent import ContentAgent
        agent = ContentAgent()
        user_context = {"user_id": 0, "session_id": 0}

        if not self.outline:
            self.status = "error"
            self.error = "Missing outline data"
            return

        sections = self.outline.get("sections", [])
        seo_keywords = self.outline.get("seo_keywords", [])
        title = self.outline.get("title", self.topic[:80])

        try:
            # Step 3: Collect images
            self.step_index = 3
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
            source_images_json = json.dumps(getattr(self, 'research_source_images', []))

            # Đợt 1: ảnh từ nguồn báo (1 lần duy nhất)
            try:
                imgs = await agent.run_tool("collect_article_images", {
                    "topic": list(keyword_set)[0] if keyword_set else "",
                    "count": needed,
                    "source_images": source_images_json,
                }, user_context)
                if isinstance(imgs, list):
                    images_data.extend(imgs)
            except Exception as e:
                logger.warning(f"[wizard] Source image collection failed: {e}")

            # Đợt 2: Unsplash bổ sung nếu thiếu
            if len(images_data) < needed:
                existing_orig = {x.get("original_url", "") for x in images_data if x.get("original_url")}
                for kw in list(keyword_set)[:4]:
                    try:
                        imgs = await agent.run_tool("collect_article_images", {
                            "topic": kw, "count": needed - len(images_data),
                        }, user_context)
                        if isinstance(imgs, list):
                            for img in imgs:
                                orig = img.get("original_url", "")
                                if orig and orig in existing_orig:
                                    continue
                                if orig:
                                    existing_orig.add(orig)
                                images_data.append(img)
                    except Exception as e:
                        logger.warning(f"[wizard] Image collection failed for '{kw}': {e}")
                    if len(images_data) >= needed:
                        break
            self.images_data = images_data
            logger.info(f"[wizard {self.task_id}] Images collected: {len(images_data)}")

            # Step 4: Validate images with vision model
            self.step_index = 4
            section_headings = " | ".join(s.get("heading", "") for s in sections if s.get("heading"))
            valid_images = []
            for img in images_data:
                img_url = img.get("url", "")
                if not img_url:
                    continue
                try:
                    vresult = await agent.run_tool("validate_image_relevance", {
                        "image_url": img_url,
                        "topic": title,
                        "context": section_headings,
                    }, user_context)
                    if vresult.get("matched", True):
                        valid_images.append(img)
                except Exception:
                    valid_images.append(img)
            if len(valid_images) >= 2:
                self.images_data = valid_images
            logger.info(f"[wizard {self.task_id}] Vision validation: {len(valid_images)}/{len(images_data)}")

            # Step 5: Write sections
            self.step_index = 5
            citation_map = {}
            full_html_parts = []
            image_urls = [img.get("url", "") for img in self.images_data if img.get("url")]
            from tools.article_tools import _detect_topic_type
            topic_type = _detect_topic_type(self.topic)

            for i, section in enumerate(sections):
                heading = section.get("heading", "")
                key_points = section.get("key_points", [])
                try:
                    section_html = await agent.run_tool("write_section", {
                        "title": title,
                        "heading": heading,
                        "key_points": " | ".join(key_points) if key_points else heading,
                        "citations": "",
                        "has_specs": "false",
                        "topic_type": topic_type,
                    }, user_context)
                except Exception as e:
                    section_html = f"<h2>{heading}</h2>\n<p>Lỗi: {str(e)[:100]}</p>"

                if i < len(image_urls):
                    alt_text = section.get("image_alt", heading)
                    img_tag = f'<img src="{image_urls[i]}" alt="{alt_text}" style="max-width:100%;border-radius:8px;margin:16px 0;" />'
                    section_html = section_html.replace("IMAGE_PLACEHOLDER", img_tag, 1)
                section_html = re.sub(r'(?:\[alt="[^"]*"\]|\(alt="[^"]*"\)|alt="\.\.\.")', '', section_html)

                full_html_parts.append(section_html)

            full_html = "\n\n".join(full_html_parts)
            full_html = full_html.replace("IMAGE_PLACEHOLDER", "")
            full_html = re.sub(r'^.*?\b(Biểu đồ|Sơ đồ|Hình ảnh|Biểu tượng|Đồ thị)\b.*?\[alt="[^"]*"\].*$', '', full_html, flags=re.MULTILINE)
            full_html = re.sub(r'^.*?\b(Biểu đồ|Sơ đồ|Hình ảnh|Biểu tượng|Đồ thị)\b.*?alt="[^"]*".*$', '', full_html, flags=re.MULTILINE)
            # append ảnh thừa (không gán cho section nào) ở cuối
            if len(image_urls) > len(sections):
                for img_url in image_urls[len(sections):]:
                    full_html += f'\n<img src="{img_url}" alt="Minh họa" style="max-width:100%;border-radius:8px;margin:16px 0;" />'

            self.content_html = full_html
            self.citation_map = citation_map
            self.seo_keywords = seo_keywords

            self.status = "content_ready"
            self.step_index = 6
            logger.info(f"[wizard {self.task_id}] Content ready, waiting for user review")

        except Exception as e:
            self.status = "error"
            self.error = f"Stage 2 failed: {str(e)}"
            logger.error(f"[wizard {self.task_id}] Stage 2 error: {e}")

    async def run_stage_3(self) -> int | None:
        """Validate + save article to DB."""
        from agents.content_agent import ContentAgent
        agent = ContentAgent()
        user_context = {"user_id": 0, "session_id": 0}

        if not self.content_html or not self.outline:
            self.status = "error"
            self.error = "Missing content or outline"
            return None

        try:
            # Step 6: Validate
            self.step_index = 6
            validation = await agent.run_tool("validate_article", {
                "content_html": self.content_html,
                "citations_json": json.dumps(list(self.citation_map.values())),
                "seo_keywords_json": json.dumps(self.seo_keywords),
            }, user_context)
            logger.info(f"[wizard {self.task_id}] Validation: passed={validation.get('passed')}")

            # Step 7: Save
            self.step_index = 7
            title = self.outline.get("title", self.topic[:80])
            meta_desc = self.outline.get("meta_description", "")
            tags = ", ".join(self.seo_keywords[:5]) if self.seo_keywords else "ielts"
            image = self.images_data[0]["url"] if self.images_data else ""

            save_result = await agent.run_tool("create_structured_article", {
                "title": title,
                "content_html": self.content_html,
                "summary": meta_desc or title[:100],
                "meta_description": meta_desc,
                "seo_keywords_json": json.dumps(self.seo_keywords),
                "citations_json": json.dumps(list(self.citation_map.values())),
                "tags": tags,
                "image": image,
                "author_name": "Content Agent",
                "images_json": json.dumps([
                    {"url": img.get("url", ""), "alt": img.get("alt", ""),
                     "photographer": img.get("photographer", "")}
                    for img in self.images_data
                ]),
            }, user_context)

            self.article_id = save_result.get("id")
            self.slug = save_result.get("slug", "")
            self.status = "done"
            self.step_index = 7
            logger.info(f"[wizard {self.task_id}] Article saved: ID={self.article_id}")
            return self.article_id

        except Exception as e:
            self.status = "error"
            self.error = f"Stage 3 failed: {str(e)}"
            logger.error(f"[wizard {self.task_id}] Stage 3 error: {e}")
            return None


def create_wizard(topic: str) -> BlogWizardTask:
    task = BlogWizardTask(topic)
    _wizard_tasks[task.task_id] = task
    asyncio.create_task(task.run_stage_1())
    return task


def get_wizard(task_id: str) -> BlogWizardTask | None:
    return _wizard_tasks.get(task_id)


def cleanup_wizards():
    now = datetime.now(timezone.utc).timestamp()
    to_delete = []
    for tid, task in _wizard_tasks.items():
        if task.status in ("done", "error") and hasattr(task, "_done_at"):
            if now - task._done_at > 3600:
                to_delete.append(tid)
    for tid in to_delete:
        del _wizard_tasks[tid]
