from agents.content_agent import ContentAgent


class TestContentAgent:
    def test_agent_initialization(self):
        agent = ContentAgent()
        assert agent.name is not None
        assert agent.description is not None
