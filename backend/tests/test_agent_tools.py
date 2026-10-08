import asyncio

import pytest

from app.schemas import Ingredient, TodayTotals
from app.services.agent_tools import AgentContext, ToolInputError, run_tool


def _ctx():
    return AgentContext(ingredients=[Ingredient(name="Rice", weight_grams=200)], profile=None,
                        today_totals=TodayTotals(calories=500, protein=20))


def test_update_ingredients_emits_action_and_updates_pantry():
    ctx = _ctx()
    result = asyncio.run(run_tool(ctx, "update_ingredients", {
        "add": [{"name": "chicken breast", "grams": 300}, {"name": "rice", "grams": 100}],
        "remove": [],
    }))
    assert result["pantry"] == ["Rice (300g)", "chicken breast (300g)"]
    assert ctx.actions == [{
        "type": "update_ingredients",
        "add": [{"name": "chicken breast", "weight_grams": 300.0}, {"name": "rice", "weight_grams": 100.0}],
        "remove": [],
    }]


def test_log_free_form_meal_updates_today_totals():
    ctx = _ctx()
    result = asyncio.run(run_tool(ctx, "log_meal", {
        "name": "150g salmon", "servings": 1, "calories": 312, "protein": 30.6, "carbs": 0, "fat": 20,
    }))
    assert result["today_total"] == {"calories": 812, "protein": 51}
    assert ctx.actions[0]["entry"]["recipe_name"] == "150g salmon"


@pytest.mark.parametrize("name,args", [
    ("log_meal", {"name": "x", "servings": 1}),               # no nutrition, no recipe
    ("log_meal", {"name": "x", "servings": 0, "calories": 1}),
    ("update_ingredients", {"add": [{"name": "egg", "grams": "two"}]}),
    ("lookup_nutrition", {"food": "", "grams": 100}),
    ("nonexistent_tool", {}),
])
def test_invalid_inputs_raise_tool_input_error(name, args):
    with pytest.raises(ToolInputError):
        asyncio.run(run_tool(_ctx(), name, args))
