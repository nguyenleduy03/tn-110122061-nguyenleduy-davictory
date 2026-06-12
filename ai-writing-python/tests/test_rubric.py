import pytest
from core.rubric import load_rubric, validate_task_params
from models.rubric import WritingRubric


def test_load_rubric_task2_academic():
    r = load_rubric("TASK2_ACADEMIC")
    assert isinstance(r, WritingRubric)
    assert r.task_type == "TASK2_ACADEMIC"
    assert len(r.task_response) > 0
    assert len(r.coherence_cohesion) > 0
    assert len(r.lexical_resource) > 0
    assert len(r.grammatical_range) > 0


def test_load_rubric_task1_academic():
    r = load_rubric("TASK1_ACADEMIC")
    assert r.task_type == "TASK1_ACADEMIC"
    assert len(r.task_response) > 0


def test_load_rubric_task1_general():
    r = load_rubric("TASK1_GENERAL")
    assert r.task_type == "TASK1_GENERAL"
    assert len(r.task_response) > 0


def test_load_rubric_task2_general():
    r = load_rubric("TASK2_GENERAL")
    assert r.task_type == "TASK2_GENERAL"
    assert len(r.task_response) > 0


def test_load_rubric_fallback():
    r = load_rubric("TASK2_ACADEMIC_UNKNOWN")
    assert r.task_type == "TASK2_ACADEMIC_UNKNOWN"
    assert len(r.task_response) > 0


def test_load_rubric_cached():
    r1 = load_rubric("TASK2_ACADEMIC")
    r2 = load_rubric("TASK2_ACADEMIC")
    assert r1 is r2  # same cached object


def test_validate_task_params_valid():
    errors = validate_task_params("TASK1_ACADEMIC", chart_type="bar")
    assert len(errors) == 0

    errors = validate_task_params("TASK2_ACADEMIC", essay_type="opinion")
    assert len(errors) == 0

    errors = validate_task_params("TASK1_GENERAL", letter_type="formal")
    assert len(errors) == 0

    errors = validate_task_params("TASK2_GENERAL")
    assert len(errors) == 0


def test_validate_task_params_invalid_task_type():
    errors = validate_task_params("TASK3_ACADEMIC")
    assert len(errors) > 0


def test_validate_task_params_invalid_chart():
    errors = validate_task_params("TASK1_ACADEMIC", chart_type="radar")
    assert len(errors) > 0


def test_validate_task_params_invalid_essay():
    errors = validate_task_params("TASK2_ACADEMIC", essay_type="narrative")
    assert len(errors) > 0


def test_validate_task_params_invalid_letter():
    errors = validate_task_params("TASK1_GENERAL", letter_type="casual")
    assert len(errors) > 0


def test_validate_task_params_chart_not_for_general():
    errors = validate_task_params("TASK1_GENERAL", letter_type="formal")
    assert len(errors) == 0
