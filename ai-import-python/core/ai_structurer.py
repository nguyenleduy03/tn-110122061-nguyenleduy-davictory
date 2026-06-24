"""AI Structurer - uses LLM to convert parsed document text into test structure."""

import json
import re
from pathlib import Path

from loguru import logger

from infrastructure.llm_client import GroqClient, AIProviderError
from models.import_models import PreviewResponse, SectionPreview, GroupPreview, QuestionPreview

_TEMPLATES = Path(__file__).parent.parent / "templates"

VALID_QUESTION_TYPES = {
    "MCQ", "TFNG", "YNNG", "FILL_BLANK", "SHORT_ANSWER",
    "SENTENCE_COMPLETION", "SUMMARY_COMPLETION", "NOTE_COMPLETION",
    "FLOW_CHART", "DIAGRAM_LABELLING", "MATCHING_HEADINGS", "MATCHING",
    "WRITING_TASK1", "WRITING_TASK2", "SPEAKING_PART1", "SPEAKING_PART2",
    "SPEAKING_PART3", "FORM_COMPLETION",
}

VALID_SKILLS = {"LISTENING", "READING", "WRITING", "SPEAKING"}

VALID_CONTENT_TYPES = {
    "READING_PASSAGE", "TABLE", "FLOW_CHART", "DIAGRAM",
    "WRITING_PASSAGE", "SPEAKING_INTERVIEW", "SPEAKING_CUECARD",
    "SPEAKING_DISCUSSION"
}

SKILL_QUESTION_TYPES = {
    "LISTENING": {"MCQ", "FILL_BLANK", "SHORT_ANSWER", "NOTE_COMPLETION",
                  "SENTENCE_COMPLETION", "FORM_COMPLETION"},
    "READING": {"MCQ", "TFNG", "YNNG", "MATCHING_HEADINGS", "MATCHING",
                "FILL_BLANK", "SHORT_ANSWER", "SENTENCE_COMPLETION",
                "SUMMARY_COMPLETION", "NOTE_COMPLETION", "FLOW_CHART",
                "DIAGRAM_LABELLING"},
    "WRITING": {"WRITING_TASK1", "WRITING_TASK2"},
    "SPEAKING": {"SPEAKING_PART1", "SPEAKING_PART2", "SPEAKING_PART3"},
}


_SKILL_CONTENT_TYPES = {
    "LISTENING": {"READING_PASSAGE", "TABLE", "NOTE_COMPLETION"},
    "READING": {"READING_PASSAGE", "TABLE", "FLOW_CHART", "DIAGRAM"},
    "WRITING": {"WRITING_PASSAGE"},
    "SPEAKING": {"SPEAKING_INTERVIEW", "SPEAKING_CUECARD", "SPEAKING_DISCUSSION"},
}

_QUESTION_CONTENT_MAP = {
    "MCQ": "READING_PASSAGE", "TFNG": "TRUE_FALSE_NG", "YNNG": "TRUE_FALSE_NG",
    "FILL_BLANK": "READING_PASSAGE", "SHORT_ANSWER": "READING_PASSAGE",
    "SENTENCE_COMPLETION": "READING_PASSAGE", "SUMMARY_COMPLETION": "SUMMARY_COMPLETION",
    "NOTE_COMPLETION": "NOTE_COMPLETION", "FLOW_CHART": "FLOW_CHART",
    "DIAGRAM_LABELLING": "DIAGRAM", "MATCHING_HEADINGS": "MATCHING_HEADING",
    "MATCHING": "MATCHING_FEATURES", "FORM_COMPLETION": "NOTE_COMPLETION",
    "WRITING_TASK1": "WRITING_PASSAGE", "WRITING_TASK2": "WRITING_PASSAGE",
    "SPEAKING_PART1": "SPEAKING_INTERVIEW", "SPEAKING_PART2": "SPEAKING_CUECARD",
    "SPEAKING_PART3": "SPEAKING_DISCUSSION",
}


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
            if data.get("skill") == "UNKNOWN" or not data.get("sections"):
                logger.warning("LLM returned empty result, retrying...")
                data = self._fallback_extract(raw_text, skill_hint)
            self._validate(data)
            data = self._filter_by_skill(data)
            return self._map_to_preview(data, resp.content)
        except AIProviderError as e:
            raise StructurerError(f"LLM error: {e}")
        except StructurerError:
            raise
        except Exception as e:
            logger.error(f"Structure failed: {e}")
            raise StructurerError(str(e))

    def _validate(self, data: dict):
        errors = []

        skill = data.get("skill", "").upper()
        if skill not in VALID_SKILLS:
            errors.append(f"Invalid skill '{skill}', must be one of {VALID_SKILLS}")

        sections = data.get("sections", [])
        if not sections:
            errors.append("No sections found in response")

        for si, sec in enumerate(sections):
            if not sec.get("title"):
                errors.append(f"Section {si + 1}: missing title")
            groups = sec.get("groups", [])
            if not groups:
                errors.append(f"Section '{sec.get('title', si+1)}': no groups found")
            for gi, grp in enumerate(groups):
                qtype = grp.get("question_type", "")
                if qtype not in VALID_QUESTION_TYPES:
                    errors.append(f"Section {si+1}, Group {gi+1}: invalid question_type '{qtype}'")
                questions = grp.get("questions", [])
                if not questions:
                    errors.append(f"Section {si+1}, Group {gi+1}: no questions found")
                for qi, q in enumerate(questions):
                    if not q.get("number"):
                        errors.append(f"Section {si+1}, Group {gi+1}, Q{qi+1}: missing question number")
                    if qtype in ("MCQ", "TFNG", "YNNG"):
                        opts = q.get("options", [])
                        if not opts:
                            errors.append(f"Section {si+1}, Group {gi+1}, Q{q.get('number')}: MCQ/TFNG/YNNG without options")

        if errors:
            logger.warning(f"Validation warnings ({len(errors)}):\n" + "\n".join(errors[:10]))

    def _filter_by_skill(self, data: dict) -> dict:
        skill = data.get("skill", "").upper()
        valid_qt = SKILL_QUESTION_TYPES.get(skill)
        valid_ct = _SKILL_CONTENT_TYPES.get(skill, set())
        if not valid_qt:
            return data

        _SKILL_QT_OVERRIDE = {
            "LISTENING": {
                "FILL_BLANK": "NOTE_COMPLETION",
                "MCQ": "READING_PASSAGE",
                "SHORT_ANSWER": "NOTE_COMPLETION",
            },
        }

        removed = 0
        fixed = 0
        for sec in data.get("sections", []):
            good = []
            for g in sec.get("groups", []):
                qt = g.get("question_type", "")
                if qt not in valid_qt:
                    removed += 1
                    continue
                ct = g.get("content_type", "")
                if ct not in valid_ct:
                    override = _SKILL_QT_OVERRIDE.get(skill, {}).get(qt)
                    g["content_type"] = override or _QUESTION_CONTENT_MAP.get(qt, "READING_PASSAGE")
                    fixed += 1
                good.append(g)
            sec["groups"] = good

        if removed:
            logger.warning(f"Removed {removed} group(s) with types invalid for skill '{skill}'")
        if fixed:
            logger.info(f"Fixed {fixed} group(s) content_type for skill '{skill}'")
        return data

    def _fallback_extract(self, raw_text: str, skill_hint: str) -> dict:
        lines = raw_text.strip().split("\n")
        title = "Imported Test"
        sections = []
        current_section = None
        current_group = None
        q_num = 0

        for line in lines:
            line = line.strip()
            if not line:
                continue
            upper = line.upper()
            if any(p in upper for p in ["PASSAGE", "SECTION", "PART"]):
                if current_group and current_section:
                    current_section["groups"].append(current_group)
                if current_section:
                    sections.append(current_section)
                current_section = {
                    "title": line[:100],
                    "part_order": len(sections) + 1,
                    "groups": [],
                }
                current_group = None
                continue

            if current_section:
                if not current_group and "QUESTION" in upper:
                    current_group = {
                        "title": line[:100],
                        "question_type": self._guess_type(upper),
                        "content_type": "READING_PASSAGE",
                        "instructions": "",
                        "passage_text": "",
                        "questions": [],
                    }
                if current_group and re.match(r"^\d+[.)]", line):
                    q_num += 1
                    current_group["questions"].append({
                        "number": q_num,
                        "text": re.sub(r"^\d+[.)]\s*", "", line)[:200],
                        "options": [],
                        "answers": [],
                        "correct_answer": "",
                    })

        if current_group and current_section:
            current_section["groups"].append(current_group)
        if current_section:
            sections.append(current_section)

        if not sections:
            sections.append({
                "title": "Questions",
                "part_order": 1,
                "groups": [{
                    "title": "Questions 1-" + str(q_num or 1),
                    "question_type": self._guess_type(raw_text.upper()),
                    "content_type": "READING_PASSAGE",
                    "instructions": "",
                    "passage_text": raw_text[:3000],
                    "questions": [{"number": i+1, "text": "", "options": [], "answers": [], "correct_answer": ""}
                                  for i in range(min(q_num or 10, 40))],
                }]
            })

        return {
            "skill": skill_hint or self._guess_skill(raw_text),
            "title": title,
            "sections": sections,
        }

    def _guess_type(self, upper: str) -> str:
        if any(w in upper for w in ["TRUE", "FALSE", "NOT GIVEN", "YES", "NO"]):
            return "TFNG"
        if "CHOOSE" in upper or "LETTER" in upper or "MULTIPLE CHOICE" in upper:
            return "MCQ"
        if "HEADING" in upper or "MATCH" in upper:
            return "MATCHING_HEADINGS"
        if "NO MORE THAN" in upper and "WORD" in upper:
            return "FILL_BLANK"
        if "COMPLETE THE SUMMARY" in upper:
            return "SUMMARY_COMPLETION"
        if "COMPLETE THE NOTES" in upper or "COMPLETE THE TABLE" in upper:
            return "NOTE_COMPLETION"
        if "COMPLETE THE FLOW" in upper or "FLOW CHART" in upper:
            return "FLOW_CHART"
        if "DIAGRAM" in upper or "LABEL" in upper:
            return "DIAGRAM_LABELLING"
        if "WRITE" in upper or "TASK 1" in upper or "TASK 2" in upper:
            return "WRITING_TASK1"
        if "SPEAK" in upper or "CUE CARD" in upper or "INTERVIEW" in upper:
            return "SPEAKING_PART1"
        return "MCQ"

    def _guess_skill(self, text: str) -> str:
        upper = text.upper()[:5000]
        scores = {}
        for skill in ["LISTENING", "READING", "WRITING", "SPEAKING"]:
            scores[skill] = upper.count(skill)
        if "LISTEN" in upper:
            scores["LISTENING"] += 5
        if "PASSAGE" in upper or "PARAGRAPH" in upper:
            scores["READING"] += 10
        if "TASK 1" in upper or "TASK 2" in upper or "ESSAY" in upper:
            scores["WRITING"] += 10
        if "CUE CARD" in upper or "INTERVIEW" in upper:
            scores["SPEAKING"] += 10
        if sum(scores.values()) == 0:
            return "READING"
        return max(scores, key=scores.get)

    def _load_prompt(self) -> str:
        path = _TEMPLATES / "structurer_prompt.txt"
        if path.exists():
            return path.read_text(encoding="utf-8")
        return self._default_prompt()

    def _default_prompt(self) -> str:
        return """You are an IELTS test expert. Extract ALL questions, passages, options, and answers into structured JSON.

SKILL: LISTENING(Part 1-4/audio), READING(passages/headings/TFNG), WRITING(Task 1/2), SPEAKING(interview/cue card/discussion).

TYPES: MCQ(A/B/C/D), TFNG(TRUE/FALSE/NOT GIVEN), YNNG(YES/NO/NOT GIVEN), FILL_BLANK, SHORT_ANSWER, SENTENCE_COMPLETION, SUMMARY_COMPLETION, NOTE_COMPLETION, FLOW_CHART, DIAGRAM_LABELLING, MATCHING_HEADINGS, MATCHING, WRITING_TASK1/2, SPEAKING_PART1/2/3.

OUTPUT: {"skill":"READING","title":"","sections":[{"title":"","part_order":1,"groups":[{"title":"Q1-5","question_type":"MCQ","content_type":"READING_PASSAGE","instructions":"","passage_text":"","questions":[{"number":1,"text":"","options":[{"label":"A","text":"","correct":true}],"answers":[],"correct_answer":"A"}]}]}]}
Return ONLY valid JSON. No extra text."""

    def _build_user_prompt(self, raw_text: str, skill_hint: str, test_type: str) -> str:
        max_len = 4000
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
                    raw_opts = q.get("options", [])
                    raw_ans = q.get("answers", [])
                    questions.append(QuestionPreview(
                        number=q.get("number", 0),
                        question_type=grp.get("question_type", "MCQ"),
                        text=q.get("text", ""),
                        options=[{"label": o, "text": o} if isinstance(o, str) else o for o in raw_opts],
                        answers=[{"text": a} if isinstance(a, str) else a for a in raw_ans],
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
            total_questions=total_q or len(sections),
            sections=sections,
            status="COMPLETED",
            raw_ai_output=raw,
        )
