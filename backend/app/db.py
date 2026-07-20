import os
import uuid
from datetime import datetime
from typing import AsyncGenerator

from fastapi import Depends, Header, HTTPException
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./nutrichef.db")

engine = create_async_engine(DATABASE_URL, echo=False)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def get_device_id(
    x_device_id: str = Header(..., alias="X-Device-Id"),
    session: AsyncSession = Depends(get_session),
) -> str:
    try:
        uuid.UUID(x_device_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="X-Device-Id must be a valid UUID")

    # Imported lazily to avoid a circular import (models.py imports Base from this module).
    from app.models import Device

    now = datetime.utcnow()
    # Atomic upsert: a device's first two requests can land concurrently (the
    # app fires several sync GETs on mount), and a plain get-then-insert races
    # both into an INSERT, so this must be a single statement, not read+write.
    stmt = (
        sqlite_insert(Device.__table__)
        .values(id=x_device_id, created_at=now, last_seen_at=now)
        .on_conflict_do_update(index_elements=["id"], set_={"last_seen_at": now})
    )
    await session.execute(stmt)
    await session.commit()
    return x_device_id
