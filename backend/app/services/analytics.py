from datetime import datetime, timedelta
from typing import Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActivityEntryRow

# Trend math lives here, in one place, so the Trends chart, suggestion
# detectors, and weekly insights all agree on the same numbers.


async def daily_aggregates(session: AsyncSession, device_id: str, days: int) -> List[Dict]:
    """Per-day nutrition sums from cooked recipes, most recent `days` days."""
    cutoff = (datetime.utcnow().date() - timedelta(days=days)).isoformat()
    query = (
        select(
            ActivityEntryRow.date,
            func.sum(ActivityEntryRow.calories).label("calories"),
            func.sum(ActivityEntryRow.protein).label("protein"),
            func.sum(ActivityEntryRow.carbs).label("carbs"),
            func.sum(ActivityEntryRow.fat).label("fat"),
        )
        .where(
            ActivityEntryRow.device_id == device_id,
            ActivityEntryRow.action == "cooked",
            ActivityEntryRow.date >= cutoff,
        )
        .group_by(ActivityEntryRow.date)
        .order_by(ActivityEntryRow.date)
    )
    result = await session.execute(query)
    return [
        {
            "date": row.date,
            "calories": row.calories or 0,
            "protein": row.protein or 0,
            "carbs": row.carbs or 0,
            "fat": row.fat or 0,
        }
        for row in result
    ]


def moving_average(values: List[float], window: int = 7) -> List[float]:
    """Trailing moving average — result[i] averages values[max(0,i-window+1):i+1]."""
    result = []
    for i in range(len(values)):
        chunk = values[max(0, i - window + 1) : i + 1]
        result.append(sum(chunk) / len(chunk))
    return result


def linear_projection(values: List[float], horizon: int = 7) -> List[float]:
    """Least-squares projection of the next `horizon` points, clamped >= 0.

    Plain Python is fine here — at most ~90 points, no numpy needed.
    """
    n = len(values)
    if n == 0:
        return [0.0] * horizon
    if n == 1:
        return [max(0.0, values[0])] * horizon

    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    denominator = sum((x - mean_x) ** 2 for x in xs)
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values)) / denominator if denominator else 0.0
    intercept = mean_y - slope * mean_x

    return [max(0.0, slope * (n + i) + intercept) for i in range(horizon)]
