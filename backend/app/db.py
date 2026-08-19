"""Read-only DB access for the app — executes via the floatchat_readonly role."""

import psycopg
from psycopg.rows import dict_row

from .config import settings

_pool = None


def get_pool() -> psycopg.AsyncConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg.AsyncConnectionPool(
            settings.db_url,
            min_size=1,
            max_size=5,
            open=False,
            kwargs={"row_factory": dict_row},
        )
    if not _pool.is_open():
        _pool.open(wait=True, timeout=10)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None and _pool.is_open():
        await _pool.close()
        _pool = None


async def fetch_all(query: str, params: tuple | None = None) -> list[dict]:
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def ping() -> bool:
    try:
        await fetch_all("SELECT 1")
        return True
    except Exception:
        return False