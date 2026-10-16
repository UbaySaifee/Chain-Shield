import os

class Settings:
    PROJECT_NAME: str = "ChainShield Analysis Service"
    VERSION: str = "1.0.0-SNAPSHOT"
    API_PREFIX: str = "/api/v1"
    PORT: int = int(os.getenv("ANALYSIS_PORT", "8000"))
    HOST: str = os.getenv("ANALYSIS_HOST", "0.0.0.0")

settings = Settings()
