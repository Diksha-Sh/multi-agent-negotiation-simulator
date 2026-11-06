"""Validation of the final negotiation config (Task 1).

The UI calls ``validate_config(config)`` after building the config with
``build_negotiation_config(...)`` and keeps the Start button disabled
until ``valid`` is True.

Expected config shape (see the Task 1 spec, section 4)::

    {
      "scenario_id": "vendor_pricing",
      "title": "...",
      "description": "...",
      "max_rounds": 10,
      "agents": [
        {"id", "name", "role", "role_description", "goal",
         "constraints", "limits", "personality"}
      ]
    }

Return value::

    {"valid": True,  "errors": []}
    {"valid": False, "errors": ["Agent 'vendor' has no personality selected", ...]}

The function never raises on bad input; every problem becomes a message
in ``errors`` so the UI can show it to the user.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

PERSONALITIES_FILE = Path(__file__).resolve().parent.parent / "scenarios" / "personalities.json"

# Fallback if personalities.json cannot be read. Spelling, capitals and the
# hyphen in "Risk-Averse" must match exactly.
DEFAULT_PERSONALITIES: tuple[str, ...] = ("Aggressive", "Collaborative", "Risk-Averse")

LIMIT_TYPES: tuple[str, ...] = ("min", "max")

# Allowed range for max_rounds (one round = one turn; a deal needs at least 2).
MIN_ROUNDS = 2
MAX_ROUNDS = 50

# Optional deadlock settings (Task 4): name -> (lowest, highest, whole number?)
DEADLOCK_SETTINGS: dict[str, tuple[float, float, bool]] = {
    "stall_rounds": (1, 10, True),
    "rejection_limit": (2, 10, True),
    "min_move_pct": (0.01, 50, False),
}


def resolve_human_agent_id(config: dict[str, Any]) -> str | None:
    """Resolve the agent-ID alias fields; numeric seat positions are not supported."""
    selected: list[str] = []
    for field in ("human_agent_id", "human_seat"):
        value = config.get(field)
        if value is None:
            continue
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field} must be a participating agent ID.")
        selected.append(value.strip())

    if len(set(selected)) > 1:
        raise ValueError("human_agent_id and human_seat must select the same agent.")
    return selected[0] if selected else None


def load_allowed_personalities() -> tuple[str, ...]:
    """Return the personality names defined in scenarios/personalities.json."""
    try:
        with open(PERSONALITIES_FILE, encoding="utf-8-sig") as f:
            names = tuple(p["name"] for p in json.load(f))
        return names or DEFAULT_PERSONALITIES
    except (OSError, ValueError, KeyError, TypeError):
        return DEFAULT_PERSONALITIES


ALLOWED_PERSONALITIES: tuple[str, ...] = load_allowed_personalities()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def validate_config(config: Any) -> dict[str, Any]:
    """Check that a negotiation config is complete and that a deal is possible.

    Checks:
        1. A scenario is selected (``scenario_id`` not empty).
        2. There are at least 2 agents.
        3. Every agent has a name, role, goal and a non-empty constraints list.
        4. Every agent's personality is one of the 3 allowed values.
        5. Every agent has at least 1 limit (and each limit is well formed).
        6. A deal is possible: for each item, the lowest "max" is at least
           the highest "min" (e.g. buyer max 40 >= vendor min 35).
        7. ``max_rounds``, when given, is a whole number from 2 to 50.
        8. ``deadlock`` settings, when given, are in range (see DEADLOCK_SETTINGS).

    Args:
        config: The final config dict produced by ``build_negotiation_config``.

    Returns:
        ``{"valid": bool, "errors": list[str]}``.
    """
    errors: list[str] = []

    if not isinstance(config, dict):
        return _result(["Config is missing or is not a valid object."])

    # 1. Scenario selected
    if not _filled(config.get("scenario_id")):
        errors.append("No scenario selected.")

    # 7. Round limit (optional; the orchestrator defaults to 10)
    if "max_rounds" in config:
        errors.extend(_check_max_rounds(config["max_rounds"]))

    # 8. Deadlock settings (optional; the deadlock module has defaults)
    if config.get("deadlock") is not None:
        errors.extend(_check_deadlock_settings(config["deadlock"]))

    # 2. At least 2 agents
    agents = config.get("agents")
    if not isinstance(agents, list):
        errors.append("Scenario has no agents list.")
        return _result(errors)
    if len(agents) < 2:
        errors.append(f"A negotiation needs at least 2 agents, found {len(agents)}.")

    seen_ids: set[str] = set()
    for index, agent in enumerate(agents, start=1):
        if not isinstance(agent, dict):
            errors.append(f"Agent #{index} is not a valid object.")
            continue
        label = _agent_label(agent, index)

        agent_id = agent.get("id")
        if _filled(agent_id):
            if agent_id in seen_ids:
                errors.append(f"Agent id '{agent_id}' is used more than once.")
            seen_ids.add(agent_id)

        # 3. Required text fields and constraints
        for field in ("name", "role", "goal"):
            if not _filled(agent.get(field)):
                errors.append(f"Agent {label} has no {field}.")
        constraints = agent.get("constraints")
        if not isinstance(constraints, list) or not any(_filled(c) for c in constraints):
            errors.append(f"Agent {label} has no constraints.")

        # 4. Personality
        personality = agent.get("personality")
        if not _filled(personality):
            errors.append(f"Agent {label} has no personality selected.")
        elif personality not in ALLOWED_PERSONALITIES:
            errors.append(
                f"Agent {label} has an invalid personality '{personality}'. "
                f"Choose one of: {', '.join(ALLOWED_PERSONALITIES)}."
            )

        # 5. Limits
        limits = agent.get("limits")
        if not isinstance(limits, list) or len(limits) == 0:
            errors.append(f"Agent {label} has no limits.")
        else:
            for n, limit in enumerate(limits, start=1):
                errors.extend(_check_limit(limit, label, n))

    try:
        selected_human = resolve_human_agent_id(config)
    except ValueError as exc:
        errors.append(str(exc))
        selected_human = None
    if selected_human is not None and selected_human not in seen_ids:
        errors.append(f"Selected human agent '{selected_human}' is not a participating agent.")

    # 6. Deal possible (only meaningful once the limits themselves are valid)
    errors.extend(_check_deal_possible(agents))

    return _result(errors)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _result(errors: list[str]) -> dict[str, Any]:
    return {"valid": not errors, "errors": errors}


def _filled(value: Any) -> bool:
    """True for a non-empty, non-whitespace string."""
    return isinstance(value, str) and value.strip() != ""


def _is_number(value: Any) -> bool:
    """True for a real, finite number (not a bool, NaN or infinity)."""
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    return isinstance(value, float) and math.isfinite(value)


def _agent_label(agent: dict[str, Any], index: int) -> str:
    """Name used in error messages: the id, else the name, else '#n'."""
    for key in ("id", "name"):
        if _filled(agent.get(key)):
            return f"'{agent[key]}'"
    return f"#{index}"


def _check_max_rounds(value: Any) -> list[str]:
    """max_rounds must be a whole number between MIN_ROUNDS and MAX_ROUNDS."""
    whole = _is_number(value) and float(value).is_integer()
    if not whole or not MIN_ROUNDS <= value <= MAX_ROUNDS:
        return [f"Max rounds must be a whole number from {MIN_ROUNDS} to {MAX_ROUNDS}, got {value!r}."]
    return []


def _check_deadlock_settings(settings: Any) -> list[str]:
    """Each known deadlock setting must be a number inside its range."""
    if not isinstance(settings, dict):
        return ["Deadlock settings must be an object, e.g. {\"stall_rounds\": 2}."]
    errors: list[str] = []
    for name, (low, high, whole) in DEADLOCK_SETTINGS.items():
        if name not in settings:
            continue
        value = settings[name]
        ok = _is_number(value) and low <= value <= high and (not whole or float(value).is_integer())
        if not ok:
            kind = "a whole number" if whole else "a number"
            errors.append(f"Deadlock setting '{name}' must be {kind} from {low:g} to {high:g}, got {value!r}.")
    return errors


def _check_limit(limit: Any, label: str, n: int) -> list[str]:
    if not isinstance(limit, dict):
        return [f"Agent {label}: limit #{n} is not a valid object."]
    errors: list[str] = []
    if not _filled(limit.get("item")):
        errors.append(f"Agent {label}: limit #{n} has no item.")
    if limit.get("type") not in LIMIT_TYPES:
        errors.append(f"Agent {label}: limit #{n} type must be 'min' or 'max'.")
    if not _is_number(limit.get("value")):
        errors.append(f"Agent {label}: limit #{n} value must be a number.")
    return errors


def validate_counteroffer(agent: dict[str, Any], offer: Any) -> list[str]:
    """Validate a counteroffer against every reservation limit for its agent."""
    label = _agent_label(agent, 1)
    if not isinstance(offer, dict):
        return [f"Counteroffer for agent {label} must be an object."]

    limits_by_item: dict[str, list[dict[str, Any]]] = {}
    for limit in agent.get("limits", []):
        if isinstance(limit, dict) and _filled(limit.get("item")):
            limits_by_item.setdefault(limit["item"].strip(), []).append(limit)

    errors: list[str] = []
    normalized_offer: dict[str, Any] = {}
    for item, value in offer.items():
        if not isinstance(item, str) or not item.strip():
            errors.append("Counteroffer item names must be non-empty strings.")
            continue
        normalized_item = item.strip()
        if normalized_item in normalized_offer:
            errors.append(f"Counteroffer contains duplicate item '{normalized_item}'.")
            continue
        normalized_offer[normalized_item] = value

    for item in limits_by_item:
        if item not in normalized_offer:
            errors.append(f"Counteroffer is missing required value for '{item}'.")
    for item in normalized_offer:
        if item not in limits_by_item:
            errors.append(f"Counteroffer includes '{item}', which has no reservation limit for agent {label}.")

    for item, value in normalized_offer.items():
        limits = limits_by_item.get(item)
        if not limits:
            continue
        if not _is_number(value):
            errors.append(f"Counteroffer value for '{item}' must be a finite number.")
            continue
        for limit in limits:
            bound = limit["value"]
            if not _is_number(bound) or limit.get("type") not in LIMIT_TYPES:
                errors.append(f"Reservation limit for '{item}' is not safely comparable.")
                continue
            unit = f" {limit.get('unit')}" if limit.get("unit") else ""
            if limit["type"] == "min" and value < bound:
                errors.append(
                    f"Counteroffer value for '{item}' ({value}{unit}) is below the minimum "
                    f"reservation limit ({bound}{unit})."
                )
            elif limit["type"] == "max" and value > bound:
                errors.append(
                    f"Counteroffer value for '{item}' ({value}{unit}) exceeds the maximum "
                    f"reservation limit ({bound}{unit})."
                )
    return errors


def _check_deal_possible(agents: list[Any]) -> list[str]:
    """For every item, the lowest max must be >= the highest min.

    Example: buyer price max 40 and vendor price min 35 -> possible.
    Buyer max 30 and vendor min 35 -> impossible, nobody can ever agree.
    Items that only have max limits (or only min limits) are skipped.
    """
    # item -> {"min": [(value, label)], "max": [(value, label)]}
    bounds: dict[str, dict[str, list[tuple[int | float, str]]]] = {}
    for index, agent in enumerate(agents, start=1):
        if not isinstance(agent, dict) or not isinstance(agent.get("limits"), list):
            continue
        label = _agent_label(agent, index)
        for limit in agent["limits"]:
            if (
                isinstance(limit, dict)
                and _filled(limit.get("item"))
                and limit.get("type") in LIMIT_TYPES
                and _is_number(limit.get("value"))
            ):
                entry = bounds.setdefault(limit["item"].strip(), {"min": [], "max": []})
                entry[limit["type"]].append((limit["value"], label))

    errors: list[str] = []
    for item, entry in bounds.items():
        if not entry["min"] or not entry["max"]:
            continue
        highest_min, min_label = max(entry["min"])
        lowest_max, max_label = min(entry["max"])
        if lowest_max < highest_min:
            errors.append(
                f"No deal is possible on '{item}': agent {max_label} will not go above "
                f"{lowest_max:g} but agent {min_label} will not go below {highest_min:g}."
            )
    return errors
