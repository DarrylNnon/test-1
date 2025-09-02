import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@db/app")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "a_super_secret_key_that_should_be_changed")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 8)) # 8 days

    # Stripe
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET")

    # Subscription Price IDs from Stripe Dashboard
    PRICE_ID_STARTER: str = os.getenv("PRICE_ID_STARTER", "price_starter_placeholder")
    PRICE_ID_PROFESSIONAL: str = os.getenv("PRICE_ID_PROFESSIONAL", "price_pro_placeholder")

    # Frontend URL for redirects
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # AI Service
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "your_openai_api_key_here")

    # Fernet Encryption Key for credentials
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "a_very_secret_32_byte_key_placeholder") # Must be 32 url-safe base64-encoded bytes

settings = Settings()