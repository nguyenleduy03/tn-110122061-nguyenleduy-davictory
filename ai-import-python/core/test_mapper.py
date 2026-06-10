"""Test mapper - converts AI preview into Backend TestSaveRequest format."""

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
    "WRITING_TASK1": {"code": "WRITING_TASK1", "hasOptions": False, "hasTextAnswer": False},
    "WRITING_TASK2": {"code": "WRITING_TASK2", "hasOptions": False, "hasTextAnswer": False},
    "SPEAKING_PART1": {"code": "SPEAKING_PART1", "hasOptions": False, "hasTextAnswer": False},
    "SPEAKING_PART2": {"code": "SPEAKING_PART2", "hasOptions": False, "hasTextAnswer": False},
    "SPEAKING_PART3": {"code": "SPEAKING_PART3", "hasOptions": False, "hasTextAnswer": False},
}

CONTENT_TYPE_MAP = {
    "MCQ": "STANDALONE",
    "TFNG": "STANDALONE",
    "YNNG": "STANDALONE",
    "FILL_BLANK": "STANDALONE",
    "SHORT_ANSWER": "STANDALONE",
    "SENTENCE_COMPLETION": "STANDALONE",
    "SUMMARY_COMPLETION": "STANDALONE",
    "NOTE_COMPLETION": "TABLE",
    "FLOW_CHART": "FLOW_CHART",
    "DIAGRAM_LABELLING": "DIAGRAM",
    "MATCHING_HEADINGS": "STANDALONE",
    "MATCHING": "STANDALONE",
    "WRITING_TASK1": "STANDALONE",
    "WRITING_TASK2": "STANDALONE",
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
                            user_id: int) -> dict:
        import json
        skill = preview.skill.upper() if preview.skill else "READING"
        session_id = SESSION_ID_MAP.get(skill, 2)
        part_ids = PART_ID_MAP.get(skill, [5])

        sessions = []
        for sec_idx, section in enumerate(preview.sections):
            part_id = part_ids[sec_idx] if sec_idx < len(part_ids) else part_ids[-1]
            parts = [{
                "partId": part_id,
                "orderIndex": sec_idx + 1,
                "questionGroups": []
            }]

            global_q_num = 0
            for grp in section.groups:
                qt_info = QUESTION_TYPE_MAP.get(grp.question_type, QUESTION_TYPE_MAP["MCQ"])
                ct = grp.content_type or CONTENT_TYPE_MAP.get(grp.question_type, "STANDALONE")

                questions = []
                for q in grp.questions:
                    global_q_num += 1
                    q_data = {
                        "questionTypeCode": qt_info["code"],
                        "questionNumber": global_q_num,
                        "questionCount": 1,
                        "questionText": q.text,
                        "points": 1.0,
                        "orderIndex": q.number,
                        "options": [],
                        "answers": [],
                    }
                    if qt_info["hasOptions"]:
                        for opt in q.options:
                            q_data["options"].append({
                                "optionLabel": opt.get("label", ""),
                                "optionText": opt.get("text", ""),
                                "isCorrect": opt.get("correct", False),
                                "orderIndex": len(q_data["options"]) + 1,
                            })
                    if qt_info["hasTextAnswer"]:
                        for ans in q.answers:
                            q_data["answers"].append({
                                "answerText": ans.get("text", ""),
                                "isCaseSensitive": False,
                                "blankIndex": len(q_data["answers"]),
                            })
                    questions.append(q_data)

                # Build passageText for Speaking
                passage_text = grp.passage_text
                if ct == "SPEAKING_INTERVIEW":
                    passage_text = json.dumps({
                        "interviewType": "PART1",
                        "partInstruction": grp.instructions or "The examiner asks you about yourself, your home, work or studies and other familiar topics.",
                        "classification": "GENERAL"
                    })
                elif ct == "SPEAKING_DISCUSSION":
                    passage_text = json.dumps({
                        "interviewType": "PART3",
                        "partInstruction": grp.instructions or "The examiner asks further questions connected to the topic in Part 2.",
                        "classification": "GENERAL"
                    })
                elif ct == "SPEAKING_CUECARD":
                    # For Part 2, extract bullet points from question text if possible
                    # Or just use raw passage text as topic
                    topic = grp.passage_text or (questions[0]["questionText"] if questions else "")
                    passage_text = json.dumps({
                        "partInstruction": grp.instructions or "The examiner will give you a topic card. You will have 1 minute to prepare.",
                        "topic": topic,
                        "shouldSayLabel": "You should say:",
                        "bulletPoints": [],
                        "closingSentence": "",
                        "prepSeconds": 60,
                        "speakingSeconds": 120
                    })

                group_q_from = global_q_num - len(questions) + 1
                parts[0]["questionGroups"].append({
                    "title": grp.title,
                    "instructions": grp.instructions,
                    "contentType": ct,
                    "passageText": passage_text,
                    "fromQuestion": group_q_from,
                    "toQuestion": global_q_num,
                    "orderIndex": len(parts[0]["questionGroups"]) + 1,
                    "questions": questions,
                })

            sessions.append({
                "sessionId": session_id,
                "orderIndex": sec_idx + 1,
                "parts": parts,
            })

        return {
            "title": title or preview.title or "Imported Test",
            "testType": test_type,
            "isFullTest": False,
            "targetBand": "7.0",
            "createdByUserId": user_id,
            "createVersion": True,
            "sessions": sessions,
        }
