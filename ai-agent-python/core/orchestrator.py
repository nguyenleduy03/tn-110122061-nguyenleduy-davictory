import asyncio
import json
import re
import unicodedata
import uuid
from datetime import datetime, timezone

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings as get_config
from core.registry import registry
from infrastructure.message_queue import enqueue_task, publish_result, dequeue_task
from infrastructure.progress_tracker import set_progress, set_plan, clear_progress
from infrastructure.llm_client import get_groq_client


VALID_AGENTS = {"content", "info", "report", "email"}


def _normalize(text: str) -> str:
    t = text.lower().strip()
    t = unicodedata.normalize('NFD', t)
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return t


_RULES = [
    ("content", ["viet bai", "viet blog", "viet noi dung", "tao bai viet", "tao blog",
                  "lam bai viet", "soan bai", "bai viet", "content", "blog ve"]),
    ("report", ["bao cao", "thong ke", "report", "phan tich", "so lieu", "tong quan",
                "performance", "doanh thu"]),
    ("email", ["gui email", "email", "gui mail", "thong bao", "marketing"]),
    ("info", ["xem", "tra cuu", "kiem tra", "danh sach", "liet ke", "thong tin", "hoc sinh",
              "lop hoc", "de thi", "giup", "cho toi", "hien thi",
              "tim", "tim kiem", "co the giup", "trung tam", "giao vien", "giang vien", "hoc vien",
              "bao nhieu lop", "bao nhieu hoc sinh", "bao nhieu giao vien", "bao nhieu giang vien",
              "bao nhieu nguoi", "co may lop", "co may hoc sinh", "co may giao vien",
              "lop nao", "hoc sinh nao", "giao vien nao", "giang vien nao",
              "nhieu nhat", "it nhat", "xep hang", "nhieu lop nhat",
              "co bao nhieu", "tong so", "so luong"]),
]

_GREETINGS = [
    "xin chao", "chao", "hello", "hi", "hey", "good morning", "good afternoon",
]

_CHAT_PATTERNS = [
    "cam on", "thanks", "thank you", "thankyou",
    "tam biet", "bye", "goodbye", "hen gap lai",
    "ban khoe khong", "hom nay the nao", "dep trai", "xinh gai",
    "hom nay la thu may", "bay gio la may gio", "may gio roi",
    "khong co gi", "khong sao",
    "ok", "okay", "duoc roi", "vang",
    "noi tiep di", "ke tiep di", "con nua khong",
    "haha", "hehe", "hihi", "lol",
    "khong biet", "toi khong biet", "em khong biet", "minh khong biet",
    "khong hieu", "khong ro", "khong biet tra loi",
]


async def _keyword_match(text: str) -> dict | None:
    for g in _GREETINGS:
        if text == g or text.startswith(g + " "):
            return {"intent": "chao hoi", "chat": True}
    for p in _CHAT_PATTERNS:
        if p in text:
            return {"intent": "chat", "chat": True}
    for agent, keywords in _RULES:
        for kw in keywords:
            if kw in text:
                return {"intent": kw, "agents": [agent], "chat": False}
    return None


async def _llm_classify(user_input: str) -> dict:
    client = get_groq_client()
    prompt = f"""Phan loai y dinh cua tin nhan sau vao 1 trong 5 nhan:

- info: hoi ve du lieu, tra cuu, xem danh sach, kiem tra thong tin, tim kiem (ke ca tao de thi, them hoc sinh, xoa du lieu - nhung thao tac tren du lieu)
- report: bao cao, thong ke, phan tich so lieu
- content: viet bai blog, viet noi dung IELTS, tao bai viet moi (CHI viet bai viet/blog, KHONG phai tao du lieu)
- email: gui email, thong bao qua email
- chat: hoi tham, chao hoi, tam su, noi chuyen, khong lien quan du lieu

VD: "tao de thi" → info, "viet bai ve IELTS" → content, "them hoc sinh" → info

Chi tra ve JSON: {{"agent": "ten_nhan"}}
Neu khong chac chan hoac tin nhan khong ro rang, hay tra ve "chat".
Tin nhan: {user_input}"""
    try:
        result = await asyncio.wait_for(
            client.create_completion(
                messages=[{"role": "user", "content": prompt}],
                model=get_config().groq_model,
                temperature=0,
                max_tokens=30,
                response_format={"type": "json_object"},
            ),
            timeout=5.0,
        )
        data = json.loads(result.content or "{}")
        agent = data.get("agent", "chat")
        if agent in VALID_AGENTS:
            return {"intent": agent, "agents": [agent], "chat": False}
        return {"intent": "chat", "chat": True}
    except Exception as e:
        logger.warning(f"LLM classify failed: {e}")
        return {"intent": "chat", "chat": True}


async def classify_intent(user_input: str) -> dict:
    text = _normalize(user_input)

    match = await _keyword_match(text)
    if match:
        return match

    return await _llm_classify(user_input)


_CHAT_CACHE = {
    "xin chao": "Xin chào! Tôi là trợ lý AI của DAVictory - trung tâm luyện thi IELTS. Tôi có thể giúp bạn tra cứu đề thi, viết blog, tạo báo cáo và nhiều hơn nữa! Bạn cần gì hôm nay?",
    "hello": "Hello! I'm the DAVictory AI assistant. How can I help you today?",
    "hi": "Hi there! I'm your IELTS study assistant. How can I help?",
    "cam on": "Cảm ơn bạn! Nếu cần thêm thông tin gì về IELTS, đừng ngần ngại hỏi tôi nhé!",
    "thanks": "You're welcome! Feel free to ask if you need any help with IELTS!",
    "ban la ai": "Tôi là trợ lý AI của DAVictory - trung tâm luyện thi IELTS. Tôi có thể giúp bạn tra cứu đề thi, viết blog, xem thống kê và nhiều hơn nữa!",
    "tam biet": "Tạm biệt bạn! Chúc bạn học IELTS thật tốt. Hẹn gặp lại!",
    "bye": "Goodbye! Good luck with your IELTS preparation!",
    "ok": "OK! Bạn cần tôi giúp gì thêm không?",
    "okay": "OK! Bạn cần tôi giúp gì thêm không?",
}


async def fast_chat(message: str, session_context: dict | None = None) -> str:
    from core.llm_agent import _strip_think
    text = _normalize(message)

    for key, response in _CHAT_CACHE.items():
        if key in text or text == key or text.startswith(key):
            return response

    from infrastructure.llm_client import get_groq_client
    client = get_groq_client()
    messages = []
    if session_context and session_context.get("history"):
        for msg in session_context["history"][-6:]:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})
    try:
        result = await asyncio.wait_for(
            client.create_completion(
                messages=messages,
                max_tokens=200,
            ),
            timeout=10.0,
        )
        text = _strip_think(result.content or "")
        return text or "Xin chào! Tôi có thể giúp gì cho bạn?"
    except Exception as e:
        logger.warning(f"fast_chat LLM failed: {e}")
        return "Xin chào! Tôi có thể giúp gì cho bạn?"


async def dispatch_task(session_id: int, user_id: int, agent_name: str,
                        intent: str, input_text: str, user_context: dict,
                        session_context: dict | None = None,
                        db_task_id: int = 0) -> str:
    task = {
        "task_id": str(uuid.uuid4()),
        "db_task_id": db_task_id,
        "session_id": session_id,
        "user_id": user_id,
        "agent_type": agent_name,
        "intent": intent,
        "input": input_text,
        "user_context": user_context,
        "session_context": session_context or {},
    }
    await enqueue_task(f"agent:{agent_name}:tasks", task)
    return task["task_id"]


async def _execute_agent_task(task_id: int, session_id: int, user_id: int,
                               agent_name: str, intent: str, input_text: str,
                               user_context: dict, session_context: dict | None = None):
    logger.info(f"_execute_agent_task called: task={task_id}, agent={agent_name}, session={session_id}")
    from db.session import get_session_factory
    from models.agent import AgentTask, AgentSession
    from sqlalchemy.orm.attributes import flag_modified
    from infrastructure.progress_tracker import set_plan, clear_progress

    try:
        agent = registry.get(agent_name)
        if not agent:
            raise ValueError(f"Agent '{agent_name}' not found")

        user_context["session_id"] = session_id

        plan = await agent.think(input_text, user_context, session_context)
        set_plan(session_id, agent_name, plan.to_dict())

        result = await asyncio.wait_for(
            agent.process(input_text, user_context, session_context),
            timeout=180.0,
        )

        if result and result.response:
            from core.llm_agent import _strip_think
            result.response = _strip_think(result.response)

        if result.success and result.tool_calls:
            try:
                await asyncio.wait_for(
                    agent.summarize(plan, result.tool_calls, input_text),
                    timeout=15.0,
                )
            except asyncio.TimeoutError:
                pass

        if result.success:
            result.plan = plan.to_dict()

        factory = get_session_factory()
        async with factory() as db:
            db_task = await db.get(AgentTask, task_id)
            if db_task:
                db_task.status = "completed" if result.success else "failed"
                db_task.result = result.to_dict() if result.success else None
                db_task.error = result.error
                db_task.completed_at = datetime.now(timezone.utc)
                await db.commit()

        await publish_result(f"session:{session_id}:results", result.to_dict())
        return result

    except Exception as e:
        logger.exception(f"Agent task {task_id} failed: {e}")
        clear_progress(session_id, agent_name)
        try:
            factory = get_session_factory()
            async with factory() as db:
                db_task = await db.get(AgentTask, task_id)
                if db_task:
                    db_task.status = "failed"
                    db_task.error = str(e)[:500]
                    db_task.completed_at = datetime.now(timezone.utc)
                    await db.commit()
        except Exception as db_err:
            logger.error(f"DB error on task cleanup: {db_err}")
        return None


async def process_agent_query(user_input: str, user_id: int, user_context: dict,
                              db: AsyncSession, existing_session_id: int | None = None,
                              mode: str = "auto") -> dict:
    from models.agent import AgentSession, AgentTask

    try:
        if existing_session_id:
            result = await db.execute(select(AgentSession).where(AgentSession.id == existing_session_id))
            session = result.scalar_one_or_none()
            if not session:
                existing_session_id = None

        if not existing_session_id:
            session = AgentSession(user_id=user_id, context={"history": []}, active_agents=[])
            db.add(session)
            await db.commit()
            await db.refresh(session)

        ctx = dict(session.context or {})

        pending = ctx.get("_pending_action")
        if pending:
            pending_agent = pending.get("agent_name", "info")
            agents = [pending_agent] if registry.get(pending_agent) else ["info"]
            intent = "general"
        elif mode == "report":
            agents = ["report"]
            intent = "report"
        elif mode == "chat":
            agents = []
            # Chat mode: trả lời nhanh, không chạy agent
            chat_resp = await fast_chat(user_input, ctx)
            history = ctx.setdefault("history", [])
            history.append({"role": "user", "content": user_input})
            from core.llm_agent import _strip_think
            clean = _strip_think(chat_resp)
            history.append({"role": "assistant", "content": clean, "agent": "chat"})
            ctx["history"] = history
            session.context = ctx
            await db.commit()
            return {
                "type": "chat",
                "response": clean,
                "session_id": session.id,
                "agents": ["chat"],
                "intent": "chat",
            }
        else:
            classification = await classify_intent(user_input)
            if classification.get("chat"):
                # Chat intent: trả lời nhanh qua fast_chat, không chạy agent
                chat_resp = await fast_chat(user_input, ctx)
                if not pending:
                    history = ctx.setdefault("history", [])
                    history.append({"role": "user", "content": user_input})
                    from core.llm_agent import _strip_think
                    clean = _strip_think(chat_resp)
                    history.append({"role": "assistant", "content": clean, "agent": "chat"})
                    ctx["history"] = history
                    session.context = ctx
                    await db.commit()
                return {
                    "type": "chat",
                    "response": clean,
                    "session_id": session.id,
                    "agents": ["chat"],
                    "intent": "chat",
                }
            agents = classification.get("agents", ["info"])
            intent = classification.get("intent", "general")

        history = ctx.setdefault("history", [])
        if not pending:
            history.append({"role": "user", "content": user_input})
        session.context = ctx
        session.active_agents = list(set((session.active_agents or []) + agents))
        await db.commit()

        responses = []
        response_data = None
        for agent_name in agents:
            task = AgentTask(
                session_id=session.id, user_id=user_id,
                agent_type=agent_name, intent=intent,
                input_data={"content": user_input}, status="pending",
            )
            db.add(task)
            await db.commit()
            await db.refresh(task)

            agent_result = await _execute_agent_task(
                task.id, session.id, user_id, agent_name,
                intent, user_input, user_context, session.context,
            )

            if agent_result and agent_result.response:
                from core.llm_agent import _strip_think
                clean = _strip_think(agent_result.response)
                responses.append(clean)
                if agent_result.data:
                    response_data = agent_result.data

            if agent_result and agent_result.pending_action:
                ctx["_pending_action"] = agent_result.pending_action
                # Direct DB update instead of ORM to avoid session staleness issues
                from sqlalchemy import update as sa_update
                from models.agent import AgentSession
                await db.execute(
                    sa_update(AgentSession)
                    .where(AgentSession.id == session.id)
                    .values(context=ctx)
                )
                await db.commit()
                break
            elif not agent_result or not agent_result.pending_action:
                ctx.pop("_pending_action", None)
                # Cô đọng lịch sử thành context_summary
                cs_list = ctx.get("context_summary", "").strip().split("\n")
                if cs_list == [""]:
                    cs_list = []
                first_sentence = responses[-1].split(".")[0][:200] if responses else user_input[:100]
                # Thêm entity names từ data.rows để context_summary có tên cụ thể
                entity_names = ""
                if agent_result and agent_result.data and agent_result.data.get("rows"):
                    rows = agent_result.data["rows"]
                    # Xác định loại thực thể từ row data
                    entity_label = ""
                    if rows and isinstance(rows[0], dict):
                        role_val = rows[0].get("role_name") or rows[0].get("vai_trò") or ""
                        ct_role = rows[0].get("role") or ""
                        if role_val == "STUDENT":
                            entity_label = "Sinh viên "
                        elif role_val == "TEACHER" or "TEACHER" in ct_role or ct_role == "MAIN_TEACHER":
                            entity_label = "Giáo viên "
                    # Lấy cột full_name hoặc name từ rows
                    names = []
                    all_classes = set()
                    all_ids = set()
                    for r in rows[:5]:
                        if isinstance(r, dict):
                            n = r.get("full_name") or r.get("name") or r.get("teacher_name") or ""
                            if n and len(n) > 2:
                                names.append(n)
                            uid = r.get("user_id")
                            if uid:
                                all_ids.add(str(uid))
                            cn = r.get("class_name") or r.get("class_code") or ""
                            if cn:
                                all_classes.add(str(cn))
                    # Thêm class_name nếu có
                    extra = ""
                    if all_classes:
                        extra = f" (Class: {', '.join(sorted(all_classes))})"
                    id_extra = ""
                    if all_ids:
                        id_extra = f" (ID: {', '.join(sorted(all_ids))})"
                    if len(names) == 1:
                        entity_names = f" [{entity_label}{names[0]}{id_extra}{extra}]"
                    elif len(names) > 1:
                        labeled = [f"{entity_label}{n}" for n in names]
                        entity_names = f" [{', '.join(labeled)}{id_extra}{extra}]"
                    elif len(rows) == 1:
                        vals = [str(v) for v in rows[0].values() if v is not None and isinstance(v, (str, int))]
                        if vals:
                            entity_names = f" [{entity_label}{vals[0]}{id_extra}{extra}]"
                cs_list.append(f"→ {agent_name}: {first_sentence}{entity_names}")
                ctx["context_summary"] = "\n".join(cs_list[-5:])
                from sqlalchemy import update as sa_update
                from models.agent import AgentSession
                await db.execute(
                    sa_update(AgentSession)
                    .where(AgentSession.id == session.id)
                    .values(context=ctx)
                )
                await db.commit()

        result_dict = {
            "type": "agent",
            "response": responses[0] if responses else "Không có phản hồi từ AI Agent.",
            "session_id": session.id,
            "agents": agents,
            "intent": intent,
            "pending_action": ctx.get("_pending_action"),
        }
        if response_data:
            result_dict["data"] = response_data
        return result_dict
    except Exception as e:
        logger.exception(f"process_agent_query failed: {e}")
        raise


async def process_chat(user_input: str, session_context: dict | None = None) -> dict:
    response = await fast_chat(user_input, session_context)
    return {
        "type": "chat",
        "response": response,
    }


async def run_agent_worker(agent_name: str):
    from db.session import get_session_factory

    while True:
        task_data = None
        try:
            task_data = await dequeue_task(f"agent:{agent_name}:tasks", timeout=5)
            if task_data is None:
                continue

            task_id = task_data.get("db_task_id", 0)
            if not task_id:
                logger.warning(f"Worker {agent_name}: no db_task_id in task data")
                continue

            await _execute_agent_task(
                task_id=task_id,
                session_id=task_data.get("session_id", 0),
                user_id=task_data.get("user_id", 0),
                agent_name=agent_name,
                intent=task_data.get("intent", ""),
                input_text=task_data.get("input", ""),
                user_context=task_data.get("user_context", {}),
                session_context=task_data.get("session_context", {}),
            )

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.exception(f"Worker error for {agent_name}: {e}")
            await asyncio.sleep(1)
