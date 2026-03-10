"""SQLite database module for Cresco."""

import json
import sqlite3
from pathlib import Path


def get_connection(db_path: str) -> sqlite3.Connection:
    """Connect to the SQLite database, initialise tables, and return the connection."""
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    _init_tables(conn)
    return conn


def _init_tables(conn: sqlite3.Connection) -> None:
    """Create application tables if they do not exist."""
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            username    TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin    INTEGER NOT NULL DEFAULT 0,
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS farm_data (
            user_id  TEXT PRIMARY KEY,
            location TEXT,
            area     REAL,
            lat      REAL,
            lon      REAL,
            nodes    TEXT,
            weather  TEXT
        );
        """
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Farm data helpers
# ---------------------------------------------------------------------------


def save_farm_data(db_path: str, user_id: str, data: dict) -> None:
    """Insert or update farm data for a user (weather column is preserved on update)."""
    conn = get_connection(db_path)
    try:
        conn.execute(
            """
            INSERT INTO farm_data (user_id, location, area, lat, lon, nodes)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                location = excluded.location,
                area     = excluded.area,
                lat      = excluded.lat,
                lon      = excluded.lon,
                nodes    = excluded.nodes
            """,
            (
                user_id,
                data.get("location"),
                data.get("area"),
                data.get("lat"),
                data.get("lon"),
                json.dumps(data.get("nodes", [])),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def get_farm_data(db_path: str, user_id: str) -> dict | None:
    """Return farm data for a user, or ``None`` if no record exists."""
    conn = get_connection(db_path)
    try:
        row = conn.execute("SELECT * FROM farm_data WHERE user_id = ?", (user_id,)).fetchone()
        if row is None:
            return None
        result = dict(row)
        result.pop("user_id", None)
        # Deserialise JSON columns
        result["nodes"] = json.loads(result["nodes"]) if result.get("nodes") else []
        result["weather"] = json.loads(result["weather"]) if result.get("weather") else None
        return result
    finally:
        conn.close()


def update_farm_weather(db_path: str, user_id: str, weather: dict) -> None:
    """Update (or insert) the weather column for a user."""
    conn = get_connection(db_path)
    try:
        conn.execute(
            """
            INSERT INTO farm_data (user_id, weather)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET weather = excluded.weather
            """,
            (user_id, json.dumps(weather)),
        )
        conn.commit()
    finally:
        conn.close()
