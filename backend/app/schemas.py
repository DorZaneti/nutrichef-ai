from typing import Dict, List, Optional

from pydantic import BaseModel


class Ingredient(BaseModel):
    name: str
    weight_grams: float


class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[Dict]] = []
    current_ingredients: Optional[List[Ingredient]] = []


class RecipeRequest(BaseModel):
    ingredients: List[str]


class BatchDetailsRequest(BaseModel):
    ids: List[str]


class ActivityEntry(BaseModel):
    date: str
    recipe_name: str
    action: str  # "viewed" | "cooked"
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None


class InsightsRequest(BaseModel):
    activity: List[ActivityEntry]
    streak_days: int = 0
    recipes_explored: int = 0


class SyncActivityRequest(BaseModel):
    entries: List[ActivityEntry]


class SyncIngredientsRequest(BaseModel):
    ingredients: List[Ingredient]
    updated_at: str
