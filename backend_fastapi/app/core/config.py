from pydantic_settings import BaseSettings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    
    MONGODB_URI: str = "mongodb+srv://user:pass@cluster.mongodb.net/?appName=name"
    
    JWT_SECRET: str = "your-secret-key-change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    FRONTEND_URL: str = "http://localhost:5173"
    FRONTEND_URL_ALT: Optional[str] = "http://localhost:5174"
    
    SENDGRID_API_KEY: Optional[str] = None
    SENDGRID_SENDER: str = "noreply@efficience-recrute.fr"
    
    STRIPE_SECRET_KEY: str = "sk_test_"
    STRIPE_PUBLIC_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: str = "whsec_"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
    
    def __init__(self, **data):
        super().__init__(**data)
        if self.ENVIRONMENT == "production":
            if self.JWT_SECRET == "your-secret-key-change-me":
                logger.warning("⚠️ WARNING: JWT_SECRET is using default value in production!")
            if self.MONGODB_URI == "mongodb+srv://user:pass@cluster.mongodb.net/?appName=name":
                raise ValueError("❌ MONGODB_URI must be configured in .env for production")

settings = Settings()
