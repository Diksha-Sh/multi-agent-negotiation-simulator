"""Tests for counteroffer evaluation against the configured scenario format."""

from __future__ import annotations

import pytest

import backend.llm_engine as engine_module
from backend.counteroffer import evaluate_offer
from backend.llm_engine import make_agent_engine
from backend.orchestrator import NegotiationState
from backend.scenario_loader import build_negotiation_config

SCENARIOS = ("vendor_pricing", "job_offer", "project_budget_allocation")


@pytest.mark.parametrize("scenario_id", SCENARIOS)
def test_evaluate_offer_accepts_existing_scenario_agent_configs(scenario_id):
    config = build_negotiation_config(scenario_id)

    for agent in config["agents"]:
        offer = {limit["item"]: limit["value"] for limit in agent["limits"]}
        decision = evaluate_offer(offer, agent)

        assert decision["action"] in ("accept", "counter", "reject")
        assert decision["stance"] in ("firm", "flexible", "urgent")
        if decision["action"] == "counter":
            assert set(decision["counteroffer"]) == set(offer)
            for limit in agent["limits"]:
                value = decision["counteroffer"][limit["item"]]
                assert value <= limit["value"] if limit["type"] == "max" else value >= limit["value"]


def test_real_counteroffer_evaluation_is_used_by_rule_engine(monkeypatch):
    config = build_negotiation_config("vendor_pricing")
    vendor = config["agents"][1]
    state = NegotiationState(
        scenario_id="vendor_pricing",
        agents=config["agents"],
        history=[
            {
                "agent_id": "buyer",
                "round": 1,
                "action": "counter",
                "offer": {"price": 36800},
                "reasoning": "The current price proposal.",
                "stance": "flexible",
            }
        ],
        round=1,
    )
    monkeypatch.setattr(engine_module, "_counteroffer_fn", lambda: evaluate_offer)

    turn = make_agent_engine(max_rounds=10, use_llm=False)(state, vendor)

    assert turn["action"] == "counter"
    assert turn["offer"] == evaluate_offer({"price": 36800}, vendor)["counteroffer"]
    assert turn["offer"]["price"] >= vendor["limits"][0]["value"]
