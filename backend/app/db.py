"""Read-only DB access for the app — executes via the floatchat_readonly role."""

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

from .config import settings

_pool: AsyncConnectionPool | None = None
_pool_initialized = False


async def get_pool() -> AsyncConnectionPool:
    global _pool, _pool_initialized
    if _pool is None:
        _pool = AsyncConnectionPool(
            settings.db_url,
            min_size=2,
            max_size=10,
            kwargs={"row_factory": dict_row, "connect_timeout": 60},
            open=False,
            timeout=120,
            max_waiting=20,
        )
    if not _pool_initialized:
        await _pool.open()
        _pool_initialized = True
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None and not _pool.closed:
        await _pool.close()
        _pool = None


async def fetch_all(query: str, params: tuple | None = None) -> list[dict]:
    pool = await get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(query, params)
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def ping() -> bool:
    try:
        pool = await get_pool()
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
                await cur.fetchone()
        return True
    except Exception:
        return False