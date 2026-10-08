import os

import anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.")

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

THEMEALDB_BASE = "https://www.themealdb.com/api/json/v1/1"

# USDA FoodData Central — free key from https://api.data.gov/signup/.
# DEMO_KEY works but is limited to ~30 requests/hour per IP.
USDA_API_KEY = os.getenv("USDA_API_KEY", "").strip().strip("'\"") or "DEMO_KEY"
USDA_BASE = "https://api.nal.usda.gov/fdc/v1"

CHAT_MODEL = "claude-sonnet-5-5"
FAST_MODEL = "claude-haiku-5-5"
# A three-sentence weekly summary doesn't need a bigger model.
INSIGHTS_MODEL = FAST_MODEL

# Public-demo cost guards (see app/limits.py). Override via env vars.
CHAT_LIMIT_PER_IP = int(os.getenv("CHAT_LIMIT_PER_IP", "20"))  # chat messages per IP per day
INSIGHTS_LIMIT_PER_IP = int(os.getenv("INSIGHTS_LIMIT_PER_IP", "3"))  # fresh insight generations
RECIPES_LIMIT_PER_IP = int(os.getenv("RECIPES_LIMIT_PER_IP", "100"))  # recipe search/details requests
DAILY_MAIN_CALLS = int(os.getenv("DAILY_MAIN_CALLS", "200"))  # app-wide Claude calls on CHAT_MODEL
DAILY_FAST_CALLS = int(os.getenv("DAILY_FAST_CALLS", "1000"))  # app-wide Claude calls on FAST_MODEL
CHAT_MAX_CHARS = 500
CHAT_HISTORY_MESSAGES = 10  # most recent history messages resent to Claude each turn

# Server-side refusal fallback (Claude API only): if the model declines on a
# safety policy, the API reruns the same request on a fallback model it picks
# by refusal category. Not available for Haiku.
REFUSAL_FALLBACK = {
    "extra_headers": {"anthropic-beta": "server-side-fallback-2026-07-01"},
    "extra_body": {"fallbacks": "default"},
}

ALLOWED_ORIGINS = [f"http://localhost:{port}" for port in (3000, 3001, 3002, 3003, 3004, 3005, 5173)]

# Extra production origins, comma-separated (e.g. a custom domain).
_extra_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS += [o.strip() for o in _extra_origins.split(",") if o.strip()]

# The deployed frontend lives on *.onrender.com; override to tighten.
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.onrender\.com")
