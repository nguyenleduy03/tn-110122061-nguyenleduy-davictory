"""Pronunciation engine for word confidence analysis."""

import statistics

from config import get_settings
from models.analysis import PronunciationResult
from models.session import SpeakingTurn

HESITATION_WORDS = {"um", "uh", "er", "ah", "like", "hmm"}


class PronunciationEngine:
    def __init__(self):
        self.s = get_settings()

    def analyze(self, turns: list[SpeakingTurn], whisper_segments: list[dict] | None = None) -> PronunciationResult:
        text = " ".join(t.answer_text.strip() for t in turns if t.answer_text.strip())
        words = [w for w in text.split() if w.strip()]
        r = PronunciationResult()
        r.total_word_count = len(words)

        h = sum(1 for w in words if w.lower().strip(",.!?") in HESITATION_WORDS)
        r.hesitation_ratio = h / max(len(words), 1)

        total_ms = sum(t.answer_duration_ms for t in turns if t.answer_duration_ms > 0)
        r.speech_rate = len(words) / (total_ms / 60000) if total_ms > 0 else 0

        if whisper_segments:
            r.has_audio = True

            # Flatten all word entries with their timing
            all_word_timings = []
            for seg in whisper_segments:
                for w in seg.get("words", []):
                    all_word_timings.append(w)

            lc = sum(1 for w in all_word_timings if w.get("confidence", 1.0) < self.s.min_word_confidence)
            total = len(all_word_timings)
            r.low_confidence_word_count = lc
            r.total_word_count = max(r.total_word_count, total)
            r.confidence_ratio = 1.0 - (lc / max(total, 1))

            # Compute pause_ratio: gaps between words / total duration
            timings = [(w.get("start", 0), w.get("end", 0)) for w in all_word_timings if w.get("start") is not None and w.get("end") is not None]
            if len(timings) >= 2:
                total_duration = timings[-1][1] - timings[0][0]
                pauses = sum(max(0, timings[i + 1][0] - timings[i][1]) for i in range(len(timings) - 1))
                r.pause_ratio = pauses / max(total_duration, 0.001)

            # Compute word_duration_std: variation in word speaking duration
            durations = [e - s for s, e in timings]
            if len(durations) >= 2:
                r.word_duration_std = statistics.stdev(durations)

            r.band = self._calc_audio_band(r)
        else:
            r.has_audio = False
            r.confidence_ratio = 1.0 - r.hesitation_ratio
            r.band = min(self._calc_text_band(r), 7.0)

        return r

    def _calc_audio_band(self, r: PronunciationResult) -> float:
        cr, sr, hr = r.confidence_ratio, r.speech_rate, r.hesitation_ratio
        if cr > 0.98 and 120 <= sr <= 170 and hr < 0.01: return 9.0
        if cr > 0.95 and 100 <= sr <= 180 and hr < 0.03: return 8.0
        if cr > 0.90 and 80 <= sr <= 200 and hr < 0.06: return 7.0
        if cr > 0.80 and 60 <= sr <= 220 and hr < 0.10: return 6.0
        if cr > 0.70 and sr >= 40 and hr < 0.15: return 5.0
        if cr > 0.50 and sr >= 30: return 4.0
        return 3.0

    def _calc_text_band(self, r: PronunciationResult) -> float:
        hr = r.hesitation_ratio
        if hr < 0.03: return 7.0
        if hr < 0.06: return 6.0
        if hr < 0.10: return 5.0
        if hr < 0.15: return 4.0
        return 3.0
