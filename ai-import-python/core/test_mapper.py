"""Test mapper - converts AI preview into Backend TestSaveRequest format."""

import json
import re
from loguru import logger


QUESTION_TYPE_MAP = {
    "MCQ": {"code": "MCQ", "hasOptions": True, "hasTextAnswer": False},
    "TFNG": {"code": "TFNG", "hasOptions": True, "hasTextAnswer": False},
    "YNNG": {"code": "YNNG", "hasOptions": True, "hasTextAnswer": False},
    "FILL_BLANK": {"code": "FILL_BLANK", "hasOptions": False, "hasTextAnswer": True},
    "SHORT_ANSWER": {"code": "SHORT_ANSWER", "hasOptions": False, "hasTextAnswer": True},
    "SENTENCE_COMPLETION": {"code": "SENTENCE_COMPLETION", "hasOptions": False, "hasTextAnswer": True},
    "SUMMARY_COMPLETION": {"code": "SUMMARY_COMPLETION", "hasOptions": False, "hasTextAnswer": True},
    "NOTE_COMPLETION": {"code": "NOTE_COMPLETION", "hasOptions": False, "hasTextAnswer": True},
    "FLOW_CHART": {"code": "FLOW_CHART", "hasOptions": False, "hasTextAnswer": True},
    "DIAGRAM_LABELLING": {"code": "DIAGRAM_LABELLING", "hasOptions": False, "hasTextAnswer": True},
    "MATCHING_HEADINGS": {"code": "MATCHING_HEADINGS", "hasOptions": False, "hasTextAnswer": False},
    "MATCHING": {"code": "MATCHING", "hasOptions": False, "hasTextAnswer": False},
    "FORM_COMPLETION": {"code": "FILL_BLANK", "hasOptions": False, "hasTextAnswer": True},
    "TABLE_COMPLETION": {"code": "FILL_BLANK", "hasOptions": False, "hasTextAnswer": True},
    "WRITING_TASK1": {"code": "WRITING_TASK1", "hasOptions": False, "hasTextAnswer": False},
    "WRITING_TASK2": {"code": "WRITING_TASK2", "hasOptions": False, "hasTextAnswer": False},
    "SPEAKING_PART1": {"code": "SPEAKING_PART1", "hasOptions": False, "hasTextAnswer": False},
    "SPEAKING_PART2": {"code": "SPEAKING_PART2", "hasOptions": False, "hasTextAnswer": False},
    "SPEAKING_PART3": {"code": "SPEAKING_PART3", "hasOptions": False, "hasTextAnswer": False},
}

CONTENT_TYPE_MAP = {
    "MCQ": "READING_PASSAGE",
    "TFNG": "TRUE_FALSE_NG",
    "YNNG": "TRUE_FALSE_NG",
    "FILL_BLANK": "READING_PASSAGE",
    "SHORT_ANSWER": "READING_PASSAGE",
    "SENTENCE_COMPLETION": "READING_PASSAGE",
    "FORM_COMPLETION": "NOTE_COMPLETION",
    "TABLE_COMPLETION": "TABLE_COMPLETION",
    "SUMMARY_COMPLETION": "SUMMARY_COMPLETION",
    "NOTE_COMPLETION": "NOTE_COMPLETION",
    "FLOW_CHART": "FLOW_CHART",
    "DIAGRAM_LABELLING": "DIAGRAM",
    "MATCHING_HEADINGS": "MATCHING_HEADING",
    "MATCHING": "MATCHING_FEATURES",
    "WRITING_TASK1": "WRITING_TASK",
    "WRITING_TASK2": "WRITING_TASK",
    "SPEAKING_PART1": "SPEAKING_INTERVIEW",
    "SPEAKING_PART2": "SPEAKING_CUECARD",
    "SPEAKING_PART3": "SPEAKING_DISCUSSION",
}

SESSION_ID_MAP = {"LISTENING": 1, "READING": 2, "WRITING": 3, "SPEAKING": 4}

PART_ID_MAP = {
    "LISTENING": [1, 2, 3, 4],
    "READING": [5, 6, 7],
    "WRITING": [8, 9],
    "SPEAKING": [10, 11, 12],
}


class TestMapper:
    def map_to_save_request(self, preview, test_type: str, title: str,
                            user_id: int,
                            target_band: str = "7.0") -> dict:
        skill = preview.skill.upper() if preview.skill else "READING"
        session_id = SESSION_ID_MAP.get(skill, 2)

        sessions = []
        for sec_idx, section in enumerate(preview.sections):
            part_ids = PART_ID_MAP.get(skill, [5])
            part_id = part_ids[sec_idx] if sec_idx < len(part_ids) else part_ids[-1]

            parts = [{
                "partId": part_id,
                "orderIndex": sec_idx + 1,
                "questionGroups": []
            }]

            global_q_num = 0
            for grp in section.groups:
                qt_info = self._get_question_type(grp)
                ct = grp.content_type or CONTENT_TYPE_MAP.get(grp.question_type, "READING_PASSAGE")

                questions = []
                for q in grp.questions:
                    global_q_num += 1
                    q_data = self._build_question(q, qt_info, grp, global_q_num)
                    questions.append(q_data)

                passage_text = self._build_passage_text(grp, ct, questions, skill)

                group_q_from = global_q_num - len(questions) + 1
                group = {
                    "title": grp.title or f"Questions {group_q_from}-{global_q_num}",
                    "instructions": grp.instructions or "",
                    "contentType": ct,
                    "passageText": passage_text,
                    "fromQuestion": group_q_from,
                    "toQuestion": global_q_num,
                    "orderIndex": len(parts[0]["questionGroups"]) + 1,
                    "questions": questions,
                }

                if ct == "TRUE_FALSE_NG":
                    group["passageText"] = json.dumps({
                        "isYesNo": grp.question_type == "YNNG"
                    })
                    group["isYesNo"] = grp.question_type == "YNNG"

                parts[0]["questionGroups"].append(group)

            sessions.append({
                "sessionId": session_id,
                "orderIndex": sec_idx + 1,
                "parts": parts,
            })

        return {
            "title": title or preview.title or "Imported Test",
            "testType": test_type,
            "isFullTest": False,
            "targetBand": target_band,
            "createdByUserId": user_id,
            "createVersion": True,
            "sessions": sessions,
        }

    def _get_question_type(self, grp):
        qtype = grp.question_type
        qt_info = QUESTION_TYPE_MAP.get(qtype)
        if qt_info:
            return qt_info
        for key, val in QUESTION_TYPE_MAP.items():
            if qtype and qtype.startswith(key[:3]):
                return val
        return QUESTION_TYPE_MAP["MCQ"]

    def _build_question(self, q, qt_info, grp, global_q_num):
        q_data = {
            "questionTypeCode": qt_info["code"],
            "questionNumber": global_q_num,
            "questionCount": 1,
            "questionText": q.text or "",
            "points": 1.0,
            "orderIndex": q.number if q.number else global_q_num,
            "options": [],
            "answers": [],
        }

        if qt_info["hasOptions"]:
            has_correct = any(o.get("correct") for o in q.options)
            for opt in q.options:
                q_data["options"].append({
                    "optionLabel": opt.get("label", ""),
                    "optionText": opt.get("text", ""),
                    "isCorrect": opt.get("correct", False),
                    "orderIndex": len(q_data["options"]) + 1,
                })

        if qt_info["hasTextAnswer"]:
            for ans in q.answers:
                answer_text = ans.get("text", "")
                if not answer_text or answer_text.strip() == "":
                    continue
                alt = ans.get("alternativeAnswers", "")
                q_data["answers"].append({
                    "answerText": answer_text.strip(),
                    "alternativeAnswers": alt if alt else None,
                    "isCaseSensitive": ans.get("isCaseSensitive", False),
                    "isSample": False,
                    "blankIndex": ans.get("blankIndex", len(q_data["answers"])),
                })

            if q.correct_answer and not q.answers:
                q_data["answers"].append({
                    "answerText": q.correct_answer.strip(),
                    "alternativeAnswers": None,
                    "isCaseSensitive": False,
                    "isSample": False,
                    "blankIndex": 0,
                })

        return q_data

    def _build_passage_text(self, grp, ct, questions, skill):
        raw_passage = grp.passage_text or ""

        if ct == "READING_PASSAGE":
            paragraphs = [p.strip() for p in raw_passage.split("\n\n") if p.strip()]
            if paragraphs:
                return json.dumps({"paragraphs": paragraphs})
            return raw_passage

        if ct == "NOTE_COMPLETION":
            note_text = re.sub(r"_{3,}(?:\s+|$)", "[blank] ", raw_passage)
            note_text = re.sub(r"_{3,}", "[blank]", note_text)
            return json.dumps({
                "noteText": note_text,
                "title": grp.title or "Notes"
            })

        if ct == "TABLE_COMPLETION":
            note_text = re.sub(r"_{3,}(?:\s+|$)", "[blank] ", raw_passage)
            note_text = re.sub(r"_{3,}", "[blank]", note_text)
            return json.dumps({
                "tableTitle": grp.title or "",
                "noteText": note_text,
            })

        if ct == "SUMMARY_COMPLETION":
            return raw_passage or ""

        if ct == "FLOW_CHART":
            return json.dumps({
                "flowNodes": [],
                "optionBank": [],
                "allowOptionReuse": True,
            })

        if ct == "DIAGRAM":
            return raw_passage or ""

        if ct == "WRITING_TASK":
            task_type = "TASK1" if "TASK 1" in raw_passage.upper() or "TASK1" in raw_passage.upper() else "TASK2"
            return json.dumps({
                "taskInstruction": raw_passage,
                "minWords": 150 if task_type == "TASK1" else 250,
                "recommendedMinutes": 20 if task_type == "TASK1" else 40,
            })

        if ct == "SPEAKING_INTERVIEW":
            return json.dumps({
                "interviewType": "PART1",
                "partInstruction": grp.instructions or "The examiner asks you about yourself, your home, work or studies and other familiar topics.",
                "classification": "GENERAL",
                "topics": [],
            })

        if ct == "SPEAKING_DISCUSSION":
            return json.dumps({
                "interviewType": "PART3",
                "partInstruction": grp.instructions or "The examiner asks further questions connected to the topic in Part 2.",
                "classification": "GENERAL",
                "topics": [],
            })

        if ct == "SPEAKING_CUECARD":
            topic = raw_passage or (questions[0]["questionText"] if questions else "")
            return json.dumps({
                "partInstruction": grp.instructions or "The examiner will give you a topic card. You will have 1 minute to prepare.",
                "topic": topic,
                "shouldSayLabel": "You should say:",
                "bulletPoints": [],
                "closingSentence": "",
                "prepSeconds": 60,
                "speakingSeconds": 120,
            })

        if ct == "MATCHING_HEADING":
            return json.dumps({
                "headingBank": [],
                "allowOptionReuse": True,
            })

        if ct in ("MATCHING_FEATURES", "DRAG_MATCHING"):
            return json.dumps({
                "leftTitle": "",
                "rightTitle": "",
                "optionBank": [],
                "allowOptionReuse": True,
            })

        if ct == "TRUE_FALSE_NG":
            return json.dumps({"isYesNo": False})

        return raw_passage
