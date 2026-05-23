from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ENV: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/carouselflow"

    # Auth
    SECRET_KEY: str = "changeme"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Anthropic / Claude
    ANTHROPIC_API_KEY: str = ""

    # Google DeepMind / Gemini
    GEMINI_API_KEY: str = ""

    # ClickHouse
    CLICKHOUSE_HOST: str = "localhost"
    CLICKHOUSE_PORT: int = 8123
    CLICKHOUSE_DB: str = "carouselflow"
    CLICKHOUSE_USER: str = "default"
    CLICKHOUSE_PASSWORD: str = ""

    # Datadog
    DD_API_KEY: str = ""
    DD_APP_KEY: str = ""
    DD_SERVICE: str = "carouselflow-ai"
    DD_ENV: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
