"""Convert DAVictory BaseTool to LangChain StructuredTool."""
import json
from typing import Any
from pydantic import BaseModel, Field, create_model

from langchain_core.tools import StructuredTool

from core.tool_base import BaseTool as DAVictoryBaseTool


_TYPE_MAP = {"string": str, "integer": str, "number": str, "boolean": str}


def _build_model(tool: DAVictoryBaseTool) -> type[BaseModel]:
    fields = {}
    for p in tool.parameters:
        py_type = _TYPE_MAP.get(p.type or "string", str)
        field = Field(description=p.description or "")
        if not getattr(p, "required", True):
            field.default = None
        fields[p.name] = (py_type, field)
    return create_model(f"{tool.name}_args", **fields)


def _make_execute(tool: DAVictoryBaseTool):
    async def execute(**kwargs: Any) -> str:
        res = await tool.execute(kwargs, {})
        if isinstance(res, (dict, list)):
            return json.dumps(res, ensure_ascii=False, default=str)
        return str(res) if not isinstance(res, str) else res
    return execute


def create_langchain_tools(tools: list[DAVictoryBaseTool]) -> list[StructuredTool]:
    result = []
    for t in tools:
        model = _build_model(t)
        st = StructuredTool.from_function(
            name=t.name,
            description=t.description,
            args_schema=model,
            coroutine=_make_execute(t),
        )
        result.append(st)
    return result
