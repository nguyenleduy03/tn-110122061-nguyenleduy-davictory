"""AI Import Service - FastAPI application entrypoint.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5186 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.import_api import router as import_router


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
