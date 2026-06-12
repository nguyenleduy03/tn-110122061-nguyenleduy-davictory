import json
from pathlib import Path
from functools import lru_cache
from models.rubric import WritingRubric, RubricBandDetail, RubricBoundary

_HERE = Path(__file__).parent.parent

VALID_TASK_TYPES = {
    "TASK1_ACADEMIC", "TASK2_ACADEMIC",
    "TASK1_GENERAL", "TASK2_GENERAL",
}

VALID_CHART_TYPES = {"line", "bar", "pie", "table", "process", "map", "multiple", ""}
VALID_ESSAY_TYPES = {"opinion", "discussion", "advantages-disadvantages", "problem-solution", "two-part", ""}
VALID_LETTER_TYPES = {"formal", "semi-formal", "informal", ""}


def validate_task_params(task_type: str, chart_type: str = "", essay_type: str = "", letter_type: str = "") -> list[str]:
    errors = []
    if task_type not in VALID_TASK_TYPES:
        errors.append(f"Invalid task_type: '{task_type}'. Must be one of {VALID_TASK_TYPES}")
    if chart_type and chart_type not in VALID_CHART_TYPES:
        errors.append(f"Invalid chart_type: '{chart_type}'. Must be one of {VALID_CHART_TYPES}")
    if essay_type and essay_type not in VALID_ESSAY_TYPES:
        errors.append(f"Invalid essay_type: '{essay_type}'. Must be one of {VALID_ESSAY_TYPES}")
    if letter_type and letter_type not in VALID_LETTER_TYPES:
        errors.append(f"Invalid letter_type: '{letter_type}'. Must be one of {VALID_LETTER_TYPES}")
    if task_type == "TASK1_ACADEMIC" and chart_type and chart_type not in {"line", "bar", "pie", "table", "process", "map", "multiple"}:
        errors.append(f"Invalid chart_type '{chart_type}' for TASK1_ACADEMIC")
    if task_type == "TASK1_GENERAL" and letter_type not in {"formal", "semi-formal", "informal", ""}:
        errors.append(f"Invalid letter_type '{letter_type}' for TASK1_GENERAL")
    if task_type == "TASK2_GENERAL" and essay_type and essay_type not in VALID_ESSAY_TYPES:
        errors.append(f"Invalid essay_type '{essay_type}' for TASK2")
    return errors


@lru_cache(maxsize=8)
def load_rubric(task_type: str = "TASK2_ACADEMIC") -> WritingRubric:
    path = _HERE / "templates" / "rubric_data.json"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        rubrics = data.get("rubrics", {})
        if task_type not in rubrics:
            fallback = "TASK2_ACADEMIC" if "TASK2" in task_type else "TASK1_ACADEMIC"
            entries = rubrics.get(fallback, {})
        else:
            entries = rubrics[task_type]
        return WritingRubric(
            task_type=task_type,
            task_response=_parse_bands(entries.get("task_response", [])),
            coherence_cohesion=_parse_bands(entries.get("coherence_cohesion", [])),
            lexical_resource=_parse_bands(entries.get("lexical_resource", [])),
            grammatical_range=_parse_bands(entries.get("grammatical_range", [])),
        )
    return _default_rubric(task_type)


def _parse_bands(raw: list[dict]) -> list[RubricBandDetail]:
    result = []
    for entry in raw:
        boundary = None
        if "boundary_up" in entry and entry["boundary_up"]:
            boundary = RubricBoundary(
                condition=entry["boundary_up"].get("condition", ""),
                test=entry["boundary_up"].get("test", ""),
            )
        result.append(RubricBandDetail(
            band=entry.get("band", 0.0),
            positive=entry.get("positive", []),
            negative=entry.get("negative", []),
            boundary_up=boundary,
        ))
    return result


def _default_rubric(task_type: str) -> WritingRubric:
    def b(band, pos, neg):
        return RubricBandDetail(band=band, positive=pos, negative=neg)
    tr = [
        b(5, ["Addresses task partially"], ["Limited development, unclear position"]),
        b(6, ["Addresses all parts, relevant position"], ["Some ideas inadequately developed"]),
        b(7, ["Clear position throughout, extends ideas"], ["Development may be uneven"]),
        b(8, ["Well-developed with relevant, extended ideas"], ["Occasional lack of precision"]),
        b(9, ["Fully developed position, precise support"], []),
    ]
    cc = [
        b(5, ["Some organisation"], ["Inadequate cohesive devices"]),
        b(6, ["Clear overall progression"], ["Cohesion may be mechanical"]),
        b(7, ["Logically organises ideas", "Range of cohesive devices"], ["Some over-use"]),
        b(8, ["Manages cohesion well", "Logical sequencing"], ["Cohesion occasionally noticeable"]),
        b(9, ["Effortless cohesion", "Skilful paragraphing"], []),
    ]
    lr = [
        b(5, ["Limited vocabulary"], ["Errors cause difficulty"]),
        b(6, ["Adequate range"], ["Inaccuracy in less common items"]),
        b(7, ["Sufficient range with flexibility"], ["Occasional imprecision"]),
        b(8, ["Wide range fluently"], ["Rare lack of naturalness"]),
        b(9, ["Sophisticated control", "Rare slip errors"], []),
    ]
    gra = [
        b(5, ["Limited range"], ["Frequent errors"]),
        b(6, ["Mix of simple and complex"], ["Some errors in complex structures"]),
        b(7, ["Variety of complex structures"], ["Occasional errors"]),
        b(8, ["Wide range, majority error-free"], ["Very occasional errors"]),
        b(9, ["Full range, full accuracy"], []),
    ]
    return WritingRubric(task_type=task_type, task_response=tr, coherence_cohesion=cc, lexical_resource=lr, grammatical_range=gra)
