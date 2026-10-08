import asyncio
import json
import re
from typing import Dict, List, Optional, Set

import httpx
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.cache import food_cache, nutrition_cache, recipe_parse_cache
from app.config import FAST_MODEL, USDA_API_KEY, USDA_BASE, client
from app.db import async_session_maker
from app.models import FoodNutrient

# Recipe nutrition = Σ (grams of each ingredient × USDA per-100g values).
# Claude only does what it's good at — turning "2 tbsp soy sauce" into a
# gram weight and a USDA search term. The numbers come from USDA.

MACROS = ("calories", "protein", "carbs", "fat")

# USDA nutrient ids. Energy has three variants depending on the dataset.
_ENERGY_IDS = (1008, 2048, 2047)
_MACRO_IDS = {"protein": 1003, "fat": 1004, "carbs": 1005}

# Share of total recipe grams that must come from USDA matches.
CONFIDENCE_HIGH = 0.85
CONFIDENCE_MEDIUM = 0.60

# USDA's search ranks these badly ("water" → "Water convolvulus") and they're 0 kcal anyway.
ZERO_CALORIE_QUERIES = {"water", "ice", "tap water", "cold water", "boiling water", "ice cubes"}

# Below this, a USDA result is treated as no match and the Claude estimate is used.
MIN_MATCH_SCORE = 0.5
# Big enough that a generic food with the same word overlap always wins, small
# enough that a branded food is still used when nothing generic matches.
BRANDED_PENALTY = 0.4
# Bump when matching changes so previously cached (possibly wrong) matches are ignored.
_CACHE_VERSION = "v3"

# Stay well under the USDA rate limit when a recipe fans out to ~20 lookups.
_usda_semaphore = asyncio.Semaphore(4)

_PARSE_SYSTEM = (
    "You convert recipe ingredient lines into gram weights for nutrition lookup. For each line return:\n"
    "- usda_query: a short English search term in USDA FoodData Central style that names the form the "
    "ingredient is in when it's measured (e.g. 'chicken breast raw', 'soy sauce', 'olive oil'). Use the "
    "instructions to decide raw vs cooked: if the recipe measures an already-cooked ingredient (e.g. "
    "'3 cups rice' that the instructions say was cooked beforehand), use the cooked form ('rice brown cooked'); "
    "if the instructions cook it from dry, use the raw/dry form.\n"
    "- grams: the edible weight in grams for the stated amount in that form. Use standard kitchen conversions "
    "(1 cup flour=120g, 1 cup dry rice=185g, 1 cup cooked rice=195g, 1 cup milk=240g, 1 tbsp oil=14g, "
    "1 tbsp butter=14g, 1 tsp salt=6g, 1 clove garlic=5g, 1 medium onion=110g, 1 egg=50g). "
    "'To taste', 'pinch' or 'garnish' amounts are 1-5g. For water use usda_query 'water'.\n"
    "- estimate_per_100g: your best estimate of calories, protein, carbs, fat per 100g, used only if USDA has no match.\n"
    "Also estimate how many servings the whole recipe makes, based on the quantities "
    "(a typical adult main-course portion is 350-550g of food)."
)

_PARSE_SCHEMA = {
    "type": "object",
    "properties": {
        "servings": {"type": "integer"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "line": {"type": "string"},
                    "usda_query": {"type": "string"},
                    "grams": {"type": "number"},
                    "estimate_per_100g": {
                        "type": "object",
                        "properties": {m: {"type": "number"} for m in MACROS},
                        "required": list(MACROS),
                        "additionalProperties": False,
                    },
                },
                "required": ["line", "usda_query", "grams", "estimate_per_100g"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["servings", "items"],
    "additionalProperties": False,
}


async def parse_ingredient_lines(recipe_name: str, lines: List[str], instructions: str = "") -> Dict:
    """Ask Claude for grams + a USDA search term per ingredient line, and the recipe's servings."""
    response = await client.messages.create(
        model=FAST_MODEL,
        max_tokens=8000,
        system=_PARSE_SYSTEM,
        messages=[{
            "role": "user",
            "content": (
                f"Recipe: {recipe_name}\nIngredient lines:\n"
                + "\n".join(f"- {line}" for line in lines)
                + (f"\n\nInstructions:\n{instructions}" if instructions else "")
            ),
        }],
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": _PARSE_SCHEMA}},
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def parse_usda_food(food: Dict) -> Optional[Dict]:
    """Per-100g macros from one USDA search hit, or None if it has no energy value."""
    by_id = {}
    for n in food.get("foodNutrients", []):
        nid = n.get("nutrientId")
        if nid is not None and n.get("value") is not None:
            by_id[nid] = n

    calories = None
    for nid in _ENERGY_IDS:
        n = by_id.get(nid)
        if n and (n.get("unitName") or "").upper() == "KCAL":
            calories = float(n["value"])
            break
    if calories is None:
        return None

    result = {"calories": calories}
    for key, nid in _MACRO_IDS.items():
        result[key] = float(by_id[nid]["value"]) if nid in by_id else 0.0
    return result


def _words(text: str) -> Set[str]:
    words = set()
    for w in re.findall(r"[a-z]+", text.lower()):
        if len(w) > 3 and w.endswith("ies"):
            w = w[:-3] + "y"
        elif len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        words.add(w)
    return words


def match_score(query: str, description: str) -> float:
    """How well a USDA description fits the search term.

    USDA's own ranking can put an unrelated food first ("stir-fry vegetables"
    → "Salsify (vegetable oyster)"), so we score the overlap ourselves: the
    share of query words found in the description, plus a bonus when the
    description's lead word (USDA's main food name) is one of them. Branded
    entries ("Rice, brown, parboiled, cooked, UNCLE BENS") are penalized so
    the generic food wins when both match — a recipe means the generic one.
    """
    query_words = _words(query)
    desc = _words(description)
    if not query_words or not desc:
        return 0.0
    overlap = len(query_words & desc) / len(query_words)
    lead = _words(description.split(",")[0])
    score = overlap + (0.5 if lead & query_words else 0.0)
    if is_branded(description):
        score -= BRANDED_PENALTY
    return score


def is_branded(description: str) -> bool:
    """USDA writes brand names in capitals (UNCLE BENS, SWANSON, KRAFT)."""
    return any(len(w) >= 3 and w.isupper() for w in re.findall(r"[A-Za-z']+", description))


async def _fetch_usda(http: httpx.AsyncClient, query: str) -> Optional[Dict]:
    async with _usda_semaphore:
        r = await http.get(
            f"{USDA_BASE}/foods/search",
            params={
                "query": query,
                "dataType": "Foundation,SR Legacy",
                "pageSize": 10,
                "api_key": USDA_API_KEY,
            },
        )
    r.raise_for_status()
    best, best_score = None, MIN_MATCH_SCORE
    for food in r.json().get("foods", []):
        per_100g = parse_usda_food(food)
        if per_100g is None:
            continue
        score = match_score(query, food.get("description") or "")
        if score > best_score:  # strict: ties keep USDA's earlier-ranked result
            best, best_score = {"fdc_id": food.get("fdcId"), "description": food.get("description"), **per_100g}, score
    return best


async def lookup_food(http: httpx.AsyncClient, query: str) -> Optional[Dict]:
    """USDA per-100g values for a search term. Memory cache → SQLite cache → USDA API.

    Returns None when USDA has no match. Raises on transient failures (rate
    limit, outage) so callers don't mistake them for a real miss.
    """
    query = query.strip().lower()
    if query in ZERO_CALORIE_QUERIES:
        return {"fdc_id": None, "description": "Water", **{m: 0.0 for m in MACROS}}
    key = f"{_CACHE_VERSION}:{query}"
    cached = food_cache.get(key)
    if cached is not None:
        return cached or None  # {} is a cached miss

    async with async_session_maker() as session:
        row = await session.get(FoodNutrient, key)
        if row is not None:
            hit = (
                {"fdc_id": row.fdc_id, "description": row.description, **{m: getattr(row, m) for m in MACROS}}
                if row.calories is not None
                else {}
            )
            food_cache.set(key, hit)
            return hit or None

        hit = await _fetch_usda(http, query)

        # Two lookups of the same term can race here; the second insert is a no-op.
        await session.execute(
            sqlite_insert(FoodNutrient).values(query=key, **(hit or {})).on_conflict_do_nothing(index_elements=["query"])
        )
        await session.commit()
    food_cache.set(key, hit or {})
    return hit


def confidence_for(usda_share: float) -> str:
    if usda_share >= CONFIDENCE_HIGH:
        return "high"
    if usda_share >= CONFIDENCE_MEDIUM:
        return "medium"
    return "low"


def aggregate(items: List[Dict], lookups: List[Optional[Dict]], servings: int) -> Dict:
    """Combine parsed ingredient grams with per-100g values into totals, per-serving values and confidence."""
    servings = max(1, int(servings or 1))
    total = {m: 0.0 for m in MACROS}
    breakdown = []
    total_grams = usda_grams = 0.0

    for item, usda in zip(items, lookups):
        grams = max(0.0, float(item.get("grams") or 0))
        per_100g = usda if usda else item.get("estimate_per_100g") or {}
        source = "usda" if usda else "estimate"
        values = {m: grams / 100 * float(per_100g.get(m) or 0) for m in MACROS}
        for m in MACROS:
            total[m] += values[m]

        total_grams += grams
        if usda:
            usda_grams += grams
        breakdown.append({
            "ingredient": item.get("line", ""),
            "grams": round(grams),
            "calories": round(values["calories"]),
            "protein": round(values["protein"], 1),
            "source": source,
            "match": usda.get("description") if usda else None,
        })

    usda_share = usda_grams / total_grams if total_grams else 0.0
    return {
        "servings": servings,
        "total": {m: round(v, 1) for m, v in total.items()},
        "per_serving": {m: round(v / servings, 1) for m, v in total.items()},
        "confidence": confidence_for(usda_share),
        "usda_share": round(usda_share, 2),
        "breakdown": breakdown,
    }


async def compute_recipe_nutrition(recipe_id: str, recipe_name: str, lines: List[str], instructions: str = "") -> Dict:
    """Nutrition for a whole recipe from its 'measure + ingredient' lines. {} on failure."""
    cached = nutrition_cache.get(recipe_id)
    if cached is not None:
        return cached
    if not lines:
        return {}
    try:
        parsed = recipe_parse_cache.get(recipe_id)
        if parsed is None:
            parsed = await parse_ingredient_lines(recipe_name, lines, instructions)
            recipe_parse_cache.set(recipe_id, parsed)
        items = parsed.get("items", [])
        async with httpx.AsyncClient(timeout=15) as http:
            outcomes = await asyncio.gather(
                *[lookup_food(http, item["usda_query"]) for item in items], return_exceptions=True
            )
        failed = [o for o in outcomes if isinstance(o, Exception)]
        if failed:
            print(f"USDA: {len(failed)}/{len(items)} lookups failed for {recipe_name} ({failed[0]!r:.120})")
        lookups = [None if isinstance(o, Exception) else o for o in outcomes]

        result = aggregate(items, lookups, parsed.get("servings") or 1)
        # Lookups that failed transiently fell back to estimates — usable now,
        # but flagged so neither cache keeps them in place of real USDA values.
        result["incomplete"] = bool(failed)
        if not failed:
            nutrition_cache.set(recipe_id, result)
        return result
    except Exception as e:
        print(f"Error computing nutrition for {recipe_name}: {e}")
        return {}


async def nutrition_for_food(food: str, grams: float) -> Optional[Dict]:
    """Macros for a single food at a given weight — USDA only, None if no match."""
    async with httpx.AsyncClient(timeout=15) as http:
        hit = await lookup_food(http, food)
    if not hit:
        return None
    return {
        "food": food,
        "usda_match": hit.get("description"),
        "grams": grams,
        **{m: round(grams / 100 * float(hit.get(m) or 0), 1) for m in MACROS},
    }
