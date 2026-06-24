from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from core.base import BaseAgent


class AgentRegistry:
    _agents: dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent):
        self._agents[agent.name] = agent

    def get(self, name: str) -> BaseAgent | None:
        return self._agents.get(name)

    def list_agents(self) -> list[dict]:
        return [
            {
                "name": a.name,
                "description": a.description,
                "capabilities": a.capabilities,
            }
            for a in self._agents.values()
        ]

    def route(self, intent: str) -> list[BaseAgent]:
        intent_lower = intent.lower()
        matched = []
        for agent in self._agents.values():
            for cap in agent.capabilities:
                if cap.lower() in intent_lower:
                    matched.append(agent)
                    break
        return matched if matched else list(self._agents.values())

    def all_agents(self) -> list[BaseAgent]:
        return list(self._agents.values())


registry = AgentRegistry()
