import os

import anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.")

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

THEMEALDB_BASE = "https://www.themealdb.com/api/json/v1/1"

CHAT_MODEL = "claude-sonnet-4-6"
FAST_MODEL = "claude-haiku-4-5"
INSIGHTS_MODEL = "claude-opus-4-8"

ALLOWED_ORIGINS = [f"http://localhost:{port}" for port in (3000, 3001, 3002, 3003, 3004, 3005, 5173)]

# Extra production origins, comma-separated (e.g. a custom domain).
_extra_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS += [o.strip() for o in _extra_origins.split(",") if o.strip()]

# The deployed frontend lives on *.onrender.com; override to tighten.
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.onrender\.com")
