"""Auto-classify IELTS Writing task type, chart type, essay type, letter type from prompt + essay text."""
import re
from dataclasses import dataclass, field


@dataclass
class ClassificationResult:
    task_type: str = "TASK2_ACADEMIC"
    chart_type: str = ""
    essay_type: str = ""
    letter_type: str = ""
    confidence: float = 0.0
    reasoning: str = ""


# ============================================================
# TASK 1 vs TASK 2 keywords
# ============================================================

_TASK1_KEYWORDS = {
    "chart", "graph", "table", "diagram", "map", "process",
    "pie", "bar", "line", "column", "data", "figure",
    "information about", "the chart shows", "the graph illustrates",
    "the diagram shows", "the map shows", "the table shows",
    "the pie chart", "the bar chart", "the line graph",
    "illustrates", "depicts", "compares", "the given",
    "the provided", "below", "the figure", "the data",
    "write a letter", "your manager", "your friend",
    "complaint", "apologise", "invitation",
}

_TASK2_KEYWORDS = {
    "discuss", "opinion", "agree or disagree", "to what extent",
    "advantages", "disadvantages", "problems", "solutions",
    "causes", "effects", "both views", "your opinion",
    "do you agree", "do you think", "what is your opinion",
    "argue", "arguments", "pros and cons", "benefits",
    "drawbacks", "outweigh", "measures", "suggest",
    "reasons", "impact", "influence",
}

# ============================================================
# ACADEMIC vs GENERAL TRAINING keywords
# ============================================================

_ACADEMIC_KEYWORDS = {
    "graph", "chart", "data", "figure", "table", "process",
    "map", "percentage", "proportion", "trend", "statistics",
    "population", "rate", "amount", "number", "figures",
    "the graph", "the chart", "the diagram",
}

_GENERAL_KEYWORDS = {
    "write a letter", "your manager", "your friend", "a friend",
    "dear", "complain", "apologise", "apologize", "invite",
    "apply for", "recommend", "suggest", "thank", "congratulate",
    "your employer", "your colleague", "your neighbour", "neighbor",
    "your landlord", "the company", "the hotel", "the restaurant",
    "to the editor", "to the council", "to your boss",
    "you are not satisfied", "you were disappointed",
    "you have lost", "you have found", "you cannot attend",
}

# ============================================================
# CHART TYPE keywords (Task 1 Academic)
# ============================================================

_CHART_TYPE_PATTERNS: list[tuple[str, list[str], float]] = [
    ("line", ["line graph", "line chart", "over a period", "from ... to ...", "trend"], 0.6),
    ("bar", ["bar chart", "bar graph", "bars", "vertical bars", "horizontal bars", "columns"], 0.6),
    ("pie", ["pie chart", "proportion", "percentage", "share of", "pie"], 0.6),
    ("table", ["table", "figures", "tabular"], 0.5),
    ("process", ["process", "stages", "steps", "shows how", "how ... is produced", "how ... is made", "life cycle", "cycle"], 0.6),
    ("map", ["map", "location", "area", "town", "village", "city", "coast", "river", "road"], 0.5),
    ("multiple", ["combined", "the charts", "the graphs", "chart and", "graph and", "table and"], 0.4),
]

# ============================================================
# LETTER TYPE keywords (Task 1 General)
# ============================================================

_LETTER_TYPE_PATTERNS: list[tuple[str, list[str], float]] = [
    ("formal", [
        "dear sir", "dear madam", "to the manager", "to the company",
        "complain", "apply for", "application", "formal complaint",
        "yours faithfully", "i am writing to complain",
        "i am writing to apply", "i am writing to request",
        "i would like to express", "i wish to",
    ], 0.6),
    ("semi-formal", [
        "dear mr", "dear ms", "dear mrs", "dear dr",
        "your teacher", "your boss", "your neighbour", "your colleague",
        "i am writing to let you know",
        "kind regards", "best regards", "i would appreciate",
    ], 0.5),
    ("informal", [
        "dear friend", "hi ", "how are you", "how have you been",
        "long time no see", "just writing to", "thought i'd write",
        "love,", "take care", "best wishes", "all the best",
        "i'm sorry", "i'm writing to", "it was great to",
        "hope you", "looking forward to hearing from you soon",
        "write back soon", "cheers",
    ], 0.5),
]

# ============================================================
# ESSAY TYPE keywords (Task 2)
# ============================================================

_ESSAY_TYPE_PATTERNS: list[tuple[str, list[str], float]] = [
    ("opinion", [
        "agree or disagree", "to what extent", "do you agree",
        "what is your opinion", "do you think", "is it positive",
        "positive or negative", "your view", "what are your views",
    ], 0.6),
    ("discussion", [
        "discuss both", "both views", "both sides",
        "discuss", "consider both", "two different views",
        "some people think", "others believe", "others think",
    ], 0.5),
    ("advantages-disadvantages", [
        "advantages and disadvantages", "advantages and disadvantages",
        "benefits and drawbacks", "pros and cons",
        "advantages outweigh", "disadvantages outweigh",
    ], 0.6),
    ("problem-solution", [
        "problems", "solutions", "causes", "effects",
        "measures", "remedies", "what can be done",
        "how to solve", "ways to address",
        "reasons and solutions", "causes and solutions",
    ], 0.5),
    ("two-part", [], 0.0),  # special: detect two ? in prompt
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _count_matches(text: str, keywords: set[str]) -> int:
    """Count keyword matches using substring matching (handles plurals naturally)."""
    tl = _normalize(text)
    return sum(1 for kw in keywords if kw in tl)


def _score_pattern(text: str, patterns: list[tuple[str, list[str], float]]) -> list[tuple[str, float]]:
    """Score patterns using substring matching."""
    tl = _normalize(text)
    results = []
    for label, kws, weight in patterns:
        score = sum(weight for kw in kws if kw in tl)
        if score > 0:
            results.append((label, score))
    results.sort(key=lambda x: -x[1])
    return results


def _detect_two_part(text: str) -> float:
    """Detect two-part question: prompt contains 2+ question marks."""
    count = text.count("?")
    return min(count * 0.4, 1.0) if count >= 2 else 0.0


def classify_task_type(prompt: str) -> tuple[str, float, str]:
    """Return (task_type: TASK1_xxx or TASK2_xxx, confidence, reasoning)."""
    t1 = _count_matches(prompt, _TASK1_KEYWORDS)
    t2 = _count_matches(prompt, _TASK2_KEYWORDS)

    # Strong signal: explicit "Task 1" or "Task 2" in prompt
    if re.search(r"\btask\s*1\b", prompt, re.IGNORECASE):
        return ("TASK1", 1.0, "Explicit 'Task 1' found in prompt")
    if re.search(r"\btask\s*2\b", prompt, re.IGNORECASE):
        return ("TASK2", 1.0, "Explicit 'Task 2' found in prompt")

    # Word count threshold: Task 1 = 150 words, Task 2 = 250 words
    # Not reliable, so low weight

    if t1 > t2:
        ratio = (t1 - t2) / max(t1, 1)
        conf = min(0.5 + ratio * 0.4, 0.95)
        return ("TASK1", conf, f"Task 1 keywords={t1}, Task 2 keywords={t2}")
    elif t2 > t1:
        ratio = (t2 - t1) / max(t2, 1)
        conf = min(0.5 + ratio * 0.4, 0.95)
        return ("TASK2", conf, f"Task 2 keywords={t2}, Task 1 keywords={t1}")
    else:
        return ("TASK2", 0.5, "No clear signal, default TASK2")


def classify_academic_general(prompt: str, task: str) -> tuple[str, float, str]:
    """Return (ACADEMIC/GENERAL, confidence, reasoning)."""
    aca = _count_matches(prompt, _ACADEMIC_KEYWORDS)
    gen = _count_matches(prompt, _GENERAL_KEYWORDS)

    # Letter signal: "write a letter" or "Dear" very strong
    if "write a letter" in prompt.lower():
        return ("GENERAL", 0.98, "Explicit 'write a letter' found")
    if re.search(r"\bdear\b", prompt, re.IGNORECASE):
        return ("GENERAL", 0.9, "'Dear' found — letter format")

    if task == "TASK1":
        # Task 1 Academic is charts/data; Task 1 General is letters
        if gen > aca:
            conf = min(0.5 + (gen - aca) * 0.1, 0.95)
            return ("GENERAL", conf, f"General keywords={gen}, Academic keywords={aca}")
        else:
            conf = min(0.5 + (aca - gen) * 0.1, 0.95)
            return ("ACADEMIC", conf, f"Academic keywords={aca}, General keywords={gen}")
    else:
        # Task 2: both Academic and GT have same essay format
        # Default to Academic if no strong General signal
        if gen >= 2:
            return ("GENERAL", 0.6, f"General keywords={gen} found in essay prompt")
        return ("ACADEMIC", 0.7, "No General Training signal, default Academic")


def classify_chart_type(prompt: str) -> tuple[str, float, str]:
    """Classify chart type for Task 1 Academic."""
    scored = _score_pattern(prompt, _CHART_TYPE_PATTERNS)
    if scored:
        label, score = scored[0]
        return (label, min(score, 1.0),
                f"Chart type '{label}' matched with score {score:.2f}")
    return ("bar", 0.3, "No chart type detected, default 'bar'")


def classify_letter_type(prompt: str) -> tuple[str, float, str]:
    """Classify letter type for Task 1 General."""
    scored = _score_pattern(prompt, _LETTER_TYPE_PATTERNS)
    if scored:
        label, score = scored[0]
        return (label, min(score, 1.0),
                f"Letter type '{label}' matched with score {score:.2f}")
    return ("formal", 0.3, "No letter type detected, default 'formal'")


def classify_essay_type(prompt: str) -> tuple[str, float, str]:
    """Classify essay type for Task 2."""
    scored = _score_pattern(prompt, _ESSAY_TYPE_PATTERNS)

    # Check two-part special case
    two_part_score = _detect_two_part(prompt)
    if two_part_score > 0.3:
        scored.append(("two-part", two_part_score))

    if scored:
        label, score = scored[0]
        return (label, min(score, 1.0),
                f"Essay type '{label}' matched with score {score:.2f}")
    return ("opinion", 0.3, "No essay type detected, default 'opinion'")


def classify(prompt_text: str, essay_text: str = "",
             task_type_hint: str | None = None,
             chart_type_hint: str = "",
             essay_type_hint: str = "",
             letter_type_hint: str = "") -> ClassificationResult:
    """Full auto-classification of writing task. Uses hints if provided, falls back to auto-detection."""

    combined = f"{prompt_text} {essay_text}"

    # === 1. Task type (TASK1 vs TASK2) ===
    if task_type_hint and task_type_hint in ("TASK1_ACADEMIC", "TASK1_GENERAL", "TASK2_ACADEMIC", "TASK2_GENERAL"):
        task = task_type_hint
        task_conf = 1.0
        task_reason = "Provided by caller"
    else:
        task_base, task_conf, task_reason = classify_task_type(combined)
        aca_gen, aca_conf, aca_reason = classify_academic_general(combined, task_base)
        task = f"{task_base}_{aca_gen}"
        task_reason += f"; {aca_reason}"

    # === 2. Sub-type classification ===
    chart_type = chart_type_hint
    essay_type = essay_type_hint
    letter_type = letter_type_hint

    if task == "TASK1_ACADEMIC":
        if not chart_type:
            chart_type, chart_conf, _ = classify_chart_type(prompt_text)
        reason_parts = [task_reason]
        if chart_type:
            reason_parts.append(f"chart_type={chart_type}")

    elif task == "TASK1_GENERAL":
        if not letter_type:
            letter_type, letter_conf, _ = classify_letter_type(prompt_text)
        reason_parts = [task_reason]
        if letter_type:
            reason_parts.append(f"letter_type={letter_type}")

    else:  # TASK2_ACADEMIC or TASK2_GENERAL
        if not essay_type:
            essay_type, essay_conf, _ = classify_essay_type(combined)
        reason_parts = [task_reason]
        if essay_type:
            reason_parts.append(f"essay_type={essay_type}")

    overall_conf = min(task_conf, 1.0)
    return ClassificationResult(
        task_type=task,
        chart_type=chart_type,
        essay_type=essay_type,
        letter_type=letter_type,
        confidence=round(overall_conf, 2),
        reasoning="; ".join(reason_parts),
    )
