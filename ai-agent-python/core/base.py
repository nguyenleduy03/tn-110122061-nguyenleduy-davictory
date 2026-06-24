from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PlanStep:
    id: int
    tool: str
    label: str
    reason: str = ""


@dataclass
class AgentPlan:
    goal: str
    steps: list[PlanStep]
    total_steps: int = 0

    def __post_init__(self):
        if self.total_steps == 0:
            self.total_steps = len(self.steps)

    def to_dict(self) -> dict:
        return {
            "goal": self.goal,
            "steps": [{"id": s.id, "tool": s.tool, "label": s.label, "reason": s.reason} for s in self.steps],
            "total_steps": self.total_steps,
        }


@dataclass
class AgentResult:
    success: bool
    agent_type: str
    response: str
    data: dict | None = None
    tool_calls: list[dict] = field(default_factory=list)
    error: str | None = None
    plan: dict | None = None
    pending_action: dict | None = None

    def to_dict(self) -> dict:
        d = {
            "success": self.success,
            "agent_type": self.agent_type,
            "response": self.response,
            "data": self.data,
            "tool_calls": self.tool_calls,
            "error": self.error,
        }
        if self.plan:
            d["plan"] = self.plan
        if self.pending_action:
            d["pending_action"] = self.pending_action
        return d


class BaseAgent(ABC):
    name: str = ""
    description: str = ""
    capabilities: list[str] = []
    system_prompt: str = ""
    tools: list = []
    max_iterations: int = 5

    def __init__(self):
        if not self.name:
            self.name = self.__class__.__name__.replace("Agent", "").lower()

    def get_tool_specs(self) -> list[dict]:
        return [t.to_openai_spec() for t in self.tools]

    async def run_tool(self, tool_name: str, params: dict, user_context: dict) -> Any:
        for tool in self.tools:
            if tool.name == tool_name:
                return await tool.execute(params, user_context)
        raise ValueError(f"Tool '{tool_name}' not found in agent '{self.name}'")

    async def think(self, input_text: str, user_context: dict, session_context: dict | None = None) -> AgentPlan:
        return AgentPlan(goal=input_text[:100], steps=[])

    async def summarize(self, plan: AgentPlan, results: list[dict], input_text: str) -> str:
        if not results:
            return "No results to summarize."
        return "\n".join(f"- {r.get('tool', 'step')}: {r.get('result_preview', '')}" for r in results)

    @abstractmethod
    async def process(self, input_text: str, user_context: dict, session_context: dict | None = None) -> AgentResult:
        ...
