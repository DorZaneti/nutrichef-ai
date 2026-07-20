from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_device_id, get_session
from app.models import ActivityEntryRow, DeviceState
from app.schemas import SyncActivityRequest, SyncIngredientsRequest

router = APIRouter()


@router.post("/api/sync/activity")
async def push_activity(
    sync_request: SyncActivityRequest,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    if not sync_request.entries:
        return {"synced": 0, "total": 0}

    rows = [
        {
            "device_id": device_id,
            "date": entry.date,
            "recipe_name": entry.recipe_name,
            "action": entry.action,
            "calories": entry.calories,
            "protein": entry.protein,
            "carbs": entry.carbs,
            "fat": entry.fat,
        }
        for entry in sync_request.entries
    ]

    # ON CONFLICT DO NOTHING makes repeated pushes of the same entries a no-op,
    # so the client can retry a flush after a dropped connection safely.
    stmt = sqlite_insert(ActivityEntryRow).values(rows).on_conflict_do_nothing(
        index_elements=["device_id", "date", "recipe_name", "action"]
    )
    result = await session.execute(stmt)
    await session.commit()
    return {"synced": result.rowcount, "total": len(rows)}


@router.get("/api/sync/activity")
async def pull_activity(
    since: Optional[str] = None,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    query = select(ActivityEntryRow).where(ActivityEntryRow.device_id == device_id)
    if since:
        query = query.where(ActivityEntryRow.date >= since)
    result = await session.execute(query)
    rows = result.scalars().all()
    return {
        "entries": [
            {
                "date": row.date,
                "recipe_name": row.recipe_name,
                "action": row.action,
                "calories": row.calories,
                "protein": row.protein,
                "carbs": row.carbs,
                "fat": row.fat,
            }
            for row in rows
        ]
    }


@router.put("/api/sync/ingredients")
async def put_ingredients(
    sync_request: SyncIngredientsRequest,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    existing = await session.get(DeviceState, device_id)
    # Last-write-wins: only accept the incoming write if it's not older than
    # what's already stored, so an out-of-order sync can't clobber a newer edit.
    if existing is not None and existing.updated_at > sync_request.updated_at:
        return {"written": False, "updated_at": existing.updated_at}

    ingredients_json = [ing.model_dump() for ing in sync_request.ingredients]
    if existing is None:
        session.add(
            DeviceState(
                device_id=device_id,
                ingredients_json=ingredients_json,
                updated_at=sync_request.updated_at,
            )
        )
    else:
        existing.ingredients_json = ingredients_json
        existing.updated_at = sync_request.updated_at
    await session.commit()
    return {"written": True, "updated_at": sync_request.updated_at}


@router.get("/api/sync/ingredients")
async def get_ingredients(
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    state = await session.get(DeviceState, device_id)
    if state is None:
        raise HTTPException(status_code=404, detail="No stored ingredients for this device")
    return {"ingredients": state.ingredients_json, "updated_at": state.updated_at}
