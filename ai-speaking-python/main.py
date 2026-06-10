"""AI Speaking Service - FastAPI application entrypoint.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5183 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.session import router as session_router
from api.scoring import router as scoring_router
from api.admin import router as admin_router


app = FastAPI(
    title="DAVictory AI Speaking Service",
    description="AI-powered IELTS Speaking evaluation with STT/TTS and multi-provider LLM scoring",
    version="2.0.0",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(session_router)
app.include_router(scoring_router)
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-speaking-python", "port": 5183}
