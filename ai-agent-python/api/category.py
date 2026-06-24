"""Category management API endpoints."""

import json
from datetime import datetime

from fastapi import APIRouter, HTTPException
from loguru import logger

from tools.tools_library import _run_sql, _execute_sql

router = APIRouter(prefix="/api/agent/categories", tags=["categories"])


@router.get("")
async def list_categories():
    """Get all categories with post count."""
    rows = await _run_sql("""
        SELECT c.*, COUNT(bp.id) as post_count
        FROM categories c
        LEFT JOIN blog_posts bp ON bp.category_id = c.id AND bp.deleted_at IS NULL
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.id ASC
    """)
    return {
        "categories": [
            {
                "id": r["id"],
                "name": r["name"],
                "slug": r["slug"],
                "color": r["color"],
                "icon": r["icon"],
                "sort_order": r["sort_order"],
                "post_count": r["post_count"],
            }
            for r in rows
        ]
    }


@router.post("")
async def create_category(body: dict):
    """Create a new category."""
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Missing name")
    slug = (body.get("slug") or "").strip() or name.lower().replace(" ", "-")
    color = body.get("color", "#2563eb")
    icon = body.get("icon", "📝")

    try:
        await _execute_sql(
            "INSERT INTO categories (name, slug, color, icon) VALUES (:name, :slug, :color, :icon)",
            {"name": name, "slug": slug, "color": color, "icon": icon},
        )
        return {"status": "ok", "slug": slug}
    except Exception as e:
        if "Duplicate" in str(e):
            raise HTTPException(400, "Slug đã tồn tại")
        raise HTTPException(500, str(e))


@router.put("/{cat_id}")
async def update_category(cat_id: int, body: dict):
    """Update a category."""
    sets = []
    params = {"id": cat_id}
    for field in ("name", "slug", "color", "icon", "sort_order"):
        if field in body:
            sets.append(f"{field} = :{field}")
            params[field] = body[field]
    if not sets:
        raise HTTPException(400, "No fields to update")
    await _execute_sql(f"UPDATE categories SET {', '.join(sets)} WHERE id = :id", params)
    return {"status": "ok"}


@router.delete("/{cat_id}")
async def delete_category(cat_id: int):
    """Delete a category. Fails if posts are assigned."""
    posts = await _run_sql(
        "SELECT COUNT(*) as cnt FROM blog_posts WHERE category_id = :id AND deleted_at IS NULL",
        {"id": cat_id},
    )
    if posts and posts[0].get("cnt", 0) > 0:
        raise HTTPException(400, f"Còn {posts[0]['cnt']} bài viết trong danh mục này")
    await _execute_sql("DELETE FROM categories WHERE id = :id", {"id": cat_id})
    return {"status": "ok"}
