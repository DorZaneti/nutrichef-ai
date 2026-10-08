import os
import sys
from pathlib import Path

# Importing app.config requires a key; tests never call the real API.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
