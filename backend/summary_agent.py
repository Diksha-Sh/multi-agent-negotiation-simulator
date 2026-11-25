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


def _infer_sentiment_timeline(history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Derive sentiment journey across the negotiation turns."""
    timeline = []
    for idx, turn in enumerate(history):
        stance = str(turn.get("stance", "flexible")).lower()
        action = str(turn.get("action", "counter")).lower()
        reasoning = str(turn.get("reasoning", "")).lower()

        # Deduce emotional & tactical sentiment
        if action == "accept":
            sentiment = "Satisfied"
            score = 0.9
            description = "Consensus reached; mutual concession satisfaction achieved."
        elif action == "reject":
            sentiment = "Frustrated"
            score = -0.8
            description = "Walkaway triggered; reservation limit threatened."
        elif stance == "firm":
            if "mediator" in reasoning or "deadlock" in reasoning:
                sentiment = "Guarded"
                score = -0.2
                description = "Adhering to mediator guidance under impasse pressure."
            else:
                sentiment = "Confident / Assertive"
                score = 0.4
                description = "Holding firm position; establishing anchoring boundary."
        elif stance == "urgent":
            sentiment = "Pressured / Anxious"
            score = -0.4
            description = "Round exhaustion approaching; concession urgency elevated."
        else:  # flexible
            sentiment = "Collaborative / Constructive"
            score = 0.6
            description = "Seeking reciprocal value; advancing integrative proposal."

        timeline.append({
            "turn_index": idx + 1,
            "round": turn.get("round", math.ceil((idx + 1) / 2)),
            "agent_id": turn.get("agent_id", "agent"),
            "action": action,
            "stance": stance,
            "sentiment": sentiment,
            "sentiment_score": score,
            "description": description,
            "offer": turn.get("offer", {}),
        })
    return timeline


def _generate_recommendations(
    config: dict[str, Any],
    history: list[dict[str, Any]],
    status: str,
    resolution_score: dict[str, Any],
) -> dict[str, Any]:
    """Generate personalized tactical strengths, weaknesses, and coaching recommendations."""
    recommendations: dict[str, Any] = {}
    is_practice = str(config.get("mode", "")).lower() == "practice"
    human_id = config.get("human_agent_id") or config.get("human_seat")

    for agent in config.get("agents", []):
        aid = agent.get("id", "agent")
        name = agent.get("name", aid.capitalize())
        personality = agent.get("personality", "Collaborative")
        is_human = is_practice and aid == human_id

        strengths = []
        weaknesses = []
        coaching_tips = []

        agent_turns = [t for t in history if t.get("agent_id") == aid]
        first_turn = agent_turns[0] if agent_turns else None
        last_turn = agent_turns[-1] if agent_turns else None

        # Analyze initial anchor
        if first_turn:
            strengths.append(f"Successfully established an opening anchor in Round {first_turn.get('round', 1)}.")

        # Analyze concession behavior
        if len(agent_turns) >= 2 and first_turn and last_turn:
            f_val = next((v for v in first_turn.get("offer", {}).values() if _is_num(v)), None)
            l_val = next((v for v in last_turn.get("offer", {}).values() if _is_num(v)), None)
            if f_val is not None and l_val is not None and f_val != l_val:
                strengths.append("Demonstrated tactical flexibility by making progressive reciprocal moves.")
            else:
                weaknesses.append("Held a static position across multiple turns, contributing to negotiation friction.")

        # Outcome-specific coaching
        if status == "accepted":
            strengths.append("Successfully guided negotiation to a mutually agreed settlement.")
            coaching_tips.append("In future negotiations, explore expanding the agenda with secondary trade-offs to extract greater surplus.")
        elif status == "deadlock":
            weaknesses.append("Unable to break deadlock prior to resolution escalation.")
            coaching_tips.append("When facing an unmoving counterparty, introduce conditional concessions ('If you give X, I will offer Y').")
        else:
            weaknesses.append("Session concluded without reaching mutual agreement.")
            coaching_tips.append("Re-evaluate reservation floor/ceiling buffers to widen the Zone of Possible Agreement.")

        role_label = "Human Participant" if is_human else f"AI Agent ({personality})"
        recommendations[aid] = {
            "name": name,
            "role_label": role_label,
            "is_human": is_human,
            "strengths": strengths or ["Maintained principled adherence to hard limits."],
            "weaknesses": weaknesses or ["Pacing could be optimized to conclude earlier."],
            "coaching_tips": coaching_tips or ["Continue calibrating anchor aggression based on counterparty style."],
        }

    return recommendations


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
    sentiment_timeline = _infer_sentiment_timeline(history)
    recommendations = _generate_recommendations(config, history, status, resolution_score)

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
