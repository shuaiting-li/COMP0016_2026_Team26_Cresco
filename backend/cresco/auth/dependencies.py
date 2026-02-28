"""FastAPI dependencies for authentication."""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .jwt import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Extract and validate the current user from the Authorization header.

    Returns:
        Dict with 'user_id', 'username', and 'is_admin'.

    Raises:
        HTTPException 401: If token is missing, expired, or invalid.
    """
    try:
        payload = decode_token(credentials.credentials)
        return {
            "user_id": payload["sub"],
            "username": payload["username"],
            "is_admin": payload.get("is_admin", False),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Require the current user to be an admin.

    Returns:
        The current user dict (same as get_current_user).

    Raises:
        HTTPException 403: If the user is not an admin.
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user
