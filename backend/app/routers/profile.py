from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_device_id, get_session
from app.models import Profile as ProfileRow
from app.routers.trends import suggestions_cache
from app.schemas import Profile
from app.services.targets import daily_targets

router = APIRouter()


@router.get("/api/profile")
async def get_profile(
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    row = await session.get(ProfileRow, device_id)
    if row is None:
        raise HTTPException(status_code=404, detail="No profile for this device")
    profile = Profile(**row.data_json)
    return {"profile": profile.model_dump(), "targets": daily_targets(profile)}


@router.put("/api/profile")
async def put_profile(
    profile: Profile,
    device_id: str = Depends(get_device_id),
    session: AsyncSession = Depends(get_session),
):
    row = await session.get(ProfileRow, device_id)
    if row is None:
        session.add(ProfileRow(device_id=device_id, data_json=profile.model_dump(), updated_at=datetime.utcnow()))
    else:
        row.data_json = profile.model_dump()
        row.updated_at = datetime.utcnow()
    await session.commit()
    # Suggestions depend on the protein target — recompute on next request.
    suggestions_cache.pop(device_id)
    return {"profile": profile.model_dump(), "targets": daily_targets(profile)}
