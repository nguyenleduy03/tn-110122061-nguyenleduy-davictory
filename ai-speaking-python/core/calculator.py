"""IELTS band calculator for Speaking Service."""

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
