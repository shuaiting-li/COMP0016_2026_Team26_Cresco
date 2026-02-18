"""Tests for the authentication module."""

from unittest.mock import patch

import jwt
import pytest

from cresco.auth.jwt import ALGORITHM, create_access_token, decode_token
from cresco.auth.users import (
    create_user,
    get_user_by_id,
    get_user_by_username,
    hash_password,
    verify_password,
)


# ---------- helpers ---------------------------------------------------------


def _create_admin_and_get_token(mock_settings) -> str:
    """Seed an admin user directly and return a valid admin JWT."""
    with patch("cresco.auth.users.get_settings", return_value=mock_settings):
        admin = create_user("seedadmin", "password123", is_admin=True)
    with patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
        return create_access_token(admin["id"], admin["username"], is_admin=True)


def _create_regular_user_and_get_token(mock_settings) -> str:
    """Seed a regular (non-admin) user directly and return a valid JWT."""
    with patch("cresco.auth.users.get_settings", return_value=mock_settings):
        user = create_user("regularuser", "password123", is_admin=False)
    with patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
        return create_access_token(user["id"], user["username"], is_admin=False)


# ---------- unit tests ------------------------------------------------------


class TestPasswordHashing:
    """Tests for password hashing and verification."""

    def test_hash_password_returns_string(self):
        """Hashing a password returns a bcrypt hash string."""
        hashed = hash_password("testpassword")
        assert isinstance(hashed, str)
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        """Correct password passes verification."""
        hashed = hash_password("mypassword")
        assert verify_password("mypassword", hashed) is True

    def test_verify_password_incorrect(self):
        """Wrong password fails verification."""
        hashed = hash_password("mypassword")
        assert verify_password("wrongpassword", hashed) is False


class TestUserManagement:
    """Tests for user CRUD operations."""

    def test_create_user_success(self, mock_settings, tmp_users_file):
        """Creating a user with a unique username succeeds."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            user = create_user("farmer_jane", "securepass123")
            assert user["username"] == "farmer_jane"
            assert "id" in user
            assert user["is_admin"] is False
            assert "password_hash" not in user

    def test_create_admin_user(self, mock_settings, tmp_users_file):
        """Creating a user with is_admin=True stores admin flag."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            user = create_user("admin_user", "securepass123", is_admin=True)
            assert user["is_admin"] is True

    def test_create_user_duplicate_raises(self, mock_settings, tmp_users_file):
        """Creating a user with a duplicate username raises ValueError."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            create_user("farmer_john", "password123")
            with pytest.raises(ValueError, match="already exists"):
                create_user("farmer_john", "otherpass456")

    def test_get_user_by_username_found(self, mock_settings, tmp_users_file):
        """Looking up an existing user by username returns the user."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            created = create_user("testfarmer", "password123")
            found = get_user_by_username("testfarmer")
            assert found is not None
            assert found["id"] == created["id"]

    def test_get_user_by_username_not_found(self, mock_settings, tmp_users_file):
        """Looking up a non-existent username returns None."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            assert get_user_by_username("nobody") is None

    def test_get_user_by_id_found(self, mock_settings, tmp_users_file):
        """Looking up an existing user by ID returns the user."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            created = create_user("idtest", "password123")
            found = get_user_by_id(created["id"])
            assert found is not None
            assert found["username"] == "idtest"

    def test_get_user_by_id_not_found(self, mock_settings, tmp_users_file):
        """Looking up a non-existent ID returns None."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            assert get_user_by_id("nonexistent-uuid") is None


class TestJWT:
    """Tests for JWT token creation and validation."""

    def test_create_and_decode_token(self, mock_settings):
        """A token created with create_access_token can be decoded."""
        with patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
            token = create_access_token("user-123", "farmer_joe")
            payload = decode_token(token)
            assert payload["sub"] == "user-123"
            assert payload["username"] == "farmer_joe"
            assert payload["is_admin"] is False

    def test_admin_token_contains_is_admin(self, mock_settings):
        """An admin token has is_admin=True in its payload."""
        with patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
            token = create_access_token("user-456", "admin_joe", is_admin=True)
            payload = decode_token(token)
            assert payload["is_admin"] is True

    def test_expired_token_raises(self, mock_settings):
        """An expired token raises ExpiredSignatureError."""
        from datetime import datetime, timedelta, timezone

        with patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
            expire = datetime.now(timezone.utc) - timedelta(hours=1)
            payload = {"sub": "user-123", "username": "farmer", "exp": expire}
            token = jwt.encode(payload, mock_settings.jwt_secret_key, algorithm=ALGORITHM)

            with pytest.raises(jwt.ExpiredSignatureError):
                decode_token(token)

    def test_invalid_token_raises(self, mock_settings):
        """A tampered token raises InvalidTokenError."""
        with patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
            with pytest.raises(jwt.InvalidTokenError):
                decode_token("not-a-valid-jwt")


class TestAuthAPI:
    """Tests for the auth API endpoints."""

    def test_register_as_admin_succeeds(self, auth_client, mock_settings, tmp_users_file):
        """Admin can register a new user and gets back a token for that user."""
        admin_token = _create_admin_and_get_token(mock_settings)
        response = auth_client.post(
            "/api/v1/auth/register",
            json={"username": "newfarmer", "password": "password123"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["username"] == "newfarmer"
        assert data["token_type"] == "bearer"

    def test_register_without_token_returns_401(self, auth_client):
        """Registering without a token returns 401."""
        response = auth_client.post(
            "/api/v1/auth/register",
            json={"username": "newfarmer", "password": "password123"},
        )
        assert response.status_code == 401

    def test_register_as_non_admin_returns_403(self, auth_client, mock_settings, tmp_users_file):
        """A non-admin user cannot register new users."""
        regular_token = _create_regular_user_and_get_token(mock_settings)
        response = auth_client.post(
            "/api/v1/auth/register",
            json={"username": "anotheruser", "password": "password123"},
            headers={"Authorization": f"Bearer {regular_token}"},
        )
        assert response.status_code == 403
        assert "Admin privileges required" in response.json()["detail"]

    def test_register_duplicate_returns_409(self, auth_client, mock_settings, tmp_users_file):
        """Registering with an existing username returns 409."""
        admin_token = _create_admin_and_get_token(mock_settings)
        auth_client.post(
            "/api/v1/auth/register",
            json={"username": "dupefarmer", "password": "password123"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        response = auth_client.post(
            "/api/v1/auth/register",
            json={"username": "dupefarmer", "password": "password456"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 409

    def test_register_short_username_returns_422(self, auth_client, mock_settings, tmp_users_file):
        """Registering with a username shorter than 3 chars returns 422."""
        admin_token = _create_admin_and_get_token(mock_settings)
        response = auth_client.post(
            "/api/v1/auth/register",
            json={"username": "ab", "password": "password123"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 422

    def test_register_admin_user(self, auth_client, mock_settings, tmp_users_file):
        """Admin can create another admin user via is_admin flag."""
        admin_token = _create_admin_and_get_token(mock_settings)
        response = auth_client.post(
            "/api/v1/auth/register",
            json={"username": "newadmin", "password": "password123", "is_admin": True},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 201

    def test_login_success(self, auth_client, mock_settings, tmp_users_file):
        """Logging in with correct credentials returns a token."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            create_user("logintest", "password123")

        response = auth_client.post(
            "/api/v1/auth/login",
            json={"username": "logintest", "password": "password123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["username"] == "logintest"

    def test_login_wrong_password(self, auth_client, mock_settings, tmp_users_file):
        """Logging in with wrong password returns 401."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            create_user("wrongpwtest", "password123")

        response = auth_client.post(
            "/api/v1/auth/login",
            json={"username": "wrongpwtest", "password": "badpassword"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, auth_client):
        """Logging in with a non-existent username returns 401."""
        response = auth_client.post(
            "/api/v1/auth/login",
            json={"username": "ghost", "password": "password123"},
        )
        assert response.status_code == 401


class TestProtectedEndpoints:
    """Tests that protected endpoints require authentication."""

    def test_chat_without_token_returns_401(self, auth_client):
        """Accessing /chat without a token returns 401."""
        response = auth_client.post(
            "/api/v1/chat",
            json={"message": "Hello"},
        )
        assert response.status_code == 401

    def test_chat_with_valid_token(self, auth_client, mock_settings, tmp_users_file):
        """Accessing /chat with a valid token succeeds."""
        with patch("cresco.auth.users.get_settings", return_value=mock_settings):
            user = create_user("chatuser", "password123")
        with patch("cresco.auth.jwt.get_settings", return_value=mock_settings):
            token = create_access_token(user["id"], user["username"])

        response = auth_client.post(
            "/api/v1/chat",
            json={"message": "What about wheat?"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

    def test_chat_with_invalid_token_returns_401(self, auth_client):
        """Accessing /chat with an invalid token returns 401."""
        response = auth_client.post(
            "/api/v1/chat",
            json={"message": "Hello"},
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401

    def test_farm_data_without_token_returns_401(self, auth_client):
        """Accessing /farm-data without a token returns 401."""
        response = auth_client.post(
            "/api/v1/farm-data",
            json={"location": "Kent", "area": 50.0},
        )
        assert response.status_code == 401

    def test_health_is_public(self, auth_client):
        """The /health endpoint does not require authentication."""
        response = auth_client.get("/api/v1/health")
        assert response.status_code == 200
