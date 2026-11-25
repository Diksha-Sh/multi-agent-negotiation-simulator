"""Post-Interaction Summary Agent (Milestone 4).

Generates comprehensive post-negotiation analysis:
1. Executive session summary and agreement recap.
2. Game-theoretic Resolution Quality Score (0-100) with multidimensional breakdown.
3. Sentiment journey timeline tracing emotional/tactical stance across rounds.
4. Personalized recommendations and coaching feedback (strengths, weaknesses, suggestions).
"""

from __future__ import annotations

import math
from typing import Any, Optional

from backend.scoring_engine import score_negotiation
from backend.sentiment_agent import (
    analyze_sentiment_trajectory,
    generate_coaching_recommendations,
)


def _is_num(val: Any) -> bool:
    return isinstance(val, (int, float)) and not isinstance(val, bool) and math.isfinite(val)


def _compute_resolution_score(
    config: dict[str, Any],
    history: list[dict[str, Any]],
    status: str,
    deadlock_event: Optional[dict[str, Any]],
) -> dict[str, Any]:
    """Calculate the resolution quality score using the scoring engine."""
    return score_negotiation(config, history, status, deadlock_event)


def generate_post_interaction_summary(
    config: dict[str, Any],
    history: list[dict[str, Any]],
    status: str,
    winner: Optional[str] = None,
    deadlock_event: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Compile comprehensive post-interaction analysis for completed negotiation."""
    scenario_title = config.get("title") or config.get("scenario_id", "Negotiation")
    total_turns = len(history)
    rounds_taken = math.ceil(total_turns / max(1, len(config.get("agents", [1, 2])))) if history else 0
    final_offer = history[-1].get("offer", {}) if history else {}

    # Executive narrative recap
    if status == "accepted":
        accepting_turn = history[-1] if history else {}
        acceptor_id = accepting_turn.get("agent_id", "Participant")
        terms_str = ", ".join(f"{k}: {v}" for k, v in final_offer.items())
        narrative = (
            f"The negotiation concluded successfully in Round {rounds_taken} with a mutual agreement. "
            f"Terms accepted ({terms_str}) by {acceptor_id}. Both stakeholders reached consensus inside the feasible ZOPA corridor."
        )
    elif status == "deadlock":
        trigger = deadlock_event.get("type", "impasse") if deadlock_event else "persistent stance rigidity"
        narrative = (
            f"The negotiation reached a formal deadlock in Round {rounds_taken} triggered by {trigger}. "
            f"Neither party conceded sufficient margin to converge on a mutual settlement within allocated rounds."
        )
    else:
        narrative = f"The negotiation concluded with status '{status}' after {rounds_taken} rounds."

    resolution_score = _compute_resolution_score(
        config, history, status, deadlock_event
    )
    sentiment_timeline = analyze_sentiment_trajectory(
        state={"config": config, "history": history, "deadlock_event": deadlock_event},
        config=config,
        history=history,
    )
    recommendations = generate_coaching_recommendations(
        config=config,
        history=history,
        status=status,
        resolution_score=resolution_score,
        deadlock_event=deadlock_event,
    )

    return {
        "scenario_title": scenario_title,
        "status": status,
        "rounds_completed": rounds_taken,
        "total_turns": total_turns,
        "final_agreement": final_offer if status == "accepted" else None,
        "executive_summary": narrative,
        "resolution_quality": resolution_score,
        "sentiment_journey": sentiment_timeline,
        "personalized_recommendations": recommendations,
        "deadlock_summary": deadlock_event,
    }
