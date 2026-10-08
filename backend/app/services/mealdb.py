import asyncio
import re
from typing import Dict, List, Optional, Set

import httpx

from app.cache import meal_detail_cache, meal_search_cache
from app.config import THEMEALDB_BASE
from app.schemas import Profile
from app.services.ai import translate_to_english
from app.services.nutrition import compute_recipe_nutrition

# Assumed to be in every kitchen — never "missing", never count against match %.
PANTRY_STAPLES = {
    'salt', 'pepper', 'black pepper', 'water', 'oil', 'olive oil', 'vegetable oil',
    'sunflower oil', 'sugar', 'ice',
}

MEAT_CATEGORIES = {'beef', 'chicken', 'lamb', 'pork', 'goat'}
MEAT_WORDS = {
    'beef', 'chicken', 'lamb', 'pork', 'goat', 'bacon', 'ham', 'sausage', 'sausages', 'mince',
    'turkey', 'duck', 'veal', 'chorizo', 'prosciutto', 'pancetta', 'salami', 'steak', 'gelatine',
}
FISH_WORDS = {
    'fish', 'salmon', 'tuna', 'cod', 'haddock', 'prawns', 'prawn', 'shrimp', 'crab', 'lobster',
    'mussels', 'clams', 'scallops', 'anchovy', 'anchovies', 'sardines', 'mackerel', 'squid', 'oysters',
}
ANIMAL_PRODUCT_WORDS = {
    'egg', 'eggs', 'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'honey', 'parmesan',
    'mozzarella', 'cheddar', 'ghee', 'mayonnaise', 'feta', 'ricotta',
}
# Allergy names users type → ingredient words they cover.
ALLERGEN_GROUPS = {
    'nuts': {'peanut', 'peanuts', 'almond', 'almonds', 'walnut', 'walnuts', 'cashew', 'cashews', 'pecan',
             'pecans', 'hazelnut', 'hazelnuts', 'pistachio', 'pistachios', 'nut', 'nuts'},
    'peanuts': {'peanut', 'peanuts'},
    'dairy': {'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'parmesan', 'mozzarella',
              'cheddar', 'ghee', 'feta', 'ricotta'},
    'lactose': {'milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt'},
    'gluten': {'flour', 'bread', 'pasta', 'wheat', 'spaghetti', 'noodles', 'couscous', 'barley',
               'breadcrumbs', 'tortilla', 'tortillas', 'penne', 'macaroni', 'lasagne'},
    'eggs': {'egg', 'eggs'},
    'egg': {'egg', 'eggs'},
    'shellfish': {'prawn', 'prawns', 'shrimp', 'crab', 'lobster', 'mussels', 'clams', 'scallops', 'oysters'},
    'fish': FISH_WORDS,
    'soy': {'soy', 'soya', 'tofu', 'edamame'},
    'sesame': {'sesame', 'tahini'},
}


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


def _singular(word: str) -> str:
    if len(word) > 4 and word.endswith('ies'):
        return word[:-3] + 'y'
    if len(word) > 4 and word.endswith('oes'):
        return word[:-2]
    if len(word) > 3 and word.endswith('s') and not word.endswith('ss'):
        return word[:-1]
    return word


def _words(text: str) -> Set[str]:
    return {_singular(w) for w in re.findall(r"[a-z]+", text.lower())}


def ingredient_matches(user_ingredient: str, meal_ingredient: str) -> bool:
    """Whole-word match: 'egg' matches 'Eggs' and 'chicken' matches 'Chicken Breast', but 'egg' ≠ 'eggplant'."""
    user = _words(normalize_for_search(user_ingredient))
    meal = _words(meal_ingredient)
    if not user or not meal:
        return False
    return user <= meal or meal <= user


def is_staple(ingredient: str) -> bool:
    return ingredient.strip().lower() in PANTRY_STAPLES


def violates_profile(meal: Dict, profile: Optional[Profile]) -> bool:
    """True if the meal breaks the profile's diet or contains one of its allergens."""
    if profile is None:
        return False
    words = set()
    for ing in _meal_ingredients(meal):
        words |= _words(ing)
    category = (meal.get('strCategory') or '').lower()

    meat = {_singular(w) for w in MEAT_WORDS}
    fish = {_singular(w) for w in FISH_WORDS}
    animal = {_singular(w) for w in ANIMAL_PRODUCT_WORDS}
    if profile.diet in ('vegetarian', 'vegan', 'pescatarian'):
        if category in MEAT_CATEGORIES or words & meat:
            return True
    if profile.diet in ('vegetarian', 'vegan'):
        if category == 'seafood' or words & fish:
            return True
    if profile.diet == 'vegan' and category != 'vegan' and words & animal:
        return True

    for allergy in profile.allergies:
        key = allergy.strip().lower()
        if not key:
            continue
        covered = {_singular(w) for w in ALLERGEN_GROUPS.get(key, set())} | _words(key)
        if words & covered:
            return True
    return False


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


async def _fetch_meal_card(
    http: httpx.AsyncClient, meal_id: str, user_ingredients: List[str], profile: Optional[Profile] = None
) -> Optional[Dict]:
    """Fetch a single meal and compute ingredient match. None if missing or excluded by the profile."""
    try:
        meal = await _lookup_meal(http, meal_id)
        if meal is None or violates_profile(meal, profile):
            return None

        meal_ings = [i.lower() for i in _meal_ingredients(meal) if not is_staple(i)]

        used = [u for u in user_ingredients if any(ingredient_matches(u, m) for m in meal_ings)]
        covered = [m for m in meal_ings if any(ingredient_matches(u, m) for u in user_ingredients)]
        missed = [m for m in meal_ings if m not in covered]

        match_pct = round(len(covered) / len(meal_ings) * 100, 1) if meal_ings else 0

        return {
            "id": meal["idMeal"],
            "name": meal["strMeal"],
            "image": meal.get("strMealThumb", ""),
            "used_ingredients": used,
            "missed_ingredients": missed[:6],
            "match_percentage": match_pct,
            "category": meal.get("strCategory") or "",
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


MAX_SEARCH_TERMS = 6


async def search_recipes_by_ingredients(
    ingredients: List[str], number: int = 10, profile: Optional[Profile] = None
) -> List[Dict]:
    """Search TheMealDB by up to 6 ingredients, merge, filter by profile and rank results."""
    meal_hit_count: Dict[str, int] = {}

    # TheMealDB only understands English — translate e.g. Hebrew names first.
    english = await translate_to_english(ingredients)
    searchable = [e for e in english if not is_staple(e)] or english

    async with httpx.AsyncClient(timeout=15) as http:
        search_terms = list(dict.fromkeys(normalize_for_search(ing) for ing in searchable[:MAX_SEARCH_TERMS]))
        results = await asyncio.gather(*[_filter_by_ingredient(http, t) for t in search_terms])

        for ids in results:
            for mid in ids:
                meal_hit_count[mid] = meal_hit_count.get(mid, 0) + 1

        if not meal_hit_count:
            return []

        sorted_ids = sorted(meal_hit_count, key=lambda x: meal_hit_count[x], reverse=True)
        # Over-fetch so diet/allergy filtering still leaves enough results.
        cards = await asyncio.gather(*[
            _fetch_meal_card(http, mid, english, profile) for mid in sorted_ids[: number * 2]
        ])

    # Show the user's own names (e.g. Hebrew) in "You have".
    to_original = dict(zip(english, ingredients))
    valid = [c for c in cards if c is not None]
    for card in valid:
        card["used_ingredients"] = [to_original.get(u, u) for u in card["used_ingredients"]]
    valid.sort(key=lambda x: x["match_percentage"], reverse=True)
    return valid[:number]


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

        nutrition = await compute_recipe_nutrition(
            recipe_id, meal["strMeal"], ingredients, raw_instructions[:3000]
        )

        return {
            "id": meal["idMeal"],
            "name": meal["strMeal"],
            "image": meal.get("strMealThumb", ""),
            "category": meal.get("strCategory") or "",
            "area": meal.get("strArea") or "",
            "servings": nutrition.get("servings") or 4,
            "source_url": meal.get("strSource") or "",
            "nutrition": nutrition,
            "instructions": instructions,
            "ingredients": ingredients,
        }
    except Exception as e:
        print(f"Error getting recipe details: {e}")
        return None
