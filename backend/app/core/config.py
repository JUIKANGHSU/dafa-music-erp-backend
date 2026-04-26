from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Da-Fa Music School ERP"
    API_V1_STR: str = "/api"
    
    # Database
    POSTGRES_USER: str = "postgres"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://dafa-music-erp.vercel.app",
        "https://erp.discovermusic888.com",
    ]

    POSTGRES_PASSWORD: str = "password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "dafa_erp"
    
    DATABASE_URL: str = ""

    # Constructed Database URL
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
        return "sqlite+aiosqlite:///./dafa_erp.db"
    
    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # LINE Messaging API
    LINE_CHANNEL_ACCESS_TOKEN: str = ""
    LINE_CHANNEL_SECRET: str = ""

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
