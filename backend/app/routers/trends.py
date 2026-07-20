from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import TTLCache
from app.db import get_device_id, get_session
from app.models import ActivityEntryRow
from app.services.analytics import daily_aggregates, linear_projection, moving_average
from app.services.patterns import detect_patterns

router = APIRouter()

# Suggestions are rule-based over recent activity, cheap but not free —
# 1h/device is plenty fresh without recomputing on every Insights tab open.
suggestions_cache = TTLCache(ttl_seconds=60 * 60, max_entries=256)


@router.get("/api/trends")
async def get_trends(
    days: int = 90,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    daily = await daily_aggregates(session, device_id, days)
    calories_series = [d["calories"] for d in daily]

    smoothed = moving_average(calories_series, 7)
    for day, avg in zip(daily, smoothed):
        day["calories_smoothed"] = round(avg, 1)

    projection_values = linear_projection(calories_series, horizon=7)
    last_date = datetime.fromisoformat(daily[-1]["date"]).date() if daily else datetime.utcnow().date()
    projection = [
        {"date": (last_date + timedelta(days=i)).isoformat(), "calories": round(value, 1)}
        for i, value in enumerate(projection_values, start=1)
    ]

    recent = calories_series[-7:]
    stats = {
        "avg_calories_7d": round(sum(recent) / len(recent), 1) if recent else 0,
        "days_tracked": len(daily),
    }

    return {"daily": daily, "projection": projection, "stats": stats}


@router.get("/api/suggestions")
async def get_suggestions(
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    cached = suggestions_cache.get(device_id)
    if cached is not None:
        return {"suggestions": cached}

    cutoff = (datetime.utcnow().date() - timedelta(days=28)).isoformat()
    query = select(ActivityEntryRow).where(
        ActivityEntryRow.device_id == device_id,
        ActivityEntryRow.date >= cutoff,
    )
    result = await session.execute(query)
    entries = [
        {
            "date": row.date,
            "recipe_name": row.recipe_name,
            "action": row.action,
            "calories": row.calories,
            "protein": row.protein,
            "carbs": row.carbs,
            "fat": row.fat,
        }
        for row in result.scalars().all()
    ]

    suggestions = detect_patterns(entries)[:2]
    suggestions_cache.set(device_id, suggestions)
    return {"suggestions": suggestions}
