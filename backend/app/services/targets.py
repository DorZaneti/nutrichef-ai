from typing import Dict, Optional

from app.schemas import Profile

# Mifflin–St Jeor BMR × activity factor = maintenance calories (TDEE).
# Mirrored in frontend/src/hooks/useProfile.js — keep the two in sync.
ACTIVITY_FACTORS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}
GOAL_CALORIE_FACTOR = {"lose": 0.8, "maintain": 1.0, "gain": 1.1}
# g protein per kg bodyweight: higher when cutting (spare muscle) or bulking (build it).
GOAL_PROTEIN_PER_KG = {"lose": 1.6, "maintain": 1.2, "gain": 1.6}


def bmr(sex: str, weight_kg: float, height_cm: float, age: int) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == "male" else base - 161


def daily_targets(profile: Optional[Profile]) -> Dict[str, Optional[float]]:
    """Daily kcal and protein targets. Values the user typed win over computed ones."""
    if profile is None:
        return {"daily_kcal": None, "daily_protein_g": None}

    kcal = protein = None
    if profile.sex and profile.weight_kg and profile.height_cm and profile.age:
        tdee = bmr(profile.sex, profile.weight_kg, profile.height_cm, profile.age) * ACTIVITY_FACTORS.get(
            profile.activity or "light", 1.375
        )
        kcal = round(tdee * GOAL_CALORIE_FACTOR[profile.goal])
        protein = round(profile.weight_kg * GOAL_PROTEIN_PER_KG[profile.goal])

    return {
        "daily_kcal": profile.daily_kcal or kcal,
        "daily_protein_g": profile.daily_protein_g or protein,
    }
