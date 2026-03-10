"""User storage and management."""

import uuid
from datetime import datetime, timezone

import bcrypt

from cresco.config import get_settings
from cresco.db import get_connection


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def get_user_by_username(username: str) -> dict | None:
    """Look up a user by username.

    Returns:
        User dict with id, username, password_hash, created_at — or None.
    """
    settings = get_settings()
    conn = get_connection(settings.database_path)
    try:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if row is None:
            return None
        result = dict(row)
        result["is_admin"] = bool(result["is_admin"])
        return result
    finally:
        conn.close()


def get_user_by_id(user_id: str) -> dict | None:
    """Look up a user by ID.

    Returns:
        User dict or None.
    """
    settings = get_settings()
    conn = get_connection(settings.database_path)
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            return None
        result = dict(row)
        result["is_admin"] = bool(result["is_admin"])
        return result
    finally:
        conn.close()


def create_user(username: str, password: str, *, is_admin: bool = False) -> dict:
    """Create a new user.

    Args:
        username: Unique username.
        password: Plain-text password (will be hashed).
        is_admin: Whether the user has admin privileges.

    Returns:
        The created user dict (without password_hash).

    Raises:
        ValueError: If the username already exists.
    """
    if get_user_by_username(username) is not None:
        raise ValueError(f"Username '{username}' already exists")

    settings = get_settings()
    conn = get_connection(settings.database_path)
    try:
        user_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO users (id, username, password_hash, is_admin, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (
                user_id,
                username,
                hash_password(password),
                int(is_admin),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
        return {"id": user_id, "username": username, "is_admin": is_admin}
    finally:
        conn.close()
