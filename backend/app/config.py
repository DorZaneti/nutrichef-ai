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
USDA_API_KEY = os.getenv("USDA_API_KEY", "DEMO_KEY")
USDA_BASE = "https://api.nal.usda.gov/fdc/v1"

CHAT_MODEL = "claude-sonnet-5-5"
FAST_MODEL = "claude-haiku-5-5"
INSIGHTS_MODEL = "claude-opus-5-5"

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
