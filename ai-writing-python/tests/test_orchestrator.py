from core.orchestrator import GradingOrchestrator


class TestGradingOrchestrator:
    def setup_method(self):
        self.orch = GradingOrchestrator()

    def test_orchestrator_initialization(self):
        assert self.orch.settings is not None
        assert self.orch.cache is not None

    def test_make_low_score_result(self):
        result = self.orch._make_low_score_result(
            submission_id=1, word_count=5,
            reason="Too short", band=1.0
        )
        assert result.submission_id == 1
        assert result.overall_band == 1.0
        assert result.status == "COMPLETED"

    def test_get_result_not_graded(self):
        result = self.orch.get_result(99999)
        assert result is None

    def test_cache_stats(self):
        stats = self.orch.cache_stats()
        assert isinstance(stats, dict)
