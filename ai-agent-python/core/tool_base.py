from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any


class ToolParameter:
    def __init__(self, name: str, type: str, description: str, required: bool = True):
        self.name = name
        self.type = type
        self.description = description
        self.required = required

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "type": self.type,
            "description": self.description,
            "required": self.required,
        }


class BaseTool(ABC):
    name: str = ""
    description: str = ""
    parameters: list[ToolParameter] = []

    def __init__(self):
        if not self.name:
            self.name = self.__class__.__name__

    def to_openai_spec(self) -> dict:
        properties = {}
        required = []
        for p in self.parameters:
            properties[p.name] = {
                "type": p.type,
                "description": p.description,
            }
            if p.required:
                required.append(p.name)
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": required,
                },
            },
        }

    @abstractmethod
    async def execute(self, params: dict, user_context: dict) -> Any:
        ...
