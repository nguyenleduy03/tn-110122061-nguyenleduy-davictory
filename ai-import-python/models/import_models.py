"""AI Import Service - Data models."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class QuestionType(str, Enum):
    MCQ = "MCQ"
    TFNG = "TFNG"
    YNNG = "YNNG"
    FILL_BLANK = "FILL_BLANK"
    SHORT_ANSWER = "SHORT_ANSWER"
    MATCHING = "MATCHING"
    MATCHING_HEADINGS = "MATCHING_HEADINGS"
    SENTENCE_COMPLETION = "SENTENCE_COMPLETION"
    SUMMARY_COMPLETION = "SUMMARY_COMPLETION"
    NOTE_COMPLETION = "NOTE_COMPLETION"
    FLOW_CHART = "FLOW_CHART"
    DIAGRAM_LABELLING = "DIAGRAM_LABELLING"
    WRITING_TASK1 = "WRITING_TASK1"
    WRITING_TASK2 = "WRITING_TASK2"
    SPEAKING_PART1 = "SPEAKING_PART1"
    SPEAKING_PART2 = "SPEAKING_PART2"
    SPEAKING_PART3 = "SPEAKING_PART3"


class SkillType(str, Enum):
    LISTENING = "LISTENING"
    READING = "READING"
    WRITING = "WRITING"
    SPEAKING = "SPEAKING"


class ParseResult(BaseModel):
    success: bool = True
    skill: str = ""
    raw_text: str = ""
    text_length: int = 0
    ocr_used: bool = False
    filename: str = ""
    file_type: str = ""


class QuestionPreview(BaseModel):
    number: int = 0
    question_type: str = "MCQ"
    text: str = ""
    options: list[dict] = []
    answers: list[dict] = []
    correct_answer: str = ""


class GroupPreview(BaseModel):
    title: str = "Questions"
    content_type: str = "READING_PASSAGE"
    question_type: str = "MCQ"
    instructions: str = ""
    passage_text: str = ""
    questions: list[QuestionPreview] = []


class SectionPreview(BaseModel):
    title: str = ""
    skill: str = ""
    part_order: int = 0
    groups: list[GroupPreview] = []
    question_count: int = 0


class PreviewResponse(BaseModel):
    task_id: str = ""
    status: str = "PENDING"
    test_type: str = "ACADEMIC"
    skill: str = "READING"
    title: str = ""
    total_questions: int = 0
    sections: list[SectionPreview] = []
    raw_ai_output: str = ""


class CreateRequest(BaseModel):
    task_id: str
    test_type: str = "ACADEMIC"
    title: str = ""
    target_band: str = "7.0"
    created_by_user_id: int = 1
    sections: list[SectionPreview] = []


class CreateResponse(BaseModel):
    success: bool = True
    test_id: int = 0
    title: str = ""
    url: str = ""
    message: str = ""


class ParseResponse(BaseModel):
    task_id: str = ""
    status: str = ""
    raw_text: str = ""
    text_length: int = 0
    filename: str = ""
    file_type: str = ""
    ocr_used: bool = False


class StructureRequest(BaseModel):
    task_id: str
    text: str
    skill_hint: str = ""
    test_type: str = "ACADEMIC"
    part: str = ""
    question_type: str = ""


class StatusResponse(BaseModel):
    task_id: str
    status: str
    progress: str = ""
    result: Optional[PreviewResponse] = None
