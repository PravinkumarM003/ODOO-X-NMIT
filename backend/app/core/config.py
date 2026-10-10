import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent
PRIMARY_DB_PATH = ROOT_DIR / "database" / "dev.db"
FALLBACK_DB_PATH = ROOT_DIR / "prisma" / "dev.db"
ACTIVE_DB_PATH = PRIMARY_DB_PATH if PRIMARY_DB_PATH.exists() else FALLBACK_DB_PATH

TIDB_DB_URL = "mysql+pymysql://3aSDDEtX2DMhV19.root:K6erAQa24hXQCxwY@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/texflow?ssl_verify_cert=false&ssl_verify_identity=false"

class Settings(BaseSettings):
    PROJECT_NAME: str = "TexFlow Textile Manufacturing Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "texflow-everest-textile-secret-key-2026-auth")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", TIDB_DB_URL
    )
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
