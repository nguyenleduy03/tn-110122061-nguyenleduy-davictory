import json
from pathlib import Path
from functools import lru_cache
from models.rubric import WritingRubric, RubricBandDetail, RubricBoundary

_HERE = Path(__file__).parent.parent


@lru_cache(maxsize=4)
def load_rubric(task_type: str = "TASK2_ACADEMIC") -> WritingRubric:
    path = _HERE / "templates" / "rubric_data.json"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        entries = data.get("rubrics", {}).get(task_type, data["rubrics"].get("TASK2_ACADEMIC", {}))
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
