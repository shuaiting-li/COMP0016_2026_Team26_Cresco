#!/usr/bin/env python3
"""Create the first admin user for Cresco.

Usage:
    cd backend
    uv run python scripts/create_admin.py <username> <password>
"""

import sys
from pathlib import Path

# Load .env file before importing config
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

from cresco.auth.users import create_user, get_user_by_username


def main() -> None:
    """Create an admin user from command-line arguments."""
    if len(sys.argv) != 3:
        print("Usage: uv run python scripts/create_admin.py <username> <password>")
        sys.exit(1)

    username, password = sys.argv[1], sys.argv[2]

    if len(username) < 3:
        print("Error: username must be at least 3 characters")
        sys.exit(1)
    if len(password) < 8:
        print("Error: password must be at least 8 characters")
        sys.exit(1)

    existing = get_user_by_username(username)
    if existing:
        print(f"Error: user '{username}' already exists")
        sys.exit(1)

    user = create_user(username, password, is_admin=True)
    print(f"Admin user created: {user['username']} (id: {user['id']})")


if __name__ == "__main__":
    main()
