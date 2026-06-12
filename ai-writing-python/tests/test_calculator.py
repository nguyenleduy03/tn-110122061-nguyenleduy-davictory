import pytest
from core.calculator import round_ielts_band, calculate_overall_band, calculate_weighted_writing_score


@pytest.mark.parametrize("input_band,expected", [
    (9.0, 9.0), (8.75, 9.0), (8.74, 8.5), (8.5, 8.5), (8.25, 8.5),
    (8.24, 8.0), (8.0, 8.0), (7.75, 8.0), (7.74, 7.5), (7.5, 7.5),
    (7.25, 7.5), (7.24, 7.0), (7.0, 7.0), (6.75, 7.0), (6.74, 6.5),
    (6.5, 6.5), (6.25, 6.5), (6.24, 6.0), (6.0, 6.0),
    (0.0, 0.0), (0.1, 0.0), (0.24, 0.0), (0.25, 0.5), (0.74, 0.5), (0.75, 1.0),
])
def test_round_ielts_band(input_band, expected):
    assert round_ielts_band(input_band) == expected


def test_calculate_overall_band_normal():
    assert calculate_overall_band([6.0, 7.0, 6.0, 6.0]) == 6.5  # avg=6.25 -> 6.5
    assert calculate_overall_band([7.0, 7.0, 7.0, 7.0]) == 7.0
    assert calculate_overall_band([5.5, 6.0, 6.5, 6.0]) == 6.0  # avg=6.0
    assert calculate_overall_band([8.0, 8.5, 8.0, 8.5]) == 8.5  # avg=8.25 -> 8.5


def test_calculate_overall_band_empty():
    assert calculate_overall_band([]) == 0.0


def test_calculate_overall_band_mixed():
    assert calculate_overall_band([6.5, 7.0]) == 7.0  # avg=6.75 -> 7.0
    assert calculate_overall_band([5.0, 6.0, 5.0, 6.0]) == 5.5  # avg=5.5


@pytest.mark.parametrize("t1,t2,expected", [
    (6.5, 6.5, 6.5),  # same
    (6.5, 7.0, 7.0),  # 6.5*0.33 + 7.0*0.67 = 6.835 -> 7.0
    (7.0, 6.5, 6.5),  # 7.0*0.33 + 6.5*0.67 = 6.665 -> 6.5
    (8.0, 7.5, 7.5),  # 8.0*0.33 + 7.5*0.67 = 7.665 -> 7.5
    (6.0, 5.5, 5.5),  # 6.0*0.33 + 5.5*0.67 = 5.665 -> 5.5
    (9.0, 9.0, 9.0),
])
def test_calculate_weighted_writing_score(t1, t2, expected):
    assert calculate_weighted_writing_score(t1, t2) == expected
