"""Backend settings: server address, file locations, and which frontend addresses may call the API.

HOST, PORT and RELOAD can be overridden with environment variables
(API_HOST, API_PORT, API_RELOAD) without editing this file.
"""

import os

from backend.scenario_loader import SCENARIO_DIR

# Server (used by backend/server.py)
HOST = os.getenv("API_HOST", "127.0.0.1")
PORT = int(os.getenv("API_PORT", "8000"))
RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"

PERSONALITIES_FILE = SCENARIO_DIR / "personalities.json"

# Frontend addresses allowed to call this API (CORS): the Vite dev server on
# localhost, on any port (Vite moves to 5174, 5175, ... when 5173 is busy).
FRONTEND_ORIGIN_REGEX = r"^http://(localhost|127\.0\.0\.1)(:\d+)?$"

API_TITLE = "Multi-Agent Negotiation Simulator API"
API_VERSION = "0.1.0"
