from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.schemas import Ingredient, Profile, TodayTotals
from app.services.mealdb import get_recipe_details, search_recipes_by_ingredients
from app.services.nutrition import MACROS, nutrition_for_food

# Tools the chat agent can call. Tools that change user state (pantry, meal
# log) don't write anything server-side — they emit an "action" that the
# frontend applies, so the client stays the single source of truth and the
# offline sync queue stays the only write path.


class ToolInputError(ValueError):
    """The model sent input that doesn't match the tool's schema."""


@dataclass
class AgentContext:
    ingredients: List[Ingredient]
    profile: Optional[Profile]
    today_totals: TodayTotals
    actions: List[Dict] = field(default_factory=list)

    def emit(self, action_type: str, **payload: Any) -> Dict:
        action = {"type": action_type, **payload}
        self.actions.append(action)
        return action


_INGREDIENT_ITEM = {
    "type": "object",
    "properties": {
        "name": {"type": "string", "description": "English ingredient name, e.g. 'chicken breast'"},
        "grams": {"type": "number", "description": "Weight in grams; estimate from units (1 egg=50g) if needed"},
    },
    "required": ["name", "grams"],
    "additionalProperties": False,
}

TOOLS = [
    {
        "name": "update_ingredients",
        "description": (
            "Add ingredients to or remove them from the user's kitchen (pantry). Call this whenever the user "
            "says they have, bought, used up or finished an ingredient. Always use English names."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "add": {"type": "array", "items": _INGREDIENT_ITEM},
                "remove": {"type": "array", "items": {"type": "string"}, "description": "Names to remove"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "search_recipes",
        "description": (
            "Find recipes that use the user's ingredients. Defaults to everything in their pantry; pass "
            "'ingredients' to focus on specific ones. Results already respect the user's diet and allergies "
            "and are shown to the user as cards, so summarize briefly instead of listing every detail."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "ingredients": {"type": "array", "items": {"type": "string"}, "description": "English names"},
                "max_results": {"type": "integer", "description": "1-10, default 6"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "get_recipe_details",
        "description": (
            "Get a recipe's full ingredient list, steps and per-serving nutrition (from USDA data). "
            "Use a recipe_id returned by search_recipes."
        ),
        "input_schema": {
            "type": "object",
            "properties": {"recipe_id": {"type": "string"}},
            "required": ["recipe_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "lookup_nutrition",
        "description": (
            "Look up calories, protein, carbs and fat for one food at a given weight in the USDA database. "
            "Use this instead of guessing whenever the user asks about a food's nutrition or logs a food "
            "that isn't a recipe."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "food": {"type": "string", "description": "English USDA-style name, e.g. 'salmon atlantic raw'"},
                "grams": {"type": "number"},
            },
            "required": ["food", "grams"],
            "additionalProperties": False,
        },
    },
    {
        "name": "log_meal",
        "description": (
            "Log something the user ate to their daily food log. For a recipe pass recipe_id and servings "
            "(portions eaten) — nutrition is computed for you. For any other food pass the nutrition for the "
            "whole amount eaten (look it up with lookup_nutrition first) and servings=1. "
            "Only log when the user says they ate or will eat it."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "What was eaten, e.g. 'Teriyaki Chicken' or '150g salmon'"},
                "servings": {"type": "number", "description": "Portions eaten, e.g. 0.5, 1, 2"},
                "recipe_id": {"type": "string"},
                "calories": {"type": "number"},
                "protein": {"type": "number"},
                "carbs": {"type": "number"},
                "fat": {"type": "number"},
            },
            "required": ["name", "servings"],
            "additionalProperties": False,
        },
    },
]

# Stream tool inputs as they're generated (they're validated below before running).
for _tool in TOOLS:
    _tool["eager_input_streaming"] = True


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ToolInputError(message)


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


async def update_ingredients(ctx: AgentContext, args: Dict) -> Dict:
    add = args.get("add") or []
    remove = args.get("remove") or []
    _require(isinstance(add, list) and isinstance(remove, list), "add and remove must be arrays")
    clean_add = []
    for item in add:
        _require(isinstance(item, dict) and isinstance(item.get("name"), str), "each add item needs a name")
        grams = item.get("grams")
        _require(_is_number(grams) and grams >= 0, "grams must be a non-negative number")
        clean_add.append({"name": item["name"].strip(), "weight_grams": float(grams)})
    _require(all(isinstance(r, str) for r in remove), "remove must be a list of names")

    # Mirror the change locally so a search later in this turn sees it.
    removed = {r.strip().lower() for r in remove}
    ctx.ingredients = [i for i in ctx.ingredients if i.name.lower() not in removed]
    for item in clean_add:
        existing = next((i for i in ctx.ingredients if i.name.lower() == item["name"].lower()), None)
        if existing:
            existing.weight_grams += item["weight_grams"]
        else:
            ctx.ingredients.append(Ingredient(**item))

    ctx.emit("update_ingredients", add=clean_add, remove=list(remove))
    return {"ok": True, "pantry": [f"{i.name} ({i.weight_grams:.0f}g)" for i in ctx.ingredients]}


async def search_recipes(ctx: AgentContext, args: Dict) -> Dict:
    names = args.get("ingredients") or [i.name for i in ctx.ingredients]
    _require(isinstance(names, list) and all(isinstance(n, str) for n in names), "ingredients must be strings")
    if not names:
        return {"recipes": [], "note": "The pantry is empty — ask the user what they have."}
    max_results = args.get("max_results", 6)
    max_results = max(1, min(10, int(max_results))) if _is_number(max_results) else 6

    recipes = await search_recipes_by_ingredients(names, number=max_results, profile=ctx.profile)
    ctx.emit("show_recipes", recipes=recipes)
    return {
        "recipes": [
            {
                "recipe_id": r["id"],
                "name": r["name"],
                "match_percentage": r["match_percentage"],
                "missing": r["missed_ingredients"],
            }
            for r in recipes
        ]
    }


async def get_recipe_details_tool(ctx: AgentContext, args: Dict) -> Dict:
    recipe_id = args.get("recipe_id")
    _require(isinstance(recipe_id, str) and recipe_id.strip(), "recipe_id is required")
    details = await get_recipe_details(recipe_id.strip())
    if details is None:
        raise ToolInputError(f"No recipe with id {recipe_id}")
    nutrition = details.get("nutrition") or {}
    return {
        "recipe_id": details["id"],
        "name": details["name"],
        "servings": details["servings"],
        "per_serving": nutrition.get("per_serving"),
        "nutrition_confidence": nutrition.get("confidence"),
        "ingredients": details["ingredients"],
        "instructions": details["instructions"],
    }


async def lookup_nutrition(ctx: AgentContext, args: Dict) -> Dict:
    food, grams = args.get("food"), args.get("grams")
    _require(isinstance(food, str) and food.strip(), "food is required")
    _require(_is_number(grams) and grams > 0, "grams must be a positive number")
    result = await nutrition_for_food(food.strip(), float(grams))
    if result is None:
        return {"found": False, "note": "No USDA match. Give your best estimate and tell the user it's estimated."}
    return {"found": True, "source": "USDA FoodData Central", **result}


async def log_meal(ctx: AgentContext, args: Dict) -> Dict:
    name, servings = args.get("name"), args.get("servings")
    _require(isinstance(name, str) and name.strip(), "name is required")
    _require(_is_number(servings) and 0 < servings <= 10, "servings must be between 0 and 10")

    recipe_id = args.get("recipe_id")
    if recipe_id:
        details = await get_recipe_details(str(recipe_id))
        per_serving = ((details or {}).get("nutrition") or {}).get("per_serving")
        _require(per_serving is not None, f"No nutrition available for recipe {recipe_id}")
        name = details["name"]
        macros = {m: round(per_serving[m] * servings, 1) for m in MACROS}
    else:
        _require(_is_number(args.get("calories")), "calories is required when there's no recipe_id")
        # Free-form foods: the given nutrition already covers the whole amount eaten.
        macros = {m: round(float(args.get(m) or 0), 1) for m in MACROS}

    entry = {"recipe_name": name.strip(), "servings": servings, **macros}
    ctx.emit("log_meal", entry=entry)
    ctx.today_totals.calories += macros["calories"]
    ctx.today_totals.protein += macros["protein"]
    return {
        "logged": entry,
        "today_total": {
            "calories": round(ctx.today_totals.calories),
            "protein": round(ctx.today_totals.protein),
        },
    }


HANDLERS = {
    "update_ingredients": update_ingredients,
    "search_recipes": search_recipes,
    "get_recipe_details": get_recipe_details_tool,
    "lookup_nutrition": lookup_nutrition,
    "log_meal": log_meal,
}


async def run_tool(ctx: AgentContext, name: str, args: Any) -> Dict:
    handler = HANDLERS.get(name)
    if handler is None:
        raise ToolInputError(f"Unknown tool {name}")
    if not isinstance(args, dict):
        raise ToolInputError("Tool input must be an object")
    return await handler(ctx, args)
