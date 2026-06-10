from pathlib import Path
from dataclasses import dataclass, field

from models.rubric import WritingRubric, RubricBandDetail

_TEMPLATES = Path(__file__).parent.parent / "templates"


@dataclass
class PromptContext:
    system_prompt: str = ""
    rubric_section: str = ""
    user_section: str = ""
    output_schema: str = ""

    def to_full_prompt(self) -> str:
        return self.user_section


def _rubric_block(name: str, bands: list[RubricBandDetail]) -> str:
    if not bands:
        return ""
    lines = [f"=== {name.upper()} ==="]
    for b in bands:
        lines.append(f"\nBand {b.band:.1f}:")
        if b.positive:
            for p in b.positive:
                lines.append(f"  + {p}")
        if b.negative:
            for n in b.negative:
                lines.append(f"  - {n}")
        if b.boundary_up and b.boundary_up.condition:
            lines.append(f"  → TO REACH Band {b.band + 0.5 if b.band < 9 else 9}: {b.boundary_up.condition}")
            lines.append(f"  → CHECK: {b.boundary_up.test}")
    return "\n".join(lines)


class PromptBuilder:

    def build(self, rubric: WritingRubric, essay: str,
              task_type: str, topic: str, prompt_text: str, word_count: int) -> PromptContext:
        system = self._load("system_role.txt") or "You are an official IELTS Writing Examiner."
        schema = self._load("output_schema.json") or '{"analysis":{},"scores":{},"overallBand":6.0}'

        rubric_sec = self._rubric_text(rubric)
        user = self._user_text(rubric_sec, essay, task_type, topic, prompt_text, word_count, schema)

        return PromptContext(
            system_prompt=system,
            rubric_section=rubric_sec,
            user_section=user,
            output_schema=schema,
        )

    def _load(self, name: str) -> str | None:
        p = _TEMPLATES / name
        return p.read_text(encoding="utf-8") if p.exists() else None

    def _rubric_text(self, rubric: WritingRubric) -> str:
        parts = []
        if not rubric.task_type.startswith("TASK1"):
            tr_name = "Task Response"
        else:
            tr_name = "Task Achievement"
        for name, bands in [
            (tr_name, rubric.task_response),
            ("Coherence & Cohesion", rubric.coherence_cohesion),
            ("Lexical Resource", rubric.lexical_resource),
            ("Grammatical Range & Accuracy", rubric.grammatical_range),
        ]:
            rb = _rubric_block(name, bands)
            if rb:
                parts.append(rb)
        return "\n".join(parts)

    def _user_text(self, rubric_sec: str, essay: str,
                   task_type: str, topic: str, prompt_text: str, word_count: int, schema: str) -> str:
        parts = ["=== GRADING TASK ==="]
        parts.append(f"Task Type: {task_type}")
        if topic:
            parts.append(f"Topic: {topic}")
        if prompt_text:
            parts.append(f"Prompt: {prompt_text}")
        parts.append(f"Word Count: {word_count}" + (" (SHORT - may affect Task Response)" if word_count < 200 else "") + "\n")

        if rubric_sec:
            parts.append("=== DETAILED RUBRIC ===\n" + rubric_sec + "\n")

        parts.append("=== STUDENT ESSAY ===\n" + essay[:4000] + "\n")

        parts.append("""=== TWO-STEP GRADING PROCESS ===

Step 1 — ANALYSIS (no scoring yet):
Analyse the essay against each criterion. Be specific and reference exact phrases from the essay.
Output an analysis object with:
- task_response_analysis: assessment of how well the task is addressed, position clarity, idea development
- coherence_analysis: assessment of organisation, progression, cohesive device usage, paragraphing
- lexical_analysis: assessment of vocabulary range, precision, less common items, collocation
- grammar_analysis: assessment of sentence variety, structural control, error patterns
- identified_strengths: list of specific textual strengths with evidence
- identified_weaknesses: list of specific textual weaknesses with evidence

Step 2 — BAND MAPPING:
For each criterion, compare your analysis against the DETAILED RUBRIC above.
1. Start from Band 5 descriptors and work upward
2. Find the highest band where ALL positive descriptors are met
3. Check that NONE of that band's negative descriptors apply
4. If negative descriptors apply, drop to the next lower band
5. Apply boundary detection: if the essay meets the current band but is close to meeting the next band, mark boundary_detected=true and explain why

Then calculate overallBand = average of 4 criteria rounded per IELTS rules.

Now determine your confidence in this score. Consider:
- How clearly does the essay match the chosen band descriptors?
- Are there any ambiguities or mixed signals?
- Use the full 0.0-1.0 scale

Finally, provide a band_justification explaining:
- Why each criterion received its band
- Why higher bands were NOT awarded (be specific)

Output ONLY valid JSON.""")
        return "\n".join(parts)
