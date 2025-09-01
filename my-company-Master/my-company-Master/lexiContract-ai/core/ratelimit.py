from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

from .config import settings

def get_api_key_identifier(request: Request) -> str:
    """
    Identifies a request by the API key ID stored in the request state.
    Falls back to the remote address if no API key is present (for non-API routes).
    """
    return str(request.state.api_key.id) if hasattr(request.state, "api_key") else get_remote_address(request)

limiter = Limiter(key_func=get_api_key_identifier, storage_uri=settings.REDIS_URL)
