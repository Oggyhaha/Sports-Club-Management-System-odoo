from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Champions Club API"
    API_V1_PREFIX: str = "/api/v1"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = (
        "postgresql+psycopg://postgres:postgres@localhost:5432/champions_club"
    )
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
