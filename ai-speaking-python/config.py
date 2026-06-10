"""AI Speaking Service configuration."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "1111"
    db_name: str = "DAVictory"

    groq_api_key: str = ""
    groq_api_key_2: str = ""
    groq_base_url: str = "https://api.groq.com"
    groq_model: str = "llama-3.3-70b-versatile"
    groq_temperature: float = 0.3
    groq_max_tokens: int = 1024

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_scoring_model: str = "gpt-4o"
    openai_scoring_temperature: float = 0.1
    openai_scoring_max_tokens: int = 2048
    openai_stt_model: str = "whisper-1"
    openai_tts_model: str = "tts-1"
    openai_tts_voice: str = "alloy"

    cache_ttl_minutes: int = 1440
    cache_max_size: int = 500

    quota_student_per_day: int = 10
    quota_teacher_per_day: int = 100
    quota_admin_per_day: int = 500

    min_word_confidence: float = 0.6
    expected_speech_rate_min: int = 80
    expected_speech_rate_max: int = 160

    session_max_turns: int = 50
    session_max_duration_minutes: int = 30

    @property
    def db_url(self) -> str:
        return f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def groq_api_keys(self) -> list[str]:
        return [k for k in [self.groq_api_key, self.groq_api_key_2] if k]


@lru_cache
def get_settings() -> Settings:
    return Settings()
