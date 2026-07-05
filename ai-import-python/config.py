"""AI Import Service configuration."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "your_password"
    db_name: str = "DAVictory"

    groq_api_key: str = ""
    groq_api_key_2: str = ""
    groq_api_key_3: str = ""
    groq_api_key_4: str = ""
    groq_api_key_5: str = ""
    groq_base_url: str = "https://api.groq.com"
    groq_model: str = "openai/gpt-oss-120b"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    groq_temperature: float = 0.1
    groq_max_tokens: int = 3000

    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/llama-3.1-nemotron-70b-instruct"
    nvidia_temperature: float = 0.1
    nvidia_max_tokens: int = 8192

    backend_url: str = "http://localhost:8080"
    backend_timeout: int = 60

    tesseract_cmd: str = "tesseract"
    ocr_language: str = "eng"
    ocr_min_text_length: int = 100

    cache_ttl_minutes: int = 60
    cache_max_size: int = 50

    @property
    def db_url(self) -> str:
        return f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def groq_api_keys(self) -> list[str]:
        return [k for k in [
            self.groq_api_key, self.groq_api_key_2, self.groq_api_key_3,
            self.groq_api_key_4, self.groq_api_key_5
        ] if k]


@lru_cache
def get_settings() -> Settings:
    return Settings()
