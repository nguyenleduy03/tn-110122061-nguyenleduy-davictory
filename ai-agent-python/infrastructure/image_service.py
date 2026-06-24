import asyncio
import hashlib
import mimetypes
import os
import uuid
from pathlib import Path

import httpx
from loguru import logger

from config import get_settings


async def search_unsplash(query: str, count: int = 5) -> list[dict]:
    settings = get_settings()
    if not settings.unsplash_access_key:
        return await _search_loremflickr(query, count)

    url = "https://api.unsplash.com/search/photos"
    params = {"query": query, "per_page": min(count, 10), "orientation": "landscape"}
    headers = {"Authorization": f"Client-ID {settings.unsplash_access_key}"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                return await _search_loremflickr(query, count)
            data = resp.json()
            results = []
            for item in data.get("results", [])[:count]:
                urls = item.get("urls", {})
                user = item.get("user", {})
                results.append({
                    "id": item.get("id", ""),
                    "url": urls.get("regular", ""),
                    "thumb": urls.get("thumb", ""),
                    "small": urls.get("small", ""),
                    "alt": item.get("alt_description") or item.get("description") or query,
                    "photographer": user.get("name", "Unknown"),
                    "photographer_url": user.get("links", {}).get("html", ""),
                    "width": item.get("width", 0),
                    "height": item.get("height", 0),
                    "source": "unsplash",
                })
            return results
    except Exception:
        return await _search_loremflickr(query, count)


async def _search_loremflickr(query: str, count: int = 3) -> list[dict]:
    results = []
    keywords = query.split()[:2] if query.split() else ["ielts"]
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    }
    for kw in keywords:
        try:
            async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
                resp = await client.get(f"https://loremflickr.com/800/400/{kw}", headers=headers)
                if resp.status_code == 200:
                    results.append({
                        "id": str(uuid.uuid4()),
                        "url": str(resp.url),
                        "thumb": str(resp.url),
                        "alt": f"Hình ảnh về {kw}",
                        "photographer": "",
                        "photographer_url": "",
                        "width": 800,
                        "height": 400,
                        "source": "loremflickr",
                    })
                    if len(results) >= count:
                        break
        except Exception:
            continue
    return results


def _generate_svg_placeholder(topic: str, subdir: str = "articles") -> str:
    settings = get_settings()
    upload_dir = Path(settings.upload_dir) / subdir
    upload_dir.mkdir(parents=True, exist_ok=True)

    h = hashlib.md5(topic.encode()).hexdigest()
    hue = int(h[:6], 16) % 360
    color1 = f"hsl({hue}, 60%, 40%)"
    color2 = f"hsl({(hue + 40) % 360}, 55%, 55%)"
    safe_topic = topic.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{color1}"/>
      <stop offset="100%" style="stop-color:{color2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="400" fill="url(#g)"/>
  <text x="400" y="180" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="Arial,sans-serif" font-size="28" font-weight="bold">{safe_topic}</text>
  <text x="400" y="230" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-family="Arial,sans-serif" font-size="14">DAVictory</text>
</svg>'''

    filename = f"placeholder-{uuid.uuid4().hex[:8]}.svg"
    filepath = upload_dir / filename
    filepath.write_text(svg, encoding="utf-8")
    return f"/{settings.upload_dir}/{subdir}/{filename}"


async def download_image(image_url: str, subdir: str = "articles", fallback_topic: str = "") -> str:
    settings = get_settings()
    upload_dir = Path(settings.upload_dir) / subdir
    upload_dir.mkdir(parents=True, exist_ok=True)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(image_url, headers=headers)
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                ext = mimetypes.guess_extension(content_type.split(";")[0]) or ".jpg"
                filename = f"{uuid.uuid4()}{ext}"
                filepath = upload_dir / filename
                filepath.write_bytes(resp.content)
                return f"/{settings.upload_dir}/{subdir}/{filename}"
            else:
                logger.warning(f"download_image: HTTP {resp.status_code} for {image_url[:80]}")
    except Exception as e:
        logger.warning(f"download_image: {e} for {image_url[:80]}")

    return _generate_svg_placeholder(fallback_topic or "Image", subdir)


async def collect_article_images(topic: str, count: int = 4, source_images: list[str] = None) -> list[dict]:
    all_images = []
    seen = set()

    # Bước 1: ưu tiên ảnh từ nguồn báo (og:image / page_images)
    if source_images:
        for img_url in source_images:
            if len(all_images) >= count:
                break
            local_url = await download_image(img_url, fallback_topic=topic)
            if local_url:
                all_images.append({
                    "id": str(uuid.uuid4()),
                    "url": local_url,
                    "thumb": local_url,
                    "alt": f"Minh họa: {topic}",
                    "photographer": "",
                    "photographer_url": "",
                    "width": 800, "height": 400,
                    "source": "article",
                    "original_url": img_url,
                })
                seen.add(img_url)
    if len(all_images) >= count:
        return all_images[:count]

    # Bước 2: fallback Unsplash + LoremFlickr
    keywords = topic.split()[:3]
    if not keywords:
        keywords = [topic]
    for kw in keywords:
        images = await search_unsplash(kw, max(2, count - len(all_images)))
        for img in images:
            orig = img.get("url", "")
            if orig in seen:
                continue
            seen.add(orig)
            img["original_url"] = orig
            img["url"] = await download_image(orig, fallback_topic=topic)
            all_images.append(img)
            if len(all_images) >= count:
                return all_images[:count]

    if not all_images:
        images = await search_unsplash(topic, count)
        for img in images:
            orig = img.get("url", "")
            img["original_url"] = orig
            img["url"] = await download_image(orig, fallback_topic=topic)
            all_images.append(img)
            if len(all_images) >= count:
                break

    # Bước 3: SVG placeholder (fallback cuối)
    while len(all_images) < count:
        placeholder_url = _generate_svg_placeholder(topic)
        all_images.append({
            "id": str(uuid.uuid4()),
            "url": placeholder_url,
            "thumb": placeholder_url,
            "alt": f"Minh họa: {topic}",
            "photographer": "",
            "photographer_url": "",
            "width": 800, "height": 400,
            "source": "placeholder",
        })

    return all_images[:count]
