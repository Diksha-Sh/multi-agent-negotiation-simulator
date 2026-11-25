
"""Resolution Quality Scoring Engine (Milestone 4)."""

from __future__ import annotations

import math
from typing import Any


WEIGHTS = {
    "surplus_efficiency": 30,
    "concession_reciprocity": 25,
    "pacing_efficiency": 25,
    "boundary_safety": 20,
}


def _is_number(value: Any) -> bool:
    """Return True for finite numeric values, excluding booleans."""
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _get_final_offer(
    history: list[dict[str, Any]],
    status: str,
    final_offer: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Get the final accepted offer, or the latest available offer."""
    if isinstance(final_offer, dict):
        return final_offer

    if status == "accepted":
        for turn in reversed(history):
            if turn.get("action") == "accept":
                offer = turn.get("offer")
                if isinstance(offer, dict):
                    return offer

    for turn in reversed(history):
        offer = turn.get("offer")
        if isinstance(offer, dict):
            return offer

    return {}


def _get_item_bounds(
    config: dict[str, Any],
) -> dict[str, dict[str, float]]:
    """Combine agent limits into feasible minimum and maximum bounds."""
    bounds: dict[str, dict[str, float]] = {}

    for agent in config.get("agents", []):
        for limit in agent.get("limits", []):
            item = limit.get("item")
            value = limit.get("value")
            limit_type = str(limit.get("type", "")).lower()

            if not item or not _is_number(value):
                continue

            bounds.setdefault(item, {})

            if limit_type == "min":
                current = bounds[item].get("min")
                bounds[item]["min"] = (
                    float(value) if current is None
                    else max(current, float(value))
                )
            elif limit_type == "max":
                current = bounds[item].get("max")
                bounds[item]["max"] = (
                    float(value) if current is None
                    else min(current, float(value))
                )

    return bounds


def _surplus_efficiency(
    offer: dict[str, Any],
    bounds: dict[str, dict[str, float]],
) -> float:
    """Measure how close the settlement is to the midpoint of each ZOPA."""
    scores = []

    for item, limits in bounds.items():
        if "min" not in limits or "max" not in limits:
            continue

        lower = limits["min"]
        upper = limits["max"]

        if upper < lower:
            continue

        value = offer.get(item)
        if not _is_number(value):
            scores.append(0.0)
            continue

        value = float(value)
        if value < lower or value > upper:
            scores.append(0.0)
            continue

        midpoint = (lower + upper) / 2
        half_width = (upper - lower) / 2

        if half_width == 0:
            score = 100.0 if value == midpoint else 0.0
        else:
            score = 100.0 * (1 - abs(value - midpoint) / half_width)

        scores.append(max(0.0, min(100.0, score)))

    return sum(scores) / len(scores) if scores else 50.0


def _concession_reciprocity(
    config: dict[str, Any],
    history: list[dict[str, Any]],
    bounds: dict[str, dict[str, float]],
) -> float:
    """Compare how much each agent moves its offers during negotiation."""
    agents = config.get("agents", [])

    if len(agents) < 2:
        return 50.0

    concession_totals = []

    for agent in agents:
        agent_id = agent.get("id")
        offers = [
            turn.get("offer", {})
            for turn in history
            if turn.get("agent_id") == agent_id
            and isinstance(turn.get("offer"), dict)
        ]

        if len(offers) < 2:
            concession_totals.append(0.0)
            continue

        item_movements = []

        for item, limits in bounds.items():
            first = offers[0].get(item)
            last = offers[-1].get(item)

            if not _is_number(first) or not _is_number(last):
                continue

            movement = abs(float(last) - float(first))

            if "min" in limits and "max" in limits:
                scale = limits["max"] - limits["min"]
            else:
                bound = limits.get("min", limits.get("max", 0.0))
                scale = abs(bound)

            if scale > 0:
                item_movements.append(min(1.0, movement / scale))
            elif movement > 0:
                item_movements.append(1.0)

        concession_totals.append(
            sum(item_movements) / len(item_movements)
            if item_movements else 0.0
        )

    largest = max(concession_totals, default=0.0)
    smallest = min(concession_totals, default=0.0)

    if largest == 0:
        return 50.0

    return max(0.0, min(100.0, (smallest / largest) * 100))


def _pacing_efficiency(
    config: dict[str, Any],
    history: list[dict[str, Any]],
    status: str,
) -> tuple[float, int]:
    """Reward agreements reached efficiently within the round limit."""
    max_rounds = config.get("max_rounds", 10)

    if not _is_number(max_rounds) or max_rounds <= 0:
        max_rounds = 10

    max_rounds = int(max_rounds)
    agent_count = max(1, len(config.get("agents", [])))

    recorded_rounds = [
        turn.get("round")
        for turn in history
        if _is_number(turn.get("round"))
    ]

    if recorded_rounds:
        rounds_taken = int(max(recorded_rounds))
    else:
        rounds_taken = math.ceil(len(history) / agent_count)

    rounds_taken = max(0, rounds_taken)

    if status != "accepted":
        return 0.0, rounds_taken

    if rounds_taken == 0:
        return 100.0, rounds_taken

    if max_rounds == 1:
        score = 100.0 if rounds_taken <= 1 else 0.0
    else:
        score = 100.0 * (
            1 - (rounds_taken - 1) / (max_rounds - 1)
        )

    return max(0.0, min(100.0, score)), rounds_taken


def _boundary_safety(
    config: dict[str, Any],
    offer: dict[str, Any],
    bounds: dict[str, dict[str, float]],
) -> float:
    """Reward settlements that respect reservation limits with a safety margin."""
    constrained_items = {
        limit.get("item")
        for agent in config.get("agents", [])
        for limit in agent.get("limits", [])
        if limit.get("item")
    }

    if not constrained_items:
        return 100.0

    scores = []

    for item in constrained_items:
        value = offer.get(item)

        if not _is_number(value):
            scores.append(0.0)
            continue

        value = float(value)
        limits = bounds.get(item, {})

        lower = limits.get("min")
        upper = limits.get("max")

        if lower is not None and value < lower:
            scores.append(0.0)
            continue

        if upper is not None and value > upper:
            scores.append(0.0)
            continue

        if lower is not None and upper is not None:
            half_width = (upper - lower) / 2

            if half_width <= 0:
                scores.append(100.0)
            else:
                margin = min(value - lower, upper - value)
                scores.append(
                    max(0.0, min(100.0, margin / half_width * 100))
                )
        elif upper is not None:
            scores.append(
                max(0.0, min(100.0, (upper - value) / max(abs(upper), 1.0) * 100))
            )
        elif lower is not None:
            scores.append(
                max(0.0, min(100.0, (value - lower) / max(abs(lower), 1.0) * 100))
            )

    return sum(scores) / len(scores) if scores else 100.0


def score_negotiation(
    config: dict[str, Any],
    history: list[dict[str, Any]],
    status: str,
    deadlock_event: dict[str, Any] | None = None,
    final_offer: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Calculate a weighted 0-100 resolution quality score."""
    history = history if isinstance(history, list) else []
    status = str(status).lower()

    offer = _get_final_offer(history, status, final_offer)
    bounds = _get_item_bounds(config)

    metric_scores = {
        "surplus_efficiency": _surplus_efficiency(offer, bounds),
        "concession_reciprocity": _concession_reciprocity(
            config, history, bounds
        ),
    }

    pacing_score, rounds_taken = _pacing_efficiency(
        config, history, status
    )
    metric_scores["pacing_efficiency"] = pacing_score
    metric_scores["boundary_safety"] = _boundary_safety(
        config, offer, bounds
    )

    breakdown = {
        metric: round(
            metric_scores[metric] * weight / 100, 2
        )
        for metric, weight in WEIGHTS.items()
    }

    overall_score = round(sum(breakdown.values()), 2)

    if status != "accepted":
        overall_score = min(overall_score, 39.0)

    overall_score = max(0.0, min(100.0, overall_score))

    if overall_score >= 85:
        tier = "Exceptional Win-Win Settlement"
    elif overall_score >= 70:
        tier = "Balanced Commercial Agreement"
    elif overall_score >= 50:
        tier = "One-Sided / Suboptimal Agreement"
    else:
        tier = "Impasse / High Friction Resolution"

    return {
        "overall_score": overall_score,
        "tier": tier,
        "breakdown": breakdown,
        "metric_scores": {
            key: round(value, 2)
            for key, value in metric_scores.items()
        },
        "weights": WEIGHTS.copy(),
        "rounds_taken": rounds_taken,
        "final_offer": offer,
        "status": status,
        "deadlock_event": deadlock_event,
    }
