"""Counteroffer Evaluation and Concession Module (Task 3).

Supports Vendor Pricing (price), Job Offer (salary, remote_days), and
Project Budget Allocation (project_allocation, total_budget).

The public function evaluate_offer(incoming_offer, agent_config) returns a
decision dictionary for the caller to convert into the project's Turn object.
"""

from __future__ import annotations

import math
import re
from numbers import Real
from typing import Any


CONCESSION_RATES = {
    "Aggressive": 0.15,
    "Collaborative": 0.50,
    "Risk-Averse": 0.70,
}

ISSUE_ALIASES = {
    "price": ("price",),
    "salary": ("salary",),
    "remote_days": ("remote workdays", "remote days", "workdays"),
    "project_allocation": (
        "allocation for project activities",
        "project activities",
        "project allocation",
        "allocation",
    ),
    "total_budget": (
        "total project budget",
        "total budget",
        "total project spending",
        "total spending",
    ),
}

WORD_NUMBERS = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}


def _is_number(value: Any) -> bool:
    """Return whether value is a finite real number, excluding booleans."""
    return (
        isinstance(value, Real)
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def _get_personality(agent: dict[str, Any]) -> str:
    """Read the selected personality or the scenario default."""
    value = agent.get("personality") or agent.get("default_personality") or "Collaborative"
    value = str(value).strip().lower()

    for personality in CONCESSION_RATES:
        if value == personality.lower():
            return personality

    raise ValueError(
        f"Unsupported personality: {value!r}. "
        f"Allowed values: {', '.join(CONCESSION_RATES)}."
    )


def _get_limits(agent: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Convert the scenario's limits list into an issue lookup."""
    limits = agent.get("limits")
    if not isinstance(limits, list) or not limits:
        raise ValueError("Agent must have a non-empty limits list.")

    result: dict[str, dict[str, Any]] = {}
    for entry in limits:
        if not isinstance(entry, dict):
            raise ValueError("Each limit must be a dictionary.")

        item = entry.get("item")
        limit_type = entry.get("type")
        value = entry.get("value")

        if not isinstance(item, str) or not item.strip():
            raise ValueError("Each limit must specify an item.")
        if limit_type not in ("min", "max"):
            raise ValueError(f"Limit type for {item!r} must be 'min' or 'max'.")
        if not _is_number(value):
            raise ValueError(f"Limit value for {item!r} must be numeric.")

        item = item.strip()
        if item in result:
            raise ValueError(f"Duplicate limit for issue {item!r}.")

        result[item] = {"type": limit_type, "value": float(value)}

    return result


def _extract_target(
    goal: str,
    item: str,
    limit: dict[str, Any],
    explicit_targets: dict[str, Any],
) -> float:
    """Determine the preferred target, constrained by the hard limit.

    Priority: explicit numeric target, issue-related value in goal, hard limit.
    """
    if item in explicit_targets:
        target_value = explicit_targets[item]
        if not _is_number(target_value):
            raise ValueError(f"Explicit target for {item!r} must be numeric.")
        target = float(target_value)
    else:
        aliases = ISSUE_ALIASES.get(item, (item.replace("_", " "),))
        candidates: list[tuple[int, int, float]] = []

        # Numeric values such as 2, 12, 120000, or 4.5.
        numbers = list(re.finditer(r"(?<![A-Za-z0-9])\d[\d,]*(?:\.\d+)?", goal))

        # For remote_days, also recognize word numbers (e.g. "two days").
        if item == "remote_days":
            for alias in aliases:
                for phrase in re.finditer(re.escape(alias), goal, re.IGNORECASE):
                    for word, value in WORD_NUMBERS.items():
                        for match in re.finditer(rf"\b{re.escape(word)}\b", goal, re.IGNORECASE):
                            distance = min(
                                abs(match.start() - phrase.end()),
                                abs(phrase.start() - match.end()),
                            )
                            candidates.append((distance, match.start(), float(value)))

        # Preserve numeric target extraction for all issues, including remote_days.
        for alias in aliases:
            for phrase in re.finditer(re.escape(alias), goal, re.IGNORECASE):
                for number in numbers:
                    distance = min(
                        abs(number.start() - phrase.end()),
                        abs(phrase.start() - number.end()),
                    )
                    candidates.append(
                        (distance, number.start(), float(number.group().replace(",", "")))
                    )

        target = min(candidates)[2] if candidates else float(limit["value"])

    # Keep target on the feasible side of the hard boundary.
    if limit["type"] == "max":
        return min(target, float(limit["value"]))
    return max(target, float(limit["value"]))


def _within_limit(value: float, limit: dict[str, Any]) -> bool:
    """Check whether a value respects the agent's hard boundary."""
    if limit["type"] == "max":
        return value <= limit["value"]
    return value >= limit["value"]


def _meets_target(value: float, target: float, limit: dict[str, Any]) -> bool:
    """Check whether an incoming value satisfies the agent's goal."""
    if limit["type"] == "max":
        return value <= target
    return value >= target


def _calculate_counteroffer(
    incoming_value: float,
    target: float,
    limit: dict[str, Any],
    concession_rate: float,
) -> float | int:
    """Move the preferred target toward the incoming offer by the concession rate."""
    counter = target + concession_rate * (incoming_value - target)

    if limit["type"] == "max":
        counter = max(target, min(counter, limit["value"]))
    else:
        counter = min(target, max(counter, limit["value"]))

    if incoming_value.is_integer() and target.is_integer():
        return int(round(counter))
    return round(counter, 2)


def evaluate_offer(
    incoming_offer: dict[str, Any],
    agent_config: dict[str, Any],
) -> dict[str, Any]:
    """Evaluate an offer and return action, counteroffer, reasoning, and stance."""
    if not isinstance(incoming_offer, dict) or not incoming_offer:
        raise ValueError("incoming_offer must be a non-empty dictionary.")
    if not isinstance(agent_config, dict):
        raise ValueError("agent_config must be a dictionary.")

    limits = _get_limits(agent_config)
    if set(incoming_offer) != set(limits):
        missing = set(limits) - set(incoming_offer)
        unexpected = set(incoming_offer) - set(limits)
        details = []
        if missing:
            details.append(f"missing issues: {sorted(missing)}")
        if unexpected:
            details.append(f"unexpected issues: {sorted(unexpected)}")
        raise ValueError("Offer issues do not match agent limits: " + "; ".join(details))

    for item, value in incoming_offer.items():
        if not _is_number(value):
            raise ValueError(f"Offer value for {item!r} must be numeric.")

    personality = _get_personality(agent_config)
    concession_rate = CONCESSION_RATES[personality]
    explicit_targets = agent_config.get("targets", {})
    if not isinstance(explicit_targets, dict):
        raise ValueError("'targets' must be a dictionary when provided.")

    goal = str(agent_config.get("goal", ""))
    targets = {
        item: _extract_target(goal, item, limit, explicit_targets)
        for item, limit in limits.items()
    }

    violations = [
        item for item, value in incoming_offer.items()
        if not _within_limit(float(value), limits[item])
    ]
    if violations:
        return {
            "action": "reject",
            "counteroffer": None,
            "reasoning": "The offer violates the agent's hard limit for: " + ", ".join(violations) + ".",
            "stance": "firm",
        }

    if all(
        _meets_target(float(incoming_offer[item]), targets[item], limits[item])
        for item in limits
    ):
        return {
            "action": "accept",
            "counteroffer": None,
            "reasoning": "The offer meets the agent's target for every issue.",
            "stance": "flexible",
        }

    counteroffer: dict[str, Any] = {}
    for item, value in incoming_offer.items():
        numeric_value = float(value)
        limit = limits[item]
        target = targets[item]
        if _meets_target(numeric_value, target, limit):
            counteroffer[item] = value
        else:
            counteroffer[item] = _calculate_counteroffer(
                incoming_value=numeric_value,
                target=target,
                limit=limit,
                concession_rate=concession_rate,
            )

    if not all(
        _within_limit(float(counteroffer[item]), limits[item]) for item in limits
    ):
        return {
            "action": "reject",
            "counteroffer": None,
            "reasoning": "No feasible counteroffer could be generated within the agent's hard limits.",
            "stance": "firm",
        }

    return {
        "action": "counter",
        "counteroffer": counteroffer,
        "reasoning": (
            f"The offer is within hard limits but misses at least one target. "
            f"The {personality} concession strategy was applied."
        ),
        "stance": "firm" if personality == "Aggressive" else "flexible",
    }
