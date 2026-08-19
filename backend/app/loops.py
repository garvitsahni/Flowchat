"""Custom asyncio loop factory for uvicorn on Windows.

psycopg's async mode requires a SelectorEventLoop (ProactorEventLoop breaks it).
uvicorn forces ProactorEventLoop on win32 by default, so run with:
    uvicorn app.main:app --loop app.loops:selector_loop_factory

Custom `--loop` values are handed to asyncio.Runner as-is and called once with no
args, so this factory must return a ready-to-use event loop instance.
"""

from __future__ import annotations

import asyncio
import selectors
import sys
from collections.abc import Callable


def selector_loop_factory(use_subprocess: bool = False) -> Callable[[], asyncio.AbstractEventLoop]:
    if sys.platform == "win32":
        return asyncio.SelectorEventLoop(selectors.SelectSelector())
    return asyncio.SelectorEventLoop()