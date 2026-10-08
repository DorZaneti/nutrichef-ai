from app.services.nutrition import aggregate, confidence_for, is_branded, parse_usda_food, rank_candidates

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


def _hit(description, kcal):
    return {"fdcId": 1, "description": description, "foodNutrients": [{"nutrientId": 1008, "value": kcal, "unitName": "KCAL"}]}


def test_rank_candidates_drops_unrelated_and_sorts_branded_last():
    foods = [
        _hit("Rice, brown, parboiled, cooked, UNCLE BENS", 147),
        _hit("Salsify, (vegetable oyster), raw", 82),
        _hit("Rice, brown, long-grain, cooked", 123),
        {"fdcId": 2, "description": "Rice, brown, no energy listed", "foodNutrients": []},
    ]
    ranked = [c["description"] for c in rank_candidates("rice brown cooked", foods)]
    assert ranked == ["Rice, brown, long-grain, cooked", "Rice, brown, parboiled, cooked, UNCLE BENS"]


def test_is_branded():
    assert is_branded("Soup, SWANSON, vegetable broth")
    assert not is_branded("Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)")


def test_lookup_foods_flow(tmp_path, monkeypatch):
    import asyncio

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    import app.db as db
    import app.services.nutrition as nutrition
    from app.cache import TTLCache

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(nutrition, "async_session_maker", async_sessionmaker(engine, expire_on_commit=False))
    monkeypatch.setattr(nutrition, "food_cache", TTLCache(ttl_seconds=60))

    rice = {"fdc_id": 1, "description": "Rice, brown, long-grain, cooked", "calories": 123.0,
            "protein": 2.7, "carbs": 25.6, "fat": 1.0}
    searched, chosen_calls = [], []

    async def fake_candidates(http, query):
        searched.append(query)
        if query == "rate limited":
            raise RuntimeError("429")
        return [] if query == "unobtainium" else [rice]

    async def fake_choose(requests):
        chosen_calls.append([r["query"] for r in requests])
        return [r["candidates"][0] for r in requests]

    monkeypatch.setattr(nutrition, "usda_candidates", fake_candidates)
    monkeypatch.setattr(nutrition, "choose_matches", fake_choose)

    items = [
        {"line": "3 cups brown rice", "query": "Rice brown cooked"},
        {"line": "1 cup water", "query": "water"},
        {"line": "a pinch of unobtainium", "query": "unobtainium"},
        {"line": "salt", "query": "rate limited"},
    ]

    async def run():
        await db.init_db()
        first = await nutrition.lookup_foods(None, items)
        second = await nutrition.lookup_foods(None, items[:3])
        return first, second

    first, second = asyncio.run(run())
    assert first[0]["description"] == rice["description"]
    assert first[1]["calories"] == 0.0                # water never hits USDA
    assert first[2] is None                           # no candidates → real miss
    assert isinstance(first[3], RuntimeError)         # transient failure surfaced, not cached
    assert chosen_calls == [["Rice brown cooked"]]    # one Claude call, only for items with candidates
    assert second[0]["description"] == rice["description"] and second[2] is None
    assert searched == ["rice brown cooked", "unobtainium", "rate limited"]  # second run fully cached
