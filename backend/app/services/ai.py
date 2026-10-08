import json
import re
from typing import Dict, List, Optional

from app.cache import translation_cache
from app.config import FAST_MODEL, INSIGHTS_MODEL, REFUSAL_FALLBACK, client
from app.schemas import ActivityEntry

_NON_LATIN = re.compile(r"[^\x00-\x7f]")


async def translate_to_english(names: List[str]) -> List[str]:
    """English food names for search APIs. ASCII names pass through; the rest go to Claude once, then cached."""
    pending = [n for n in dict.fromkeys(names) if _NON_LATIN.search(n) and translation_cache.get(n) is None]
    if pending:
        try:
            response = await client.messages.create(
                model=FAST_MODEL,
                max_tokens=4000,
                system=(
                    "Translate each food/ingredient name to its common English name as used in recipes "
                    "(e.g. 'חזה עוף' -> 'chicken breast'). Keep the same order and count."
                ),
                messages=[{"role": "user", "content": json.dumps(pending, ensure_ascii=False)}],
                output_config={
                    "effort": "low",
                    "format": {
                        "type": "json_schema",
                        "schema": {
                            "type": "object",
                            "properties": {"english": {"type": "array", "items": {"type": "string"}}},
                            "required": ["english"],
                            "additionalProperties": False,
                        },
                    },
                },
            )
            text = next(b.text for b in response.content if b.type == "text")
            english = json.loads(text)["english"]
            if len(english) == len(pending):
                for original, translated in zip(pending, english):
                    translation_cache.set(original, translated.strip().lower())
        except Exception as e:
            print(f"Error translating ingredient names: {e}")
    return [translation_cache.get(n) or n for n in names]


async def generate_weekly_insights(
    activity: List[ActivityEntry],
    streak_days: int,
    recipes_explored: int,
    targets: Optional[Dict[str, Optional[float]]] = None,
    language: str = "en",
) -> Dict:
    """Compile a week of user activity into a 3-bullet insight summary."""
    lines = []
    for entry in activity:
        macros = ""
        if entry.calories is not None:
            portion = f"{entry.servings:g} serving(s), " if entry.servings else ""
            macros = f" ({portion}{entry.calories:.0f} kcal, {entry.protein or 0:.0f}g protein, {entry.carbs or 0:.0f}g carbs, {entry.fat or 0:.0f}g fat)"
        action = "ate" if entry.action == "cooked" else entry.action
        lines.append(f"- {entry.date}: {action} '{entry.recipe_name}'{macros}")

    activity_log = "\n".join(lines) if lines else "(no activity recorded this week)"

    target_lines = ""
    if targets and (targets.get("daily_kcal") or targets.get("daily_protein_g")):
        target_lines = (
            f"\nDaily targets: {targets.get('daily_kcal') or 'not set'} kcal, "
            f"{targets.get('daily_protein_g') or 'not set'}g protein"
        )

    response = await client.messages.create(
        model=INSIGHTS_MODEL,
        max_tokens=8000,
        **REFUSAL_FALLBACK,
        system=(
            "You are a nutrition coach analyzing a user's weekly activity in a recipe app. "
            "Given their recipe activity log, produce exactly three concise, specific, encouraging insights: "
            "1) went_well: what went well this week, "
            "2) bottleneck: where the main bottleneck or gap was, "
            "3) adjustment: the single best adjustment for next week. "
            "Each insight is one sentence, grounded in the actual data. Compare logged meals against the "
            "daily targets when they're given. If data is sparse, say so honestly and suggest how to build the habit."
            + (" Write all three insights in Hebrew." if language == "he" else "")
        ),
        messages=[{
            "role": "user",
            "content": (
                f"Weekly activity log:\n{activity_log}\n\n"
                f"Current streak: {streak_days} days\n"
                f"Total recipes explored: {recipes_explored}"
                f"{target_lines}"
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
