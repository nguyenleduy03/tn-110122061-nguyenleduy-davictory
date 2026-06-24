"""AI Speaking Service - Exam grading endpoint."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import json

from core.exam_graders import ExamGrader
from models.scoring import ExamGradeResultDTO

router = APIRouter(prefix="/api/ai/speaking", tags=["speaking-exam"])
grader = ExamGrader()


@router.post("/exam-grade")
async def exam_grade(
    questions: str = Form(...),
    files: list[UploadFile] = File(...),
    audio_urls: Optional[str] = Form(None),
):
    try:
        q_list = json.loads(questions)
        if not isinstance(q_list, list) or not q_list:
            raise HTTPException(400, "questions must be a non-empty JSON array")
    except json.JSONDecodeError:
        raise HTTPException(400, "questions must be valid JSON array")

    result = await grader.grade(q_list, files, audio_urls)
    return ExamGradeResultDTO.from_result(result)
