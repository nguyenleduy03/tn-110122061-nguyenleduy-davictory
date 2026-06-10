"""LLM client for AI Import Service - Groq provider."""

from dataclasses import dataclass
from groq import AsyncGroq, RateLimitError
from loguru import logger

from config import get_settings


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str = "groq"
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class AIProviderError(Exception):
    pass


class GroqClient:
    def __init__(self):
        self.settings = get_settings()
        keys = self.settings.groq_api_keys
        self.clients = [AsyncGroq(api_key=k, base_url=self.settings.groq_base_url) for k in keys]
        if not self.clients:
            self.clients = [AsyncGroq(api_key="", base_url=self.settings.groq_base_url)]
        self._idx = 0

    def _next(self) -> AsyncGroq:
        c = self.clients[self._idx % len(self.clients)]
        self._idx += 1
        return c

    async def chat(self, system: str, user: str,
                   temperature: float | None = None,
                   max_tokens: int | None = None) -> LLMResponse:
        s = self.settings
        last_error = None
        for attempt in range(max(1, len(self.clients))):
            client = self._next()
            try:
                resp = await client.chat.completions.create(
                    model=s.groq_model,
                    temperature=temperature if temperature is not None else s.groq_temperature,
                    max_tokens=max_tokens or s.groq_max_tokens,
                    messages=[{"role": "system", "content": system},
                              {"role": "user", "content": user}],
                )
                usage = resp.usage
                return LLMResponse(content=resp.choices[0].message.content or "",
                                   model=resp.model,
                                   prompt_tokens=usage.prompt_tokens if usage else 0,
                                   completion_tokens=usage.completion_tokens if usage else 0,
                                   total_tokens=usage.total_tokens if usage else 0)
            except RateLimitError as e:
                last_error = e
                logger.warning(f"Rate limit, rotating key (attempt {attempt + 1})")
                continue
            except Exception as e:
                last_error = e
                if attempt < len(self.clients) - 1:
                    logger.warning(f"Error, rotating key: {e}")
                    continue
        raise AIProviderError(str(last_error))
