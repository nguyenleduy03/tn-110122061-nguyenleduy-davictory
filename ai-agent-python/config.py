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
    groq_api_keys: str = ""
    groq_base_url: str = "https://api.groq.com"
    groq_model: str = "qwen/qwen3-32b"
    groq_vision_model: str = "llama-3.2-11b-vision-preview"
    groq_temperature: float = 0.1

    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "meta/llama-3.1-70b-instruct"
    nvidia_temperature: float = 0.1

    unsplash_access_key: str = ""
    upload_dir: str = "uploads"

    redis_url: str = ""

    backend_url: str = "http://localhost:8080"

    host: str = "0.0.0.0"
    port: int = 5187

    @property
    def db_url(self) -> str:
        return f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def groq_key_list(self) -> list[str]:
        keys = []
        if self.groq_api_keys:
            keys = [k.strip() for k in self.groq_api_keys.split(",") if k.strip()]
        if self.groq_api_key:
            keys.append(self.groq_api_key)
        if self.groq_api_key_2:
            keys.append(self.groq_api_key_2)
        return keys


@lru_cache
def get_settings() -> Settings:
    return Settings()
