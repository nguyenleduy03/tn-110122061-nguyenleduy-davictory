"""AI Agent Service - Multi-Agent System for DAVictory.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5187 --reload
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from api.agent import router as agent_router
from api.category import router as category_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tạo bảng DB nếu chưa tồn tại
    try:
        from models.agent import create_tables
        await create_tables()
        logger.info("✅ Đã đồng bộ database tables")
    except Exception as e:
        logger.warning(f"Không thể tạo tables: {e}")

    # Build TF-IDF index for table embedding
    try:
        from core.schema import TABLE_SCHEMAS
        from core.embedding import build_index
        build_index([f"{k}: {v}" for k, v in TABLE_SCHEMAS.items()])
    except Exception as e:
        logger.warning(f"Không thể build embedding index: {e}")

    # Đăng ký agents
    from core.registry import registry
    from agents.content_agent import ContentAgent
    from agents.info_agent import InfoAgent
    from agents.report_agent import ReportAgent
    from agents.email_agent import EmailAgent

    registry.register(ContentAgent())
    registry.register(InfoAgent())
    registry.register(ReportAgent())
    registry.register(EmailAgent())
    logger.info(f"✅ Đã đăng ký {len(registry.list_agents())} agents: {', '.join(a['name'] for a in registry.list_agents())}")

    # Start background workers
    tasks = []
    for name in registry._agents:
        task = asyncio.create_task(_run_worker(name))
        tasks.append(task)
        logger.info(f"  ✅ Worker started for agent: {name}")

    yield

    # Cleanup
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


async def _run_worker(agent_name: str):
    from core.orchestrator import run_agent_worker
    await run_agent_worker(agent_name)


app = FastAPI(
    lifespan=lifespan,
    title="DAVictory AI Agent Service",
    description="Multi-Agent System - Content, Info, Report, Email",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router)
app.include_router(category_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"error": f"Internal server error: {str(exc)}"},
    )

# Serve uploaded files (images from agent)
app.mount("/api/agent/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads_raw")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-agent-python", "port": 5187}
