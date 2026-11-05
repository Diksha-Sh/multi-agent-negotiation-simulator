"""Tests for the Deadlock Detection and Resolution Module (backend/deadlock.py).

Run from the repo root:  python -m pytest tests/test_deadlock.py -v
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend import llm_engine as engine_mod  # noqa: E402
from backend.deadlock import (  # noqa: E402
    LADDER,
    active_resolution,
    check_deadlock,
    deadlock_settings,
    resolve_deadlock,
)
from backend.llm_engine import make_agent_engine, recommend_move  # noqa: E402
from backend.main import app  # noqa: E402
from backend.orchestrator import NegotiationOrchestrator, Turn  # noqa: E402
from backend.scenario_loader import build_negotiation_config  # noqa: E402
from backend.validation import validate_config  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    """Never call a real LLM in these tests."""
    monkeypatch.setattr(engine_mod, "get_llm_settings", lambda: {
        "enabled": False, "api_key": "", "base_url": "", "model": "", "temperature": 0.0,
        "timeout": 1.0, "max_tokens": 10,
    })


@pytest.fixture
def config() -> dict:
    """Buyer (max 40000) vs vendor (min 35000), 20 rounds so the limit is not the cause."""
    return {
        "scenario_id": "test",
        "title": "Test",
        "description": "Test scenario",
        "max_rounds": 20,
        "agents": [
            {"id": "buyer", "name": "Buyer", "role": "Procurement", "goal": "Get a price of 35500",
             "constraints": ["Budget 40000"], "personality": "Collaborative",
             "limits": [{"item": "price", "type": "max", "value": 40000, "unit": "INR"}]},
            {"id": "vendor", "name": "Vendor", "role": "Sales", "goal": "Get a price of 39500",
             "constraints": ["Floor 35000"], "personality": "Collaborative",
             "limits": [{"item": "price", "type": "min", "value": 35000, "unit": "INR"}]},
        ],
    }


def _turn(agent_id: str, n: int, price: float, action: str = "counter") -> Turn:
    return Turn(agent_id=agent_id, round=n, action=action, offer={"price": price},
                reasoning="", stance="firm")


def _play(config: dict, prices: list[float]):
    """Step the orchestrator through buyer/vendor counters with the given prices."""
    orch = NegotiationOrchestrator(config)
    state = orch.start()
    for n, price in enumerate(prices, start=1):
        agent = "buyer" if n % 2 else "vendor"
        state = orch.step(state, _turn(agent, n, price))
    return orch, state


def _scripted_run(config: dict, script: dict[str, float]):
    """AI engine for everyone except the agents in ``script``, who always repeat one price."""
    engine = make_agent_engine(config["max_rounds"], use_llm=False)

    def agent_fn(state, agent):
        if agent["id"] in script:
            return _turn(agent["id"], state.round + 1, script[agent["id"]])
        return engine(state, agent)

    orch = NegotiationOrchestrator(config)
    return orch.run_loop(agent_fn)


# --- detection ---------------------------------------------------------------

def test_no_deadlock_while_both_sides_move(config):
    _, state = _play(config, [36000, 39000, 36800, 38200, 37300])
    assert state.status == "ongoing"
    assert state.deadlock_event is None


def test_same_position_when_both_sides_repeat(config):
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    event = state.deadlock_event
    assert event["type"] == "same_position"
    assert event["round_triggered"] == 6
    assert event["resolution_attempt"] == "suggest_compromise"
    assert event["resolution_outcome"] is None
    assert event["compromise_offer"] == {"price": 37500}
    assert state.status == "ongoing"


def test_repeated_rejection_when_one_side_holds(config):
    # Buyer repeats 36000 three times while the vendor keeps conceding.
    _, state = _play(config, [36000, 39500, 36000, 39000, 36000])
    event = state.deadlock_event
    assert event["type"] == "repeated_rejection"
    assert "3 times" in event["details"]


def test_stall_when_moves_are_tiny(config):
    _, state = _play(config, [36000, 39000, 36100, 38900, 36150, 38850])
    event = state.deadlock_event
    assert event["type"] == "stall"
    assert "less than 1%" in event["details"]


def test_max_rounds_event_replaces_open_attempt(config):
    config["max_rounds"] = 8
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000, 36000, 39000])
    assert state.status == "deadlock"
    event = state.deadlock_event
    assert event["type"] == "max_rounds"
    assert event["resolution_outcome"] == "breakdown"
    assert event["attempts"][0]["type"] == "same_position"


def test_check_deadlock_is_idempotent_for_the_same_turn(config):
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    assert check_deadlock(state, config) == state.deadlock_event


def test_settings_come_from_config(config):
    config["deadlock"] = {"stall_rounds": 3, "min_move_pct": 5, "rejection_limit": 4}
    assert deadlock_settings(config) == {"stall_rounds": 3, "min_move_pct": 5, "rejection_limit": 4}
    # With 3 required rounds, two repeats are not enough any more.
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    assert state.deadlock_event is None
    assert deadlock_settings({}) == {"stall_rounds": 2, "min_move_pct": 1.0, "rejection_limit": 3}


def test_empty_history_has_no_deadlock(config):
    orch = NegotiationOrchestrator(config)
    assert check_deadlock(orch.start(), config) is None


# --- resolution ladder --------------------------------------------------------

def test_ladder_order_and_breakdown(config):
    # Both sides never move: compromise -> stance change -> final round -> breakdown.
    prices = [36000, 39000] * 9
    orch = NegotiationOrchestrator(config)
    state = orch.start()
    seen = []
    for n, price in enumerate(prices, start=1):
        state = orch.step(state, _turn("buyer" if n % 2 else "vendor", n, price))
        event = state.deadlock_event
        if event and (not seen or seen[-1] != event["resolution_attempt"]):
            seen.append(event["resolution_attempt"])
        if state.status != "ongoing":
            break
    assert seen == list(LADDER)
    assert state.status == "deadlock"
    assert state.deadlock_event["resolution_outcome"] == "breakdown"
    assert len(state.deadlock_event["attempts"]) == 3


def test_attempt_marked_resolved_when_both_sides_move_again(config):
    orch, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    state = orch.step(state, _turn("buyer", 7, 37000))
    assert state.deadlock_event["resolution_outcome"] is None  # only one side moved
    state = orch.step(state, _turn("vendor", 8, 38000))
    assert state.deadlock_event["resolution_outcome"] == "compromise"
    assert state.deadlock_event["resolved_round"] == 8


def test_accept_after_attempt_records_outcome(config):
    orch, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    state = orch.step(state, _turn("buyer", 7, 39000, action="accept"))
    assert state.status == "accepted"
    assert state.deadlock_event["resolution_outcome"] == "compromise"


def test_reject_after_attempt_is_breakdown(config):
    orch, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    state = orch.step(state, _turn("buyer", 7, 39000, action="reject"))
    assert state.status == "rejected"
    assert state.deadlock_event["resolution_outcome"] == "breakdown"


def test_final_round_gives_each_agent_one_turn(config):
    prices = [36000, 39000] * 7  # up to the final-round trigger at turn 14
    _, state = _play(config, prices)
    assert state.deadlock_event["resolution_attempt"] == "trigger_final_round"
    orch = NegotiationOrchestrator(config)
    replay = orch.start()
    for n, price in enumerate(prices + [36000], start=1):
        replay = orch.step(replay, _turn("buyer" if n % 2 else "vendor", n, price))
    assert replay.status == "ongoing"  # vendor still has its last turn
    replay = orch.step(replay, _turn("vendor", 16, 39000))
    assert replay.status == "deadlock"
    assert replay.deadlock_event["resolution_attempt"] == "declare_breakdown"


def test_compromise_stays_inside_both_limits(config):
    # Buyer offers far below the vendor's floor: the midpoint is pulled up to 35000.
    _, state = _play(config, [30000, 39000, 30000, 39000, 30000, 39000])
    assert state.deadlock_event["compromise_offer"] == {"price": 35000}


def test_no_compromise_without_a_deal_zone_skips_to_stance(config):
    config["agents"][0]["limits"][0]["value"] = 34000  # buyer max < vendor min
    _, state = _play(config, [33000, 36000, 33000, 36000, 33000, 36000])
    event = state.deadlock_event
    assert event["resolution_attempt"] == "modify_stance"
    assert "compromise_offer" not in event


def test_resolve_deadlock_actions(config):
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    action = resolve_deadlock(state, state.deadlock_event)
    assert action == {
        "action": "suggest_compromise",
        "status": "ongoing",
        "message": state.deadlock_event["message"],
        "compromise_offer": {"price": 37500},
        "recommended_stance": "flexible",
    }
    assert resolve_deadlock(state, {"type": "max_rounds"})["status"] == "deadlock"
    assert resolve_deadlock(state, {"resolution_attempt": "trigger_final_round"})["turns_left"] == 2


# --- the engine follows the resolution ---------------------------------------

def test_active_resolution_only_while_attempt_is_open(config):
    orch, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    assert active_resolution(state)["attempt"] == "suggest_compromise"
    state = orch.step(state, _turn("buyer", 7, 37000))
    state = orch.step(state, _turn("vendor", 8, 38000))
    assert active_resolution(state) is None  # resolved


def test_engine_moves_to_the_compromise(config):
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    move = recommend_move(state, config["agents"][0], config["max_rounds"])
    assert move["offer"]["price"] == 37500
    assert move["stance"] == "flexible"
    assert any("Deadlock resolution active" in n for n in move["notes"])


def test_engine_accepts_in_final_round_when_offer_is_inside_limits(config):
    _, state = _play(config, [36000, 39000] * 7)
    assert active_resolution(state)["attempt"] == "trigger_final_round"
    move = recommend_move(state, config["agents"][0], config["max_rounds"])
    assert move["action"] == "accept"
    assert move["offer"] == {"price": 39000}


def test_prompt_tells_the_llm_about_the_mediator(config):
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    agent = config["agents"][0]
    move = recommend_move(state, agent, config["max_rounds"])
    user_message = engine_mod.build_prompt(state, agent, move, config["max_rounds"])[1]["content"]
    assert "Mediator suggests meeting in the middle: price 37,500." in user_message


def test_stubborn_buyer_ends_in_a_deal_via_the_ladder():
    config = build_negotiation_config("vendor_pricing")
    config["max_rounds"] = 20
    state = _scripted_run(config, {"buyer": 35200})
    assert state.status == "accepted"
    assert state.history[-1]["offer"] == {"price": 35200}
    assert state.deadlock_event["resolution_outcome"] in ("compromise", "stance_change", "final_round")


@pytest.mark.parametrize("scenario", ["vendor_pricing", "job_offer", "project_budget_allocation"])
def test_normal_runs_are_not_disturbed(scenario):
    config = build_negotiation_config(scenario)
    state = NegotiationOrchestrator(config).run_loop(make_agent_engine(config["max_rounds"], use_llm=False))
    assert state.status == "accepted"
    assert state.deadlock_event is None


# --- config validation ---------------------------------------------------------

def test_valid_deadlock_settings_pass(config):
    config["deadlock"] = {"stall_rounds": 3, "min_move_pct": 0.5, "rejection_limit": 4}
    assert validate_config(config)["valid"] is True


@pytest.mark.parametrize("settings", [
    {"stall_rounds": 0}, {"stall_rounds": 2.5}, {"rejection_limit": 1},
    {"min_move_pct": -1}, {"min_move_pct": "x"}, "fast",
])
def test_bad_deadlock_settings_fail(config, settings):
    config["deadlock"] = settings
    result = validate_config(config)
    assert result["valid"] is False
    assert any("eadlock setting" in e for e in result["errors"])


# --- API ----------------------------------------------------------------------

def _api_config(config: dict) -> dict:
    api = copy.deepcopy(config)
    api["max_rounds"] = 10
    return api


def _history(prices: list[float]) -> list[dict]:
    return [dict(_turn("buyer" if n % 2 else "vendor", n, p)) for n, p in enumerate(prices, start=1)]


def test_api_check_deadlock_detects_and_resolves(config):
    res = client.post("/api/orchestrator/check-deadlock",
                      json={"config": _api_config(config), "history": _history([36000, 39000] * 3)})
    assert res.status_code == 200
    body = res.json()
    assert body["deadlock_detected"] is True
    assert body["active"] is True
    assert body["deadlock_event"]["type"] == "same_position"
    assert body["resolution"]["compromise_offer"] == {"price": 37500}
    assert body["status"] == "ongoing"


def test_api_check_deadlock_no_deadlock(config):
    res = client.post("/api/orchestrator/check-deadlock",
                      json={"config": _api_config(config), "history": _history([36000, 39000, 36800])})
    assert res.status_code == 200
    assert res.json()["deadlock_detected"] is False
    assert res.json()["resolution"] is None


def test_api_check_deadlock_rejects_wrong_turn_order(config):
    history = _history([36000, 39000])
    history.reverse()
    res = client.post("/api/orchestrator/check-deadlock", json={"config": _api_config(config), "history": history})
    assert res.status_code == 422


def test_api_check_deadlock_rejects_bad_input(config):
    assert client.post("/api/orchestrator/check-deadlock",
                       json={"config": {"scenario_id": ""}, "history": []}).status_code == 400
    assert client.post("/api/orchestrator/check-deadlock",
                       json={"config": _api_config(config), "history": "x"}).status_code == 422


def test_api_step_returns_deadlock_event_automatically(config):
    # The check runs inside the loop: /step returns the event without a separate call.
    res = client.post("/api/orchestrator/step?engine=llm",
                      json={"config": _api_config(config), "history": _history([36000, 39000] * 3)})
    assert res.status_code == 200
    body = res.json()
    assert body["deadlock_event"]["resolution_attempt"] == "suggest_compromise"
    # Buyer moves at least up to the mediator's midpoint (never less of a concession).
    assert 37500 <= body["turn"]["offer"]["price"] < 39000


def test_swagger_documents_check_deadlock():
    schema = client.get("/openapi.json").json()
    op = schema["paths"]["/api/orchestrator/check-deadlock"]["post"]
    assert "stuck" in op["summary"]
    assert {"200", "400", "422"} <= set(op["responses"])


# --- the LLM reply is held to the mediator's step (guardrails) ---------------

def test_guardrails_raise_a_stubborn_llm_counter_to_the_compromise(config):
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    agent = config["agents"][0]
    move = recommend_move(state, agent, config["max_rounds"])
    llm_reply = {"action": "counter", "offer": {"price": 36000}, "stance": "firm", "reasoning": "Holding."}
    final = engine_mod.apply_guardrails(llm_reply, state, agent, move)
    assert final["action"] == "counter"
    assert final["offer"]["price"] == move["offer"]["price"] == 37500
    assert final["stance"] == "flexible"


def test_guardrails_keep_a_bigger_llm_concession(config):
    _, state = _play(config, [36000, 39000, 36000, 39000, 36000, 39000])
    agent = config["agents"][0]
    move = recommend_move(state, agent, config["max_rounds"])
    llm_reply = {"action": "counter", "offer": {"price": 38000}, "stance": "flexible", "reasoning": ""}
    assert engine_mod.apply_guardrails(llm_reply, state, agent, move)["offer"]["price"] == 38000


def test_guardrails_accept_in_final_round_even_if_llm_counters(config):
    _, state = _play(config, [36000, 39000] * 7)
    agent = config["agents"][0]
    move = recommend_move(state, agent, config["max_rounds"])
    assert move["action"] == "accept"
    llm_reply = {"action": "counter", "offer": {"price": 36000}, "stance": "firm", "reasoning": "One more try."}
    final = engine_mod.apply_guardrails(llm_reply, state, agent, move)
    assert final["action"] == "accept"
    assert final["offer"] == {"price": 39000}


def test_guardrails_unchanged_without_a_deadlock(config):
    _, state = _play(config, [36000, 39000, 36800])
    agent = config["agents"][1]
    move = recommend_move(state, agent, config["max_rounds"])
    llm_reply = {"action": "counter", "offer": {"price": 39000}, "stance": "firm", "reasoning": ""}
    assert engine_mod.apply_guardrails(llm_reply, state, agent, move)["offer"]["price"] == 39000
