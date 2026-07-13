"""AI Writing Service configuration."""

import json
import os
from functools import lru_cache
from pydantic_settings import BaseSettings

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "active_model.json")

# Runtime model override (persisted to file across restarts)
_active_model: str | None = None


def _load_active_model() -> str | None:
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE) as f:
                data = json.load(f)
                return data.get("model") or None
    except Exception:
        pass
    return None


def _save_active_model(model: str) -> None:
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump({"model": model}, f)
    except Exception as e:
        import logging
        logging.warning(f"Failed to save active model: {e}")


def set_active_model(model: str) -> None:
    global _active_model
    _active_model = model
    _save_active_model(model)


def get_active_model() -> str | None:
    global _active_model
    if _active_model is None:
        _active_model = _load_active_model()
    return _active_model


class Settings(BaseSettings):
    model_config = {"extra": "ignore"}

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "your_password"
    db_name: str = "DAVictory"

    chroma_host: str = "localhost"
    chroma_port: int = 5184
    chroma_persist_dir: str = "./data/chroma"

    groq_api_key: str = ""
    groq_api_key_2: str = ""
    groq_api_key_3: str = ""
    groq_api_key_4: str = ""
    groq_api_key_5: str = ""
    groq_base_url: str = "https://api.groq.com"
    groq_model: str = "llama-3.1-8b-instant"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    groq_temperature: float = 0.1
    groq_max_tokens: int = 0

    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "qwen/qwen3-next-80b-a3b-instruct"
    nvidia_temperature: float = 0.1
    nvidia_max_tokens: int = 0

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    gemini_api_key: str = ""

    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    cache_ttl_minutes: int = 1440
    cache_max_size: int = 1000

    quota_student_per_day: int = 5
    quota_teacher_per_day: int = 50
    quota_admin_per_day: int = 200

    scoring_provider: str = "nvidia"

    prompt_version: str = "v2.0"
    few_shot_count: int = 1
    max_essay_length: int = 4000


    @property
    def db_url(self) -> str:
        return f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def groq_api_keys(self) -> list[str]:
        return [k for k in [
            self.groq_api_key, self.groq_api_key_2, self.groq_api_key_3,
            self.groq_api_key_4, self.groq_api_key_5
        ] if k]


MODEL_CONTEXT: dict[str, dict] = {
    "qwen/qwen3-32b": {"context_window": 131072, "max_completion": 40960, "tpm_limit": 6000},
    "qwen/qwen3-next-80b-a3b-instruct": {"context_window": 131072, "max_completion": 32768, "tpm_limit": 12000},
    "llama-3.1-8b-instant": {"context_window": 131072, "max_completion": 131072, "tpm_limit": 6000},
    "openai/gpt-oss-120b": {"context_window": 131072, "max_completion": 65536, "tpm_limit": 6000},
    "nvidia/llama-3.1-nemotron-70b-instruct": {"context_window": 131072, "max_completion": 32768, "tpm_limit": 12000},
    "meta-llama/llama-4-scout-17b-16e-instruct": {"context_window": 1048576, "max_completion": 32768, "tpm_limit": 6000},
}

TOKEN_BUFFER: int = 500
MAX_TOTAL_TOKENS: int = 12000
MIN_COMPLETION_TOKENS: int = 1000


@lru_cache
def get_settings() -> Settings:
    return Settings()
