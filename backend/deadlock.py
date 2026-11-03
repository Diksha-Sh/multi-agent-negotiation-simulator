"""Deadlock Detection and Resolution Module (Task 4).

This module monitors negotiation state across rounds to detect stalls,
repeated rejections, or cyclical positions, and executes resolution strategies
(midpoint compromise, stance modifications, final round trigger, or breakdown).
"""

from __future__ import annotations

from typing import Any, Optional, TypedDict


class DeadlockEvent(TypedDict, total=False):
    """Structured representation of a detected negotiation stall or deadlock."""
    type: str  # "stall" | "repeated_rejection" | "max_rounds" | "same_position" | "breakdown"
    round_triggered: int
    resolution_attempt: Optional[str]
    resolution_outcome: Optional[str]  # "compromise" | "stance_change" | "final_round" | "breakdown" | None
    details: Optional[str]


def check_deadlock(
    state: Any,
    config: dict[str, Any],
    consecutive_stall_limit: int = 3,
) -> Optional[DeadlockEvent]:
    """Inspect negotiation history to determine if agents are stuck.

    Conditions checked:
    1. Maximum round cap reached or exceeded.
    2. Repeated rejections: 3+ rejections in recent history.
    3. Same position / stall: No meaningful change in offers for N consecutive turns.

    Args:
        state: Active NegotiationState object.
        config: Scenario configuration dictionary.
        consecutive_stall_limit: Number of unchanged offers to declare a stall.

    Returns:
        DeadlockEvent dictionary if a deadlock condition is met, else None.
    """
    history = getattr(state, "history", [])
    if not history:
        return None

    max_rounds = int(config.get("max_rounds", 10))
    agents = getattr(state, "agents", config.get("agents", []))
    max_turns = max_rounds * (len(agents) if agents else 2)

    # 1. Check max rounds / turns reached
    if len(history) >= max_turns:
        return {
            "type": "max_rounds",
            "round_triggered": getattr(state, "round", len(history)),
            "resolution_attempt": "declare_breakdown",
            "resolution_outcome": "breakdown",
            "details": f"Negotiation reached maximum allowed limit ({max_rounds} rounds, {max_turns} turns).",
        }

    # 2. Check repeated rejections
    recent_turns = history[-consecutive_stall_limit:] if len(history) >= consecutive_stall_limit else history
    rejection_count = sum(1 for t in recent_turns if str(t.get("action", "")).lower() == "reject")
    if rejection_count >= 2:
        return {
            "type": "repeated_rejection",
            "round_triggered": getattr(state, "round", len(history)),
            "resolution_attempt": "suggest_compromise",
            "resolution_outcome": "compromise",
            "details": f"Detected {rejection_count} rejections in recent turns.",
        }

    # 3. Check for same position / zero offer movement over consecutive turns
    if len(history) >= consecutive_stall_limit * 2:
        tail = history[-(consecutive_stall_limit * 2):]
        offers_by_agent: dict[str, list[dict[str, Any]]] = {}
        for t in tail:
            aid = t.get("agent_id", "")
            offers_by_agent.setdefault(aid, []).append(t.get("offer", {}))

        # If any agent repeated the exact same offer for N consecutive of their turns
        for aid, agent_offers in offers_by_agent.items():
            if len(agent_offers) >= consecutive_stall_limit:
                first = agent_offers[0]
                if all(o == first for o in agent_offers):
                    return {
                        "type": "same_position",
                        "round_triggered": getattr(state, "round", len(history)),
                        "resolution_attempt": "modify_stance",
                        "resolution_outcome": "stance_change",
                        "details": f"Agent '{aid}' held unyielding position across {consecutive_stall_limit} consecutive offers.",
                    }

    return None


def resolve_deadlock(
    state: Any,
    deadlock_event: DeadlockEvent,
    config: dict[str, Any],
) -> dict[str, Any]:
    """Execute a progressive resolution mechanism on a detected deadlock.

    Resolution sequence:
    1. suggest_compromise -> calculate midpoint of latest opposing offers.
    2. modify_stance -> instruct agents to become 'urgent' or 'flexible'.
    3. trigger_final_round -> set a single final round ultimatum.
    4. breakdown -> terminate session with impasse.

    Returns:
        Dictionary describing the resolution action taken.
    """
    dtype = deadlock_event.get("type", "stall")
    history = getattr(state, "history", [])

    if dtype in ("max_rounds", "breakdown"):
        return {
            "action": "declare_breakdown",
            "status": "deadlock",
            "message": "Negotiation terminated: maximum limits reached without mutual agreement.",
        }

    if dtype in ("same_position", "stall"):
        # Suggest midpoint compromise
        if len(history) >= 2:
            last_two = history[-2:]
            off1 = last_two[0].get("offer", {})
            off2 = last_two[1].get("offer", {})
            compromise_offer: dict[str, Any] = {}
            for k in off1:
                if k in off2 and isinstance(off1[k], (int, float)) and isinstance(off2[k], (int, float)):
                    compromise_offer[k] = round((off1[k] + off2[k]) / 2, 2)
            if compromise_offer:
                return {
                    "action": "suggest_compromise",
                    "status": "ongoing",
                    "compromise_offer": compromise_offer,
                    "message": "Suggested midpoint compromise between opposing positions.",
                }

        return {
            "action": "modify_stance",
            "status": "ongoing",
            "recommended_stance": "flexible",
            "message": "Requested agents to adopt flexible stance to break stall.",
        }

    return {
        "action": "trigger_final_round",
        "status": "ongoing",
        "message": "Final settlement round triggered.",
    }
