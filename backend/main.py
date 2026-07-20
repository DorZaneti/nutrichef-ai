import asyncio
import os
import webbrowser
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGIN_REGEX, ALLOWED_ORIGINS, ANTHROPIC_API_KEY
from app.db import init_db
from app.routers import chat, insights, recipes, sync, trends


async def open_browser():
    await asyncio.sleep(1)
    webbrowser.open("http://localhost:3000")
    print("🌐 Opening http://localhost:3000 ...")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Render (and most PaaS hosts) set RENDER/CI-style env vars; only pop a
    # browser when running on a developer machine.
    if not os.getenv("RENDER"):
        asyncio.create_task(open_browser())
    yield


app = FastAPI(title="NutriChef AI API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(recipes.router)
app.include_router(insights.router)
app.include_router(sync.router)
app.include_router(trends.router)


@app.get("/")
def read_root():
    return {
        "message": "NutriChef AI API is running!",
        "powered_by": "Claude + TheMealDB",
        "endpoints": {
            "chat": "/api/chat",
            "recipes": "/api/recipes",
            "recipe_details": "/api/recipe/{id}",
            "insights": "/api/insights",
        },
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "anthropic_configured": bool(ANTHROPIC_API_KEY),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
