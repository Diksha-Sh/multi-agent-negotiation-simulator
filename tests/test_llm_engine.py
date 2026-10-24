"""Tests for the LLM Reasoning Engine (Task 2). No network calls: the LLM is mocked."""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import backend.llm_engine as engine_mod
from backend.llm_engine import (
    apply_guardrails,
    build_prompt,
    make_agent_engine,
    my_agent_engine,
    parse_llm_reply,
    recommend_move,
)
from backend.orchestrator import NegotiationOrchestrator, NegotiationState
from backend.scenario_loader import build_negotiation_config

SCENARIOS = ["vendor_pricing", "job_offer", "project_budget_allocation"]
PERSONALITIES = ["Aggressive", "Collaborative", "Risk-Averse"]
TURN_KEYS = {"agent_id", "round", "action", "offer", "reasoning", "stance"}

LLM_SETTINGS = {"api_key": "test-key", "base_url": "http://llm.test", "model": "test-model",
                "temperature": 0.0, "timeout": 5.0, "enabled": True}


@pytest.fixture(autouse=True)
def rule_based_by_default(monkeypatch):
    """Ignore any real key in .env and the counteroffer module, so tests are repeatable."""
    monkeypatch.setattr(engine_mod, "get_llm_settings", lambda: {**LLM_SETTINGS, "api_key": "", "enabled": False})
    monkeypatch.setattr(engine_mod, "_counteroffer_fn", lambda: None)


@pytest.fixture
def llm_on(monkeypatch):
    monkeypatch.setattr(engine_mod, "get_llm_settings", lambda: dict(LLM_SETTINGS))


def mock_llm(monkeypatch, replies):
    """Make _call_llm return the given replies in order (the last one repeats)."""
    calls = []

    def fake(messages, settings):
        calls.append(messages)
        reply = replies[min(len(calls) - 1, len(replies) - 1)]
        if isinstance(reply, Exception):
            raise reply
        return reply if isinstance(reply, str) else json.dumps(reply)

    monkeypatch.setattr(engine_mod, "_call_llm", fake)
    return calls


def run(scenario_id, personalities=None, engine=None):
    config = build_negotiation_config(scenario_id, personalities or {})
    orch = NegotiationOrchestrator(config)
    return config, orch.run_loop(engine or make_agent_engine(orch.max_rounds))


def limits_of(config, agent_id):
    agent = next(a for a in config["agents"] if a["id"] == agent_id)
    return {l["item"]: l for l in agent["limits"]}


def respects(value, limit):
    return value <= limit["value"] if limit["type"] == "max" else value >= limit["value"]


def vendor_state(history=None, round_=None):
    config = build_negotiation_config("vendor_pricing")
    history = history or []
    return config, NegotiationState(scenario_id="vendor_pricing", agents=config["agents"],
                                    history=history, round=len(history) if round_ is None else round_)


# ----------------------------------------------------------------------------
# 1. Contract with the Orchestrator
# ----------------------------------------------------------------------------

@pytest.mark.parametrize("scenario_id", SCENARIOS)
def test_turns_match_the_locked_contract(scenario_id):
    _, state = run(scenario_id)
    for i, turn in enumerate(state.history, start=1):
        assert set(turn) == TURN_KEYS
        assert turn["round"] == i
        assert turn["action"] in ("accept", "counter", "reject")
        assert turn["stance"] in ("firm", "flexible", "urgent")
        assert isinstance(turn["offer"], dict) and turn["offer"]
        assert isinstance(turn["reasoning"], str) and turn["reasoning"]


def test_agents_alternate():
    _, state = run("vendor_pricing")
    ids = [t["agent_id"] for t in state.history]
    assert ids[0::2] == ["buyer"] * len(ids[0::2])
    assert ids[1::2] == ["vendor"] * len(ids[1::2])


def test_my_agent_engine_plugs_into_run_loop():
    _, state = run("vendor_pricing", engine=my_agent_engine)
    assert state.status in ("accepted", "deadlock")


# ----------------------------------------------------------------------------
# 2. Rule-based negotiation (no API key)
# ----------------------------------------------------------------------------

@pytest.mark.parametrize("scenario_id", SCENARIOS)
@pytest.mark.parametrize("personality", PERSONALITIES)
def test_every_scenario_reaches_a_deal(scenario_id, personality):
    config = build_negotiation_config(scenario_id)
    choices = {a["id"]: personality for a in config["agents"]}
    _, state = run(scenario_id, choices)
    assert state.status == "accepted"
    assert state.winner == state.history[-1]["agent_id"]


@pytest.mark.parametrize("scenario_id", SCENARIOS)
def test_every_offer_stays_inside_the_agents_limits(scenario_id):
    config, state = run(scenario_id)
    for turn in state.history:
        if turn["action"] == "counter":
            for item, limit in limits_of(config, turn["agent_id"]).items():
                assert respects(turn["offer"][item], limit), turn


def test_accepted_deal_is_inside_both_sides_limits():
    config, state = run("vendor_pricing")
    price = state.history[-1]["offer"]["price"]
    assert 35000 <= price <= 40000


def test_agents_never_take_back_a_concession():
    _, state = run("vendor_pricing", {"buyer": "Aggressive", "vendor": "Aggressive"})
    buyer = [t["offer"]["price"] for t in state.history if t["agent_id"] == "buyer" and t["action"] == "counter"]
    vendor = [t["offer"]["price"] for t in state.history if t["agent_id"] == "vendor" and t["action"] == "counter"]
    assert buyer == sorted(buyer)
    assert vendor == sorted(vendor, reverse=True)


def test_aggressive_holds_out_longer_than_risk_averse():
    _, tough = run("vendor_pricing", {"buyer": "Aggressive", "vendor": "Aggressive"})
    _, soft = run("vendor_pricing", {"buyer": "Risk-Averse", "vendor": "Risk-Averse"})
    assert tough.round > soft.round


def test_no_zone_of_agreement_never_breaks_limits():
    config = build_negotiation_config("vendor_pricing")
    config["agents"][0]["limits"][0]["value"] = 30000  # buyer max below vendor min (35000)
    orch = NegotiationOrchestrator(config)
    state = orch.run_loop(make_agent_engine(orch.max_rounds))
    assert state.status == "deadlock"
    for turn in state.history:
        price = turn["offer"]["price"]
        assert price <= 30000 if turn["agent_id"] == "buyer" else price >= 35000


def test_remote_days_are_whole_numbers():
    _, state = run("job_offer")
    for turn in state.history:
        assert isinstance(turn["offer"]["remote_days"], int)


def test_opening_move_has_no_incoming_offer():
    config, state = vendor_state()
    move = recommend_move(state, config["agents"][0], 10)
    assert move["action"] == "counter"
    assert move["offer"]["price"] < 37000  # buyer anchors below its 37000 goal


# ----------------------------------------------------------------------------
# 3. Counteroffer module hook (Harini's evaluate_offer)
# ----------------------------------------------------------------------------

def test_counteroffer_module_accept_is_used(monkeypatch):
    calls = []

    def evaluate_offer(incoming, agent):
        calls.append((incoming, agent["id"]))
        return {"action": "accept", "counteroffer": None, "reasoning": "ok", "stance": "flexible"}

    monkeypatch.setattr(engine_mod, "_counteroffer_fn", lambda: evaluate_offer)
    _, state = run("vendor_pricing")
    assert calls and calls[0] == ({"price": state.history[0]["offer"]["price"]}, "vendor")
    assert state.history[1]["action"] == "accept"


def test_counteroffer_module_errors_do_not_stop_the_negotiation(monkeypatch):
    def broken(incoming, agent):
        raise ValueError("boom")

    monkeypatch.setattr(engine_mod, "_counteroffer_fn", lambda: broken)
    _, state = run("vendor_pricing")
    assert state.status == "accepted"


# ----------------------------------------------------------------------------
# 4. LLM path (mocked)
# ----------------------------------------------------------------------------

def test_prompt_contains_persona_goal_limits_personality_and_history():
    config, state = vendor_state([
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 35800},
         "reasoning": "Let's start here.", "stance": "flexible"},
    ])
    vendor = config["agents"][1]
    move = recommend_move(state, vendor, 10)
    system, user = (m["content"] for m in build_prompt(state, vendor, move, 10))
    assert "Sales Representative" in system
    assert vendor["goal"] in system
    assert "at least 35000" in system
    assert "Risk-Averse" in system
    assert "35800" in user and "Let's start here." in user
    assert "turn 2 of 10" in user


def test_llm_reply_is_used(monkeypatch, llm_on):
    calls = mock_llm(monkeypatch, [{"action": "counter", "offer": {"price": 36000},
                                    "reasoning": "Let's meet in the middle.", "stance": "firm"}])
    config, state = vendor_state()
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert calls
    assert turn["offer"] == {"price": 36000}
    assert turn["reasoning"] == "Let's meet in the middle."
    assert turn["stance"] == "firm"


def test_llm_offer_outside_limits_is_clamped(monkeypatch, llm_on):
    mock_llm(monkeypatch, [{"action": "counter", "offer": {"price": 99999}, "reasoning": "x", "stance": "firm"}])
    config, state = vendor_state()
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert turn["offer"]["price"] == 40000


def test_llm_cannot_accept_when_nothing_is_on_the_table(monkeypatch, llm_on):
    mock_llm(monkeypatch, [{"action": "accept", "offer": {}, "reasoning": "deal", "stance": "flexible"}])
    config, state = vendor_state()
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert turn["action"] == "counter"


def test_llm_cannot_walk_away_from_a_valid_offer(monkeypatch, llm_on):
    mock_llm(monkeypatch, [{"action": "reject", "offer": {}, "reasoning": "no", "stance": "firm"}])
    config, state = vendor_state([
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 36000},
         "reasoning": "", "stance": "flexible"},
    ])
    turn = make_agent_engine(10)(state, config["agents"][1])
    assert turn["action"] == "counter"
    assert turn["offer"]["price"] >= 35000


def test_llm_may_reject_an_offer_that_breaks_limits(monkeypatch, llm_on):
    mock_llm(monkeypatch, [{"action": "reject", "offer": {}, "reasoning": "Too low.", "stance": "firm"}])
    config, state = vendor_state([
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 20000},
         "reasoning": "", "stance": "firm"},
    ])
    turn = make_agent_engine(10)(state, config["agents"][1])
    assert turn["action"] == "reject"


def test_llm_accept_takes_the_incoming_terms(monkeypatch, llm_on):
    mock_llm(monkeypatch, [{"action": "accept", "offer": {"price": 1}, "reasoning": "Deal.", "stance": "flexible"}])
    config, state = vendor_state([
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 37500},
         "reasoning": "", "stance": "flexible"},
    ])
    turn = make_agent_engine(10)(state, config["agents"][1])
    assert turn["action"] == "accept"
    assert turn["offer"] == {"price": 37500}


def test_llm_cannot_take_back_a_concession(monkeypatch, llm_on):
    mock_llm(monkeypatch, [{"action": "counter", "offer": {"price": 34000}, "reasoning": "x", "stance": "firm"}])
    config, state = vendor_state([
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 36000}, "reasoning": "", "stance": "firm"},
        {"agent_id": "vendor", "round": 2, "action": "counter", "offer": {"price": 38000}, "reasoning": "", "stance": "firm"},
    ])
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert turn["offer"]["price"] == 36000


def test_bad_values_are_replaced(monkeypatch, llm_on):
    mock_llm(monkeypatch, [{"action": "dance", "offer": {"price": "cheap"}, "reasoning": "", "stance": "angry"}])
    config, state = vendor_state()
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert turn["action"] == "counter"
    assert turn["stance"] in ("firm", "flexible", "urgent")
    assert isinstance(turn["offer"]["price"], int)
    assert turn["reasoning"]


def test_llm_failure_falls_back_to_rules(monkeypatch, llm_on):
    calls = mock_llm(monkeypatch, [RuntimeError("network down")])
    config, state = vendor_state()
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert len(calls) == 2  # one retry
    assert turn["action"] == "counter" and turn["reasoning"]


def test_garbage_reply_falls_back_to_rules(monkeypatch, llm_on):
    mock_llm(monkeypatch, ["Sorry, I cannot help with that."])
    config, state = vendor_state()
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert turn["offer"]["price"] <= 40000


def test_full_negotiation_with_llm_mock(monkeypatch, llm_on):
    mock_llm(monkeypatch, ["not json"])  # every call fails -> rules each turn
    _, state = run("job_offer")
    assert state.status == "accepted"


@pytest.mark.parametrize("text", [
    '{"action": "counter", "offer": {"price": 1}, "reasoning": "r", "stance": "firm"}',
    '```json\n{"action": "counter", "offer": {"price": 1}, "reasoning": "r", "stance": "firm"}\n```',
    'Here is my move: {"action": "counter", "offer": {"price": 1}, "reasoning": "r", "stance": "firm"} Thanks',
])
def test_parse_llm_reply_formats(text):
    assert parse_llm_reply(text)["offer"] == {"price": 1}


@pytest.mark.parametrize("text", ["", "no json here", "[1, 2]"])
def test_parse_llm_reply_rejects_garbage(text):
    with pytest.raises(ValueError):
        parse_llm_reply(text)


def test_guardrails_keep_every_item():
    config = build_negotiation_config("job_offer")
    state = NegotiationState(scenario_id="job_offer", agents=config["agents"])
    candidate = config["agents"][0]
    move = recommend_move(state, candidate, 10)
    result = apply_guardrails({"action": "counter", "offer": {"salary": 20}, "reasoning": "r", "stance": "firm"},
                              state, candidate, move)
    assert set(result["offer"]) == {"salary", "remote_days"}


# ----------------------------------------------------------------------------
# 5. Settings
# ----------------------------------------------------------------------------

def test_settings_need_a_key_to_enable_llm(monkeypatch):
    monkeypatch.undo()
    for name in ("LLM_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"):
        monkeypatch.setenv(name, "")
    monkeypatch.setattr(engine_mod, "_load_dotenv", lambda: None)
    assert engine_mod.get_llm_settings()["enabled"] is False
    monkeypatch.setenv("LLM_API_KEY", "abc")
    assert engine_mod.get_llm_settings()["enabled"] is True
    monkeypatch.setenv("LLM_ENABLED", "false")
    assert engine_mod.get_llm_settings()["enabled"] is False


def test_engine_status_never_contains_the_key(monkeypatch, llm_on):
    status = engine_mod.engine_status()
    assert status["mode"] == "llm"
    assert "test-key" not in json.dumps(status)


def test_engine_reports_which_mode_played(monkeypatch, llm_on):
    from backend.llm_engine import engine_mode
    mock_llm(monkeypatch, [{"action": "counter", "offer": {"price": 36000}, "reasoning": "r", "stance": "firm"},
                           "garbage"])
    config, state = vendor_state()
    engine = make_agent_engine(10)
    assert engine_mode(engine) == "rule-based"
    engine(state, config["agents"][0])
    assert engine_mode(engine) == "llm"
    engine(state, config["agents"][0])  # "garbage" twice -> rules
    assert engine_mode(engine) == "mixed"


def test_rate_limit_waits_before_retry(monkeypatch, llm_on):
    import httpx
    waits = []
    monkeypatch.setattr("time.sleep", lambda s: waits.append(s))
    request = httpx.Request("POST", "http://llm.test/chat/completions")
    error = httpx.HTTPStatusError("429", request=request,
                                  response=httpx.Response(429, headers={"retry-after": "3"}, request=request))
    mock_llm(monkeypatch, [error, {"action": "counter", "offer": {"price": 36000}, "reasoning": "r", "stance": "firm"}])
    config, state = vendor_state()
    turn = make_agent_engine(10)(state, config["agents"][0])
    assert waits == [3.0]
    assert turn["offer"] == {"price": 36000}
