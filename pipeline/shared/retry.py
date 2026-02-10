from __future__ import annotations

import asyncio
import functools
import logging
import time
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable)


def retry(
    max_attempts: int = 3,
    backoff_base: float = 2.0,
    exceptions: tuple = (Exception,),
) -> Callable:
    """Retry decorator with exponential backoff. Works with both sync and async."""

    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts - 1:
                        raise
                    wait = backoff_base**attempt
                    logger.warning(
                        "%s failed (attempt %d/%d), retrying in %.1fs: %s",
                        func.__name__,
                        attempt + 1,
                        max_attempts,
                        wait,
                        e,
                    )
                    await asyncio.sleep(wait)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts - 1:
                        raise
                    wait = backoff_base**attempt
                    logger.warning(
                        "%s failed (attempt %d/%d), retrying in %.1fs: %s",
                        func.__name__,
                        attempt + 1,
                        max_attempts,
                        wait,
                        e,
                    )
                    time.sleep(wait)

        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore[return-value]
        return sync_wrapper  # type: ignore[return-value]

    return decorator
