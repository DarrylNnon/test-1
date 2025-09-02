from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from .config import settings
import json
from cryptography.fernet import Fernet

# --- JWT & Password Hashing ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
FERNET = Fernet(settings.FERNET_KEY.encode())

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def encrypt_data(data: dict) -> bytes:
    """
    Encrypts a dictionary into a bytes string.
    """
    json_data = json.dumps(data)
    return FERNET.encrypt(json_data.encode())


def decrypt_data(encrypted_data: bytes) -> dict:
    """
    Decrypts a bytes string back into a dictionary.
    """
    decrypted_bytes = FERNET.decrypt(encrypted_data)
    return json.loads(decrypted_bytes.decode())

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Fernet Encryption for Credentials ---
try:
    fernet = Fernet(settings.ENCRYPTION_KEY.encode())
except (ValueError, TypeError) as e:
    print(f"CRITICAL: Invalid ENCRYPTION_KEY. It must be 32 url-safe base64-encoded bytes. Error: {e}")
    fernet = None

def encrypt_data(data: str) -> bytes:
    """Encrypts a string using Fernet."""
    if not fernet:
        raise ValueError("Encryption service is not configured due to an invalid key.")
    return fernet.encrypt(data.encode())

def decrypt_data(encrypted_data: bytes) -> str:
    """Decrypts a string using Fernet."""
    if not fernet:
        raise ValueError("Encryption service is not configured due to an invalid key.")
    return fernet.decrypt(encrypted_data).decode()

def create_oauth_state_token(organization_id: str) -> str:
    """
    Creates a short-lived JWT to use as the 'state' parameter in an OAuth flow.
    """
    expires = timedelta(minutes=15)
    to_encode = {
        "exp": datetime.utcnow() + expires,
        "iat": datetime.utcnow(),
        "sub": str(organization_id),
        "aud": "oauth_state" # Audience claim to distinguish from user tokens
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_oauth_state_token(token: str) -> str | None:
    """
    Verifies the state token and returns the organization_id.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM], audience="oauth_state")
        return payload.get("sub")
    except jwt.JWTError:
        return None