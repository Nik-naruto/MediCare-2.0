"""Application Configuration using Pydantic Settings (v2)."""

from typing import List, Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings and environment variables configuration."""

    PROJECT_NAME: str = "MediCare 2.0 API"
    API_V1_STR: str = "/api/v1"

    # Environment & Safety Configuration
    ENVIRONMENT: str = "development"
    ENABLE_DEV_ENDPOINTS: bool = True
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Storage Configuration
    UPLOAD_DIR: str = "uploads"

    # Database Configuration
    DATABASE_URL: str

    # JWT & Security Configuration
    SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    @model_validator(mode="after")
    def validate_security_configuration(self) -> "Settings":
        """Enforce strict SECRET_KEY and BACKEND_CORS_ORIGINS configuration rules for production and development environments."""
        insecure_placeholders = {
            "placeholder_secret_key_change_in_production",
            "change_this_to_a_secure_secret_key_in_production",
        }
        is_production = self.ENVIRONMENT.strip().lower() == "production"

        if is_production:
            if not self.SECRET_KEY or self.SECRET_KEY.strip() in insecure_placeholders:
                raise ValueError(
                    "CRITICAL SECURITY FAILURE: SECRET_KEY must be explicitly configured with a secure value in production environment."
                )

            clean_origins = [str(o).strip() for o in self.BACKEND_CORS_ORIGINS if o and str(o).strip()]
            if not clean_origins or "*" in clean_origins:
                raise ValueError(
                    "CRITICAL SECURITY FAILURE: BACKEND_CORS_ORIGINS must be explicitly configured with trusted frontend origin(s) in production environment and cannot contain wildcards ('*')."
                )
        else:
            if not self.SECRET_KEY:
                self.SECRET_KEY = "dev_secret_key_medicare_local_development_only"

        return self


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

