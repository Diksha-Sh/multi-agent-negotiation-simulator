"""Deadlock Detection and Resolution Module (Task 4).

The orchestrator calls ``check_deadlock(state, config)`` after every turn.
When the negotiation is stuck, the module returns a deadlock event and picks
the next resolution step from a fixed ladder:

    1. suggest_compromise   -> mediator proposes the midpoint of the two latest offers
    2. modify_stance        -> both agents are asked to become flexible
    3. trigger_final_round  -> each agent gets one last turn to close the deal
    4. declare_breakdown    -> the negotiation ends with no deal

Each time the negotiation gets stuck again, the next step is tried. The LLM
Reasoning Engine reads the active step (``active_resolution``) and adjusts the
agents' next offers, so a resolution actually changes what the agents do.

Deadlock event (shared with the Orchestrator and the Arena UI)::

    {
      "type": "stall" | "repeated_rejection" | "same_position" | "max_rounds",
      "round_triggered": 6,
      "resolution_attempt": "suggest_compromise" | "modify_stance"
                            | "trigger_final_round" | "declare_breakdown",
      "resolution_outcome": "compromise" | "stance_change" | "final_round"
                            | "breakdown" | None,   # None = attempt still in progress
      "details": "Both sides held the same offers for 2 rounds.",
      "message": "Mediator suggests meeting in the middle: price 37500.",
      "compromise_offer": {"price": 37500},          # only for suggest_compromise
      "level": 1,                                     # 1-4, position on the ladder
      "attempts": [ {...earlier events, short form...} ]
    }

Detection rules (all thresholds can be changed in ``config["deadlock"]``):

    same_position       both agents repeated their offer unchanged for the last
                        ``stall_rounds`` turns each (default 2)
    repeated_rejection  one agent proposed the same terms ``rejection_limit`` times
                        in a row (default 3) and each time the other side countered
                        instead of accepting, while the other side kept moving
    stall               both agents still move, but each of their last
                        ``stall_rounds`` moves is smaller than ``min_move_pct``
                        percent (default 1%)
    max_rounds          the round count reached max_rounds

Every function is a pure function of the turn history (plus the previous event
kept in ``state.deadlock_event``), so the API can rebuild the same result by
replaying the history.
"""

from __future__ import annotations

import math
from typing import Any, Optional, TypedDict


class DeadlockEvent(TypedDict, total=False):
    """Structured representation of a detected negotiation stall or deadlock."""
    type: str  # "stall" | "repeated_rejection" | "same_position" | "max_rounds"
    round_triggered: int
    resolution_attempt: Optional[str]
    resolution_outcome: Optional[str]  # "compromise" | "stance_change" | "final_round" | "breakdown" | None
    details: Optional[str]
    message: Optional[str]
    compromise_offer: Optional[dict[str, Any]]
    level: int
    attempts: list[dict[str, Any]]
    resolved_round: Optional[int]  # set when the attempt worked (or ended in breakdown)


DEFAULT_SETTINGS: dict[str, float] = {
    "stall_rounds": 2,      # own moves per agent that must be (almost) unchanged
    "min_move_pct": 1.0,    # a move smaller than this percent counts as "no real change"
    "rejection_limit": 3,   # same proposal turned down this many times
}

LADDER: tuple[str, ...] = (
    "suggest_compromise",
    "modify_stance",
    "trigger_final_round",
    "declare_breakdown",
)

OUTCOME_OF: dict[str, str] = {
    "suggest_compromise": "compromise",
    "modify_stance": "stance_change",
    "trigger_final_round": "final_round",
    "declare_breakdown": "breakdown",
}

DEADLOCK_TYPES: tuple[str, ...] = ("stall", "repeated_rejection", "same_position", "max_rounds")


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

def deadlock_settings(config: Optional[dict[str, Any]], stall_rounds: Optional[int] = None) -> dict[str, float]:
    """Thresholds from ``config["deadlock"]``, falling back to the defaults."""
    settings = dict(DEFAULT_SETTINGS)
    custom = (config or {}).get("deadlock") if isinstance(config, dict) else None
    if isinstance(custom, dict):
        for key in settings:
            value = custom.get(key)
            if _is_number(value) and value > 0:
                settings[key] = value
    if stall_rounds:
        settings["stall_rounds"] = stall_rounds
    settings["stall_rounds"] = max(1, int(settings["stall_rounds"]))
    settings["rejection_limit"] = max(2, int(settings["rejection_limit"]))
    return settings


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def check_deadlock(
    state: Any,
    config: dict[str, Any],
    consecutive_stall_limit: Optional[int] = None,
) -> Optional[DeadlockEvent]:
    """Check the negotiation after a turn and return a deadlock event, or None.

    Returns a new or updated event when something changed this turn:
    a new deadlock was found (next step on the ladder), an earlier attempt
    worked (outcome filled in), or the final round ran out (breakdown).
    Returns None when there is nothing new to report.

    Args:
        state: the NegotiationState (needs ``history``, ``round``, ``agents``,
            and optionally ``deadlock_event`` from earlier turns).
        config: the negotiation config (``max_rounds``, optional ``deadlock`` settings).
        consecutive_stall_limit: optional override for ``stall_rounds``.
    """
    history = list(getattr(state, "history", None) or [])
    if not history:
        return None

    settings = deadlock_settings(config, consecutive_stall_limit)
    current_round = int(getattr(state, "round", len(history)) or len(history))
    previous = getattr(state, "deadlock_event", None)
    previous = previous if isinstance(previous, dict) else None

    # Asked twice for the same turn (e.g. by the /check-deadlock endpoint): same answer.
    if previous and previous.get("round_triggered") == current_round:
        return previous

    # 1. Round limit
    max_rounds = _max_rounds(config)
    if current_round >= max_rounds:
        return max_rounds_event(state, max_rounds)

    window_start = int(previous.get("round_triggered", 0)) if previous else 0
    agent_ids = _agent_ids(state, config, history)
    moves = _moves_by_agent(history, agent_ids, window_start)

    if previous and previous.get("resolution_outcome") is None:
        attempt = previous.get("resolution_attempt")

        # 2a. Final round: every agent had its last turn and nobody accepted -> breakdown.
        if attempt == "trigger_final_round":
            if current_round - window_start >= len(agent_ids):
                return _escalate(state, previous, previous.get("type", "stall"), "declare_breakdown",
                                 "The final round ended without a deal.")
            return None

        # 2b. The earlier attempt worked: every agent moved again.
        if attempt in OUTCOME_OF and attempt != "declare_breakdown" and all(
            any(m["pct"] >= settings["min_move_pct"] for m in moves[a]) for a in agent_ids
        ):
            resolved: DeadlockEvent = dict(previous)  # type: ignore[assignment]
            resolved["resolution_outcome"] = OUTCOME_OF[attempt]
            resolved["resolved_round"] = current_round
            return resolved

    # 3. New deadlock in the turns since the last event
    found = _detect(moves, agent_ids, settings, _agent_names(state))
    if not found:
        return None
    dtype, details = found
    level = int(previous.get("level", 0)) + 1 if previous else 1
    return _escalate(state, previous, dtype, LADDER[min(level, len(LADDER)) - 1], details)


def resolve_deadlock(
    state: Any,
    deadlock_event: Optional[DeadlockEvent],
    config: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Turn a deadlock event into the action the agents should take next.

    Returns:
        {"action", "status", "message", and optionally "compromise_offer",
         "recommended_stance", "turns_left"}.
        ``status`` is "deadlock" for a breakdown, else "ongoing".
    """
    event = deadlock_event or {}
    attempt = event.get("resolution_attempt") or "declare_breakdown"
    if event.get("type") == "max_rounds":
        attempt = "declare_breakdown"

    result: dict[str, Any] = {
        "action": attempt,
        "status": "deadlock" if attempt == "declare_breakdown" else "ongoing",
        "message": event.get("message") or _message(attempt, None),
    }
    if attempt == "suggest_compromise":
        result["compromise_offer"] = event.get("compromise_offer") or _compromise(state)
        result["recommended_stance"] = "flexible"
    elif attempt == "modify_stance":
        result["recommended_stance"] = "flexible"
    elif attempt == "trigger_final_round":
        result["recommended_stance"] = "urgent"
        result["turns_left"] = len(_agent_ids(state, config or {}, getattr(state, "history", [])))
    return result


def active_resolution(state: Any) -> Optional[dict[str, Any]]:
    """The resolution step the agents must follow on this turn, or None.

    Used by the LLM Reasoning Engine: an attempt is active while its outcome is
    still unknown (``resolution_outcome is None``).
    """
    event = getattr(state, "deadlock_event", None)
    if not isinstance(event, dict) or event.get("resolution_outcome") is not None:
        return None
    attempt = event.get("resolution_attempt")
    if attempt not in ("suggest_compromise", "modify_stance", "trigger_final_round"):
        return None
    return {
        "attempt": attempt,
        "message": event.get("message") or _message(attempt, event.get("compromise_offer")),
        "compromise_offer": event.get("compromise_offer") or {},
        "round_triggered": event.get("round_triggered"),
    }


def finalize_deadlock_event(state: Any) -> None:
    """Close an open attempt when the negotiation ends by accept or reject.

    accept -> the attempt in progress worked (outcome = compromise / stance_change / final_round)
    reject -> an agent walked away, so the outcome is breakdown
    """
    event = getattr(state, "deadlock_event", None)
    if not isinstance(event, dict) or event.get("resolution_outcome") is not None:
        return
    status = getattr(state, "status", "")
    updated = dict(event)
    if status == "accepted":
        updated["resolution_outcome"] = OUTCOME_OF.get(str(event.get("resolution_attempt")), "compromise")
    elif status == "rejected":
        updated["resolution_outcome"] = "breakdown"
        updated["details"] = f"{event.get('details', '')} An agent then walked away.".strip()
    else:
        return
    updated["resolved_round"] = getattr(state, "round", None)
    state.deadlock_event = updated


def max_rounds_event(state: Any, max_rounds: int) -> DeadlockEvent:
    """Event for a negotiation that used up all its rounds without a deal."""
    previous = getattr(state, "deadlock_event", None)
    previous = previous if isinstance(previous, dict) else None
    if previous and previous.get("type") == "max_rounds":
        return previous  # type: ignore[return-value]
    return {
        "type": "max_rounds",
        "round_triggered": int(getattr(state, "round", 0)),
        "resolution_attempt": "declare_breakdown",
        "resolution_outcome": "breakdown",
        "details": f"Reached the maximum of {max_rounds} rounds without a deal.",
        "message": _message("declare_breakdown", None),
        "level": int(previous.get("level", 0)) + 1 if previous else 1,
        "attempts": _attempts(previous),
    }


# ---------------------------------------------------------------------------
# Detection helpers
# ---------------------------------------------------------------------------

def _detect(
    moves: dict[str, list[dict[str, Any]]],
    agent_ids: list[str],
    settings: dict[str, float],
    names: dict[str, str],
) -> Optional[tuple[str, str]]:
    """Return (type, details) for the first deadlock rule that matches, else None."""
    n = int(settings["stall_rounds"])
    pct = float(settings["min_move_pct"])
    limit = int(settings["rejection_limit"])

    def last(agent_id: str, count: int) -> Optional[list[dict[str, Any]]]:
        own = moves.get(agent_id, [])
        return own[-count:] if len(own) >= count else None

    # same_position: nobody moved at all for n turns each
    recent = {a: last(a, n) for a in agent_ids}
    if all(r is not None and all(m["pct"] == 0 for m in r) for r in recent.values()):
        return "same_position", f"Both sides repeated the same offers for {n} rounds in a row."

    # repeated_rejection: one side keeps putting the same terms on the table while the other moves
    for agent_id in agent_ids:
        held = last(agent_id, limit - 1)
        if held is None or any(m["pct"] != 0 for m in held):
            continue
        others = [a for a in agent_ids if a != agent_id]
        if others and all(moves.get(o) and moves[o][-1]["pct"] >= pct for o in others):
            who = names.get(agent_id, agent_id)
            terms = _format_offer(held[-1]["offer"])
            return "repeated_rejection", (
                f"{who} proposed the same terms ({terms}) {limit} times and each time they were turned down."
            )

    # stall: everyone is still moving, but by less than pct percent
    if all(r is not None and all(m["pct"] < pct for m in r) for r in recent.values()):
        return "stall", f"Both sides moved less than {pct:g}% per offer for {n} rounds."

    return None


def _moves_by_agent(
    history: list[dict[str, Any]], agent_ids: list[str], window_start: int
) -> dict[str, list[dict[str, Any]]]:
    """Each agent's moves (change from its own previous offer) after ``window_start``.

    A move is {"round": int, "pct": largest % change of any item, "offer": dict}.
    The previous offer may come from before the window, so the first move in the
    window is still measured correctly.
    """
    last_offer: dict[str, dict[str, Any]] = {}
    moves: dict[str, list[dict[str, Any]]] = {a: [] for a in agent_ids}
    for index, turn in enumerate(history, start=1):
        offer = turn.get("offer")
        agent_id = str(turn.get("agent_id"))
        if str(turn.get("action", "")).lower() != "counter" or not _numeric_offer(offer):
            continue
        before = last_offer.get(agent_id)
        last_offer[agent_id] = offer
        if before is None or index <= window_start:
            continue
        moves.setdefault(agent_id, []).append(
            {"round": index, "pct": _change_pct(before, offer), "offer": offer}
        )
    return moves


def _change_pct(before: dict[str, Any], after: dict[str, Any]) -> float:
    """Largest percentage change of any shared numeric item."""
    changes = []
    for item, new in after.items():
        old = before.get(item)
        if _is_number(old) and _is_number(new):
            changes.append(abs(float(new) - float(old)) / max(abs(float(old)), 1e-9) * 100)
    return max(changes) if changes else 0.0


# ---------------------------------------------------------------------------
# Resolution helpers
# ---------------------------------------------------------------------------

def _escalate(
    state: Any, previous: Optional[dict[str, Any]], dtype: str, attempt: str, details: str
) -> DeadlockEvent:
    """Build the event for the next ladder step (skip the compromise if none is possible)."""
    level = LADDER.index(attempt) + 1
    compromise = _compromise(state) if attempt == "suggest_compromise" else None
    if attempt == "suggest_compromise" and not compromise:
        attempt, level = "modify_stance", 2
    event: DeadlockEvent = {
        "type": dtype if dtype in DEADLOCK_TYPES else "stall",
        "round_triggered": int(getattr(state, "round", 0)),
        "resolution_attempt": attempt,
        "resolution_outcome": "breakdown" if attempt == "declare_breakdown" else None,
        "details": details,
        "message": _message(attempt, compromise),
        "level": max(level, int(previous.get("level", 0)) + 1 if previous else level),
        "attempts": _attempts(previous),
    }
    if compromise:
        event["compromise_offer"] = compromise
    return event


def _compromise(state: Any) -> dict[str, Any]:
    """Midpoint of each agent's latest offer, kept inside every agent's hard limits."""
    history = list(getattr(state, "history", None) or [])
    latest: dict[str, dict[str, Any]] = {}
    for turn in history:
        if _numeric_offer(turn.get("offer")):
            latest[str(turn.get("agent_id"))] = turn["offer"]
    if len(latest) < 2:
        return {}

    offers = list(latest.values())
    items = set.intersection(*(set(o) for o in offers))
    agents = list(getattr(state, "agents", None) or [])
    result: dict[str, Any] = {}
    for item in sorted(items):
        values = [o[item] for o in offers if _is_number(o.get(item))]
        if len(values) != len(offers):
            continue
        middle = sum(float(v) for v in values) / len(values)
        low, high = _feasible(agents, item)
        if low > high:
            return {}  # no deal zone on this item: a compromise cannot help
        middle = min(high, max(low, middle))
        if all(float(v).is_integer() for v in values):
            middle = float(round(middle))
            if middle < low:
                middle = math.ceil(low)
            if middle > high:
                middle = math.floor(high)
            result[item] = int(middle)
        else:
            result[item] = round(middle, 2)
    if result and all(result == {k: o.get(k) for k in result} for o in offers):
        return {}  # everyone already offers the same terms
    return result


def _feasible(agents: list[dict[str, Any]], item: str) -> tuple[float, float]:
    """Shared interval allowed by every agent's limit on this item."""
    low, high = float("-inf"), float("inf")
    for agent in agents:
        for limit in agent.get("limits") or []:
            if not isinstance(limit, dict) or limit.get("item") != item or not _is_number(limit.get("value")):
                continue
            if limit.get("type") == "min":
                low = max(low, float(limit["value"]))
            elif limit.get("type") == "max":
                high = min(high, float(limit["value"]))
    return low, high


def _message(attempt: str, compromise: Optional[dict[str, Any]]) -> str:
    if attempt == "suggest_compromise":
        terms = _format_offer(compromise or {})
        return f"Mediator suggests meeting in the middle: {terms}." if terms else "Mediator suggests meeting in the middle."
    if attempt == "modify_stance":
        return "Mediator asks both sides to be more flexible and make a real concession."
    if attempt == "trigger_final_round":
        return "Final round: each side gets one last offer. Close the deal now or the negotiation ends."
    return "Negotiation breakdown: the resolution steps did not produce a deal."


def _attempts(previous: Optional[dict[str, Any]]) -> list[dict[str, Any]]:
    """Short history of earlier events, oldest first."""
    if not previous:
        return []
    earlier = list(previous.get("attempts") or [])
    earlier.append({
        "type": previous.get("type"),
        "round_triggered": previous.get("round_triggered"),
        "resolution_attempt": previous.get("resolution_attempt"),
        "resolution_outcome": previous.get("resolution_outcome"),
        "result": "resolved" if previous.get("resolution_outcome") else "escalated",
    })
    return earlier


# ---------------------------------------------------------------------------
# Small utilities
# ---------------------------------------------------------------------------

def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _numeric_offer(offer: Any) -> bool:
    return isinstance(offer, dict) and bool(offer) and any(_is_number(v) for v in offer.values())


def _max_rounds(config: Optional[dict[str, Any]]) -> int:
    try:
        return int((config or {}).get("max_rounds", 10))
    except (TypeError, ValueError):
        return 10


def _agent_ids(state: Any, config: Optional[dict[str, Any]], history: list[dict[str, Any]]) -> list[str]:
    agents = getattr(state, "agents", None) or (config or {}).get("agents") or []
    ids = [str(a.get("id")) for a in agents if isinstance(a, dict) and a.get("id") is not None]
    if not ids:
        ids = list(dict.fromkeys(str(t.get("agent_id")) for t in history))
    return ids


def _agent_names(state: Any) -> dict[str, str]:
    agents = getattr(state, "agents", None) or []
    return {str(a.get("id")): str(a.get("name") or a.get("id")) for a in agents if isinstance(a, dict)}


def _format_offer(offer: dict[str, Any]) -> str:
    parts = []
    for item, value in offer.items():
        if _is_number(value):
            shown = f"{value:,.0f}" if float(value).is_integer() else f"{value:,.2f}"
            parts.append(f"{item.replace('_', ' ')} {shown}")
    return ", ".join(parts)
