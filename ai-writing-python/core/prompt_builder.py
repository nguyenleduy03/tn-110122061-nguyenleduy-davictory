from pathlib import Path
from dataclasses import dataclass, field

from models.rubric import WritingRubric, RubricBandDetail

_TEMPLATES = Path(__file__).parent.parent / "templates"

_SYS_PROMPT_MAP = {
    "TASK1_ACADEMIC": "sys_role_t1_academic.txt",
    "TASK1_GENERAL": "sys_role_t1_general.txt",
}


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


_TASK1_CHART_GUIDE = {
    "line": "Describing trends over time (line graph). Focus on: overall trend direction, key increases/decreases, fluctuations, peak/trough points, rate of change.",
    "bar": "Comparing categories (bar chart). Focus on: highest/lowest values, significant differences, groupings, rankings, changes over time if applicable.",
    "pie": "Comparing proportions (pie chart). Focus on: largest/smallest shares, percentages, rankings, changes between time periods if applicable.",
    "table": "Comparing numerical data (table). Focus on: highest/lowest figures, notable differences, trends, selecting key data points (not all).",
    "process": "Describing a process (process diagram). Focus on: stages in sequence, inputs and outputs, cyclical vs linear, materials/equipment, passive voice for man-made processes.",
    "map": "Describing spatial changes (map). Focus on: location descriptions, additions/removals, expansions/contractions, transformations, compass directions.",
    "multiple": "Combined charts. Focus on: correlation between chart types, key findings from each, synthesising information, not describing each chart separately.",
}

_TASK2_ESSAY_GUIDE = {
    "opinion": "Argumentative essay — state and defend a clear position on the issue. Focus on: strong thesis statement, well-developed arguments, counter-arguments addressed, clear conclusion.",
    "discussion": "Discussion essay — discuss both views/sides of an issue. Focus on: balanced coverage of both perspectives, your own opinion clearly stated, equal development of each side.",
    "advantages-disadvantages": "Advantages and disadvantages essay. Focus on: balanced coverage of pros and cons, whether advantages outweigh disadvantages (if asked), specific examples.",
    "problem-solution": "Problem and solution essay (or causes/effects). Focus on: clearly identified problems/causes, feasible solutions/effects, cause-effect reasoning, concrete recommendations.",
    "two-part": "Two-part question essay — answer two distinct questions. Focus on: equal attention to both questions, clear structure addressing each question, logical connection between parts.",
}

_LETTER_GUIDE = {
    "formal": "FORMAL LETTER — written to someone you do not know personally (e.g. company, manager, official). Use: formal greetings (Dear Sir/Madam), formal closings (Yours faithfully/sincerely), no contractions, polite and respectful language, formal vocabulary.",
    "semi-formal": "SEMI-FORMAL LETTER — written to someone you know but in a professional/formal context (e.g. boss, teacher, neighbour). Use: courteous tone, some contractions acceptable, less formal than full formal but still polite, appropriate closings (Best regards, Kind regards).",
    "informal": "INFORMAL LETTER — written to a friend or close family member. Use: friendly conversational tone, contractions OK (I'm, don't), personal expressions, casual closings (Love, Best wishes, Take care), informal vocabulary.",
}


class PromptBuilder:

    def build(self, rubric: WritingRubric, essay: str,
              task_type: str, topic: str, prompt_text: str, word_count: int,
              chart_type: str = "", essay_type: str = "", letter_type: str = "",
              max_completion_tokens: int = 0, image_url: str = "") -> PromptContext:
        sys_file = _SYS_PROMPT_MAP.get(task_type, "sys_role_t2.txt")
        system = self._load(sys_file) or self._load("system_role.txt") or "You are an official IELTS Writing Examiner."
        schema = self._load("output_schema.json") or '{"analysis":{},"scores":{},"overallBand":6.0}'

        rubric_sec = self._rubric_text(rubric)
        user = self._user_text(rubric_sec, essay, task_type, topic, prompt_text, word_count, schema,
                               chart_type, essay_type, letter_type, max_completion_tokens, image_url)

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
        if rubric.task_type == "TASK1_GENERAL":
            tr_name = "Task Achievement (Letter)"
        elif not rubric.task_type.startswith("TASK1"):
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
                   task_type: str, topic: str, prompt_text: str, word_count: int, schema: str,
                   chart_type: str = "", essay_type: str = "", letter_type: str = "",
                   max_completion_tokens: int = 0, image_url: str = "") -> str:
        parts = ["=== GRADING TASK ==="]
        parts.append(f"Task Type: {task_type}")

        # Append type-specific guidance
        if task_type == "TASK1_ACADEMIC" and chart_type in _TASK1_CHART_GUIDE:
            parts.append(f"Chart Type: {chart_type}")
            parts.append(f"Visual Guide: {_TASK1_CHART_GUIDE[chart_type]}")
        elif task_type == "TASK1_GENERAL":
            lt = letter_type or "formal"
            parts.append(f"Letter Type: {lt}")
            if lt in _LETTER_GUIDE:
                parts.append(f"Letter Guide: {_LETTER_GUIDE[lt]}")
        elif task_type in ("TASK2_ACADEMIC", "TASK2_GENERAL") and essay_type in _TASK2_ESSAY_GUIDE:
            parts.append(f"Essay Type: {essay_type}")
            parts.append(f"Essay Guide: {_TASK2_ESSAY_GUIDE[essay_type]}")

        if topic:
            parts.append(f"Topic: {topic}")
        if prompt_text:
            parts.append(f"Prompt: {prompt_text}")
        if image_url:
            parts.append(f"Image/Chart URL (provided to student): {image_url}")
            if task_type == "TASK1_ACADEMIC":
                parts.append("Note: The student was shown a visual (chart/diagram/map) for this task. The image URL is above. Evaluate based on the student's description and analysis of the visual data.")

        # Word count warning based on task type
        if task_type == "TASK1_GENERAL":
            min_words = 150
            warning = " (SHORT)" if word_count < 150 else ""
        elif task_type.startswith("TASK1"):
            min_words = 150
            warning = " (SHORT)" if word_count < 150 else ""
        else:
            min_words = 250
            warning = " (SHORT)" if word_count < 250 else ""
        parts.append(f"Word Count: {word_count}{warning}\n")

        if rubric_sec:
            parts.append("=== DETAILED RUBRIC ===\n" + rubric_sec + "\n")

        parts.append("=== STUDENT ESSAY ===\n" + essay + "\n")

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

""")  # noqa: E501
        if max_completion_tokens > 0:
            parts.append(f"\nTOKEN BUDGET: Your response must fit in ~{max_completion_tokens} tokens. Prioritize: band scores (all 4 criteria), evidence, key feedback. Be concise.\n")
        parts.append("You MUST output valid JSON following this exact schema:\n")
        parts.append(schema)
        parts.append("\n\nOutput ONLY valid JSON — no markdown, no extra text.")
        return "\n".join(parts)
