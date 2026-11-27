
import pytest

from backend.scoring_engine import (
    WEIGHTS,
    _get_item_bounds,
    _surplus_efficiency,
    _concession_reciprocity,
    _pacing_efficiency,
    _boundary_safety,
    score_negotiation,
)


@pytest.fixture
def vendor_config():
    return {
        "max_rounds": 10,
        "agents": [
            {
                "id": "buyer",
                "limits": [
                    {"item": "price", "type": "max", "value": 40000}
                ],
            },
            {
                "id": "vendor",
                "limits": [
                    {"item": "price", "type": "min", "value": 35000}
                ],
            },
        ],
    }


def make_history(buyer_first=40000, buyer_last=37500,
                 vendor_first=35000, vendor_last=37500,
                 rounds=2):
    return [
        {
            "agent_id": "buyer",
            "round": 1,
            "action": "counter",
            "offer": {"price": buyer_first},
        },
        {
            "agent_id": "vendor",
            "round": 1,
            "action": "counter",
            "offer": {"price": vendor_first},
        },
        {
            "agent_id": "buyer",
            "round": rounds,
            "action": "counter",
            "offer": {"price": buyer_last},
        },
        {
            "agent_id": "vendor",
            "round": rounds,
            "action": "counter",
            "offer": {"price": vendor_last},
        },
    ]


# 1. Check that all four scoring weights are present.
def test_scoring_weights(vendor_config):
    assert WEIGHTS == {
        "surplus_efficiency": 30,
        "concession_reciprocity": 25,
        "pacing_efficiency": 25,
        "boundary_safety": 20,
    }


# 2. Check that the weights add up to 100.
def test_weights_total_100():
    assert sum(WEIGHTS.values()) == 100


# 3. Check that reservation limits are combined correctly.
def test_get_item_bounds(vendor_config):
    bounds = _get_item_bounds(vendor_config)
    assert bounds["price"]["min"] == 35000
    assert bounds["price"]["max"] == 40000


# 4. An offer at the ZOPA midpoint should get 100 surplus points.
def test_surplus_at_midpoint(vendor_config):
    bounds = _get_item_bounds(vendor_config)
    assert _surplus_efficiency({"price": 37500}, bounds) == 100


# 5. An offer at the lower boundary should get zero surplus points.
def test_surplus_at_lower_boundary(vendor_config):
    bounds = _get_item_bounds(vendor_config)
    assert _surplus_efficiency({"price": 35000}, bounds) == 0


# 6. An offer outside the ZOPA should get zero surplus points.
def test_surplus_outside_zopa(vendor_config):
    bounds = _get_item_bounds(vendor_config)
    assert _surplus_efficiency({"price": 42000}, bounds) == 0


# 7. A missing offer item should not receive surplus points.
def test_surplus_missing_item(vendor_config):
    bounds = _get_item_bounds(vendor_config)
    assert _surplus_efficiency({}, bounds) == 0


# 8. Equal concessions by both agents should score 100.
def test_equal_concessions(vendor_config):
    history = make_history()
    bounds = _get_item_bounds(vendor_config)

    score = _concession_reciprocity(
        vendor_config, history, bounds
    )

    assert score == 100


# 9. No concessions by either agent should receive a neutral score.
def test_no_concessions(vendor_config):
    history = make_history(
        buyer_first=37500,
        buyer_last=37500,
        vendor_first=37500,
        vendor_last=37500,
    )
    bounds = _get_item_bounds(vendor_config)

    score = _concession_reciprocity(
        vendor_config, history, bounds
    )

    assert score == 50


# 10. A missing agent should receive a lower reciprocity score.
def test_one_agent_does_not_concede(vendor_config):
    history = make_history(
        buyer_first=40000,
        buyer_last=40000,
        vendor_first=35000,
        vendor_last=37500,
    )
    bounds = _get_item_bounds(vendor_config)

    score = _concession_reciprocity(
        vendor_config, history, bounds
    )

    assert score == 0


# 11. An agreement in the first round should get full pacing points.
def test_accept_and_reject_actions_are_excluded_from_reciprocity():
    config = {
        "agents": [
            {"id": "buyer", "limits": [{"item": "price", "type": "max", "value": 80}]},
            {"id": "vendor", "limits": [{"item": "price", "type": "min", "value": 20}]},
        ],
    }
    bounds = _get_item_bounds(config)
    history = [
        {"agent_id": "buyer", "action": "counter", "offer": {"price": 80}},
        {"agent_id": "vendor", "action": "counter", "offer": {"price": 20}},
        {"agent_id": "buyer", "action": "counter", "offer": {"price": 70}},
        {"agent_id": "vendor", "action": "counter", "offer": {"price": 50}},
        {"agent_id": "buyer", "action": "accept", "offer": {"price": 50}},
    ]

    score = _concession_reciprocity(config, history, bounds)
    history.append(
        {"agent_id": "vendor", "action": "reject", "offer": {"price": 80}}
    )
    score_with_reject = _concession_reciprocity(config, history, bounds)

    assert score == pytest.approx(100 / 3)
    assert score_with_reject == pytest.approx(100 / 3)


def test_pacing_first_round(vendor_config):
    history = make_history(rounds=1)

    score, rounds = _pacing_efficiency(
        vendor_config, history, "accepted"
    )

    assert score == 100
    assert rounds == 1


# 12. An agreement in the final round should get zero pacing points.
def test_pacing_last_round(vendor_config):
    history = make_history(rounds=10)

    score, rounds = _pacing_efficiency(
        vendor_config, history, "accepted"
    )

    assert score == 0
    assert rounds == 10


# 13. A deadlock should receive zero pacing points.
def test_deadlock_pacing(vendor_config):
    history = make_history(rounds=5)

    score, _ = _pacing_efficiency(
        vendor_config, history, "deadlock"
    )

    assert score == 0


# 14. A settlement at the midpoint should have full boundary safety.
def test_boundary_safety_midpoint(vendor_config):
    bounds = _get_item_bounds(vendor_config)

    score = _boundary_safety(
        vendor_config, {"price": 37500}, bounds
    )

    assert score == 100


# 15. A settlement at a reservation boundary should have zero safety.
def test_boundary_safety_at_limit(vendor_config):
    bounds = _get_item_bounds(vendor_config)

    score = _boundary_safety(
        vendor_config, {"price": 35000}, bounds
    )

    assert score == 0


# 16. A settlement outside the reservation limits should have zero safety.
def test_boundary_safety_outside_limit(vendor_config):
    bounds = _get_item_bounds(vendor_config)

    score = _boundary_safety(
        vendor_config, {"price": 45000}, bounds
    )

    assert score == 0


# 17. A fair win-win settlement should score at least 85.
def test_fair_win_win_score(vendor_config):
    history = make_history()

    result = score_negotiation(
        vendor_config,
        history,
        "accepted",
    )

    assert result["overall_score"] >= 85
    assert result["tier"] == "Exceptional Win-Win Settlement"


# 18. A one-sided settlement should score between 50 and 70.
def test_one_sided_settlement_score(vendor_config):
    history = make_history(
        buyer_first=38500,
        buyer_last=38500,
        vendor_first=38500,
        vendor_last=38500,
    )

    result = score_negotiation(
        vendor_config,
        history,
        "accepted",
    )

    assert 50 <= result["overall_score"] <= 70


# 19. A deadlocked negotiation should score below 40.
def test_deadlock_score_below_40(vendor_config):
    history = make_history(rounds=5)

    result = score_negotiation(
        vendor_config,
        history,
        "deadlock",
        deadlock_event={"type": "max_rounds"},
    )

    assert result["overall_score"] < 40


def test_deadlock_cap_adjustment_reconciles_breakdown(vendor_config):
    result = score_negotiation(
        vendor_config,
        make_history(rounds=5),
        "deadlock",
        deadlock_event={"type": "max_rounds"},
    )

    assert result["overall_score"] == 39
    assert sum(
        value for key, value in result["breakdown"].items()
        if key != "cap_adjustment"
    ) == 75
    assert result["breakdown"]["cap_adjustment"] == -36
    assert sum(result["breakdown"].values()) == result["overall_score"]


# 20. The result should contain all required scoring information.
def test_result_structure(vendor_config):
    result = score_negotiation(
        vendor_config,
        make_history(),
        "accepted",
    )

    assert "overall_score" in result
    assert "tier" in result
    assert "breakdown" in result
    assert "metric_scores" in result
    assert "weights" in result
    assert "rounds_taken" in result
    assert "final_offer" in result
    assert "cap_adjustment" in result["breakdown"]


# 21. The final score should stay between 0 and 100.
def test_score_is_within_range(vendor_config):
    result = score_negotiation(
        vendor_config,
        make_history(),
        "accepted",
    )

    assert 0 <= result["overall_score"] <= 100


# 22. A rejected negotiation should also score below 40.
def test_rejected_score_below_40(vendor_config):
    result = score_negotiation(
        vendor_config,
        make_history(),
        "rejected",
    )

    assert result["overall_score"] < 40
