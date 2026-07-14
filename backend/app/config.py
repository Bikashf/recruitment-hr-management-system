import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Split DB Architecture explanation:
    # We use PostgreSQL for structured, relational, ACID-compliant business records.
    # We use MongoDB for storing resumes as unstructured documents/GridFS blobs.
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/hr_system"
    MONGODB_URL: str = "mongodb://localhost:27017/hr_system_resumes"
    MONGODB_DB_NAME: str = "hr_system_resumes"
    
    # JWT signing secrets
    SECRET_KEY: str = "supersecretjwtkeythatshouldbechangedinproduction12345!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Load from .env file if it exists
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
