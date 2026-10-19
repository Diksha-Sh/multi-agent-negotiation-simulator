"""GET /api/personalities: the three personalities."""

import json
from typing import Any

from fastapi import APIRouter

from backend.config import PERSONALITIES_FILE

router = APIRouter(prefix="/api", tags=["personalities"])


@router.get("/personalities", summary="The three personalities")
def list_personalities() -> list[dict[str, Any]]:
    with open(PERSONALITIES_FILE, encoding="utf-8-sig") as f:
        return json.load(f)
