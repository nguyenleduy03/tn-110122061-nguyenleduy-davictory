"""AI Writing Service configuration."""

from functools import lru_cache
from pydantic_settings import BaseSettings

# Runtime model override (set via API, persists until restart)
_active_model: str | None = None


def set_active_model(model: str) -> None:
    global _active_model
    _active_model = model


def get_active_model() -> str | None:
    return _active_model


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "1111"
    db_name: str = "DAVictory"

    chroma_host: str = "localhost"
    chroma_port: int = 5184
    chroma_persist_dir: str = "./data/chroma"

    groq_api_key: str = ""
    groq_api_key_2: str = ""
    groq_base_url: str = "https://api.groq.com"
    groq_model: str = "llama-3.3-70b-versatile"
    groq_temperature: float = 0.1
    groq_max_tokens: int = 1500

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

    prompt_version: str = "v2.0"
    few_shot_count: int = 1
    max_essay_length: int = 4000

    @property
    def db_url(self) -> str:
        return f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def groq_api_keys(self) -> list[str]:
        return [k for k in [self.groq_api_key, self.groq_api_key_2] if k]


@lru_cache
def get_settings() -> Settings:
    return Settings()
