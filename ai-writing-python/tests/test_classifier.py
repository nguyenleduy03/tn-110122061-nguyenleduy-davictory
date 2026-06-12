import pytest
from core.classifier import (
    classify, classify_task_type, classify_academic_general,
    classify_chart_type, classify_letter_type, classify_essay_type,
    ClassificationResult,
)


# ============================================================
# classify_task_type
# ============================================================

def test_task1_chart_keywords():
    prompt = "The line graph below shows the number of visitors to a museum from 2010 to 2020."
    task, conf, reason = classify_task_type(prompt)
    assert task == "TASK1"
    assert conf > 0.5


def test_task1_table_keywords():
    prompt = "The table below gives information about the population of five countries."
    task, conf, reason = classify_task_type(prompt)
    assert task == "TASK1"


def test_task1_process_keywords():
    prompt = "The diagram shows the process of how chocolate is produced from cocoa beans."
    task, conf, reason = classify_task_type(prompt)
    assert task == "TASK1"


def test_task2_opinion():
    prompt = "Some people think that the government should invest more in public transportation. To what extent do you agree or disagree?"
    task, conf, reason = classify_task_type(prompt)
    assert task == "TASK2"
    assert conf > 0.5


def test_task2_discussion():
    prompt = "Discuss both views and give your opinion. Some people believe that children should start school at a very early age, while others think they should start at age 7."
    task, conf, reason = classify_task_type(prompt)
    assert task == "TASK2"


def test_task2_problem_solution():
    prompt = "What are the main causes of traffic congestion in cities? What solutions can you suggest?"
    task, conf, reason = classify_task_type(prompt)
    assert task == "TASK2"


def test_task_explicit():
    prompt = "WRITING TASK 1: You should spend about 20 minutes on this task."
    task, conf, reason = classify_task_type(prompt)
    assert task == "TASK1"
    assert conf == 1.0

    prompt2 = "WRITING TASK 2: You should spend about 40 minutes on this task."
    task2, conf2, reason2 = classify_task_type(prompt2)
    assert task2 == "TASK2"
    assert conf2 == 1.0


# ============================================================
# classify_academic_general
# ============================================================

def test_academic_chart():
    prompt = "The bar chart below shows the percentage of people who use public transport in different cities."
    task_aca, conf, reason = classify_academic_general(prompt, "TASK1")
    assert task_aca == "ACADEMIC"


def test_general_letter():
    prompt = "You recently stayed at a hotel and were not satisfied with the service. Write a letter to the manager to complain."
    task_gen, conf, reason = classify_academic_general(prompt, "TASK1")
    assert task_gen == "GENERAL"


def test_general_letter_dear():
    prompt = "Dear Sir or Madam, I am writing to apply for the position of..."
    task_gen, conf, reason = classify_academic_general(prompt, "TASK1")
    assert task_gen == "GENERAL"
    assert conf > 0.8


def test_general_task2():
    prompt = "Some people think that learning practical skills at work is more important than academic qualifications."
    # No General Training signal -> default Academic for Task 2
    task, conf, reason = classify_academic_general(prompt, "TASK2")
    assert task == "ACADEMIC"


# ============================================================
# classify_chart_type
# ============================================================

def test_chart_line():
    prompt = "The line graph shows changes in the price of oil over a 20-year period."
    ct, conf, reason = classify_chart_type(prompt)
    assert ct == "line"


def test_chart_bar():
    prompt = "The bar chart compares the number of males and females in different age groups."
    ct, conf, reason = classify_chart_type(prompt)
    assert ct == "bar"


def test_chart_pie():
    prompt = "The pie charts show the proportion of household expenditure in 1990 and 2010."
    ct, conf, reason = classify_chart_type(prompt)
    assert ct == "pie"


def test_chart_table():
    prompt = "The table below gives information about the literacy rates in several countries."
    ct, conf, reason = classify_chart_type(prompt)
    assert ct == "table"


def test_chart_process():
    prompt = "The diagram illustrates the process by which bricks are manufactured for the building industry."
    ct, conf, reason = classify_chart_type(prompt)
    assert ct == "process"


def test_chart_map():
    prompt = "The maps show the changes that took place in a town between 1990 and 2020."
    ct, conf, reason = classify_chart_type(prompt)
    assert ct == "map"


def test_chart_multiple():
    prompt = "The chart and graph below show the number of tourists and the average spending per tourist."
    ct, conf, reason = classify_chart_type(prompt)
    assert ct == "multiple"


# ============================================================
# classify_letter_type
# ============================================================

def test_letter_formal():
    prompt = "Dear Sir or Madam, I am writing to express my dissatisfaction with the service I received at your restaurant."
    lt, conf, reason = classify_letter_type(prompt)
    assert lt == "formal"


def test_letter_semi_formal():
    prompt = "Dear Mr Smith, I am writing to let you know that I will be unable to attend the meeting next week."
    lt, conf, reason = classify_letter_type(prompt)
    assert lt == "semi-formal"


def test_letter_informal():
    prompt = "Hi John, How are you? I hope you're doing well. I'm writing to invite you to my birthday party next Saturday."
    lt, conf, reason = classify_letter_type(prompt)
    assert lt == "informal"


def test_letter_formal_complaint():
    prompt = "You recently bought a product from a store but it was defective. Write a letter to the store manager to complain."
    lt, conf, reason = classify_letter_type(prompt)
    assert lt == "formal"


# ============================================================
# classify_essay_type
# ============================================================

def test_essay_opinion():
    prompt = "To what extent do you agree or disagree with the following statement? University education should be free for everyone."
    et, conf, reason = classify_essay_type(prompt)
    assert et == "opinion"


def test_essay_discussion():
    prompt = "Discuss both views and give your opinion. Some people believe that technology makes people more social, while others think it isolates them."
    et, conf, reason = classify_essay_type(prompt)
    assert et == "discussion"


def test_essay_advantages_disadvantages():
    prompt = "What are the advantages and disadvantages of living in a big city?"
    et, conf, reason = classify_essay_type(prompt)
    assert et == "advantages-disadvantages"


def test_essay_problem_solution():
    prompt = "What are the causes of air pollution in urban areas? What measures can be taken to solve this problem?"
    et, conf, reason = classify_essay_type(prompt)
    assert et == "problem-solution"


def test_essay_two_part():
    prompt = "Why do people choose to live alone in big cities? What impact does this trend have on society?"
    et, conf, reason = classify_essay_type(prompt)
    assert et == "two-part"


# ============================================================
# full classify()
# ============================================================

def test_classify_task1_academic_bar():
    prompt = "The bar chart below shows the percentage of people who use public transport in different cities."
    result = classify(prompt)
    assert result.task_type == "TASK1_ACADEMIC"
    assert result.chart_type == "bar"
    assert result.confidence > 0.3
    assert result.reasoning


def test_classify_task1_general_letter():
    prompt = "You recently stayed at a hotel and were not satisfied with the service. Write a letter to the manager to complain."
    result = classify(prompt)
    assert result.task_type == "TASK1_GENERAL"
    assert result.letter_type == "formal"


def test_classify_task2_opinion():
    prompt = "To what extent do you agree or disagree with the following statement? The government should invest more in renewable energy."
    result = classify(prompt)
    assert result.task_type == "TASK2_ACADEMIC"
    assert result.essay_type == "opinion"


def test_classify_task2_discussion():
    prompt = "Discuss both views and give your opinion. Some people think that children should start school early, others believe they should start later."
    result = classify(prompt)
    assert result.task_type == "TASK2_ACADEMIC"
    assert result.essay_type == "discussion"


def test_classify_with_hints():
    """Hints should override auto-detection."""
    prompt = "The bar chart below shows data."
    result = classify(prompt, task_type_hint="TASK1_GENERAL", letter_type_hint="informal")
    assert result.task_type == "TASK1_GENERAL"
    assert result.letter_type == "informal"


def test_classify_empty_prompt():
    """Should return defaults for empty prompt."""
    result = classify("")
    assert result.task_type == "TASK2_ACADEMIC"
    assert result.essay_type == "opinion"


def test_classify_task1_line():
    prompt = "The line graph below shows the amount of electricity generated by different sources in a country from 2000 to 2020."
    result = classify(prompt)
    assert result.task_type == "TASK1_ACADEMIC"
    assert result.chart_type == "line"


def test_classify_task1_process():
    prompt = "The process diagram shows how glass bottles are recycled."
    result = classify(prompt)
    assert result.task_type == "TASK1_ACADEMIC"
    assert result.chart_type == "process"


def test_classify_task1_map():
    prompt = "The maps show the development of a coastal town between 1960 and 2020."
    result = classify(prompt)
    assert result.task_type == "TASK1_ACADEMIC"
    assert result.chart_type == "map"
