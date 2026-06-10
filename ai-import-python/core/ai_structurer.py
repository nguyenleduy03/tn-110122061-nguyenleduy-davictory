"""AI Structurer - uses LLM to convert parsed document text into test structure."""

import json
import re
from pathlib import Path

from loguru import logger

from infrastructure.llm_client import GroqClient, AIProviderError
from models.import_models import PreviewResponse, SectionPreview, GroupPreview, QuestionPreview, SkillType

_TEMPLATES = Path(__file__).parent.parent / "templates"


class StructurerError(Exception):
    pass


class AIStructurer:
    def __init__(self):
        self.llm = GroqClient()

    async def structure(self, raw_text: str, skill_hint: str = "",
                        test_type: str = "ACADEMIC") -> PreviewResponse:
        system = self._load_prompt()
        user = self._build_user_prompt(raw_text, skill_hint, test_type)

        try:
            resp = await self.llm.chat(system, user)
            data = self._extract_json(resp.content)
            return self._map_to_preview(data, resp.content)
        except AIProviderError as e:
            raise StructurerError(f"LLM error: {e}")
        except Exception as e:
            logger.error(f"Structure failed: {e}")
            raise StructurerError(str(e))

    def _load_prompt(self) -> str:
        path = _TEMPLATES / "structurer_prompt.txt"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return self._default_prompt()

    def _default_prompt(self) -> str:
        return """You are an IELTS test expert with 15 years of experience creating official IELTS exams.

Your task is to analyze a document and extract ALL questions, passages, options, and answers into a structured IELTS test format.

## SUPPORTED QUESTION TYPES
- MCQ: Multiple Choice with options A/B/C/D
- TFNG: True/False/Not Given
- YNNG: Yes/No/Not Given
- FILL_BLANK: Fill in the blank (one or more words)
- SHORT_ANSWER: Short answer questions
- MATCHING_HEADINGS: Match headings to paragraphs
- MATCHING: Match features/information to paragraphs
- SENTENCE_COMPLETION: Complete sentences with words from text
- SUMMARY_COMPLETION: Complete summary with words from text
- NOTE_COMPLETION: Complete notes/table/form
- FLOW_CHART: Complete flow-chart

## RULES
1. Identify the IELTS skill (LISTENING/READING/WRITING/SPEAKING)
2. For READING: extract passages, then questions grouped by passage
3. For LISTENING: extract all parts (Part 1-4), questions grouped by section
4. For WRITING: extract Task 1 and Task 2 prompts
5. For SPEAKING: extract Part 1, Part 2 (cue card), Part 3 questions
6. Preserve question numbering exactly as in the document
7. Include ALL options and mark the correct answer
8. For fill-blank questions, provide exact answers
9. If answers are not explicitly marked, infer from context but mark confidence low

## OUTPUT FORMAT (JSON only, no markdown):
{
  "skill": "READING",
  "title": "Descriptive test title",
  "sections": [
    {
      "title": "Passage 1: ...",
      "part_order": 1,
      "groups": [
        {
          "title": "Questions 1-5",
          "question_type": "MCQ",
          "content_type": "READING_PASSAGE",
          "instructions": "Choose the correct letter, A, B, C or D.",
          "passage_text": "Full passage text...",
          "questions": [
            {
              "number": 1,
              "text": "Question text",
              "options": [
                {"label": "A", "text": "Option A", "correct": false},
                {"label": "B", "text": "Option B", "correct": true}
              ],
              "answers": [{"text": "B"}]
            }
          ]
        }
      ]
    }
  ]
}

Return ONLY valid JSON. No markdown fences, no extra text."""

    def _build_user_prompt(self, raw_text: str, skill_hint: str, test_type: str) -> str:
        max_len = 15000
        trimmed = raw_text[:max_len] + ("..." if len(raw_text) > max_len else "")
        hint = f"Hint: This appears to be a {skill_hint} test.\n" if skill_hint else ""
        return f"""{hint}Test Type: {test_type}

## DOCUMENT CONTENT
{trimmed}

Analyze the document above and extract the complete IELTS test structure in the JSON format specified."""

    def _extract_json(self, content: str) -> dict:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        m = re.search(r"\{.*\}", content, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                pass
        raise StructurerError("Could not extract JSON from AI response")

    def _map_to_preview(self, data: dict, raw: str) -> PreviewResponse:
        sections = []
        total_q = 0
        for sec in data.get("sections", []):
            groups = []
            for grp in sec.get("groups", []):
                questions = []
                for q in grp.get("questions", []):
                    questions.append(QuestionPreview(
                        number=q.get("number", 0),
                        question_type=grp.get("question_type", "MCQ"),
                        text=q.get("text", ""),
                        options=q.get("options", []),
                        answers=q.get("answers", []),
                        correct_answer=q.get("correct_answer", ""),
                    ))
                    total_q += 1
                groups.append(GroupPreview(
                    title=grp.get("title", ""),
                    content_type=grp.get("content_type", "READING_PASSAGE"),
                    question_type=grp.get("question_type", "MCQ"),
                    instructions=grp.get("instructions", ""),
                    passage_text=grp.get("passage_text", ""),
                    questions=questions,
                ))
            sections.append(SectionPreview(
                title=sec.get("title", ""),
                skill=data.get("skill", "READING"),
                part_order=sec.get("part_order", 1),
                groups=groups,
                question_count=sum(len(g.questions) for g in groups),
            ))
        return PreviewResponse(
            skill=data.get("skill", "READING"),
            title=data.get("title", "Imported Test"),
            test_type=data.get("testType", "ACADEMIC"),
            total_questions=total_q,
            sections=sections,
            status="COMPLETED",
            raw_ai_output=raw,
        )
