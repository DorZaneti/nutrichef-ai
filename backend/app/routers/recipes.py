import asyncio

from fastapi import APIRouter, HTTPException

from app.schemas import BatchDetailsRequest, RecipeRequest
from app.services.mealdb import get_recipe_details, search_recipes_by_ingredients

router = APIRouter()


@router.post("/api/recipes")
async def get_recipes(recipe_request: RecipeRequest):
    try:
        if not recipe_request.ingredients:
            return {"recipes": [], "count": 0}

        recipes = await search_recipes_by_ingredients(recipe_request.ingredients, number=10)
        return {"recipes": recipes, "count": len(recipes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/recipes/details")
async def get_recipes_details_batch(batch_request: BatchDetailsRequest):
    try:
        ids = batch_request.ids[:10]
        results = await asyncio.gather(*[get_recipe_details(rid) for rid in ids])
        return {"details": {rid: details for rid, details in zip(ids, results) if details is not None}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/recipe/{recipe_id}")
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
