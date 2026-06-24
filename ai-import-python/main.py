"""AI Import Service - FastAPI application entrypoint.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5186 --reload
"""

import sys
from pathlib import Path
from loguru import logger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.import_api import router as import_router

# Xóa default handler, thêm handler ra console và file
logger.remove()
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level:8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>", level="DEBUG")
logger.add(Path(__file__).parent / "logs" / "import_{time:YYYY-MM-DD}.log",
           rotation="1 day", retention="7 days", level="DEBUG",
           format="{time:YYYY-MM-DD HH:mm:ss} | {level:8} | {name}:{function}:{line} - {message}")

app = FastAPI(
    title="DAVictory AI Import Service",
    description="AI-powered document import - auto-create IELTS tests from PDF/DOCX/TXT",
    version="1.0.0",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(import_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-import-python", "port": 5186}


@app.on_event("startup")
async def startup():
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)
    logger.info("AI Import Service started")
