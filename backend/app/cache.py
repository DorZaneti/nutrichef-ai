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

    def pop(self, key: Any) -> None:
        self._store.pop(key, None)

    def set(self, key: Any, value: Any) -> None:
        self._store[key] = (time.monotonic() + self.ttl, value)
        self._store.move_to_end(key)
        while len(self._store) > self.max_entries:
            self._store.popitem(last=False)


# TheMealDB data is static, cache aggressively. Recipe nutrition is
# deterministic per recipe, so a long TTL avoids repeat Claude calls.
meal_search_cache = TTLCache(ttl_seconds=60 * 60, max_entries=256)
meal_detail_cache = TTLCache(ttl_seconds=60 * 60 * 6, max_entries=512)
nutrition_cache = TTLCache(ttl_seconds=60 * 60 * 24, max_entries=512)
# Claude's gram/USDA-term parse of a recipe. Kept separately from the final
# result so a retry after a USDA outage reuses it — numbers stay stable and no
# second Claude call is made.
recipe_parse_cache = TTLCache(ttl_seconds=60 * 60 * 24, max_entries=512)
# USDA per-100g values by search term (also persisted in the food_nutrients table).
food_cache = TTLCache(ttl_seconds=60 * 60 * 24 * 7, max_entries=2048)
# Non-English ingredient name → English, for TheMealDB search.
translation_cache = TTLCache(ttl_seconds=60 * 60 * 24 * 7, max_entries=1024)
