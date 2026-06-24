import asyncio
import json
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

# DuckDuckGo search — try newer package first, fallback to legacy
_DDGS = None
if not _DDGS:
    try:
        from ddgs import DDGS
        _DDGS = DDGS
    except ImportError:
        try:
            from duckduckgo_search import DDGS
            _DDGS = DDGS
        except ImportError:
            _DDGS = None

from core.tool_base import BaseTool, ToolParameter
from infrastructure.llm_client import get_groq_client


class SearchWebTool(BaseTool):
    name = "search_web"
    description = "Tìm kiếm thông tin trên web (DuckDuckGo, hỗ trợ tiếng Việt)"
    parameters = [
        ToolParameter("query", "string", "Từ khóa tìm kiếm"),
        ToolParameter("max_results", "integer", "Số kết quả tối đa", required=False),
    ]

    async def _ddgs_search(self, query: str, max_results: int, region: str = "wt-wt") -> list[dict]:
        if not _DDGS:
            return []
        try:
            def _search():
                with _DDGS() as ddgs:
                    return list(ddgs.text(query, max_results=max_results, region=region))
            results = await asyncio.to_thread(_search)
            return [
                {"title": r["title"], "url": r["href"], "snippet": r["body"], "source": "web"}
                for r in results
            ]
        except Exception as e:
            return []

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        query = params.get("query", "")
        max_results = min(int(params.get("max_results", 8)), 15)

        today = datetime.now()
        year = today.year
        year_range = f"{year-1}-{year}"

        # Sinh nhiều query để tìm từ nhiều góc
        queries = [
            query,
            f"{query} {year}",
            f"{query} {year_range}",
            f"{query} mới nhất",
            f"{query} xu hướng",
        ]
        queries = list(dict.fromkeys(q.strip() for q in queries if q.strip()))  # dedup

        # Search tất cả queries song song
        tasks = [self._ddgs_search(q, max_results, region="wt-wt") for q in queries]
        task_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Gộp kết quả, ưu tiên query cuối (mới nhất, xu hướng) trước
        # và đẩy Wikipedia xuống cuối để tin xu hướng không bị lấn át
        seen_urls = set()
        non_wiki = []
        wiki_results = []
        for group in reversed([g for g in task_results if isinstance(g, list)]):
            for r in group:
                url = r.get("url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                if "wikipedia.org" in url:
                    wiki_results.append(r)
                else:
                    non_wiki.append(r)
        merged = (non_wiki + wiki_results)[:max_results]

        # Nếu vẫn không có kết quả, fallback site:.vn
        if not merged:
            for q in queries[:2]:
                res = await self._ddgs_search(f"{q} site:.vn", max_results, region="wt-wt")
                for r in res:
                    url = r.get("url", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        merged.append(r)

        # Fallback cuối: Wikipedia
        if not merged:
            merged = await self._wiki_fallback(query, max_results)

        return merged[:max_results]

    async def _wiki_fallback(self, query: str, max_results: int) -> list[dict]:
        results = []
        async with httpx.AsyncClient(timeout=8) as client:
            for lang in ["vi", "en"]:
                try:
                    resp = await client.get(
                        f"https://{lang}.wikipedia.org/w/api.php",
                        params={"action": "query", "list": "search", "srsearch": query,
                                "format": "json", "srlimit": max_results, "utf8": 1},
                        headers={"User-Agent": "DAVictoryAgent/1.0"},
                    )
                    if resp.status_code == 200:
                        for item in resp.json().get("query", {}).get("search", []):
                            title = item.get("title", "")
                            snippet = re.sub(r'<[^>]+>', '', item.get("snippet", ""))
                            results.append({
                                "title": title,
                                "url": f"https://{lang}.wikipedia.org/wiki/{title.replace(' ', '_')}",
                                "snippet": snippet[:300],
                                "source": "wikipedia",
                            })
                except Exception:
                    continue
        return results[:max_results]


class FetchWebContent(BaseTool):
    name = "fetch_web_content"
    description = "Lấy nội dung chi tiết từ một URL"
    parameters = [
        ToolParameter("url", "string", "URL cần lấy nội dung"),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        url = params.get("url", "")
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "DAVictoryAgent/1.0"})
                if resp.status_code != 200:
                    return {"error": f"HTTP {resp.status_code}"}
                soup = BeautifulSoup(resp.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer", "header"]):
                    tag.decompose()
                text = soup.get_text(separator="\n", strip=True)

                # Extract OG image (ảnh đại diện bài báo)
                og_image = ""
                og_tag = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "og:image"})
                if og_tag:
                    og_image = og_tag.get("content", "")

                # Extract ảnh trong bài (lọc logo, icons, ảnh nhỏ)
                page_images = []
                for img in soup.find_all("img"):
                    src = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
                    if not src or src.startswith("data:") or src.startswith("//"):
                        continue
                    src = urljoin(url, src)
                    # Bỏ logo, icon, ảnh quá nhỏ
                    lower_src = src.lower()
                    if any(x in lower_src for x in ["logo", "icon", "avatar", "banner", "sprite", "icon-"]):
                        continue
                    # Bỏ ảnh nhỏ hơn 100px (thường là UI elements)
                    w = img.get("width")
                    h = img.get("height")
                    if w and h:
                        try:
                            if int(w) < 100 or int(h) < 100:
                                continue
                        except ValueError:
                            pass
                    page_images.append(src)

                return {
                    "url": url,
                    "content": text[:5000],
                    "length": len(text),
                    "og_image": og_image if og_image and "logo" not in og_image.lower() else "",
                    "page_images": page_images[:5],
                }
        except Exception as e:
            return {"error": str(e)}


class ResearchTopicTool(BaseTool):
    name = "research_topic"
    description = "Nghiên cứu toàn diện một chủ đề: tìm kiếm + lấy nội dung từ các nguồn (song song)"
    parameters = [
        ToolParameter("topic", "string", "Chủ đề cần nghiên cứu"),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        topic = params.get("topic", "")
        search_results = await SearchWebTool().execute({"query": topic, "max_results": 8}, user_context)

        async def fetch_source(sr: dict, idx: int) -> dict:
            content = await FetchWebContent().execute({"url": sr["url"]}, user_context)
            return {
                "id": idx + 1,
                "title": sr.get("title", ""),
                "url": sr.get("url", ""),
                "snippet": sr.get("snippet", ""),
                "content": content.get("content", sr.get("snippet", ""))[:3000],
                "og_image": content.get("og_image", ""),
                "page_images": content.get("page_images", []),
            }

        results = await asyncio.gather(
            *[fetch_source(sr, i) for i, sr in enumerate(search_results[:5])],
            return_exceptions=True,
        )
        sources = [r for r in results if isinstance(r, dict)]

        # Gom tất cả ảnh từ các nguồn (ưu tiên og_image trước, page_images sau)
        all_source_images = []
        seen_urls = set()
        for s in sources:
            og = s.get("og_image", "")
            if og and og not in seen_urls:
                seen_urls.add(og)
                all_source_images.append(og)
            for img in s.get("page_images", []):
                if img not in seen_urls:
                    seen_urls.add(img)
                    all_source_images.append(img)

        return {
            "topic": topic,
            "total_sources": len(sources),
            "sources": sources,
            "all_source_images": all_source_images[:10],
        }


class SearchImagesTool(BaseTool):
    name = "search_images"
    description = "Tìm kiếm hình ảnh trên LoremFlickr/Unsplash"
    parameters = [
        ToolParameter("query", "string", "Từ khóa tìm ảnh"),
        ToolParameter("count", "integer", "Số lượng ảnh", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        query = params.get("query", "")
        count = min(int(params.get("count", 3)), 6)
        results = []
        keywords = re.sub(r'[^\w\s]', '', query).strip()[:40]

        async with httpx.AsyncClient(timeout=8) as client:
            for kw in [keywords.split()[0] if keywords.split() else keywords, "ielts", "study", "english"]:
                try:
                    resp = await client.get(
                        f"https://loremflickr.com/800/400/{kw}",
                        follow_redirects=True,
                    )
                    if resp.status_code == 200:
                        results.append({
                            "url": str(resp.url),
                            "alt": f"Hình ảnh về {kw}",
                            "source": "loremflickr",
                        })
                        if len(results) >= count:
                            break
                except Exception:
                    continue

        return results[:count]


class CollectArticleImages(BaseTool):
    name = "collect_article_images"
    description = "Thu thập hình ảnh cho bài viết (ưu tiên ảnh từ nguồn báo, fallback Unsplash)"
    parameters = [
        ToolParameter("topic", "string", "Chủ đề bài viết"),
        ToolParameter("count", "integer", "Số lượng ảnh tối đa", required=False),
        ToolParameter("source_images", "string", "JSON array ảnh từ nguồn báo (og:image + page_images)", required=False),
    ]

    async def execute(self, params: dict, user_context: dict) -> list[dict]:
        from infrastructure.image_service import collect_article_images as service_collect

        topic = params.get("topic", "")
        count = min(int(params.get("count", 4)), 6)

        # Parse source_images nếu có
        source_images = []
        raw = params.get("source_images", "")
        if raw:
            try:
                source_images = json.loads(raw) if isinstance(raw, str) else raw
            except (json.JSONDecodeError, TypeError):
                pass

        return await service_collect(topic, count, source_images)


class ValidateImageRelevance(BaseTool):
    name = "validate_image_relevance"
    description = "Dùng vision model kiểm tra ảnh có phù hợp với nội dung bài viết không"
    parameters = [
        ToolParameter("image_url", "string", "URL ảnh cần kiểm tra"),
        ToolParameter("topic", "string", "Chủ đề bài viết"),
        ToolParameter("context", "string", "Ngữ cảnh nội dung (các heading sections)"),
    ]

    async def execute(self, params: dict, user_context: dict) -> dict:
        from infrastructure.llm_client import get_groq_client

        image_url = params.get("image_url", "")
        topic = params.get("topic", "")
        context = params.get("context", "")

        if not image_url:
            return {"matched": True, "score": 5, "reason": "Không có URL ảnh"}

        client = get_groq_client()
        prompt = f"""Bạn là chuyên gia kiểm duyệt ảnh cho bài viết. Hãy xem ảnh và đánh giá mức độ phù hợp.

CHỦ ĐỀ BÀI VIẾT: {topic}
NỘI DUNG CÁC SECTION: {context}

YÊU CẦU:
- Ảnh có liên quan đến nội dung trên không?
- Có phải ảnh minh họa phù hợp (không phải ảnh quảng cáo, ảnh lỗi, ảnh chứa nội dung nhạy cảm)?
- Ảnh có chất lượng tốt, rõ nét không?

Trả về JSON:
{{"matched": true/false, "score": 1-10, "reason": "lý do ngắn gọn bằng tiếng Việt"}}"""

        try:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ]
            result = await client.create_vision_completion(messages)
            content = (result.content or "").strip()
            content = re.sub(r'```(?:json)?\s*|\s*```', '', content)
            parsed = json.loads(content)
            return {
                "matched": parsed.get("matched", True),
                "score": int(parsed.get("score", 5)),
                "reason": parsed.get("reason", ""),
            }
        except Exception as e:
            return {"matched": True, "score": 5, "reason": f"Vision validation skipped: {e}"}
