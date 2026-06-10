"""AI Writing Service - FastAPI application entrypoint.

Usage:
    uvicorn main:app --host 0.0.0.0 --port 5182 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.grading import router as grading_router
from api.admin import router as admin_router
from api.evaluation import router as eval_router


app = FastAPI(
    title="DAVictory AI Writing Service",
    description="AI-powered IELTS Writing Task 1 & 2 grading with RAG pipeline and ChromaDB",
    version="2.0.0",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(grading_router)
app.include_router(admin_router)
app.include_router(eval_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-writing-python", "port": 5182}
