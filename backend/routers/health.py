"""GET /api/health: check the API is running."""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health", summary="Check the API is running")
def health() -> dict[str, str]:
    return {"status": "ok"}
