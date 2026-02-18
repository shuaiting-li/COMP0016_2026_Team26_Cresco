"""JWT token creation and validation."""

from datetime import datetime, timedelta, timezone

import jwt

from cresco.config import get_settings

ALGORITHM = "HS256"


def create_access_token(user_id: str, username: str, *, is_admin: bool = False) -> str:
    """Create a JWT access token.

    Args:
        user_id: The user's unique ID.
        username: The user's username.
        is_admin: Whether the user has admin privileges.

    Returns:
        Encoded JWT string.
    """
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours)
    payload = {
        "sub": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token.

    Args:
        token: The JWT string.

    Returns:
        Decoded payload dict with 'sub' (user_id) and 'username'.

    Raises:
        jwt.ExpiredSignatureError: If token has expired.
        jwt.InvalidTokenError: If token is invalid.
    """
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
