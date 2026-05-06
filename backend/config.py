from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "AttendX API"
    VERSION: str = "1.0.0"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SECRET_KEY: str = "supersecretkey_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    DEEPFACE_THRESHOLD: float = 0.40

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
