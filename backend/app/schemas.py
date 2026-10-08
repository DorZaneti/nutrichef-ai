from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Ingredient(BaseModel):
    name: str
    weight_grams: float


class Profile(BaseModel):
    goal: Literal["lose", "maintain", "gain"] = "maintain"
    daily_kcal: Optional[float] = None
    daily_protein_g: Optional[float] = None
    diet: Literal["none", "vegetarian", "vegan", "pescatarian"] = "none"
    allergies: List[str] = Field(default_factory=list)
    language: Literal["en", "he"] = "en"
    # Optional body stats — when present, targets are computed from them.
    sex: Optional[Literal["male", "female"]] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity: Optional[Literal["sedentary", "light", "moderate", "active", "very_active"]] = None


class TodayTotals(BaseModel):
    calories: float = 0
    protein: float = 0


class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[Dict]] = []
    current_ingredients: Optional[List[Ingredient]] = []
    profile: Optional[Profile] = None
    today_totals: Optional[TodayTotals] = None


class RecipeRequest(BaseModel):
    ingredients: List[str]
    profile: Optional[Profile] = None


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
    servings: Optional[float] = None


class InsightsRequest(BaseModel):
    activity: List[ActivityEntry]
    streak_days: int = 0
    recipes_explored: int = 0
    profile: Optional[Profile] = None


class SyncActivityRequest(BaseModel):
    entries: List[ActivityEntry]


class SyncIngredientsRequest(BaseModel):
    ingredients: List[Ingredient]
    updated_at: str
