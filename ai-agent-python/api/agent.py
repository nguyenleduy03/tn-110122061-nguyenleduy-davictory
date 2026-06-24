import asyncio
import copy
import json
import re
from datetime import datetime

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from tools.tools_library import _run_sql, _execute_sql

from core.orchestrator import process_agent_query
from core.registry import registry
from db.session import get_session
from infrastructure.progress_tracker import get_all_progress
from models.agent import AgentSession, AgentTask

JWT_SECRET = "DAVictorySecretKey2026SuperLongAndSecureBase64EncodedKeyForJWTSigning1234567890ABCDEF"
MANAGER_ROLES = {"ROLE_MANAGER", "ROLE_ADMIN"}


async def _get_user_from_token(request: Request) -> dict:
    """Decode JWT, return {user_id, username, roles} or raise 401."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token xác thực")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256", "HS384", "HS512"])
    except Exception:
        raise HTTPException(401, "Token không hợp lệ")
    username = payload.get("sub")
    roles = payload.get("roles", [])
    if not username:
        raise HTTPException(401, "Token không chứa thông tin người dùng")
    rows = await _run_sql(
        "SELECT id FROM users WHERE (email = :u OR username = :u) AND deleted_at IS NULL LIMIT 1",
        {"u": username},
    )
    if not rows:
        raise HTTPException(401, "Người dùng không tồn tại")
    return {"user_id": rows[0]["id"], "username": username, "roles": roles}


async def require_manager(request: Request):
    """Dependency: yêu cầu role MANAGER/ADMIN."""
    user = await _get_user_from_token(request)
    if not any(r in MANAGER_ROLES for r in user.get("roles", [])):
        raise HTTPException(403, "Từ chối: cần quyền MANAGER trở lên")
    request.state.user = user

router = APIRouter(prefix="/api/agent", tags=["agent"], dependencies=[Depends(require_manager)])


async def _get_or_create_session(db: AsyncSession, user_id: int | None, session_id: int | None = None) -> AgentSession:
    if session_id:
        result = await db.execute(select(AgentSession).where(AgentSession.id == session_id))
        session = result.scalar_one_or_none()
        if session:
            return session
    session = AgentSession(user_id=user_id or None, context={"history": []}, active_agents=[])
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.post("/query")
async def query(request: Request, db: AsyncSession = Depends(get_session)):
    try:
        body = await request.json()
    except Exception as e:
        logger.error(f"Invalid JSON body: {e}")
        return {"error": "Invalid JSON body"}

    message = body.get("message", "")
    user_id = request.state.user["user_id"]
    session_id = body.get("session_id")
    agent_mode = body.get("agent_mode", False)
    mode = body.get("mode", "auto")

    try:
        if not agent_mode:
            session = await _get_or_create_session(db, user_id, session_id)

            ctx = dict(session.context or {"history": []})
            ctx.setdefault("history", [])

            response_text = await _chat_with_history(message, ctx)

            clean = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL).strip()
            ctx["history"].append({"role": "user", "content": message})
            ctx["history"].append({"role": "assistant", "content": clean, "agent": "chat"})
            response_text = clean
            session.context = ctx
            flag_modified(session, "context")
            await db.commit()

            return {
                "type": "chat",
                "response": response_text,
                "session_id": session.id,
            }

        result = await process_agent_query(message, user_id, {"user_id": user_id}, db, session_id, mode=mode)
        return result
    except Exception as e:
        logger.exception(f"Agent query failed: {e}")
        return {"error": f"Internal error: {str(e)}"}


async def _chat_with_history(message: str, ctx: dict) -> str:
    from core.llm_agent import _strip_think
    from infrastructure.llm_client import get_groq_client
    client = get_groq_client()
    messages = [{"role": "system", "content": "Bạn là trợ lý AI của DAVictory. Luôn trả lời bằng tiếng Việt, ngắn gọn, tự nhiên, thân thiện."}]
    if ctx.get("history"):
        for msg in ctx["history"][-10:]:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})
    try:
        result = await asyncio.wait_for(
            client.create_completion(messages=messages, max_tokens=300),
            timeout=15.0,
        )
        return _strip_think(result.content or "") or "Xin chào! Tôi có thể giúp gì cho bạn?"
    except Exception as e:
        logger.warning(f"_chat_with_history failed: {e}")
        return "Xin chào! Tôi có thể giúp gì cho bạn?"


@router.get("/agents")
async def list_agents():
    return {"agents": registry.list_agents()}


@router.get("/sessions/{session_id}/stream")
async def stream_results(session_id: int):
    async def event_stream():
        from infrastructure.message_queue import subscribe_continuous
        import json as json_mod

        queue: asyncio.Queue = asyncio.Queue()

        async def on_msg(data: dict):
            await queue.put(data)

        listener = await subscribe_continuous(f"session:{session_id}:results", on_msg)

        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {json_mod.dumps(data, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json_mod.dumps({'type': 'heartbeat'})}\n\n"
        finally:
            listener.cancel()
            try:
                await listener
            except asyncio.CancelledError:
                pass

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/sessions/{session_id}/progress")
async def get_session_progress(session_id: int):
    progress = get_all_progress(session_id)
    return {"session_id": session_id, "progress": progress}


@router.get("/sessions")
async def list_sessions(user_id: int = Query(0), db: AsyncSession = Depends(get_session)):
    query = select(AgentSession).order_by(AgentSession.created_at.desc())
    if user_id:
        query = query.where(AgentSession.user_id == user_id)
    query = query.limit(20)
    result = await db.execute(query)
    sessions = result.scalars().all()
    return {
        "sessions": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "active_agents": s.active_agents,
                "created_at": str(s.created_at) if s.created_at else None,
            }
            for s in sessions
        ]
    }


@router.post("/posts/generate")
async def start_wizard(request: Request):
    try:
        body = await request.json()
    except Exception:
        return {"error": "Invalid JSON body"}

    topic = body.get("topic", "").strip()
    if not topic:
        return {"error": "Missing topic"}

    from core.blog_wizard import create_wizard
    task = create_wizard(topic)
    return {"task_id": task.task_id, "status": task.status}


@router.get("/posts/generate/{task_id}")
async def get_wizard_status(task_id: str):
    from core.blog_wizard import get_wizard
    task = get_wizard(task_id)
    if not task:
        return {"error": "Task not found"}
    return task.to_dict()


@router.post("/posts/generate/{task_id}/outline")
async def confirm_wizard_outline(task_id: str, request: Request):
    from core.blog_wizard import get_wizard
    task = get_wizard(task_id)
    if not task:
        return {"error": "Task not found"}
    if task.status != "outline_ready":
        return {"error": f"Invalid status: {task.status}"}

    try:
        body = await request.json()
    except Exception:
        return {"error": "Invalid JSON body"}

    action = body.get("action", "")
    if action == "edit" and body.get("outline"):
        task.outline = body["outline"]

    if action in ("approve", "edit"):
        asyncio.create_task(task.run_stage_2())
        return {"status": "writing", "task_id": task_id}

    return {"error": "Invalid action"}


@router.post("/posts/generate/{task_id}/outline/improve")
async def improve_wizard_outline(task_id: str, request: Request):
    from core.blog_wizard import get_wizard
    task = get_wizard(task_id)
    if not task:
        return {"error": "Task not found"}
    if task.status != "outline_ready" and task.status != "researching":
        return {"error": f"Invalid status: {task.status}"}

    try:
        body = await request.json()
    except Exception:
        return {"error": "Invalid JSON body"}

    feedback = (body.get("feedback") or "").strip()
    if not feedback:
        return {"error": "Missing feedback"}

    asyncio.create_task(task.regenerate_outline(feedback))
    return {"status": "improving", "task_id": task_id}


@router.post("/posts/generate/{task_id}/content")
async def confirm_wizard_content(task_id: str, request: Request):
    from core.blog_wizard import get_wizard
    task = get_wizard(task_id)
    if not task:
        return {"error": "Task not found"}
    if task.status != "content_ready":
        return {"error": f"Invalid status: {task.status}"}

    try:
        body = await request.json()
    except Exception:
        return {"error": "Invalid JSON body"}

    action = body.get("action", "")
    if action == "edit" and body.get("content_html"):
        task.content_html = body["content_html"]

    if action in ("approve", "edit"):
        article_id = await task.run_stage_3()
        if article_id:
            return {"status": "done", "article_id": article_id, "task_id": task_id}
        return {"status": "error", "error": task.error or "Save failed"}

    return {"error": "Invalid action"}


@router.get("/sessions/{session_id}/tasks")
async def get_session_tasks(session_id: int, since_id: int = Query(0),
                             db: AsyncSession = Depends(get_session)):
    query = select(AgentTask).where(AgentTask.session_id == session_id)
    if since_id:
        query = query.where(AgentTask.id > since_id)
    query = query.order_by(AgentTask.id)
    result = await db.execute(query)
    tasks = result.scalars().all()
    return {
        "tasks": [
            {
                "id": t.id,
                "agent_type": t.agent_type,
                "intent": t.intent,
                "status": t.status,
                "result": t.result,
                "error": t.error,
                "created_at": str(t.created_at) if t.created_at else None,
                "completed_at": str(t.completed_at) if t.completed_at else None,
            }
            for t in tasks
        ]
    }


@router.get("/report/templates")
async def get_report_templates():
    """Get pre-built report templates."""
    from infrastructure.report_templates import REPORT_TEMPLATES
    categories = {}
    for t in REPORT_TEMPLATES:
        cat = t["category"]
        if cat not in categories:
            categories[cat] = {"value": cat, "label": _cat_label(cat), "templates": []}
        categories[cat]["templates"].append({
            "id": t["id"],
            "title": t["title"],
            "description": t["description"],
            "period": t["period"],
            "icon": t["icon"],
        })
    return {"categories": list(categories.values())}


@router.get("/report/templates/{template_id}")
async def get_report_template_detail(template_id: str):
    """Get full template detail with data-driven content and LLM-generated sections."""
    from infrastructure.report_templates import REPORT_TEMPLATES
    template = None
    for t in REPORT_TEMPLATES:
        if t["id"] == template_id:
            template = t
            break
    if not template:
        raise HTTPException(404, "Template not found")

    from infrastructure.report_generator import ReportGenerator
    generator = ReportGenerator()
    try:
        result = await generator.generate(copy.deepcopy(template))
        return result
    except Exception as e:
        logger.exception(f"Report generation failed for {template_id}: {e}")
        raise HTTPException(500, f"Report generation failed: {str(e)}")


def _cat_label(cat: str) -> str:
    labels = {
        "tong_quan": "Tổng quan",
        "hoc_tap": "Học tập",
        "thi_cu": "Thi cử",
    }
    return labels.get(cat, cat)


@router.post("/report/export-pdf")
async def export_report_pdf(request: Request):
    """Export report markdown to PDF."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "Invalid JSON")

    markdown_text = body.get("markdown", "")
    if not markdown_text:
        raise HTTPException(400, "Missing markdown content")

    chart_groups = body.get("chart_groups", [])

    from services.pdf_service import markdown_to_pdf
    buf = markdown_to_pdf(markdown_text, chart_groups)

    return Response(
        content=buf.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Bao_cao_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"',
            "Content-Type": "application/pdf",
        },
    )


@router.put("/posts/{post_id}/category")
async def assign_post_category(post_id: int, body: dict):
    """Assign a category to a blog post."""
    category_id = body.get("category_id")
    if category_id is not None:
        await _execute_sql("UPDATE blog_posts SET category_id = :cid WHERE id = :pid",
                       {"cid": category_id, "pid": post_id})
    else:
        await _execute_sql("UPDATE blog_posts SET category_id = NULL WHERE id = :pid",
                       {"pid": post_id})
    return {"status": "ok"}


@router.get("/posts/{post_id}/category")
async def get_post_category(post_id: int):
    """Get the category assigned to a post."""
    rows = await _run_sql("""
        SELECT c.* FROM categories c
        JOIN blog_posts bp ON bp.category_id = c.id
        WHERE bp.id = :pid
    """, {"pid": post_id})
    if rows:
        return rows[0]
    return None


@router.get("/posts-list")
async def list_posts_python():
    """List all posts with category info (Python-side, bypasses Java)."""
    from tools.tools_library import _run_sql
    rows = await _run_sql("""
        SELECT p.id, p.title, p.slug, p.status, p.tags, p.thumbnail,
               p.reading_time, p.category_id, p.created_at,
               c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM blog_posts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
    """)
    posts = []
    for r in rows:
        post = {
            "id": r["id"],
            "title": r["title"],
            "status": r["status"],
            "tags": r["tags"].split(",") if r["tags"] else [],
            "thumbnail": r["thumbnail"],
            "reading_time": r["reading_time"],
            "category_id": r["category_id"],
            "created_at": str(r["created_at"]) if r["created_at"] else None,
            "preview": "",
        }
        if r.get("category_name"):
            post["category"] = {"name": r["category_name"], "color": r["category_color"], "icon": r["category_icon"]}
        posts.append(post)
    return {"posts": posts}


@router.get("/posts/{post_id}")
async def get_post(post_id: int):
    """Get a single blog post by ID."""
    rows = await _run_sql("""
        SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM blog_posts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = :id AND p.deleted_at IS NULL
    """, {"id": post_id})
    if not rows:
        raise HTTPException(404, "Post not found")
    post = dict(rows[0])
    if isinstance(post.get("tags"), str):
        post["tags"] = [t.strip() for t in post["tags"].split(",") if t.strip()]
    if post.get("category_name"):
        post["category"] = {"name": post["category_name"], "color": post["category_color"], "icon": post["category_icon"]}
    return post


@router.delete("/posts/{post_id}")
async def delete_post(post_id: int):
    """Soft-delete a blog post (set deleted_at)."""
    await _execute_sql(
        "UPDATE blog_posts SET deleted_at = NOW() WHERE id = :id",
        {"id": post_id},
    )
    return {"message": f"Deleted post {post_id}"}


@router.put("/posts/{post_id}/publish")
async def publish_post(post_id: int):
    """Publish a blog post."""
    rows = await _run_sql(
        "SELECT id, title, status FROM blog_posts WHERE id = :id AND deleted_at IS NULL",
        {"id": post_id},
    )
    if not rows:
        raise HTTPException(404, "Post not found")
    await _execute_sql(
        "UPDATE blog_posts SET status = 'published', published_at = NOW() WHERE id = :id",
        {"id": post_id},
    )
    # Fetch updated post to return full data
    updated = await _run_sql("""
        SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM blog_posts p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = :id
    """, {"id": post_id})
    if updated:
        return updated[0]
    return {"status": "published", "id": post_id}
