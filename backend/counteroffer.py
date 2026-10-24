
"""
Counteroffer Evaluation and Concession Module.

Task 3 responsibilities:
- Evaluate an incoming offer against the agent's goals and limits.
- Decide whether to accept, counter, or reject.
- Calculate personality-based concessions.
- Support single-issue and multi-issue negotiations.

Integration:
Sathish's LLM reasoning engine can call evaluate_offer() and use
its result to construct the Turn required by backend/orchestrator.py.
"""

import math
import re
from numbers import Real
from typing import Any


# Fraction of the distance from the agent's target toward the incoming offer.
# A smaller value means the agent makes a smaller concession.
CONCESSION_RATES = {
    "aggressive": 0.15,
    "collaborative": 0.50,
    "risk-averse": 0.70,
}


# Map scenario issue names to phrases used in the existing goal descriptions.
# These aliases help derive targets without changing the scenario JSON files.
ISSUE_ALIASES = {
    "price": ("price", "purchase price", "selling price"),
    "salary": ("salary",),
    "remote_days": (
        "remote workdays",
        "remote workdays per week",
        "remote days",
        "remote work",
    ),
    "project_allocation": (
        "project activities",
        "project allocation",
        "allocation",
    ),
    "total_budget": (
        "total budget",
        "total spending",
        "project spending",
    ),
}


def _is_number(value: Any) -> bool:
    """Accept finite numeric values but reject booleans."""
    return (
        isinstance(value, Real)
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def _normalise_personality(agent: dict) -> str:
    """Read the selected personality from the agent configuration."""
    personality = (
        agent.get("personality")
        or agent.get("default_personality")
        or "Collaborative"
    )

    personality = str(personality).strip().lower().replace("_", "-")

    if personality not in CONCESSION_RATES:
        raise ValueError(
            f"Unsupported personality: {personality!r}. "
            "Expected Aggressive, Collaborative, or Risk-Averse."
        )

    return personality


def _extract_target_from_goal(goal: str, item: str) -> float | None:
    """
    Extract the numeric target associated with an issue from an agent's goal.

    Examples:
        'Purchase at a price of no more than 37000 INR'
        'Secure a salary of at least 12 LPA'
        'Secure at least 60 lakh INR for project activities'

    An explicit numeric target in agent['targets'] takes precedence.
    If the goal cannot be interpreted, the hard limit is used as a fallback.
    """
    if not goal:
        return None

    aliases = ISSUE_ALIASES.get(item, (item.replace("_", " "),))
    number_pattern = re.compile(
        r"(?<![A-Za-z0-9])\d[\d,]*(?:\.\d+)?"
    )
    number_matches = list(number_pattern.finditer(goal))

    if not number_matches:
        return None

    best_distance = None
    best_value = None
    lower_goal = goal.lower()

    for alias in aliases:
        alias_pattern = re.compile(re.escape(alias), re.IGNORECASE)

        for alias_match in alias_pattern.finditer(lower_goal):
            for number_match in number_matches:
                # Choose the numeric value closest to the issue phrase.
                distance = min(
                    abs(number_match.start() - alias_match.end()),
                    abs(alias_match.start() - number_match.end()),
                )

                if best_distance is None or distance < best_distance:
                    best_distance = distance
                    best_value = float(
                        number_match.group().replace(",", "")
                    )

    return best_value


def _get_issue_rules(agent: dict) -> dict[str, dict]:
    """
    Convert the repository's limits list into a lookup by issue.

    Existing format:
        "limits": [
            {"item": "price", "type": "max", "value": 40000}
        ]

    'min' means the agent must receive at least the specified value.
    'max' means the agent must not exceed the specified value.
    """
    limits = agent.get("limits")

    if not isinstance(limits, list) or not limits:
        raise ValueError(
            f"Agent {agent.get('id', '<unknown>')} has no valid limits."
        )

    rules = {}

    for limit in limits:
        if not isinstance(limit, dict):
            raise ValueError("Each limit must be a dictionary.")

        item = limit.get("item")
        limit_type = limit.get("type")
        limit_value = limit.get("value")

        if not isinstance(item, str) or not item.strip():
            raise ValueError("Each limit must have a valid item name.")

        if limit_type not in {"min", "max"}:
            raise ValueError(
                f"Limit type for {item!r} must be 'min' or 'max'."
            )

        if not _is_number(limit_value):
            raise ValueError(
                f"Limit value for {item!r} must be a finite number."
            )

        if item in rules:
            raise ValueError(
                f"Duplicate limit for issue {item!r}."
            )

        rules[item] = {
            "type": limit_type,
            "limit": float(limit_value),
        }

    return rules


def _get_target(
    agent: dict,
    item: str,
    rule: dict,
) -> float:
    """
    Determine the preferred target for an issue.

    Priority:
    1. Optional explicit numeric target in agent['targets'].
    2. Numeric target extracted from the existing goal description.
    3. Hard limit as a safe fallback.

    Targets are clamped so they never contradict the hard limit.
    """
    targets = agent.get("targets", {})
    target = None

    if isinstance(targets, dict) and item in targets:
        if not _is_number(targets[item]):
            raise ValueError(
                f"Target for {item!r} must be numeric."
            )
        target = float(targets[item])

    if target is None:
        target = _extract_target_from_goal(
            str(agent.get("goal", "")),
            item,
        )

    if target is None:
        target = rule["limit"]

    limit_value = rule["limit"]

    # Keep the target within the feasible range for this agent.
    if rule["type"] == "max":
        target = min(target, limit_value)
    else:
        target = max(target, limit_value)

    return target


def _within_limit(value: float, rule: dict) -> bool:
    """Check whether an incoming value satisfies the agent's hard boundary."""
    if rule["type"] == "max":
        return value <= rule["limit"]

    return value >= rule["limit"]


def _meets_target(value: float, target: float, rule: dict) -> bool:
    """Check whether an incoming value meets the agent's goal."""
    if rule["type"] == "max":
        return value <= target

    return value >= target


def _calculate_concession(
    incoming_value: float,
    target: float,
    rule: dict,
    concession_rate: float,
) -> float:
    """
    Move the counteroffer from the incoming value toward the agent's target.

    Aggressive agents move less.
    Collaborative agents move moderately.
    Risk-averse agents move further toward the incoming offer.
    """
    counter_value = (
        target
        + concession_rate * (incoming_value - target)
    )

    limit_value = rule["limit"]

    if rule["type"] == "max":
        lower_bound = target
        upper_bound = limit_value
    else:
        lower_bound = limit_value
        upper_bound = target

    counter_value = max(
        lower_bound,
        min(counter_value, upper_bound),
    )

    # Keep whole-number values whole, e.g. remote workdays.
    if float(incoming_value).is_integer() and float(target).is_integer():
        counter_value = int(round(counter_value))
    else:
        counter_value = round(counter_value, 2)

    return counter_value


def evaluate_offer(
    incoming_offer: dict[str, Any],
    agent_config: dict[str, Any],
) -> dict[str, Any]:
    """
    Evaluate an incoming offer and calculate the appropriate response.

    Parameters
    ----------
    incoming_offer:
        The other agent's current offer, e.g. {"price": 39500}.

    agent_config:
        The current agent's configuration from the scenario, including
        id, goal, limits, and personality/default_personality.

    Returns
    -------
    {
        "action": "accept" | "counter" | "reject",
        "counteroffer": dict | None,
        "reasoning": str,
        "stance": "firm" | "flexible" | "urgent"
    }

    This function does not create a complete Turn. The calling agent
    engine supplies agent_id and round and builds the Turn object.
    """
    if not isinstance(incoming_offer, dict) or not incoming_offer:
        raise ValueError(
            "incoming_offer must be a non-empty dictionary."
        )

    if not isinstance(agent_config, dict):
        raise ValueError("agent_config must be a dictionary.")

    rules = _get_issue_rules(agent_config)

    if set(incoming_offer) != set(rules):
        missing = set(rules) - set(incoming_offer)
        unexpected = set(incoming_offer) - set(rules)

        details = []
        if missing:
            details.append(f"missing issues: {sorted(missing)}")
        if unexpected:
            details.append(f"unexpected issues: {sorted(unexpected)}")

        raise ValueError(
            "Incoming offer does not match the agent's configured issues: "
            + "; ".join(details)
        )

    for item, value in incoming_offer.items():
        if not _is_number(value):
            raise ValueError(
                f"Offer value for {item!r} must be a finite number."
            )

    personality = _normalise_personality(agent_config)
    concession_rate = CONCESSION_RATES[personality]

    targets = {
        item: _get_target(agent_config, item, rule)
        for item, rule in rules.items()
    }

    # Reject an offer that violates any of the agent's hard limits.
    violations = [
        item
        for item, value in incoming_offer.items()
        if not _within_limit(float(value), rules[item])
    ]

    if violations:
        return {
            "action": "reject",
            "counteroffer": None,
            "reasoning": (
                "The incoming offer violates the agent's hard limit for: "
                + ", ".join(violations)
                + "."
            ),
            "stance": "firm",
        }

    # Accept only when every issue meets the agent's goal.
    if all(
        _meets_target(
            float(incoming_offer[item]),
            targets[item],
            rules[item],
        )
        for item in rules
    ):
        return {
            "action": "accept",
            "counteroffer": None,
            "reasoning": (
                "The incoming offer meets the agent's target "
                "for every negotiation issue."
            ),
            "stance": "flexible",
        }

    # Counter only on issues that do not meet the target.
    # Preserve incoming values for issues that are already satisfactory.
    counteroffer = {}

    for item, value in incoming_offer.items():
        numeric_value = float(value)
        target = targets[item]
        rule = rules[item]

        if _meets_target(numeric_value, target, rule):
            counteroffer[item] = value
        else:
            counteroffer[item] = _calculate_concession(
                incoming_value=numeric_value,
                target=target,
                rule=rule,
                concession_rate=concession_rate,
            )

    # Safety check: never return a counteroffer outside hard limits.
    if not all(
        _within_limit(float(counteroffer[item]), rules[item])
        for item in rules
    ):
        return {
            "action": "reject",
            "counteroffer": None,
            "reasoning": (
                "No feasible counteroffer could be generated "
                "within the agent's hard limits."
            ),
            "stance": "firm",
        }

    stance = (
        "firm" if personality == "aggressive" else "flexible"
    )

    return {
        "action": "counter",
        "counteroffer": counteroffer,
        "reasoning": (
            f"The offer is within the agent's hard limits but does not "
            f"meet every target. A {personality} concession strategy "
            f"was applied."
        ),
        "stance": stance,
    }
