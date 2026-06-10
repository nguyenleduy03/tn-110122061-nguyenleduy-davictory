import re
from typing import Optional

from chromadb import HttpClient
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from loguru import logger

from config import get_settings
from models.rubric import SampleEssay, DiversifiedResult

_STOP_WORDS = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
                "have", "has", "had", "do", "does", "did", "will", "would", "could",
                "should", "may", "might", "can", "shall", "to", "of", "in", "for",
                "on", "with", "at", "by", "from", "as", "into", "through", "during",
                "and", "or", "but", "if", "so", "than", "too", "very", "just",
                "this", "that", "these", "those", "it", "its", "which", "who",
                "about", "up", "out", "also", "now", "been", "has", "not", "no",
                "all", "both", "each", "few", "more", "most", "other", "some"}

_CRITERION_KEYS = {
    "tr": "task_response", "cc": "coherence_cohesion",
    "lr": "lexical_resource", "gra": "grammatical_range",
}


class SampleRetriever:
    COLLECTION = "writing_samples"

    def __init__(self):
        s = get_settings()
        self._client = HttpClient(host=s.chroma_host, port=s.chroma_port)
        self._model = None
        self._collection = None

    @property
    def collection(self):
        if self._collection is None:
            try:
                self._collection = self._client.get_or_create_collection(
                    name=self.COLLECTION, metadata={"hnsw:space": "cosine"})
            except Exception:
                self._collection = self._client.get_collection(self.COLLECTION)
        return self._collection

    @property
    def model(self):
        if self._model is None:
            self._model = DefaultEmbeddingFunction()
        return self._model

    def embed(self, text: str) -> list[float]:
        embeddings = self.model([text])
        return embeddings[0] if embeddings else []

    @property
    def is_initialized(self) -> bool:
        try:
            return self.collection.count() > 0
        except Exception:
            return False

    def count(self) -> int:
        try:
            return self.collection.count()
        except Exception:
            return 0

    def retrieve(self, query: str, task_type: str = "TASK2_ACADEMIC",
                 top_k: int = 15, exclude_id: int | None = None) -> DiversifiedResult:
        col = self.collection
        qe = self.embed(query)

        if col.count() == 0:
            return DiversifiedResult()

        where_filter = {"task_type": task_type}

        results = col.query(
            query_embeddings=[qe],
            n_results=min(top_k * 5, col.count()),
            where=where_filter,
            include=["metadatas", "documents", "distances"],
        )

        if not results.get("ids") or not results["ids"][0]:
            return DiversifiedResult()

        qkw = self._keywords(query)
        candidates = []
        for i in range(len(results["ids"][0])):
            try:
                did = int(results["ids"][0][i])
            except (ValueError, TypeError):
                continue
            if exclude_id and did == exclude_id:
                continue
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            dist = results["distances"][0][i] if results["distances"] else 0.0
            sim = max(0.0, 1.0 - dist)
            doc = results["documents"][0][i] if results["documents"] else ""
            dkw = self._keywords(doc)
            kscore = len(qkw & dkw) / max(len(qkw | dkw), 1)
            hybrid = sim * 0.7 + kscore * 0.3
            band = float(meta.get("band_score", 0))
            candidates.append((did, hybrid, sim, band, meta, dkw))

        candidates.sort(key=lambda x: x[1], reverse=True)
        return self._diversify(candidates, query)

    def _diversify(self, candidates: list, query: str) -> DiversifiedResult:
        low = [c for c in candidates if 4.0 <= c[3] < 6.0]
        mid = [c for c in candidates if 6.0 <= c[3] < 7.5]
        high = [c for c in candidates if c[3] >= 7.5]

        all_bands = low + mid + high
        if not all_bands:
            return DiversifiedResult()

        picks = []
        seen_ids = set()
        for bucket in [high, mid, low]:
            for c in bucket:
                did = c[0]
                if did not in seen_ids and not self._self_match(meta_to_essay(c[4]), query):
                    picks.append(c)
                    seen_ids.add(did)
                    if len(picks) >= 5:
                        break
            if len(picks) >= 5:
                break

        if not picks:
            return DiversifiedResult()

        samples = []
        for i, (did, _, sim, band, meta, dkw) in enumerate(picks):
            samples.append(SampleEssay(
                id=did,
                task_type=meta.get("task_type", ""),
                topic=meta.get("topic", ""),
                prompt_text=meta.get("prompt_text", ""),
                essay_text="",
                band_score=band,
                word_count=int(meta.get("word_count", 0) or 0),
                similarity_score=sim,
                keywords=sorted(dkw)[:8],
            ))

        avg_sim = sum(s.similarity_score for s in samples) / len(samples) if samples else 0.0
        bands = [s.band_score for s in samples]
        spread = max(bands) - min(bands) if len(bands) >= 2 else 0.0
        return DiversifiedResult(samples=samples, avg_similarity=avg_sim, band_spread=spread)

    def _keywords(self, text: str) -> set[str]:
        return {w for w in re.findall(r"\b[a-zA-Z]{4,}\b", text.lower()) if w not in _STOP_WORDS}

    def _self_match(self, e1: str, e2: str) -> bool:
        return bool(e1 and e2 and e1[:100].strip().lower() == e2[:100].strip().lower())


def meta_to_essay(meta: dict) -> str:
    return meta.get("essay_text", meta.get("documents", [""])[0] if isinstance(meta.get("documents"), list) else "") or ""
