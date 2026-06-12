import pytest
from core.parser import ResponseParser, ParseError

parser = ResponseParser()


def test_parse_basic():
    content = '{"analysis":{},"scores":{"taskResponse":{"band":7.0},"coherenceCohesion":{"band":7.5},"lexicalResource":{"band":7.0},"grammaticalRange":{"band":7.0}},"overallBand":7.0,"confidence":0.85}'
    result = parser.parse(content, "TASK2_ACADEMIC")
    assert result.overall_band == 7.0
    assert result.task_response.band == 7.0
    assert result.coherence_cohesion.band == 7.5
    assert result.lexical_resource.band == 7.0
    assert result.grammatical_range.band == 7.0
    assert result.status == "COMPLETED"


def test_parse_snake_case():
    content = '{"analysis":{},"scores":{"task_response":{"band":6.5},"coherence_cohesion":{"band":6.0},"lexical_resource":{"band":6.5},"grammatical_range":{"band":6.0}},"overall_band":6.5,"confidence":0.75}'
    result = parser.parse(content, "TASK2_ACADEMIC")
    assert result.overall_band == 6.5
    assert result.task_response.band == 6.5


def test_parse_letter_task_type():
    """TASK1_GENERAL should prefer TA over TR"""
    content = '{"analysis":{},"scores":{"taskAchievement":{"band":7.0,"bandJustification":"Good letter"},"coherenceCohesion":{"band":7.0},"lexicalResource":{"band":6.5},"grammaticalRange":{"band":7.0}},"overallBand":7.0,"confidence":0.8}'
    result = parser.parse(content, "TASK1_GENERAL")
    assert result.overall_band == 7.0
    assert result.task_response.band == 7.0
    assert result.task_response.display_name == "Task Achievement"


def test_parse_letter_fallback_to_tr():
    """If TA not found, fall back to TR"""
    content = '{"analysis":{},"scores":{"taskResponse":{"band":6.5},"coherenceCohesion":{"band":6.0},"lexicalResource":{"band":6.0},"grammaticalRange":{"band":6.0}},"overallBand":6.0,"confidence":0.7}'
    result = parser.parse(content, "TASK1_GENERAL")
    assert result.overall_band == 6.0
    assert result.task_response.band == 6.5


def test_parse_with_boundary():
    content = '{"analysis":{},"scores":{"taskResponse":{"band":7.0,"boundary":{"detected":true,"closerTo":8.0,"reason":"Close to 8"}},"coherenceCohesion":{"band":7.0},"lexicalResource":{"band":7.0},"grammaticalRange":{"band":7.0}},"overallBand":7.0,"confidence":0.9}'
    result = parser.parse(content, "TASK2_ACADEMIC")
    assert result.task_response.boundary_detected is True
    assert result.task_response.boundary_closer_to == 8.0
    assert result.task_response.boundary_reason == "Close to 8"


def test_parse_with_strengths_weaknesses():
    content = '''{"analysis":{"identified_strengths":["Good vocabulary","Clear structure"],"identified_weaknesses":["Simple sentences"]},"scores":{"taskResponse":{"band":6.0},"coherenceCohesion":{"band":6.0},"lexicalResource":{"band":6.0},"grammaticalRange":{"band":6.0}},"overallBand":6.0,"confidence":0.7}'''
    result = parser.parse(content, "TASK2_ACADEMIC")
    assert "Good vocabulary" in result.strengths
    assert "Simple sentences" in result.weaknesses


def test_parse_overall_from_criteria():
    content = '{"analysis":{},"scores":{"taskResponse":{"band":7.5},"coherenceCohesion":{"band":7.0},"lexicalResource":{"band":7.0},"grammaticalRange":{"band":6.5}},"confidence":0.8}'
    result = parser.parse(content, "TASK2_ACADEMIC")
    assert result.overall_band == 7.0  # avg=7.0


def test_parse_invalid_json():
    with pytest.raises(ParseError):
        parser.parse("not json at all", "TASK2_ACADEMIC")


def test_parse_markdown_wrapped():
    content = """```json
{"analysis":{},"scores":{"taskResponse":{"band":6.0},"coherenceCohesion":{"band":6.0},"lexicalResource":{"band":6.0},"grammaticalRange":{"band":6.0}},"overallBand":6.0,"confidence":0.8}
```"""
    result = parser.parse(content, "TASK2_ACADEMIC")
    assert result.overall_band == 6.0


def test_parse_detailed_feedback():
    content = '{"analysis":{},"scores":{"taskResponse":{"band":7.0,"detailedFeedback":"Good development of ideas"}},"overallBand":7.0,"confidence":0.9}'
    result = parser.parse(content, "TASK2_ACADEMIC")
    assert result.task_response.detailed_feedback == "Good development of ideas"
