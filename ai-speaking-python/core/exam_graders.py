"""Exam grade orchestrator for custom speaking tests."""

import time
from uuid import uuid4
from loguru import logger

from models.session import SpeakingTurn
from models.scoring import SpeakingResult, PerQuestionScore, ExamGradeResult
from models.analysis import FeatureAnalysis
from core.scorer import ScoringPipeline
from core.analyzer import FeatureAnalyzer
from core.pronunciation import PronunciationEngine
from providers.stt import STTProvider
from core.calculator import round_ielts_band

PART_PATTERNS = {
    "PART1": 3,
    "PART2": 1,
    "PART3": 2,
}


def _assign_part(index: int, total: int) -> str:
    if total <= 1:
        return "PART2"
    if total <= 3:
        return "PART1" if index == 0 else "PART3"
    if index < 3:
        return "PART1"
    return "PART3"


class ExamGrader:
    def __init__(self):
        self.stt = STTProvider()
        self.scorer = ScoringPipeline()
        self.analyzer = FeatureAnalyzer()
        self.pron = PronunciationEngine()

    async def grade(
        self,
        questions: list[str],
        files: list,
        audio_urls: str | None = None,
    ) -> ExamGradeResult:
        total = len(questions)
        turns: list[SpeakingTurn] = []
        all_segments: list[dict] = []

        for i, q_text in enumerate(questions):
            part = _assign_part(i, total)

            if i < len(files) and files[i]:
                audio_data = await files[i].read()
                filename = files[i].filename or f"question_{i}.webm"
            else:
                logger.warning(f"No audio file for question {i}, skipping")
                turn = SpeakingTurn(
                    id=str(uuid4()),
                    turn_number=i + 1,
                    question_text=q_text,
                    answer_text="",
                    answer_duration_ms=0,
                    part=part,
                )
                turns.append(turn)
                continue

            try:
                whisper = await self.stt.transcribe(audio_data, filename)
            except Exception as e:
                logger.error(f"STT failed for question {i}: {e}")
                turn = SpeakingTurn(
                    id=str(uuid4()),
                    turn_number=i + 1,
                    question_text=q_text,
                    answer_text="",
                    answer_duration_ms=0,
                    part=part,
                )
                turns.append(turn)
                continue

            text = whisper.get("text", "")
            duration = whisper.get("duration", 0)
            segments = whisper.get("segments", [])

            turn = SpeakingTurn(
                id=str(uuid4()),
                turn_number=i + 1,
                question_text=q_text,
                answer_text=text,
                answer_duration_ms=int(duration * 1000) if duration else 0,
                part=part,
            )
            turns.append(turn)
            all_segments.extend(segments)

        answered = [t for t in turns if t.answer_text.strip()]
        if not answered:
            return ExamGradeResult(
                overall=SpeakingResult(status="FAILED", error_message="No answers could be transcribed from audio files")
            )

        start = time.time()

        features = self.analyzer.analyze(answered)
        pron = self.pron.analyze(answered, all_segments if all_segments else None)
        overall = await self.scorer.evaluate(
            session_id=str(uuid4()),
            user_id="exam",
            turns=answered,
            features=features,
            pronunciation=pron,
            part="PART1",
        )

        per_question: list[PerQuestionScore] = []
        for i, turn in enumerate(answered):
            try:
                q_features = self.analyzer.analyze([turn])
                q_pron = self.pron.analyze([turn])
                q_result = await self.scorer.evaluate(
                    session_id=str(uuid4()),
                    user_id="exam",
                    turns=[turn],
                    features=q_features,
                    pronunciation=q_pron,
                    part=turn.part,
                )

                pq = PerQuestionScore(
                    question_index=i,
                    question_text=turn.question_text,
                    transcript=turn.answer_text,
                    band=q_result.overall_band,
                    fluency_coherence=q_result.fluency_coherence.band,
                    lexical_resource=q_result.lexical_resource.band,
                    grammatical_range=q_result.grammatical_range.band,
                    pronunciation=q_result.pronunciation.band,
                    feedback=q_result.overall_feedback,
                )
                per_question.append(pq)
            except Exception as e:
                logger.error(f"Per-question scoring failed for idx {i}: {e}")
                per_question.append(
                    PerQuestionScore(
                        question_index=i,
                        question_text=turn.question_text,
                        transcript=turn.answer_text,
                        feedback=f"Scoring failed: {e}",
                    )
                )

        overall.latency_ms = int((time.time() - start) * 1000)

        return ExamGradeResult(overall=overall, per_question=per_question)
