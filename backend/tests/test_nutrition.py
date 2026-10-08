from app.services.nutrition import MIN_MATCH_SCORE, aggregate, confidence_for, match_score, parse_usda_food

CHICKEN_SEARCH_HIT = {
    "fdcId": 2646170,
    "description": "Chicken, breast, boneless, skinless, raw",
    "foodNutrients": [
        {"nutrientId": 1004, "value": 1.93, "unitName": "G"},
        {"nutrientId": 1003, "value": 22.5, "unitName": "G"},
        {"nutrientId": 1005, "value": 0.0, "unitName": "G"},
        {"nutrientId": 2047, "value": 106, "unitName": "KCAL"},
        {"nutrientId": 2048, "value": 112, "unitName": "KCAL"},
    ],
}


def test_parse_usda_food_prefers_specific_atwater_energy():
    parsed = parse_usda_food(CHICKEN_SEARCH_HIT)
    assert parsed == {"calories": 112.0, "protein": 22.5, "fat": 1.93, "carbs": 0.0}


def test_parse_usda_food_uses_1008_and_ignores_kilojoules():
    food = {"foodNutrients": [
        {"nutrientId": 1008, "value": 1500, "unitName": "kJ"},
        {"nutrientId": 2047, "value": 360, "unitName": "KCAL"},
        {"nutrientId": 1003, "value": 7, "unitName": "G"},
    ]}
    assert parse_usda_food(food)["calories"] == 360


def test_parse_usda_food_without_energy_is_none():
    assert parse_usda_food({"foodNutrients": [{"nutrientId": 1003, "value": 5, "unitName": "G"}]}) is None


def test_aggregate_sums_grams_and_divides_by_servings():
    items = [
        {"line": "400g chicken", "grams": 400, "estimate_per_100g": {}},
        {"line": "200g rice", "grams": 200, "estimate_per_100g": {}},
    ]
    lookups = [
        {"calories": 112, "protein": 22.5, "carbs": 0, "fat": 2},
        {"calories": 360, "protein": 7, "carbs": 80, "fat": 1},
    ]
    result = aggregate(items, lookups, servings=2)
    assert result["total"] == {"calories": 1168.0, "protein": 104.0, "carbs": 160.0, "fat": 10.0}
    assert result["per_serving"] == {"calories": 584.0, "protein": 52.0, "carbs": 80.0, "fat": 5.0}
    assert result["confidence"] == "high"
    assert [b["source"] for b in result["breakdown"]] == ["usda", "usda"]


def test_aggregate_falls_back_to_estimate_and_lowers_confidence():
    items = [
        {"line": "100g chicken", "grams": 100, "estimate_per_100g": {}},
        {"line": "100g mystery sauce", "grams": 100,
         "estimate_per_100g": {"calories": 200, "protein": 0, "carbs": 40, "fat": 5}},
    ]
    result = aggregate(items, [{"calories": 112, "protein": 22.5, "carbs": 0, "fat": 2}, None], servings=1)
    assert result["total"]["calories"] == 312.0
    assert result["usda_share"] == 0.5
    assert result["confidence"] == "low"
    assert result["breakdown"][1]["source"] == "estimate"


def test_aggregate_guards_zero_servings():
    result = aggregate([{"line": "x", "grams": 100, "estimate_per_100g": {}}],
                       [{"calories": 100, "protein": 0, "carbs": 0, "fat": 0}], servings=0)
    assert result["servings"] == 1
    assert result["per_serving"]["calories"] == 100.0


def test_confidence_thresholds():
    assert confidence_for(0.85) == "high"
    assert confidence_for(0.84) == "medium"
    assert confidence_for(0.60) == "medium"
    assert confidence_for(0.59) == "low"


def test_match_score_rejects_unrelated_usda_hits():
    query = "vegetables mixed stir-fry"
    assert match_score(query, "Vegetables, mixed, frozen, unprepared") > match_score(query, "Salsify, (vegetable oyster), raw")
    assert match_score("chicken breast raw", "Chicken, breast, boneless, skinless, raw") >= 1.5
    assert match_score("soy sauce", "Soy sauce made from soy (tamari)") >= 1.5
    assert match_score("cornstarch", "Salsify, (vegetable oyster), raw") < MIN_MATCH_SCORE
