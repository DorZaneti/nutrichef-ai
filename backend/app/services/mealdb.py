import asyncio
from typing import Dict, List, Optional

import httpx

from app.cache import meal_detail_cache, meal_search_cache
from app.config import THEMEALDB_BASE
from app.services.ai import estimate_nutrition


def normalize_for_search(ingredient: str) -> str:
    """Strip descriptors to get the base ingredient name TheMealDB understands."""
    descriptors = {
        'breast', 'breasts', 'thigh', 'thighs', 'wing', 'wings', 'leg', 'legs',
        'ground', 'minced', 'fresh', 'dried', 'frozen', 'baby', 'whole',
        'sliced', 'chopped', 'diced', 'boneless', 'skinless', 'lean',
        'extra', 'large', 'small', 'medium', 'finely', 'cooked', 'raw',
        'peeled', 'pitted', 'shredded', 'grated', 'crushed',
    }
    words = ingredient.lower().split()
    base = [w for w in words if w not in descriptors]
    return ' '.join(base) if base else ingredient.lower()


async def _lookup_meal(http: httpx.AsyncClient, meal_id: str) -> Optional[Dict]:
    """Fetch raw meal detail from TheMealDB, cached."""
    cached = meal_detail_cache.get(meal_id)
    if cached is not None:
        return cached
    r = await http.get(f"{THEMEALDB_BASE}/lookup.php", params={"i": meal_id})
    data = r.json()
    if not data.get("meals"):
        return None
    meal = data["meals"][0]
    meal_detail_cache.set(meal_id, meal)
    return meal


def _meal_ingredients(meal: Dict) -> List[str]:
    ings = []
    for i in range(1, 21):
        ing = (meal.get(f"strIngredient{i}") or "").strip()
        if ing:
            ings.append(ing)
    return ings


async def _fetch_meal_card(http: httpx.AsyncClient, meal_id: str, user_ingredients: List[str]) -> Optional[Dict]:
    """Fetch a single meal and compute ingredient match."""
    try:
        meal = await _lookup_meal(http, meal_id)
        if meal is None:
            return None

        meal_ings = [i.lower() for i in _meal_ingredients(meal)]

        user_normalized = [normalize_for_search(u) for u in user_ingredients]
        used = [
            user_ingredients[i] for i, u in enumerate(user_normalized)
            if any(u in m or m in u for m in meal_ings)
        ]
        missed = [m for m in meal_ings if not any(u in m or m in u for u in user_normalized)]

        match_pct = round(len(used) / len(meal_ings) * 100, 1) if meal_ings else 0

        return {
            "id": meal["idMeal"],
            "name": meal["strMeal"],
            "image": meal.get("strMealThumb", ""),
            "used_ingredients": used,
            "missed_ingredients": missed[:6],
            "match_percentage": match_pct,
            "likes": 0,
        }
    except Exception as e:
        print(f"Error fetching meal {meal_id}: {e}")
        return None


async def _filter_by_ingredient(http: httpx.AsyncClient, ingredient: str) -> List[str]:
    """Return meal ids matching one ingredient, cached."""
    cached = meal_search_cache.get(ingredient)
    if cached is not None:
        return cached
    try:
        r = await http.get(f"{THEMEALDB_BASE}/filter.php", params={"i": ingredient})
        data = r.json()
        ids = [meal["idMeal"] for meal in data.get("meals") or []]
    except Exception as e:
        print(f"Error searching ingredient {ingredient}: {e}")
        return []
    meal_search_cache.set(ingredient, ids)
    return ids


async def search_recipes_by_ingredients(ingredients: List[str], number: int = 10) -> List[Dict]:
    """Search TheMealDB by up to 3 ingredients, merge and rank results."""
    meal_hit_count: Dict[str, int] = {}

    async with httpx.AsyncClient(timeout=15) as http:
        search_terms = [normalize_for_search(ing) for ing in ingredients[:3]]
        results = await asyncio.gather(*[_filter_by_ingredient(http, t) for t in search_terms])

        for ids in results:
            for mid in ids:
                meal_hit_count[mid] = meal_hit_count.get(mid, 0) + 1

        if not meal_hit_count:
            return []

        sorted_ids = sorted(meal_hit_count, key=lambda x: meal_hit_count[x], reverse=True)
        cards = await asyncio.gather(*[
            _fetch_meal_card(http, mid, ingredients) for mid in sorted_ids[:number]
        ])

    valid = [c for c in cards if c is not None]
    valid.sort(key=lambda x: x["match_percentage"], reverse=True)
    return valid


async def get_recipe_details(recipe_id: str) -> Optional[Dict]:
    """Get full recipe details from TheMealDB with AI-estimated nutrition."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            meal = await _lookup_meal(http, recipe_id)
        if meal is None:
            return None

        ingredients = []
        for i in range(1, 21):
            ing = (meal.get(f"strIngredient{i}") or "").strip()
            measure = (meal.get(f"strMeasure{i}") or "").strip()
            if ing:
                ingredients.append(f"{measure} {ing}".strip())

        raw_instructions = meal.get("strInstructions") or ""
        instructions = [s.strip() for s in raw_instructions.splitlines() if s.strip()]

        nutrition = await estimate_nutrition(recipe_id, meal["strMeal"], ingredients)

        return {
            "id": meal["idMeal"],
            "name": meal["strMeal"],
            "image": meal.get("strMealThumb", ""),
            "servings": 4,
            "ready_in_minutes": 0,
            "source_url": meal.get("strSource") or "",
            "nutrition": nutrition,
            "instructions": instructions,
            "ingredients": ingredients,
        }
    except Exception as e:
        print(f"Error getting recipe details: {e}")
        return None
