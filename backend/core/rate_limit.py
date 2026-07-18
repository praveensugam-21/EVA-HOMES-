from collections import defaultdict, deque
from time import time

from fastapi import HTTPException, Request, status


class SimpleRateLimiter:
    def __init__(self):
        self._hits = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = time()
        bucket = self._hits[key]

        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()

        if len(bucket) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a moment and try again.",
            )

        bucket.append(now)


rate_limiter = SimpleRateLimiter()


def client_identifier(request: Request, prefix: str) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client = forwarded_for.split(",")[0].strip()
    else:
        client = request.client.host if request.client else "unknown"
    return f"{prefix}:{client}"
