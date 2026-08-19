"""FloatChat settings — read from environment / .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # DB — app executes via the read-only role (ARCHITECTURE.md §2.4)
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "floatchat"
    db_user: str = "floatchat_readonly"
    db_password: str = "floatchat_dev"

    # Pipeline uses the owner role
    pipeline_db_user: str = "floatchat_owner"
    pipeline_db_password: str = "floatchat_dev"

    # LLM providers — activate only when their key is present
    llm_provider: str = "mock"  # mock | gemini | openrouter | grok
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None
    grok_api_key: str | None = None

    # Guardrail caps (ARCHITECTURE.md §2.4)
    max_rows: int = 5000
    max_query_timeout_ms: int = 10000

    # Uncertainty thresholds (SCHEMA_AND_PROMPTS.md §2, example 5)
    min_float_count: int = 3
    min_qc_pass_ratio: float = 0.7

    @property
    def db_url(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def pipeline_db_url(self) -> str:
        return (
            f"postgresql://{self.pipeline_db_user}:{self.pipeline_db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()