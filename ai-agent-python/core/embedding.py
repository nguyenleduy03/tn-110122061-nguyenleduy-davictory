import math
import re
from collections import Counter

from loguru import logger


def _tokenize(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    return [t for t in text.split() if len(t) > 1]


class TfidfIndex:
    def __init__(self):
        self.docs: list[str] = []
        self.doc_tokens: list[list[str]] = []
        self.idf: dict[str, float] = {}
        self.terms: set[str] = set()

    def build(self, docs: list[str]):
        self.docs = docs
        self.doc_tokens = [_tokenize(d) for d in docs]
        all_tokens = [t for dt in self.doc_tokens for t in dt]
        term_doc_count = Counter()
        for dt in self.doc_tokens:
            for t in set(dt):
                term_doc_count[t] += 1
        n = len(docs)
        self.terms = set(all_tokens)
        self.idf = {t: math.log((n + 1) / (term_doc_count[t] + 1)) + 1 for t in self.terms}

    def _tfidf(self, tokens: list[str]) -> dict[str, float]:
        tf = Counter(tokens)
        n = len(tokens) or 1
        return {t: (tf[t] / n) * self.idf.get(t, 1) for t in set(tokens) if t in self.idf}

    def _cosine_sim(self, v1: dict[str, float], v2: dict[str, float]) -> float:
        terms = set(v1) | set(v2)
        dot = sum(v1.get(t, 0) * v2.get(t, 0) for t in terms)
        n1 = math.sqrt(sum(v * v for v in v1.values())) or 1
        n2 = math.sqrt(sum(v * v for v in v2.values())) or 1
        return dot / (n1 * n2)

    def search(self, query: str, top_n: int = 5) -> list[tuple[int, float]]:
        q_tokens = _tokenize(query)
        q_vec = self._tfidf(q_tokens)
        scores = []
        for i, dt in enumerate(self.doc_tokens):
            d_vec = self._tfidf(dt)
            sim = self._cosine_sim(q_vec, d_vec)
            scores.append((i, sim))
        scores.sort(key=lambda x: -x[1])
        return scores[:top_n]

    def search_with_keys(self, query: str, keys: list[str], top_n: int = 5) -> list[tuple[str, float]]:
        results = self.search(query, top_n * 3)
        seen = set()
        filtered = []
        for idx, score in results:
            key = keys[idx] if idx < len(keys) else str(idx)
            if key not in seen:
                seen.add(key)
                filtered.append((key, score))
        return filtered[:top_n]


_index: TfidfIndex | None = None


def build_index(docs: list[str]) -> TfidfIndex:
    global _index
    idx = TfidfIndex()
    idx.build(docs)
    _index = idx
    logger.info(f"✅ Built TF-IDF index with {len(docs)} documents")
    return idx


def get_index() -> TfidfIndex | None:
    return _index
