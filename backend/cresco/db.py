"""PostgreSQL database module for Cresco."""

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

_pool: AsyncConnectionPool | None = None

_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS farm_data (
    user_id  TEXT PRIMARY KEY,
    location TEXT,
    area     DOUBLE PRECISION,
    lat      DOUBLE PRECISION,
    lon      DOUBLE PRECISION,
    nodes    JSONB,
    weather  JSONB
);
"""


async def init_pool(conninfo: str) -> AsyncConnectionPool:
    """Open an async connection pool and ensure tables exist."""
    global _pool
    _pool = AsyncConnectionPool(conninfo, min_size=2, max_size=10, open=False)
    await _pool.open()
    async with _pool.connection() as conn:
        await conn.execute(_CREATE_TABLES)
        await conn.commit()
    return _pool


async def close_pool() -> None:
    """Close the async connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def init_tables_sync(conninfo: str) -> None:
    """Create tables using a one-shot sync connection (for scripts)."""
    with psycopg.connect(conninfo) as conn:
        conn.execute(_CREATE_TABLES)
        conn.commit()


# ---------------------------------------------------------------------------
# Async helpers (for routes — take pool param)
# ---------------------------------------------------------------------------


async def save_farm_data(pool: AsyncConnectionPool, user_id: str, data: dict) -> None:
    """Insert or update farm data for a user (weather column is preserved on update)."""
    async with pool.connection() as conn:
        await conn.execute(
            """
            INSERT INTO farm_data (user_id, location, area, lat, lon, nodes)
            VALUES (%s, %s, %s, %s, %s, %s)
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
                psycopg.types.json.Jsonb(data.get("nodes", [])),
            ),
        )
        await conn.commit()


async def get_farm_data(pool: AsyncConnectionPool, user_id: str) -> dict | None:
    """Return farm data for a user, or ``None`` if no record exists."""
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute("SELECT * FROM farm_data WHERE user_id = %s", (user_id,))
            row = await cur.fetchone()
    if row is None:
        return None
    row.pop("user_id", None)
    if row.get("nodes") is None:
        row["nodes"] = []
    return row


async def update_farm_weather(pool: AsyncConnectionPool, user_id: str, weather: dict) -> None:
    """Update (or insert) the weather column for a user."""
    async with pool.connection() as conn:
        await conn.execute(
            """
            INSERT INTO farm_data (user_id, weather)
            VALUES (%s, %s)
            ON CONFLICT(user_id) DO UPDATE SET weather = excluded.weather
            """,
            (user_id, psycopg.types.json.Jsonb(weather)),
        )
        await conn.commit()


# ---------------------------------------------------------------------------
# Sync helper (for agent tool running in LangGraph thread pool)
# ---------------------------------------------------------------------------


def get_farm_data_sync(conninfo: str, user_id: str) -> dict | None:
    """Return farm data for a user using a sync connection."""
    with psycopg.connect(conninfo, row_factory=dict_row) as conn:
        row = conn.execute("SELECT * FROM farm_data WHERE user_id = %s", (user_id,)).fetchone()
    if row is None:
        return None
    row.pop("user_id", None)
    if row.get("nodes") is None:
        row["nodes"] = []
    return row
