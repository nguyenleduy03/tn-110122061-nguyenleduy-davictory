import json
import time
import uuid

from loguru import logger

from config import get_settings, get_active_model
from infrastructure.llm_client import GroqClient, NvidiaClient, AIProviderError
from infrastructure.cache import TTLCache
from infrastructure.quota import QuotaManager, QuotaExceeded

from models.grading import GradingResult, CriteriaScore, ClassifyResponse
from core.rubric import load_rubric
from core.prompt_builder import PromptBuilder
from core.retriever import SampleRetriever
from core.parser import ResponseParser, ParseError
from core.calculator import calculate_overall_band
from core.classifier import classify


class GradingOrchestrator:
    def __init__(self):
        self.settings = get_settings()
        self.groq_llm = GroqClient()
        self.nvidia_llm = NvidiaClient()
        self.cache = TTLCache(max_size=self.settings.cache_max_size, ttl_seconds=self.settings.cache_ttl_minutes * 60)
        self.quota = QuotaManager()
        self.retriever = SampleRetriever()
        self.prompt = PromptBuilder()
        self.parser = ResponseParser()

    def _get_llm(self):
        active = get_active_model() or self.settings.groq_model
        if active.startswith("nvidia/"):
            return self.nvidia_llm
        return self.groq_llm

    def _make_low_score_result(self, submission_id: int, word_count: int,
                                reason: str, band: float = 1.0) -> GradingResult:
        score = CriteriaScore(band=band, band_justification=reason,
                              detailed_feedback=reason)
        return GradingResult(
            submission_id=submission_id,
            overall_band=band,
            task_response=score,
            coherence_cohesion=score,
            lexical_resource=score,
            grammatical_range=score,
            overall_feedback=reason,
            confidence_score=0.99,
            confidence_reason="Rule-based: essay too short for LLM evaluation",
            status="COMPLETED",
        )

    async def classify_essay(self, essay_text: str, prompt_text: str = "") -> ClassifyResponse:
        """Classify essay using LLM. Falls back to local classifier on error."""
        from pathlib import Path
        _TEMPLATES = Path(__file__).parent.parent / "templates"
        classify_prompt_path = _TEMPLATES / "classify_prompt.txt"
        if classify_prompt_path.exists():
            classify_sys = classify_prompt_path.read_text(encoding="utf-8")
        else:
            classify_sys = "Classify this IELTS writing task. Return JSON with task_type, sub_type, topic."

        combined = f"Prompt: {prompt_text}\n\nEssay: {essay_text}" if prompt_text else essay_text
        user_prompt = f"Classify the following IELTS writing:\n\n{combined[:3000]}"

        try:
            resp = await self._get_llm().chat(classify_sys, user_prompt)
            data = json.loads(resp.content)
            return ClassifyResponse(
                task_type=data.get("task_type", "TASK2_ACADEMIC"),
                sub_type=data.get("sub_type", ""),
                topic=data.get("topic", ""),
                reasoning=data.get("reasoning", ""),
                confidence=float(data.get("confidence", 0.5)),
            )
        except Exception:
            logger.warning("LLM classify failed, falling back to local classifier")
            cl = classify(prompt_text=prompt_text, essay_text=essay_text)
            sub_type = cl.chart_type or cl.essay_type or cl.letter_type or ""
            return ClassifyResponse(
                task_type=cl.task_type,
                sub_type=sub_type,
                topic="",
                reasoning=cl.reasoning,
                confidence=cl.confidence,
            )

    async def grade(self, submission_id: int, essay_text: str, user_id: str, role: str,
                    prompt_text: str = "", question_group_id: int | None = None,
                    task_type: str | None = None, topic: str = "",
                    skip_cache: bool = False,
                    chart_type: str = "", essay_type: str = "", letter_type: str = "") -> GradingResult:
        self.quota.check(user_id, role)

        cache_key = f"grade:{submission_id}"
        if not skip_cache:
            cached = self.cache.get(cache_key)
            if cached:
                return cached

        try:
            start = time.time()

            if not task_type:
                task_type = f"TASK{(question_group_id or 2) % 2 + 1}_ACADEMIC"

            # === AUTO-CLASSIFY from prompt + essay if needed ===
            if not chart_type or not essay_type or not letter_type:
                cl = classify(
                    prompt_text=prompt_text,
                    essay_text=essay_text,
                    task_type_hint=task_type,
                    chart_type_hint=chart_type,
                    essay_type_hint=essay_type,
                    letter_type_hint=letter_type,
                )
                task_type = cl.task_type
                chart_type = cl.chart_type
                essay_type = cl.essay_type
                letter_type = cl.letter_type
                logger.info(f"Auto-classified: {task_type}, chart={chart_type}, essay={essay_type}, letter={letter_type} (conf={cl.confidence})")
            word_count = len(essay_text.split())

            # === DEFAULT SUB-TYPES ===
            if task_type == "TASK1_GENERAL" and not letter_type:
                letter_type = "formal"
            if task_type == "TASK1_ACADEMIC" and not chart_type:
                chart_type = "bar"
            if task_type in ("TASK2_ACADEMIC", "TASK2_GENERAL") and not essay_type:
                essay_type = "opinion"

            # === STRONG LOCAL VALIDATION ===
            if word_count < 10:
                reason = f"ESSAY IS TOO SHORT ({word_count} words). This is not a genuine essay attempt. All criteria scored at Band {1.0:.1f}."
                logger.warning(f"Skipping LLM call for submission {submission_id}: only {word_count} words")
                result = self._make_low_score_result(submission_id, word_count, reason, 1.0)
                result.grading_id = str(uuid.uuid4())
                result.provider = "local"
                result.model = "rule-based"
                result.latency_ms = int((time.time() - start) * 1000)
                self.quota.increment(user_id, role)
                if not skip_cache:
                    self.cache.put(cache_key, result)
                return result

            pre_note = ""
            is_task1 = task_type.startswith("TASK1")
            is_letter = task_type == "TASK1_GENERAL"
            min_words = 150 if is_task1 else 250

            if word_count < 50:
                pre_note = (
                    f"ESSAY IS EXTREMELY SHORT ({word_count} words, minimum {min_words}). "
                    f"This submission is far below the required length. "
                    f"Task {'Achievement' if is_task1 else 'Response'} is capped at Band 2.0, "
                    f"Coherence & Cohesion at Band 2.0, "
                    f"Lexical Resource at Band 2.0, "
                    f"Grammatical Range at Band 2.0."
                )
            elif word_count < 100:
                pre_note = (
                    f"ESSAY IS VERY SHORT ({word_count} words, minimum {min_words}). "
                    f"All criteria are capped at Band 4.0."
                )
            elif word_count < min_words:
                pre_note = (
                    f"ESSAY IS SHORT ({word_count} words, minimum {min_words}). "
                    f"According to IELTS rules, Task {'Achievement' if is_task1 else 'Response'} is capped at Band 5.0. "
                    f"Coherence & Cohesion is capped at Band 5.0. "
                    f"Lexical Resource is capped at Band 6.0. "
                    f"Grammatical Range is capped at Band 6.0."
                )

            rubric = load_rubric(task_type)

            retrieval = self.retriever.retrieve(essay_text, task_type)
            samples = retrieval.samples

            pc = self.prompt.build(
                rubric=rubric, essay=essay_text,
                task_type=task_type, topic=topic, prompt_text=prompt_text,
                word_count=word_count,
                chart_type=chart_type, essay_type=essay_type, letter_type=letter_type,
            )

            if pre_note:
                pc.user_section = f"=== LOCAL PRE-CHECK ===\n{pre_note}\n\n{pc.user_section}"

            full_user_prompt = pc.to_full_prompt()
            full_prompt = f"[SYSTEM PROMPT]\n{pc.system_prompt}\n\n[USER PROMPT]\n{full_user_prompt}"

            resp = await self._get_llm().chat(pc.system_prompt, full_user_prompt)
            latency_ms = int((time.time() - start) * 1000)

            result = self.parser.parse(resp.content, task_type)

            # === LOCAL BAND ENFORCEMENT ===
            max_bands = {code: 9.0 for code in ["TR", "CC", "LR", "GRA"]}
            if word_count < 50:
                for code in max_bands:
                    max_bands[code] = 2.0
            elif word_count < 100:
                for code in max_bands:
                    max_bands[code] = 4.0
            elif word_count < min_words:
                max_bands["TR"] = 5.0
                max_bands["CC"] = 5.0
                max_bands["LR"] = 6.0
                max_bands["GRA"] = 6.0

            for criterion_code, criterion in [
                ("TR", result.task_response),
                ("CC", result.coherence_cohesion),
                ("LR", result.lexical_resource),
                ("GRA", result.grammatical_range),
            ]:
                cap = max_bands.get(criterion_code, 9.0)
                if criterion.band > cap:
                    logger.info(f"Capping {criterion_code} from {criterion.band} to {cap} (word_count={word_count})")
                    criterion.band = cap
                    criterion.band_justification += f" [CAPPED to Band {cap:.1f} due to short essay ({word_count} words)]"
                    if criterion.boundary_detected and criterion.boundary_closer_to > cap:
                        criterion.boundary_detected = False
                        criterion.boundary_closer_to = 0.0
                        criterion.boundary_reason = "Boundary assessment superseded by local cap"

            # === LOCAL OVERALL BAND CALCULATION ===
            criteria_bands = {
                code: s.band
                for code, s in [
                    ("TR", result.task_response),
                    ("CC", result.coherence_cohesion),
                    ("LR", result.lexical_resource),
                    ("GRA", result.grammatical_range),
                ]
                if s.band > 0
            }
            if criteria_bands:
                local_overall = calculate_overall_band(list(criteria_bands.values()))
                if local_overall != result.overall_band:
                    logger.info(f"Recalculated overall band: LLM={result.overall_band} -> Local={local_overall}")
                    result.overall_band = local_overall

            result.submission_id = submission_id
            result.grading_id = str(uuid.uuid4())
            result.provider = resp.provider
            result.model = resp.model
            result.prompt_version = self.settings.prompt_version
            result.prompt_tokens = resp.prompt_tokens
            result.completion_tokens = resp.completion_tokens
            result.latency_ms = latency_ms
            result.reference_sample_ids = [s.id for s in samples]
            result.full_prompt = full_prompt

            self.quota.increment(user_id, role)
            if not skip_cache:
                self.cache.put(cache_key, result)

            logger.info(f"Graded submission {submission_id}: band={result.overall_band}, "
                       f"confidence={result.confidence_score:.2f}, {latency_ms}ms")
            return result

        except QuotaExceeded as e:
            raise
        except ParseError as e:
            raise
        except AIProviderError as e:
            raise
        except Exception as e:
            logger.exception(f"Grading failed for {submission_id}")
            raise

    async def generate_feedback(self, essay_text: str, task_type: str,
                                  topic: str, prompt_text: str,
                                  scores: dict,
                                  chart_type: str = "", essay_type: str = "", letter_type: str = "") -> dict:
        # === AUTO-CLASSIFY if sub-types missing ===
        if not chart_type or not essay_type or not letter_type:
            cl = classify(
                prompt_text=prompt_text,
                essay_text=essay_text,
                task_type_hint=task_type,
                chart_type_hint=chart_type,
                essay_type_hint=essay_type,
                letter_type_hint=letter_type,
            )
            task_type = cl.task_type
            chart_type = cl.chart_type
            essay_type = cl.essay_type
            letter_type = cl.letter_type

        rubric = load_rubric(task_type)
        pc = self.prompt.build(
            rubric=rubric, essay=essay_text,
            task_type=task_type, topic=topic, prompt_text=prompt_text,
            word_count=len(essay_text.split()),
            chart_type=chart_type, essay_type=essay_type, letter_type=letter_type,
        )

        feedback_prompt = f"""{pc.system_prompt}

=== FEEDBACK GENERATION ===

The essay has already been scored with the following bands:
{json.dumps(scores, indent=2)}

Based on these scores and the essay text, generate detailed feedback:

1. For each criterion, provide:
   - Specific, actionable feedback for improvement
   - What the writer did well (strengths with evidence)
   - What needs improvement (weaknesses with evidence)
   - Concrete suggestions for how to improve

2. Generate an overall_feedback paragraph summarising the main areas for improvement.

3. Generate improvement_priority: a ranked list of 3-5 most important actions.

4. Provide detailed_feedback for each criterion with specific references to the essay.

Output ONLY valid JSON with keys:
- overallFeedback: string
- improvementPriority: list of strings
- criteria: object with taskResponse/coherenceCohesion/lexicalResource/grammaticalRange, each containing detailedFeedback, strengths, weaknesses

=== STUDENT ESSAY ===
{essay_text[:4000]}
"""

        resp = await self._get_llm().chat(pc.system_prompt, feedback_prompt)
        try:
            data = json.loads(resp.content)
            data["model"] = resp.model
            data["provider"] = resp.provider
            return data
        except json.JSONDecodeError:
            return {"overallFeedback": resp.content, "model": resp.model}

    def get_result(self, submission_id: int) -> GradingResult | None:
        return self.cache.get(f"grade:{submission_id}")

    def clear_cache(self):
        self.cache.clear()

    def cache_stats(self) -> dict:
        return self.cache.stats
