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
    winner: Optional[str],
) -> dict[str, Any]:
    """Calculate 0-100 resolution quality score based on goals, concessions, and efficiency."""
    max_rounds = config.get("max_rounds", 10) or 10
    total_turns = len(history)
    rounds_taken = math.ceil(total_turns / max(1, len(config.get("agents", [1, 2]))))

    # 1. Agreement outcome base score (0-40 pts)
    if status == "accepted":
        outcome_score = 40.0
    elif status == "deadlock":
        outcome_score = 15.0  # partial credit for principled exploration without unprincipled collapse
    else:  # rejected / incomplete
        outcome_score = 10.0

    # 2. Efficiency score (0-20 pts)
    # Reaching consensus early/moderately is rewarded; round exhaustion is penalized.
    if status == "accepted":
        efficiency_ratio = 1.0 - (rounds_taken / max(2, max_rounds))
        efficiency_score = round(max(5.0, 10.0 + 10.0 * efficiency_ratio), 1)
    else:
        efficiency_score = round(max(2.0, 10.0 * (1.0 - (rounds_taken / max_rounds))), 1)

    # 3. Concession reciprocity & Pareto balance (0-20 pts)
    concessions = []
    for agent in config.get("agents", []):
        agent_id = agent.get("id")
        agent_offers = [t.get("offer", {}) for t in history if t.get("agent_id") == agent_id and isinstance(t.get("offer"), dict)]
        if len(agent_offers) >= 2:
            first_val = next((v for v in agent_offers[0].values() if _is_num(v)), None)
            last_val = next((v for v in agent_offers[-1].values() if _is_num(v)), None)
            if first_val is not None and last_val is not None:
                concessions.append(abs(last_val - first_val))

    if len(concessions) >= 2 and max(concessions) > 0:
        ratio = min(concessions) / max(concessions)
        reciprocity_score = round(10.0 + 10.0 * ratio, 1)
    else:
        reciprocity_score = 15.0

    # 4. Reservation Boundary Safety (0-20 pts)
    # Verifies both parties concluded inside their acceptable bounds
    boundary_safe = True
    last_offer = history[-1].get("offer", {}) if history else {}
    for agent in config.get("agents", []):
        for lim in agent.get("limits", []):
            item = lim.get("item")
            lim_val = lim.get("value")
            lim_type = str(lim.get("type", "")).lower()
            if item in last_offer and _is_num(last_offer[item]) and _is_num(lim_val):
                offered = float(last_offer[item])
                bound = float(lim_val)
                if lim_type == "min" and offered < bound:
                    boundary_safe = False
                elif lim_type == "max" and offered > bound:
                    boundary_safe = False

    boundary_score = 20.0 if boundary_safe else 0.0

    total_score = round(min(100.0, outcome_score + efficiency_score + reciprocity_score + boundary_score), 1)

    if total_score >= 85:
        tier = "Exceptional Win-Win Settlement"
    elif total_score >= 70:
        tier = "Balanced Commercial Agreement"
    elif total_score >= 50:
        tier = "Suboptimal Compromise"
    else:
        tier = "Impasse / High Friction Resolution"

    return {
        "overall_score": total_score,
        "tier": tier,
        "breakdown": {
            "agreement_outcome": outcome_score,
            "pacing_efficiency": efficiency_score,
            "concession_reciprocity": reciprocity_score,
            "boundary_safety": boundary_score,
        },
    }


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

    resolution_score = _compute_resolution_score(config, history, status, winner)
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
