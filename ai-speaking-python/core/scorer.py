"""Scoring pipeline for IELTS speaking evaluation."""

import json
import re
import time
from pathlib import Path
from statistics import stdev

from loguru import logger
from infrastructure.llm_client import OpenAIClient, NvidiaClient, GroqClient, AIProviderError
from models.scoring import SpeakingResult, CriteriaScore
from models.analysis import FeatureAnalysis, PronunciationResult
from models.session import SpeakingTurn
from core.rubric import load_rubric, SpeakingRubric
from core.calculator import round_ielts_band

_HERE = Path(__file__).parent.parent


class ScoringPipeline:
    def __init__(self, provider: str = "groq"):
        if provider == "nvidia":
            self.llm = NvidiaClient()
        elif provider == "groq":
            self.llm = GroqClient()
        else:
            self.llm = OpenAIClient()

    def _get_criterion(self, c: dict, keys: list[str], code: str, name: str) -> CriteriaScore:
        d = {}
        for k in keys:
            v = c.get(k, {})
            if isinstance(v, dict):
                d = v; break
            elif isinstance(v, (int, float)):
                d = {"band": v, "strengths": [], "weaknesses": [], "detailedFeedback": ""}; break
        return CriteriaScore(code=code, display_name=name,
            band=round_ielts_band(float(d.get("band", 5.0))),
            strengths=[str(s) for s in d.get("strengths", [])],
            weaknesses=[str(w) for w in d.get("weaknesses", [])],
            detailed_feedback=str(d.get("detailedFeedback", "") or d.get("detailed_feedback", "")))

    async def evaluate(self, session_id: str, user_id: str, turns: list[SpeakingTurn],
                       features: FeatureAnalysis, pronunciation: PronunciationResult,
                       part: str = "PART2") -> SpeakingResult:
        rubric = load_rubric()
        system = self._load("templates/system_role.txt") or "You are an official IELTS Speaking Examiner."
        schema = self._load("templates/output_schema.json") or json.dumps({"overallBand": 6.0, "criteria": {}, "overallFeedback": "", "improvementPriority": [], "confidenceScore": 0.85}, indent=2)

        transcript = "\n".join(f"[{t.part}] Q: {t.question_text}\nA: {t.answer_text}" for t in turns)
        feat = f"Words: {features.word_count} | Sentences: {features.sentence_count} | TTR: {features.lexical_diversity:.3f} | Avg Sent: {features.avg_sentence_length:.1f} | Hesitation: {features.hesitation_count} | Discourse: {features.discourse_marker_count} | Advanced Vocab: {features.advanced_vocab_count} | Dominant Tense: {features.dominant_tense} | Repetition: {features.repetition_count}"
        pron = f"Band: {pronunciation.band:.1f} | Confidence: {pronunciation.confidence_ratio:.3f} | Speech Rate: {pronunciation.speech_rate:.1f} wpm | Hesitation: {pronunciation.hesitation_ratio:.3f}" if pronunciation.has_audio else f"Audio: NOT AVAILABLE (text-only) | Hesitation: {pronunciation.hesitation_ratio:.3f}"

        rub_text = self._rubric_text(rubric)
        user = f"{rub_text}\n\n=== SPEAKING TRANSCRIPT ({part}) ===\n{transcript}\n\n=== NLP FEATURES ===\n{feat}\n\n=== PRONUNCIATION ===\n{pron}\n\n### Instructions: Rate the candidate on each criterion (1-9). Return ONLY valid JSON using EXACTLY this structure with these EXACT criterion keys:\n{{\n  \"overallBand\": 6.5,\n  \"criteria\": {{\n    \"fluency_coherence\": {{\"band\": 6, \"strengths\": [], \"weaknesses\": [], \"detailedFeedback\": \"\"}},\n    \"lexical_resource\": {{\"band\": 6, \"strengths\": [], \"weaknesses\": [], \"detailedFeedback\": \"\"}},\n    \"grammatical_range_accuracy\": {{\"band\": 6, \"strengths\": [], \"weaknesses\": [], \"detailedFeedback\": \"\"}},\n    \"pronunciation\": {{\"band\": 6, \"strengths\": [], \"weaknesses\": [], \"detailedFeedback\": \"\"}}\n  }},\n  \"overallFeedback\": \"\",\n  \"improvementPriority\": [],\n  \"confidenceScore\": 0.85\n}}"

        try:
            start = time.time()
            resp = await self.llm.chat(system, user, temperature=0.1, max_tokens=2048)
            lat = int((time.time() - start) * 1000)

            logger.info(f"LLM response: {resp.content[:300]}")
            data = self._extract_json(resp.content)
            overall = round_ielts_band(float(data.get("overallBand", 5.0)))
            c = data.get("criteria", {})

            fc = self._get_criterion(c, ["fluency_coherence", "fluencyAndCoherence", "fluency"], "FC", "Fluency & Coherence")
            lr = self._get_criterion(c, ["lexical_resource", "lexicalResource", "lexical"], "LR", "Lexical Resource")
            gra = self._get_criterion(c, ["grammatical_range_accuracy", "grammaticalRangeAccuracy", "grammarAndVocabulary", "grammar"], "GRA", "Grammatical Range & Accuracy")
            p = self._get_criterion(c, ["pronunciation"], "P", "Pronunciation")

            all_s = [f"[{x.display_name}] {s}" for x in [fc, lr, gra, p] for s in x.strengths]
            all_w = [f"[{x.display_name}] {w}" for x in [fc, lr, gra, p] for w in x.weaknesses]

            bands = [x.band for x in [fc, lr, gra, p] if x.band > 0]
            try:
                cons = 1.0 - (stdev(bands) / 4.0) if len(bands) >= 2 else 0.5
            except Exception:
                cons = 0.5
            conf = max(0.0, min(1.0, float(data.get("confidenceScore", cons))))

            return SpeakingResult(session_id=session_id, user_id=user_id, overall_band=overall,
                fluency_coherence=fc, lexical_resource=lr, grammatical_range=gra, pronunciation=p,
                overall_feedback=str(data.get("overallFeedback", "")),
                improvement_priority=[str(x) for x in data.get("improvementPriority", [])],
                strengths=all_s, weaknesses=all_w, provider=resp.provider, model=resp.model,
                confidence_score=conf, latency_ms=lat, status="COMPLETED")
        except Exception as e:
            logger.error(f"Scoring failed: {e}")
            return SpeakingResult(session_id=session_id, user_id=user_id, status="FAILED", error_message=str(e))

    def _extract_json(self, content: str) -> dict:
        content = content.strip()
        if content.startswith("```json"): content = content[7:]
        elif content.startswith("```"): content = content[3:]
        if content.endswith("```"): content = content[:-3]
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
        raise ValueError("Cannot extract JSON from response")

    def _rubric_text(self, rubric: SpeakingRubric) -> str:
        parts = ["=== IELTS SPEAKING BAND DESCRIPTORS ==="]
        for name, bands in [("Fluency & Coherence", rubric.fluency_coherence),
                            ("Lexical Resource", rubric.lexical_resource),
                            ("Grammatical Range & Accuracy", rubric.grammatical_range),
                            ("Pronunciation", rubric.pronunciation)]:
            parts.append(f"\n--- {name} ---")
            for b in bands:
                if 5.0 <= b.band <= 9.0:
                    parts.append(f"Band {b.band:.1f}: {b.descriptor}")
        return "\n".join(parts)

    def _load(self, path: str) -> str | None:
        p = _HERE / path
        return p.read_text(encoding="utf-8") if p.exists() else None
