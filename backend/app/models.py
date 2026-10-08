from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ActivityEntryRow(Base):
    __tablename__ = "activity_entries"
    __table_args__ = (
        UniqueConstraint("device_id", "date", "recipe_name", "action", name="uq_activity_entry"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), index=True)
    date: Mapped[str] = mapped_column(String)
    recipe_name: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    calories: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    protein: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbs: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    # Portions eaten; macros above are already scaled by it.
    servings: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DeviceState(Base):
    __tablename__ = "device_state"

    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), primary_key=True)
    ingredients_json: Mapped[list] = mapped_column(JSON)
    updated_at: Mapped[str] = mapped_column(String)


class WeeklyInsight(Base):
    __tablename__ = "weekly_insights"

    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), primary_key=True)
    week_start: Mapped[str] = mapped_column(String, primary_key=True)
    went_well: Mapped[str] = mapped_column(String)
    bottleneck: Mapped[str] = mapped_column(String)
    adjustment: Mapped[str] = mapped_column(String)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FoodNutrient(Base):
    """USDA FoodData Central lookups, cached per query so restarts don't re-spend the rate limit."""

    __tablename__ = "food_nutrients"

    query: Mapped[str] = mapped_column(String, primary_key=True)
    fdc_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # Per 100g. All None when USDA had no match (a cached miss).
    calories: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    protein: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbs: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Profile(Base):
    __tablename__ = "profiles"

    device_id: Mapped[str] = mapped_column(ForeignKey("devices.id"), primary_key=True)
    data_json: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
