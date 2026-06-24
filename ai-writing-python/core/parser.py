"""Flexible parser that handles both camelCase and snake_case LLM responses."""

import json
import re
from statistics import stdev

from models.grading import GradingResult, CriteriaScore
from core.calculator import round_ielts_band


class ParseError(Exception):
    def __init__(self, msg: str, raw: str = ""):
        self.raw_response = raw
        super().__init__(msg)


CRITERIA_MAP_SNAKE = {
    "task_response": ("TR", "Task Response"),
    "task_achievement": ("TA", "Task Achievement"),
    "coherence_cohesion": ("CC", "Coherence & Cohesion"),
    "coherence_and_cohesion": ("CC", "Coherence & Cohesion"),
    "lexical_resource": ("LR", "Lexical Resource"),
    "grammatical_range": ("GRA", "Grammatical Range & Accuracy"),
    "grammatical_range_and_accuracy": ("GRA", "Grammatical Range & Accuracy"),
}

CRITERIA_MAP_CAMEL = {
    "taskResponse": ("TR", "Task Response"),
    "taskAchievement": ("TA", "Task Achievement"),
    "coherenceCohesion": ("CC", "Coherence & Cohesion"),
    "lexicalResource": ("LR", "Lexical Resource"),
    "grammaticalRange": ("GRA", "Grammatical Range & Accuracy"),
}

_CRITERIA_ALL = {**CRITERIA_MAP_CAMEL, **CRITERIA_MAP_SNAKE}

_LETTER_TASK_TYPES = {"TASK1_GENERAL"}


def _get(d, *keys, default=None):
    for k in keys:
        if k in d:
            return d[k]
    return default


def _str(val, default=""):
    if isinstance(val, dict):
        return json.dumps(val, ensure_ascii=False)
    return str(val) if val is not None else default


def _float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _parse_band(val):
    return round_ielts_band(_float(val, 0))


def _list_str(val, default=None):
    if isinstance(val, list):
        return [str(x) for x in val]
    return default or []


class ResponseParser:

    def parse(self, content: str, task_type: str = "TASK2_ACADEMIC") -> GradingResult:
        is_letter = task_type in _LETTER_TASK_TYPES
        data = self._extract_json(content)

        overall_band = _get(data, "overallBand", "overall_band")
        if overall_band is None:
            raw_scores = _get(data, "scores", "criteria", "band_mapping", default={})
            overall_band = _get(raw_scores, "overallBand", "overall_band")
        if overall_band is not None:
            overall = _parse_band(overall_band)
        else:
            overall = None

        raw_scores = _get(data, "scores", "criteria", "band_mapping", default={})
        raw_analysis = data.get("analysis", {})

        if isinstance(raw_scores, dict) and not any(k in raw_scores for k in list(CRITERIA_MAP_CAMEL.keys()) + list(CRITERIA_MAP_SNAKE.keys())):
            raw_scores = {} if raw_scores.get("assigned_band") is None else {"taskResponse": raw_scores}

        scores = {}
        for json_key, (code, name) in _CRITERIA_ALL.items():
            c = raw_scores.get(json_key, {})
            if not c or not isinstance(c, dict):
                continue
            boundary = c.get("boundary", {}) or {}
            if not boundary.get("detected"):
                boundary = {}
            scores[code] = CriteriaScore(
                code=code, display_name=name,
                band=_parse_band(_get(c, "band", "assigned_band", default=0)),
                band_justification=_str(_get(c, "bandJustification", "band_justification", "reason", default="")),
                boundary_detected=bool(boundary.get("detected", False)),
                boundary_closer_to=_float(boundary.get("closerTo", boundary.get("closer_to", 0))),
                boundary_reason=_str(boundary.get("reason", "")),
                strengths=[str(s) for s in c.get("strengths", [])],
                weaknesses=[str(w) for w in c.get("weaknesses", [])],
                evidence_from_essay=[str(e) for e in c.get("evidenceFromEssay", c.get("evidence_from_essay", []))],
                detailed_feedback=_str(c.get("detailedFeedback", c.get("detailed_feedback", ""))),
            )

        all_s = []
        all_w = []
        if is_letter:
            primary_code, secondary_code = "TA", "TR"
        else:
            primary_code, secondary_code = "TR", "TA"
        for code in [primary_code, secondary_code, "CC", "LR", "GRA"]:
            s = scores.get(code)
            if s:
                pfx = f"[{s.display_name}] "
                all_s.extend(pfx + x for x in s.strengths)
                all_w.extend(pfx + x for x in s.weaknesses)

        if not all_s:
            analysis_strengths = raw_analysis.get("identified_strengths", raw_analysis.get("identifiedStrengths", []))
            if analysis_strengths:
                all_s = [str(x) for x in analysis_strengths]
        if not all_w:
            analysis_weaknesses = raw_analysis.get("identified_weaknesses", raw_analysis.get("identifiedWeaknesses", []))
            if analysis_weaknesses:
                all_w = [str(x) for x in analysis_weaknesses]

        conf = _float(_get(data, "confidence", "confidenceScore", "confidence_score", default=0))
        if conf == 0:
            bands = [s.band for s in scores.values() if s.band > 0]
            try:
                cons = 1.0 - (stdev(bands) / 4.0) if len(bands) >= 2 else 0.5
            except Exception:
                cons = 0.5
            conf = max(0.0, min(1.0, cons))

        band_just_raw = _get(data, "bandJustification", "band_justification", default="")
        if isinstance(band_just_raw, dict):
            band_just_str = json.dumps(band_just_raw, ensure_ascii=False)
        else:
            band_just_str = str(band_just_raw) if band_just_raw else ""

        if overall is None:
            bands = [s.band for s in scores.values() if s.band > 0]
            if bands:
                from core.calculator import calculate_overall_band
                overall = calculate_overall_band(bands)

        if overall is None:
            raise ParseError("Missing overallBand/overall_band", content)

        def _resolve_analysis_text(key):
            val = raw_analysis.get(key)
            if isinstance(val, str):
                return val
            if isinstance(val, dict):
                parts = []
                for sk in ["assessment", "overall_assessment", "summary", "analysis"]:
                    if sk in val and val[sk]:
                        parts.append(str(val[sk]))
                if not parts:
                    parts.append(json.dumps(val, ensure_ascii=False))
                return "\n".join(parts)
            return ""

        return GradingResult(
            overall_band=overall,
            task_response=scores.get(primary_code, scores.get(secondary_code,
                self._infer_score_from_analysis(raw_analysis, "task_response", primary_code,
                    "Task Achievement" if is_letter else "Task Response"))),
            coherence_cohesion=scores.get("CC",
                self._infer_score_from_analysis(raw_analysis, "coherence", "CC", "Coherence & Cohesion")),
            lexical_resource=scores.get("LR",
                self._infer_score_from_analysis(raw_analysis, "lexical", "LR", "Lexical Resource")),
            grammatical_range=scores.get("GRA",
                self._infer_score_from_analysis(raw_analysis, "grammar", "GRA", "Grammatical Range & Accuracy")),
            overall_feedback=_str(_get(data, "overallFeedback", "overall_feedback", default="")),
            strengths=all_s, weaknesses=all_w,
            improvement_priority=_list_str(_get(data, "improvementPriority", "improvement_priority", default=[])),
            confidence_score=conf,
            confidence_reason=_str(_get(data, "confidenceReason", "confidence_reason", default="")),
            band_justification=band_just_str,
            band_boundary_summary=_str(_get(data, "bandBoundarySummary", "band_boundary_summary", default="")),
            analysis={
                "taskResponseAnalysis": _resolve_analysis_text("task_response_analysis"),
                "coherenceAnalysis": _resolve_analysis_text("coherence_analysis"),
                "lexicalAnalysis": _resolve_analysis_text("lexical_analysis"),
                "grammarAnalysis": _resolve_analysis_text("grammar_analysis"),
            },
            strength_summary=_str(_get(data, "strengthSummary", "strength_summary", default="")),
            weakness_summary=_str(_get(data, "weaknessSummary", "weakness_summary", default="")),
            status="COMPLETED",
        )

    def _infer_score_from_analysis(self, analysis: dict, key_prefix: str, code: str, name: str) -> CriteriaScore:
        key = f"{key_prefix}_analysis"
        val = analysis.get(key, {})
        if isinstance(val, dict):
            assessment = str(val.get("assessment", val.get("overall_assessment", "")))
            strengths = [str(s) for s in val.get("strengths", [])]
            weaknesses = [str(w) for w in val.get("weaknesses", [])]
            return CriteriaScore(code=code, display_name=name, band_justification=assessment,
                                 strengths=strengths, weaknesses=weaknesses)
        return CriteriaScore(code=code, display_name=name)

    def _extract_json(self, content: str) -> dict:
        content = content.strip()
        if not content:
            raise ParseError("LLM returned empty response—có thể model đang lỗi hoặc request timeout.", content)
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
        m = re.search(r"\{", content, re.DOTALL)
        if m:
            start = m.start()
            json_str = content[start:]
            for i in range(50):
                try:
                    return json.loads(json_str + "}" * i)
                except json.JSONDecodeError:
                    continue
            fixed = re.sub(r'(?<=[\[,{])\s*$', '', json_str)
            fixed = re.sub(r'("(?:\\.|[^"\\])*)$', r'\1"', fixed)
            fixed = re.sub(r',\s*\}', '\n}', fixed)
            fixed = re.sub(r',\s*\]', '\n]', fixed)
            for i in range(50):
                try:
                    return json.loads(fixed + "}" * i)
                except json.JSONDecodeError:
                    continue
        raise ParseError("Cannot extract JSON", content)
