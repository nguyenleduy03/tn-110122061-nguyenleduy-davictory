"""Fix existing blog posts that have broken image URLs in DB."""
import asyncio
import re
import uuid
from pathlib import Path

from config import get_settings
from infrastructure.image_service import download_image


async def main():
    settings = get_settings()
    upload_dir = Path(settings.upload_dir) / "articles"
    upload_dir.mkdir(parents=True, exist_ok=True)

    print(f"Upload dir: {upload_dir.absolute()}")

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy import text, select
    from sqlalchemy.orm import sessionmaker

    engine = create_async_engine(settings.db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession)

    async with async_session() as session:
        result = await session.execute(text("SELECT id, title, thumbnail, content FROM blog_posts WHERE deleted_at IS NULL"))
        posts = result.fetchall()

        fixed_thumbnail = 0
        fixed_content = 0

        for row in posts:
            post_id = row[0]
            title = row[1] or ""
            thumbnail = row[2] or ""
            content = row[3] or ""
            changed = False

            # Fix thumbnail
            if thumbnail and ("loremflickr.com" in thumbnail or "example.com" in thumbnail):
                new_thumb = await download_image(thumbnail, fallback_topic=title[:50])
                await session.execute(
                    text("UPDATE blog_posts SET thumbnail = :thumb WHERE id = :id"),
                    {"thumb": new_thumb, "id": post_id},
                )
                fixed_thumbnail += 1
                changed = True
                print(f"  [{post_id}] Thumbnail: {thumbnail[:60]}... -> {new_thumb}")

            # Fix content images
            img_pattern = re.compile(r'<img[^>]*src="([^"]+)"[^>]*>')
            if content:
                new_content = content
                for match in img_pattern.finditer(content):
                    src = match.group(1)
                    if "loremflickr.com" in src or "example.com" in src:
                        new_src = await download_image(src, fallback_topic=title[:50])
                        new_content = new_content.replace(src, new_src)
                        fixed_content += 1
                        changed = True
                        print(f"  [{post_id}] Image: {src[:60]}... -> {new_src}")

                if changed:
                    await session.execute(
                        text("UPDATE blog_posts SET content = :content WHERE id = :id"),
                        {"content": new_content, "id": post_id},
                    )

        await session.commit()
        print(f"\nDone! Fixed {fixed_thumbnail} thumbnails, {fixed_content} images in content.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
