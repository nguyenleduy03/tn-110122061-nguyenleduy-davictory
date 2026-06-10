"""Essay feature analyzer - NLP analysis of student essays."""

import re
from dataclasses import dataclass, field

COHESION_MARKERS = {
    "first", "second", "third", "firstly", "secondly", "thirdly", "finally",
    "however", "therefore", "moreover", "furthermore", "consequently", "nevertheless",
    "in addition", "on the other hand", "in contrast", "for example", "for instance",
    "as a result", "in conclusion", "to sum up", "nonetheless", "meanwhile",
    "subsequently", "accordingly", "thus", "hence", "besides", "also", "additionally",
    "similarly", "likewise", "in fact", "indeed", "specifically", "particularly",
    "in my opinion", "in other words", "on the contrary",
}

ACADEMIC_WORDS = {
    "significant", "substantial", "consequently", "furthermore", "demonstrate",
    "phenomenon", "implication", "contemporary", "empirical", "theoretical",
    "methodology", "correlation", "variable", "proportion", "predominantly",
    "fundamental", "crucial", "essential", "evident", "explicit", "implicit",
    "inevitably", "typically", "conversely", "mitigate", "exacerbate", "facilitate",
    "implement", "deteriorate", "controversial", "beneficial", "detrimental",
    "inequality", "disparity", "sustainability", "urbanization", "globalization",
    "advocate", "comprehensive",
}


@dataclass
class EssayFeatures:
    word_count: int = 0
    sentence_count: int = 0
    paragraph_count: int = 0
    avg_word_length: float = 0.0
    avg_sentence_length: float = 0.0
    lexical_diversity: float = 0.0
    academic_vocabulary_ratio: float = 0.0
    cohesion_marker_density: float = 0.0
    cohesion_markers_found: list[str] = field(default_factory=list)
    avg_words_per_paragraph: float = 0.0
    has_introduction: bool = False
    has_conclusion: bool = False
    has_clear_structure: bool = False
    long_sentence_count: int = 0
    short_sentence_count: int = 0
    complex_word_ratio: float = 0.0


def analyze_essay(essay: str) -> EssayFeatures:
    if not essay.strip():
        return EssayFeatures()
    paragraphs = [p.strip() for p in essay.split("\n") if p.strip()]
    sentences = [s.strip() for s in re.split(r"[.!?]+", essay) if len(s.strip()) > 3]
    words = re.findall(r"\b[a-zA-Z]+\b", essay.lower())

    f = EssayFeatures()
    f.word_count = len(words)
    f.sentence_count = len(sentences)
    f.paragraph_count = len(paragraphs)
    f.avg_word_length = sum(len(w) for w in words) / max(len(words), 1)
    f.avg_sentence_length = f.word_count / max(f.sentence_count, 1)
    f.avg_words_per_paragraph = f.word_count / max(f.paragraph_count, 1)

    unique = set(words)
    f.lexical_diversity = len(unique) / max(len(words), 1)

    aca = sum(1 for w in unique if w in ACADEMIC_WORDS)
    f.academic_vocabulary_ratio = aca / max(len(unique), 1)

    essay_lower = essay.lower()
    found = [m for m in COHESION_MARKERS if f" {m} " in f" {essay_lower} " or essay_lower.startswith(m + " ")]
    f.cohesion_markers_found = found
    f.cohesion_marker_density = len(found) / max(f.sentence_count, 1)

    first = paragraphs[0].lower() if paragraphs else ""
    last = paragraphs[-1].lower() if paragraphs else ""
    f.has_introduction = len(first.split()) > 10
    f.has_conclusion = any(m in last for m in {"in conclusion", "to sum up", "in summary", "overall"})
    f.has_clear_structure = f.has_introduction and f.has_conclusion and f.paragraph_count >= 3

    for s in sentences:
        wc = len(re.findall(r"\b[a-zA-Z]+\b", s.lower()))
        if wc > 25:
            f.long_sentence_count += 1
        elif wc < 8:
            f.short_sentence_count += 1

    complex_words = sum(1 for w in words if len(w) > 7)
    f.complex_word_ratio = complex_words / max(len(words), 1)

    return f
