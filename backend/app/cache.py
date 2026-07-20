import time
from collections import OrderedDict
from typing import Any, Optional


class TTLCache:
    """In-memory TTL cache with LRU-style eviction. Single-process only."""

    def __init__(self, ttl_seconds: float, max_entries: int = 512):
        self.ttl = ttl_seconds
        self.max_entries = max_entries
        self._store: OrderedDict[Any, tuple[float, Any]] = OrderedDict()

    def get(self, key: Any) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.monotonic() > expires_at:
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return value

    def set(self, key: Any, value: Any) -> None:
        self._store[key] = (time.monotonic() + self.ttl, value)
        self._store.move_to_end(key)
        while len(self._store) > self.max_entries:
            self._store.popitem(last=False)


# TheMealDB data is static, cache aggressively. Nutrition estimates are
# deterministic per recipe, so a long TTL avoids repeat Claude calls.
meal_search_cache = TTLCache(ttl_seconds=60 * 60, max_entries=256)
meal_detail_cache = TTLCache(ttl_seconds=60 * 60 * 6, max_entries=512)
nutrition_cache = TTLCache(ttl_seconds=60 * 60 * 24, max_entries=512)
