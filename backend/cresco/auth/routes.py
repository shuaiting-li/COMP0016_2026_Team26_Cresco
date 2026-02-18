"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import get_current_admin
from .jwt import create_access_token
from .schemas import LoginRequest, RegisterRequest, TokenResponse
from .users import create_user, get_user_by_username, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    _admin: dict = Depends(get_current_admin),
) -> TokenResponse:
    """Register a new user (admin only) and return an access token for the new user."""
    try:
        user = create_user(request.username, request.password, is_admin=request.is_admin)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    token = create_access_token(user["id"], user["username"], is_admin=user["is_admin"])
    return TokenResponse(access_token=token, username=user["username"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    """Authenticate a user and return an access token."""
    user = get_user_by_username(request.username)

    if user is None or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(
        user["id"], user["username"], is_admin=user.get("is_admin", False)
    )
    return TokenResponse(access_token=token, username=user["username"])
