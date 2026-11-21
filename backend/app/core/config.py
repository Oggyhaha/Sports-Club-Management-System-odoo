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

    # JWT Authentication & Security
    SECRET_KEY: str = "temporary-hackathon-demo-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # Default access token lifetime: 30 minutes

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
