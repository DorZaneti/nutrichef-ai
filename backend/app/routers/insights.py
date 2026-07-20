from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import ActivityEntryRow, WeeklyInsight
from app.schemas import ActivityEntry, InsightsRequest
from app.services.ai import generate_weekly_insights

router = APIRouter()


def _iso_week_start(day: datetime) -> str:
    monday = day.date() - timedelta(days=day.weekday())
    return monday.isoformat()


@router.post("/api/insights")
async def weekly_insights(
    request: InsightsRequest,
    x_device_id: Optional[str] = Header(None, alias="X-Device-Id"),
    refresh: bool = Query(False),
    session: AsyncSession = Depends(get_session),
):
    try:
        if not x_device_id:
            # Deviceless path, unchanged: caller supplies its own activity log.
            insights = await generate_weekly_insights(
                request.activity,
                request.streak_days,
                request.recipes_explored,
            )
            return {"insights": insights}

        week_start = _iso_week_start(datetime.utcnow())

        if not refresh:
            cached = await session.get(WeeklyInsight, (x_device_id, week_start))
            if cached is not None:
                return {
                    "insights": {
                        "went_well": cached.went_well,
                        "bottleneck": cached.bottleneck,
                        "adjustment": cached.adjustment,
                    },
                    "cached": True,
                }

        query = select(ActivityEntryRow).where(
            ActivityEntryRow.device_id == x_device_id,
            ActivityEntryRow.date >= week_start,
        )
        result = await session.execute(query)
        activity = [
            ActivityEntry(
                date=row.date,
                recipe_name=row.recipe_name,
                action=row.action,
                calories=row.calories,
                protein=row.protein,
                carbs=row.carbs,
                fat=row.fat,
            )
            for row in result.scalars().all()
        ]

        insights = await generate_weekly_insights(activity, request.streak_days, request.recipes_explored)

        now = datetime.utcnow()
        stmt = (
            sqlite_insert(WeeklyInsight.__table__)
            .values(
                device_id=x_device_id,
                week_start=week_start,
                went_well=insights["went_well"],
                bottleneck=insights["bottleneck"],
                adjustment=insights["adjustment"],
                generated_at=now,
            )
            .on_conflict_do_update(
                index_elements=["device_id", "week_start"],
                set_={
                    "went_well": insights["went_well"],
                    "bottleneck": insights["bottleneck"],
                    "adjustment": insights["adjustment"],
                    "generated_at": now,
                },
            )
        )
        await session.execute(stmt)
        await session.commit()

        return {"insights": insights, "cached": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
