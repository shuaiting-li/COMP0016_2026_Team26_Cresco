"""User storage and management."""

import uuid
from datetime import datetime, timezone

import bcrypt
import psycopg
from psycopg.rows import dict_row

from cresco.config import get_settings


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
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        row = conn.execute("SELECT * FROM users WHERE username = %s", (username,)).fetchone()
    if row is None:
        return None
    return dict(row)


def get_user_by_id(user_id: str) -> dict | None:
    """Look up a user by ID.

    Returns:
        User dict or None.
    """
    settings = get_settings()
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        row = conn.execute("SELECT * FROM users WHERE id = %s", (user_id,)).fetchone()
    if row is None:
        return None
    return dict(row)


def delete_user_by_id(user_id: str) -> bool:
    """Delete a user by ID.

    Returns:
        True if a row was deleted, False if the user ID was not found.
    """
    settings = get_settings()
    with psycopg.connect(settings.database_url) as conn:
        cursor = conn.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        return cursor.rowcount > 0


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
    with psycopg.connect(settings.database_url) as conn:
        user_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO users (id, username, password_hash, is_admin, created_at)"
            " VALUES (%s, %s, %s, %s, %s)",
            (
                user_id,
                username,
                hash_password(password),
                is_admin,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    return {"id": user_id, "username": username, "is_admin": is_admin}
