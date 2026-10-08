"""Daily caps on Claude usage, so the public demo can't run up the API bill.

Two layers: a per-IP request limit on each AI-backed endpoint, and an app-wide
budget of Claude calls per UTC day (a backstop against many IPs at once).
Counters live in memory and reset on restart, which is fine for one instance.
"""
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from app.config import DAILY_FAST_CALLS, DAILY_MAIN_CALLS, FAST_MODEL


class BudgetExceeded(Exception):
    """The app-wide daily Claude budget is used up."""


class DailyCounter:
    def __init__(self):
        self._day = None
        self._counts = defaultdict(int)

    def _roll(self) -> None:
        today = datetime.now(timezone.utc).date()
        if today != self._day:
            self._day = today
            self._counts.clear()

    def used(self, key) -> int:
        self._roll()
        return self._counts[key]

    def take(self, key, limit: int) -> bool:
        """Count one use of `key`; False (and no count) once today's limit is reached."""
        if self.used(key) >= limit:
            return False
        self._counts[key] += 1
        return True


counter = DailyCounter()

LIMIT_DETAIL = {"code": "daily_limit", "message": "Daily demo limit reached. Please try again tomorrow."}


def _budget(model: str):
    """Cheap helper calls (Haiku) and the main chat/insights calls draw from separate pools."""
    if model == FAST_MODEL:
        return ("budget", "fast"), DAILY_FAST_CALLS
    return ("budget", "main"), DAILY_MAIN_CALLS


def spend_claude_call(model: str) -> None:
    """Count one Claude request against the app-wide budget. Call right before each request."""
    key, limit = _budget(model)
    if not counter.take(key, limit):
        raise BudgetExceeded(f"Daily Claude budget ({key[1]} model) is used up")


def has_budget(model: str) -> bool:
    """Whether a request on `model` could still run today, without counting one."""
    key, limit = _budget(model)
    return counter.used(key) < limit


def client_ip(request: Request) -> str:
    # Render sits behind Cloudflare, which overwrites these headers with the
    # real client address. X-Forwarded-For is only appended to, so a client can
    # forge its first entry — it's the last resort.
    for header in ("cf-connecting-ip", "true-client-ip"):
        if request.headers.get(header):
            return request.headers[header].strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def take_per_ip(request: Request, bucket: str, limit: int) -> None:
    """Count one request from this client IP; 429 once today's limit for `bucket` is reached."""
    if not counter.take((bucket, client_ip(request)), limit):
        raise HTTPException(status_code=429, detail=LIMIT_DETAIL)


def per_ip_limit(bucket: str, limit: int):
    """FastAPI dependency form of take_per_ip."""

    def check(request: Request) -> None:
        take_per_ip(request, bucket, limit)

    return check


def require_budget(model: str):
    """FastAPI dependency: 429 up front when the app-wide budget for `model` is already used up."""

    def check() -> None:
        if not has_budget(model):
            raise HTTPException(status_code=429, detail=LIMIT_DETAIL)

    return check
