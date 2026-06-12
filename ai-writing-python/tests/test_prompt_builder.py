import pytest
from core.prompt_builder import PromptBuilder
from core.rubric import load_rubric
from models.rubric import WritingRubric

builder = PromptBuilder()

SAMPLE_ESSAY = "This is a sample essay for testing purposes. It contains enough words to pass the minimum threshold for the test."


def _make_rubric(task_type: str) -> WritingRubric:
    return load_rubric(task_type)


def test_build_task2_academic():
    rubric = _make_rubric("TASK2_ACADEMIC")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK2_ACADEMIC", "Education", "Some prompt text", 50)
    assert pc.system_prompt
    assert pc.user_section
    assert pc.rubric_section
    assert pc.output_schema
    assert "TASK2_ACADEMIC" in pc.user_section
    assert "TASK RESPONSE" in pc.rubric_section
    assert "Education" in pc.user_section
    assert "Some prompt text" in pc.user_section


def test_build_task1_academic():
    rubric = _make_rubric("TASK1_ACADEMIC")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK1_ACADEMIC", "GDP chart", "Describe the chart", 50,
                       chart_type="bar")
    assert "TASK1_ACADEMIC" in pc.user_section
    assert "TASK ACHIEVEMENT" in pc.rubric_section
    assert "bar" in pc.user_section.lower()
    assert "GDP chart" in pc.user_section


def test_build_task1_general():
    rubric = _make_rubric("TASK1_GENERAL")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK1_GENERAL", "", "", 50,
                       letter_type="formal")
    assert "TASK1_GENERAL" in pc.user_section
    assert "TASK ACHIEVEMENT (LETTER)" in pc.rubric_section
    assert "FORMAL" in pc.user_section


def test_build_task1_general_informal():
    rubric = _make_rubric("TASK1_GENERAL")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK1_GENERAL", "", "", 50,
                       letter_type="informal")
    assert "INFORMAL" in pc.user_section
    assert "TASK ACHIEVEMENT (LETTER)" in pc.rubric_section


def test_build_task2_with_essay_type():
    rubric = _make_rubric("TASK2_ACADEMIC")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK2_ACADEMIC", "Technology", "", 50,
                       essay_type="discussion")
    assert "discussion" in pc.user_section.lower() or "Discussion" in pc.user_section
    assert "Technology" in pc.user_section


def test_word_count_warning_task1():
    rubric = _make_rubric("TASK1_ACADEMIC")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK1_ACADEMIC", "", "", 50)
    assert "SHORT" in pc.user_section


def test_word_count_warning_task2():
    rubric = _make_rubric("TASK2_ACADEMIC")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK2_ACADEMIC", "", "", 50)
    assert "SHORT" in pc.user_section


def test_to_full_prompt():
    rubric = _make_rubric("TASK2_ACADEMIC")
    pc = builder.build(rubric, SAMPLE_ESSAY, "TASK2_ACADEMIC", "", "", 50)
    full = pc.to_full_prompt()
    assert full == pc.user_section
    assert len(full) > 0
