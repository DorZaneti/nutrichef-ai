import asyncio
import sqlite3

from sqlalchemy.ext.asyncio import create_async_engine

import app.db as db
import app.models  # noqa: F401 — registers tables on Base


def test_init_db_adds_servings_column_to_old_table(tmp_path, monkeypatch):
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as conn:
        conn.execute(
            "CREATE TABLE activity_entries (id INTEGER PRIMARY KEY, device_id VARCHAR, date VARCHAR, "
            "recipe_name VARCHAR, action VARCHAR, calories FLOAT, protein FLOAT, carbs FLOAT, fat FLOAT, "
            "created_at DATETIME)"
        )
    monkeypatch.setattr(db, "engine", create_async_engine(f"sqlite+aiosqlite:///{path}"))

    asyncio.run(db.init_db())
    asyncio.run(db.init_db())  # idempotent

    with sqlite3.connect(path) as conn:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(activity_entries)")}
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert "servings" in columns
    assert {"food_nutrients", "profiles"} <= tables
