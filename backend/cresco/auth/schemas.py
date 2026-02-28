"""Pydantic schemas for authentication."""

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """Request model for user registration (admin only)."""

    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    password: str = Field(..., min_length=8, max_length=128, description="User password")
    is_admin: bool = Field(
        default=False, description="Whether the new user should have admin privileges"
    )


class LoginRequest(BaseModel):
    """Request model for user login."""

    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class TokenResponse(BaseModel):
    """Response model containing JWT token."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    username: str = Field(..., description="Authenticated username")


class UserInfo(BaseModel):
    """Public user information."""

    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
