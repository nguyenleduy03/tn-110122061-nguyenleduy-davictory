"""NLP feature analyzer for speaking transcripts."""

import re
from models.analysis import FeatureAnalysis
from models.session import SpeakingTurn

HESITATION = {"um", "uh", "er", "ah", "like", "you know", "well", "i mean", "sort of", "kind of", "actually", "basically", "hmm"}
DISCOURSE = {"first", "firstly", "second", "secondly", "finally", "however", "therefore", "moreover", "furthermore", "in my opinion", "i think", "in conclusion", "for example", "because", "although", "on the other hand", "in addition", "as a result", "similarly"}
ADVANCED = {"significant", "substantial", "consequently", "furthermore", "demonstrate", "phenomenon", "implication", "fundamental", "crucial", "essential", "inevitable", "predominantly", "controversial", "beneficial", "sustainable", "urbanization", "advocate", "mitigate", "exacerbate", "comprehensive", "perceive", "collaborate", "enhance"}
TENSES = {"present": re.compile(r"\b(is|are|am|do|does|have|has|make|go|say|think|believe)\b", re.I),
          "past": re.compile(r"\b(was|were|did|had|made|went|said|thought|used to)\b", re.I),
          "future": re.compile(r"\b(will|going to|plan to|intend to)\b", re.I)}
COMPLEX = {"although", "whereas", "because", "unless", "while", "despite", "however", "therefore"}


class FeatureAnalyzer:
    def analyze(self, turns: list[SpeakingTurn]) -> FeatureAnalysis:
        text = " ".join(t.answer_text for t in turns if t.answer_text.strip())
        if not text.strip():
            return FeatureAnalysis()

        words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
        uniq = set(words)
        sents = [s.strip() for s in re.split(r"[.!?]+", text) if len(s.strip()) > 3]

        f = FeatureAnalysis()
        f.word_count = len(words)
        f.sentence_count = len(sents)
        f.unique_word_count = len(uniq)
        f.lexical_diversity = len(uniq) / max(len(words), 1)
        f.avg_sentence_length = len(words) / max(len(sents), 1)

        low = text.lower()
        f.hesitation_markers = [m for m in HESITATION if f" {m} " in f" {low} " or low.startswith(m + " ")]
        f.hesitation_count = len(f.hesitation_markers)
        f.discourse_markers = [m for m in DISCOURSE if f" {m} " in f" {low} " or low.startswith(m + " ")]
        f.discourse_marker_count = len(f.discourse_markers)
        f.advanced_vocabulary = [w for w in uniq if w in ADVANCED]
        f.advanced_vocab_count = len(f.advanced_vocabulary)

        total_ms = sum(t.answer_duration_ms for t in turns if t.answer_duration_ms > 0)
        f.speech_rate = len(words) / (total_ms / 60000) if total_ms > 0 else 0

        tc = {n: len(p.findall(text)) for n, p in TENSES.items()}
        f.dominant_tense = max(tc, key=tc.get) if any(tc.values()) else "present"

        wlist = text.split()
        f.repetition_count = sum(1 for i in range(1, len(wlist)) if wlist[i].lower() == wlist[i-1].lower())
        f.complex_sentence_ratio = sum(1 for s in sents for c in COMPLEX if c in s.lower()) / max(len(sents), 1)

        return f
