import json
from typing import Dict, List

from app.cache import nutrition_cache
from app.config import CHAT_MODEL, FAST_MODEL, INSIGHTS_MODEL, client
from app.schemas import ActivityEntry, Ingredient

SYSTEM_PROMPT = """You are NutriChef AI, a friendly and enthusiastic chef assistant powered by Claude.

Your role:
- Help users discover recipes based on their available ingredients
- Parse ingredient names and weights from natural language
- Provide cooking tips and substitution suggestions
- Be conversational, encouraging, and make cooking fun!

When a user mentions ingredients:
1. Acknowledge what they have
2. Let them know you'll search for recipes
3. Keep the conversation natural and helpful

Important: You DON'T call tools directly - the backend handles recipe search. Just be conversational and helpful!"""


async def run_chat_agent(user_message: str, conversation_history: List[Dict], current_ingredients: List[Ingredient]) -> str:
    context = ""
    if current_ingredients:
        context = "\n\nUser's current ingredients:\n"
        for ing in current_ingredients:
            context += f"- {ing.name}: {ing.weight_grams}g\n"

    messages = conversation_history + [
        {"role": "user", "content": user_message + context}
    ]

    try:
        response = await client.messages.create(
            model=CHAT_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        return next(b.text for b in response.content if b.type == "text")
    except Exception as e:
        print(f"Error with Claude API: {e}")
        return "I'm having trouble thinking right now. Please try again!"


async def stream_chat_agent(user_message: str, conversation_history: List[Dict], current_ingredients: List[Ingredient]):
    """Same prompt as run_chat_agent, but yields text deltas as they arrive."""
    context = ""
    if current_ingredients:
        context = "\n\nUser's current ingredients:\n"
        for ing in current_ingredients:
            context += f"- {ing.name}: {ing.weight_grams}g\n"

    messages = conversation_history + [
        {"role": "user", "content": user_message + context}
    ]

    try:
        async with client.messages.stream(
            model=CHAT_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
    except Exception as e:
        print(f"Error with Claude API: {e}")
        yield "I'm having trouble thinking right now. Please try again!"


async def extract_ingredients_from_message(user_message: str) -> List[Dict]:
    try:
        response = await client.messages.create(
            model=FAST_MODEL,
            max_tokens=512,
            system=(
                "Extract food ingredients and their quantities from the message, converting everything to grams. "
                "Use these conversions: 1 egg=50g, 1 medium onion=150g, 1 medium tomato=120g, "
                "1 medium potato=170g, 1 cup flour=120g, 1 cup rice=200g, 1 cup milk=240g, "
                "1 tbsp butter=14g, 1 tbsp oil=14g, 1 clove garlic=5g, 1 medium apple=180g, "
                "1 medium carrot=60g, 1 medium banana=120g, 1 slice bread=30g. "
                "For unknown items, estimate a reasonable weight. "
                "Return an empty ingredients array if no food ingredients are found."
            ),
            messages=[{"role": "user", "content": user_message}],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "ingredients": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "weight_grams": {"type": "number"},
                                    },
                                    "required": ["name", "weight_grams"],
                                    "additionalProperties": False,
                                },
                            }
                        },
                        "required": ["ingredients"],
                        "additionalProperties": False,
                    },
                }
            },
        )
        text = next(b.text for b in response.content if b.type == "text")
        data = json.loads(text)
        return data.get("ingredients", [])
    except Exception as e:
        print(f"Error extracting ingredients: {e}")
        return []


async def estimate_nutrition(recipe_id: str, recipe_name: str, ingredients: List[str]) -> Dict:
    """Use Claude to estimate nutrition for a recipe based on its name and ingredients."""
    cached = nutrition_cache.get(recipe_id)
    if cached is not None:
        return cached
    try:
        ingredient_list = "\n".join(ingredients[:15])
        response = await client.messages.create(
            model=FAST_MODEL,
            max_tokens=256,
            system=(
                "You are a nutrition expert. Estimate the total nutrition for a recipe "
                "based on its name and ingredient list (for ~4 servings). "
                "Use realistic average values. Numbers only, no units in values."
            ),
            messages=[{
                "role": "user",
                "content": f"Recipe: {recipe_name}\nIngredients:\n{ingredient_list}",
            }],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {
                            "calories": {"type": "number"},
                            "protein": {"type": "number"},
                            "carbs": {"type": "number"},
                            "fat": {"type": "number"},
                        },
                        "required": ["calories", "protein", "carbs", "fat"],
                        "additionalProperties": False,
                    },
                }
            },
        )
        text = next(b.text for b in response.content if b.type == "text")
        nutrition = json.loads(text)
        nutrition_cache.set(recipe_id, nutrition)
        return nutrition
    except Exception as e:
        print(f"Error estimating nutrition: {e}")
        return {}


async def generate_weekly_insights(activity: List[ActivityEntry], streak_days: int, recipes_explored: int) -> Dict:
    """Compile a week of user activity into a 3-bullet insight summary."""
    lines = []
    for entry in activity:
        macros = ""
        if entry.calories is not None:
            macros = f" ({entry.calories:.0f} kcal, {entry.protein or 0:.0f}g protein, {entry.carbs or 0:.0f}g carbs, {entry.fat or 0:.0f}g fat)"
        lines.append(f"- {entry.date}: {entry.action} '{entry.recipe_name}'{macros}")

    activity_log = "\n".join(lines) if lines else "(no activity recorded this week)"

    response = await client.messages.create(
        model=INSIGHTS_MODEL,
        max_tokens=1024,
        system=(
            "You are a nutrition coach analyzing a user's weekly activity in a recipe app. "
            "Given their recipe activity log, produce exactly three concise, specific, encouraging insights: "
            "1) went_well: what went well this week, "
            "2) bottleneck: where the main bottleneck or gap was, "
            "3) adjustment: the single best adjustment for next week. "
            "Each insight is one sentence, grounded in the actual data. If data is sparse, "
            "say so honestly and suggest how to build the habit."
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Weekly activity log:\n{activity_log}\n\n"
                f"Current streak: {streak_days} days\n"
                f"Total recipes explored: {recipes_explored}"
            ),
        }],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": {
                    "type": "object",
                    "properties": {
                        "went_well": {"type": "string"},
                        "bottleneck": {"type": "string"},
                        "adjustment": {"type": "string"},
                    },
                    "required": ["went_well", "bottleneck", "adjustment"],
                    "additionalProperties": False,
                },
            }
        },
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)
