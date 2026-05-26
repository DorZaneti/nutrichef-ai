from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import json
import asyncio
import httpx
import anthropic
import webbrowser
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="NutriChef AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:3004", "http://localhost:3005"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.")

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

THEMEALDB_BASE = "https://www.themealdb.com/api/json/v1/1"


# Pydantic models
class Ingredient(BaseModel):
    name: str
    weight_grams: float

class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[Dict]] = []
    current_ingredients: Optional[List[Ingredient]] = []

class RecipeRequest(BaseModel):
    ingredients: List[str]


# ============================================
# THEMEALDB API FUNCTIONS
# ============================================

async def _fetch_meal_card(http: httpx.AsyncClient, meal_id: str, user_ingredients: List[str]) -> Optional[Dict]:
    """Fetch a single meal and compute ingredient match."""
    try:
        r = await http.get(f"{THEMEALDB_BASE}/lookup.php", params={"i": meal_id})
        data = r.json()
        if not data.get("meals"):
            return None
        meal = data["meals"][0]

        meal_ings = []
        for i in range(1, 21):
            ing = meal.get(f"strIngredient{i}", "") or ""
            if ing.strip():
                meal_ings.append(ing.strip().lower())

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


async def search_recipes_by_ingredients(ingredients: List[str], number: int = 10) -> List[Dict]:
    """Search TheMealDB by up to 3 ingredients, merge and rank results."""
    meal_hit_count: Dict[str, int] = {}

    async with httpx.AsyncClient(timeout=10) as http:
        search_terms = [normalize_for_search(ing) for ing in ingredients[:3]]
        tasks = [http.get(f"{THEMEALDB_BASE}/filter.php", params={"i": ing}) for ing in search_terms]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for resp in responses:
            if isinstance(resp, Exception):
                continue
            data = resp.json()
            if data.get("meals"):
                for meal in data["meals"]:
                    mid = meal["idMeal"]
                    meal_hit_count[mid] = meal_hit_count.get(mid, 0) + 1

    if not meal_hit_count:
        return []

    sorted_ids = sorted(meal_hit_count, key=lambda x: meal_hit_count[x], reverse=True)

    async with httpx.AsyncClient(timeout=15) as http:
        detail_tasks = [
            _fetch_meal_card(http, mid, ingredients)
            for mid in sorted_ids[:number]
        ]
        results = await asyncio.gather(*detail_tasks)

    valid = [r for r in results if r is not None]
    valid.sort(key=lambda x: x["match_percentage"], reverse=True)
    return valid


async def estimate_nutrition(recipe_name: str, ingredients: List[str]) -> Dict:
    """Use Claude to estimate nutrition for a recipe based on its name and ingredients."""
    try:
        ingredient_list = "\n".join(ingredients[:15])
        response = await client.messages.create(
            model="claude-haiku-4-5",
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
        return json.loads(text)
    except Exception as e:
        print(f"Error estimating nutrition: {e}")
        return {}


async def get_recipe_details(recipe_id: str) -> Optional[Dict]:
    """Get full recipe details from TheMealDB."""
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.get(f"{THEMEALDB_BASE}/lookup.php", params={"i": recipe_id})
            data = r.json()

        if not data.get("meals"):
            return None
        meal = data["meals"][0]

        ingredients = []
        for i in range(1, 21):
            ing = (meal.get(f"strIngredient{i}") or "").strip()
            measure = (meal.get(f"strMeasure{i}") or "").strip()
            if ing:
                ingredients.append(f"{measure} {ing}".strip())

        raw_instructions = meal.get("strInstructions") or ""
        instructions = [s.strip() for s in raw_instructions.splitlines() if s.strip()]

        nutrition = await estimate_nutrition(meal["strMeal"], ingredients)

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


# ============================================
# AI AGENT WITH CLAUDE
# ============================================

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
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        return next(b.text for b in response.content if b.type == "text")
    except Exception as e:
        print(f"Error with Claude API: {e}")
        return "I'm having trouble thinking right now. Please try again!"


async def extract_ingredients_from_message(user_message: str) -> List[Dict]:
    try:
        response = await client.messages.create(
            model="claude-haiku-4-5",
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


# ============================================
# API ENDPOINTS
# ============================================

@app.get("/")
def read_root():
    return {
        "message": "NutriChef AI API is running!",
        "powered_by": "Claude + TheMealDB",
        "endpoints": {
            "chat": "/api/chat",
            "recipes": "/api/recipes",
            "recipe_details": "/api/recipe/{id}",
        },
    }


@app.post("/api/chat")
async def chat(chat_request: ChatMessage):
    try:
        response_text = await run_chat_agent(
            chat_request.message,
            chat_request.conversation_history,
            chat_request.current_ingredients,
        )
        extracted_ingredients = await extract_ingredients_from_message(chat_request.message)

        new_history = chat_request.conversation_history.copy()
        new_history.append({"role": "user", "content": chat_request.message})
        new_history.append({"role": "assistant", "content": response_text})

        return {
            "response": response_text,
            "conversation_history": new_history,
            "extracted_ingredients": extracted_ingredients,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recipes")
async def get_recipes(recipe_request: RecipeRequest):
    try:
        if not recipe_request.ingredients:
            return {"recipes": [], "count": 0}

        recipes = await search_recipes_by_ingredients(recipe_request.ingredients, number=10)
        return {"recipes": recipes, "count": len(recipes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/recipe/{recipe_id}")
async def get_recipe_full_details(recipe_id: str):
    try:
        details = await get_recipe_details(recipe_id)
        if not details:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
    }


@app.on_event("startup")
async def open_browser():
    await asyncio.sleep(1)
    webbrowser.open("http://localhost:3000")
    print("🌐 Opening http://localhost:3000 ...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
