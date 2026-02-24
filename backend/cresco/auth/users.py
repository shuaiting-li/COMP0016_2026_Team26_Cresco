"""User storage and management."""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt

from cresco.config import get_settings


def _get_users_path() -> Path:
    """Get the path to the users JSON file."""
    settings = get_settings()
    return Path(settings.users_file)


def _load_users() -> dict:
    """Load users from the JSON file."""
    path = _get_users_path()
    if not path.exists():
        return {"users": {}}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_users(data: dict) -> None:
    """Save users to the JSON file."""
    path = _get_users_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


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
    data = _load_users()
    for user in data["users"].values():
        if user["username"] == username:
            return user
    return None


def get_user_by_id(user_id: str) -> dict | None:
    """Look up a user by ID.

    Returns:
        User dict or None.
    """
    data = _load_users()
    return data["users"].get(user_id)


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

    data = _load_users()
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "username": username,
        "password_hash": hash_password(password),
        "is_admin": is_admin,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    data["users"][user_id] = user
    _save_users(data)

    return {"id": user_id, "username": username, "is_admin": is_admin}
