"""Analytics & Post-Interaction Summary Router (Milestone 4).

Endpoints:
- POST /api/summary: Generate comprehensive post-interaction report (Quality Score, Sentiment, Recommendations).
- POST /api/analytics: Aggregate cross-session analytics and deadlock pattern mining.
- GET /api/analytics: Retrieve baseline multi-session benchmark analytics.
- GET /api/analytics/demo-sessions: Realistic sessions played by the engine (dashboard demo data).
"""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Body

from backend.analytics import analyze_performance, generate_demo_sessions, get_sample_sessions
from backend.summary_agent import generate_post_interaction_summary

router = APIRouter(prefix="/api", tags=["analytics"])


@router.post("/summary", summary="Generate post-interaction summary, quality score, and recommendations")
def get_session_summary(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    """Generates an executive recap, quality score, sentiment journey, and personalized coaching."""
    config = payload.get("config") or {}
    history = payload.get("history") or []
    status = payload.get("status") or "accepted"
    winner = payload.get("winner")
    deadlock_event = payload.get("deadlock_event")

    return generate_post_interaction_summary(
        config=config,
        history=history,
        status=status,
        winner=winner,
        deadlock_event=deadlock_event,
    )


@router.post("/analytics", summary="Compute cross-session metrics across multiple negotiations")
def compute_analytics(payload: dict[str, Any] = Body(default_factory=dict)) -> dict[str, Any]:
    """Analyzes a collection of completed sessions to report agreement rates, deadlock causes, and trends."""
    sessions = payload.get("sessions") or []
    return analyze_performance(sessions)


@router.get("/analytics", summary="Fetch multi-session benchmark analytics")
def get_default_analytics() -> dict[str, Any]:
    """Returns pre-aggregated benchmark performance analytics across scenarios."""
    return analyze_performance(get_sample_sessions())


@router.get(
    "/analytics/demo-sessions",
    summary="Demo dataset: 30 real negotiations played by the rule-based engine",
)
def get_demo_sessions() -> dict[str, Any]:
    """All 3 scenarios x 9 personality pairings (+3 short Aggressive runs), in the same shape
    as saved history records, with turns and deadlock events. Used by the Performance
    Dashboard when a user has no saved sessions yet, and for the pitch demo."""
    sessions = generate_demo_sessions()
    return {"sessions": sessions, "analytics": analyze_performance(sessions)}
