"""IELTS band score calculator."""

import math


def round_ielts_band(score: float) -> float:
    if score >= 9.0:
        return 9.0
    lower = math.floor(score)
    decimal = score - lower
    if decimal < 0.25:
        return float(lower)
    elif decimal < 0.75:
        return lower + 0.5
    else:
        return min(float(lower + 1), 9.0)


def calculate_overall_band(scores: list[float]) -> float:
    return round_ielts_band(sum(scores) / len(scores)) if scores else 0.0


_WEIGHT_T1 = 1.0 / 3.0
_WEIGHT_T2 = 2.0 / 3.0


def calculate_weighted_writing_score(task1_band: float, task2_band: float) -> float:
    """Task 2 counts for 2/3, Task 1 counts for 1/3 of total Writing score."""
    return round_ielts_band(task1_band * _WEIGHT_T1 + task2_band * _WEIGHT_T2)
