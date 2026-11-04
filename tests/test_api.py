"""Tests for the backend API (backend/main.py and backend/routers/).  Run from the repo root:  python -m pytest -v"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.main import app  # noqa: E402
from backend.scenario_loader import load_all_scenarios  # noqa: E402

client = TestClient(app)

SCENARIO_IDS = sorted(
    p.stem for p in (ROOT / "scenarios").glob("*.json") if p.name != "personalities.json"
)


# --- loader fix --------------------------------------------------------------

def test_loader_skips_personalities_file():
    scenarios = load_all_scenarios()
    assert all(isinstance(s, dict) and "agents" in s for s in scenarios)
    assert sorted(s["id"] for s in scenarios) == SCENARIO_IDS


# --- read endpoints ----------------------------------------------------------

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_list_scenarios():
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    assert sorted(s["id"] for s in r.json()) == SCENARIO_IDS


@pytest.mark.parametrize("scenario_id", SCENARIO_IDS)
def test_get_each_scenario(scenario_id):
    r = client.get(f"/api/scenarios/{scenario_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == scenario_id
    assert len(body["agents"]) >= 2


def test_get_unknown_scenario_is_404():
    r = client.get("/api/scenarios/does_not_exist")
    assert r.status_code == 404


def test_list_personalities():
    r = client.get("/api/personalities")
    assert r.status_code == 200
    assert [p["name"] for p in r.json()] == ["Aggressive", "Collaborative", "Risk-Averse"]


# --- /api/validate -----------------------------------------------------------

def _frontend_config(scenario_id: str) -> dict:
    """Same shape AgentConfigScreen builds on Start (includes its extra fields)."""
    s = json.loads((ROOT / "scenarios" / f"{scenario_id}.json").read_text(encoding="utf-8-sig"))
    return {
        "scenario_id": s["id"], "id": s["id"], "title": s["title"],
        "description": s["description"], "max_rounds": s.get("max_rounds", 10),
        "agents": [
            {"id": a["id"], "name": a["name"], "role": a["role"],
             "role_description": a.get("role_description", ""),
             "goal": a["goal"], "objective": a["goal"],
             "constraints": a["constraints"], "limits": a["limits"],
             "personality": a["default_personality"]}
            for a in s["agents"]
        ],
    }


@pytest.mark.parametrize("scenario_id", SCENARIO_IDS)
def test_validate_accepts_frontend_config(scenario_id):
    r = client.post("/api/validate", json=_frontend_config(scenario_id))
    assert r.status_code == 200
    assert r.json() == {"valid": True, "errors": []}


def test_validate_reports_errors():
    config = _frontend_config("vendor_pricing")
    config["agents"][1]["goal"] = ""
    config["agents"][0]["personality"] = "Friendly"
    r = client.post("/api/validate", json=config)
    assert r.status_code == 200
    body = r.json()
    assert body["valid"] is False
    assert "Agent 'vendor' has no goal." in body["errors"]
    assert any("invalid personality 'Friendly'" in e for e in body["errors"])


def test_validate_handles_garbage():
    r = client.post("/api/validate", json=["not", "a", "config"])
    assert r.status_code == 200
    assert r.json()["valid"] is False


# --- /api/config -------------------------------------------------------------

@pytest.mark.parametrize("scenario_id", SCENARIO_IDS)
def test_build_config_with_defaults(scenario_id):
    r = client.post("/api/config", json={"scenario_id": scenario_id})
    assert r.status_code == 200
    body = r.json()
    assert body["validation"] == {"valid": True, "errors": []}
    config = body["config"]
    assert config["scenario_id"] == scenario_id
    assert all("personality" in a and "default_personality" not in a for a in config["agents"])


def test_build_config_applies_choice():
    r = client.post("/api/config", json={"scenario_id": "vendor_pricing",
                                         "personalities": {"vendor": "Aggressive"}})
    assert r.status_code == 200
    agents = {a["id"]: a for a in r.json()["config"]["agents"]}
    assert agents["vendor"]["personality"] == "Aggressive"


def test_build_config_invalid_personality_is_reported():
    r = client.post("/api/config", json={"scenario_id": "vendor_pricing",
                                         "personalities": {"vendor": "Friendly"}})
    assert r.status_code == 200
    assert r.json()["validation"]["valid"] is False


def test_build_config_unknown_agent_is_422():
    r = client.post("/api/config", json={"scenario_id": "vendor_pricing",
                                         "personalities": {"nobody": "Aggressive"}})
    assert r.status_code == 422


def test_build_config_unknown_scenario_is_404():
    r = client.post("/api/config", json={"scenario_id": "does_not_exist"})
    assert r.status_code == 404


@pytest.mark.parametrize("scenario_id", SCENARIO_IDS)
def test_config_to_orchestrator_runs_rule_based_negotiation(scenario_id, monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "false")
    built = client.post("/api/config", json={"scenario_id": scenario_id})
    assert built.status_code == 200
    config = built.json()["config"]
    assert built.json()["validation"] == {"valid": True, "errors": []}

    response = client.post("/api/orchestrator/run", json=config)
    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "accepted"
    assert result["round"] <= config["max_rounds"]
    assert [turn["agent_id"] for turn in result["history"]] == [
        config["agents"][index % len(config["agents"])]["id"]
        for index in range(len(result["history"]))
    ]
    assert [turn["round"] for turn in result["history"]] == list(
        index // len(config["agents"]) + 1
        for index in range(len(result["history"]))
    )
    assert result["state"]["history"] == result["history"]
    limits_by_agent = {
        agent["id"]: {limit["item"]: limit for limit in agent["limits"]}
        for agent in config["agents"]
    }
    previous_counters = {}
    for turn in result["history"]:
        assert turn["action"] in ("accept", "counter", "reject")
        assert turn["stance"] in ("firm", "flexible", "urgent")
        if turn["action"] != "counter":
            continue
        limits = limits_by_agent[turn["agent_id"]]
        assert set(turn["offer"]) == set(limits)
        for item, value in turn["offer"].items():
            limit = limits[item]
            assert value <= limit["value"] if limit["type"] == "max" else value >= limit["value"]
            previous = previous_counters.get((turn["agent_id"], item))
            if previous is not None:
                assert value <= previous if limit["type"] == "max" else value >= previous
            previous_counters[(turn["agent_id"], item)] = value
    assert result["winner"] == result["history"][-1]["agent_id"]
    accepted_offer = result["history"][-1]["offer"]
    assert accepted_offer == result["history"][-2]["offer"]
    for limits in limits_by_agent.values():
        for item, limit in limits.items():
            value = accepted_offer[item]
            assert value <= limit["value"] if limit["type"] == "max" else value >= limit["value"]


def test_orchestrator_accepts_wrapped_config_and_custom_personality(monkeypatch):
    monkeypatch.setenv("LLM_ENABLED", "false")
    built = client.post("/api/config", json={
        "scenario_id": "job_offer",
        "personalities": {"employer": "Aggressive"},
    })
    config = built.json()["config"]
    response = client.post("/api/orchestrator/run", json={"config": config})

    assert response.status_code == 200
    agents = {agent["id"]: agent for agent in response.json()["state"]["agents"]}
    assert agents["candidate"]["personality"] == "Collaborative"
    assert agents["employer"]["personality"] == "Aggressive"


def test_orchestrator_rejects_invalid_config():
    config = _frontend_config("vendor_pricing")
    config["agents"][0]["personality"] = "Friendly"

    response = client.post("/api/orchestrator/run", json=config)

    assert response.status_code == 400
    assert response.json()["detail"]["message"] == "Invalid negotiation configuration"
    assert any("invalid personality 'Friendly'" in error
               for error in response.json()["detail"]["errors"])


def test_orchestrator_rejects_missing_and_malformed_requests():
    missing = client.post("/api/orchestrator/run", json={})
    malformed = client.post(
        "/api/orchestrator/run",
        content="{bad json",
        headers={"Content-Type": "application/json"},
    )

    assert missing.status_code == 400
    assert malformed.status_code == 422


def test_cors_allows_frontend_dev_server():
    r = client.options("/api/scenarios", headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


# --- server settings ---------------------------------------------------------

def test_server_settings_and_entry_point():
    from backend import config, server

    assert callable(server.run)
    assert config.HOST == "127.0.0.1"
    assert config.PORT == 8000
    assert config.PERSONALITIES_FILE.exists()


# --- review fixes: robustness ------------------------------------------------

import copy  # noqa: E402

from backend.scenario_loader import (  # noqa: E402
    ScenarioFileError,
    build_negotiation_config,
)


def _vendor() -> dict:
    return json.loads((ROOT / "scenarios" / "vendor_pricing.json").read_text(encoding="utf-8-sig"))


def test_validate_rejects_nan_sent_over_http():
    config = _frontend_config("vendor_pricing")
    raw = json.dumps(config).replace('"value": 40000', '"value": NaN', 1)
    assert '"value": NaN' in raw
    r = client.post("/api/validate", content=raw, headers={"Content-Type": "application/json"})
    assert r.status_code == 200
    assert r.json()["valid"] is False


def test_loader_accepts_file_saved_with_bom(tmp_path):
    (tmp_path / "vendor_pricing.json").write_text(json.dumps(_vendor()), encoding="utf-8-sig")
    assert load_all_scenarios(tmp_path)[0]["id"] == "vendor_pricing"


@pytest.mark.parametrize("content", ["{ broken", "[1, 2, 3]", '{"title": "no id"}'])
def test_loader_reports_bad_file_by_name(tmp_path, content):
    (tmp_path / "bad.json").write_text(content, encoding="utf-8")
    with pytest.raises(ScenarioFileError, match="bad.json"):
        load_all_scenarios(tmp_path)


def test_bad_scenario_file_gives_clear_500(monkeypatch):
    import backend.routers.scenarios as routes

    def boom():
        raise ScenarioFileError("scenarios/bad.json is not valid JSON")

    monkeypatch.setattr(routes, "load_all_scenarios", boom)
    r = client.get("/api/scenarios")
    assert r.status_code == 500
    assert "bad.json" in r.json()["detail"]


def test_build_config_uses_spec_defaults(tmp_path):
    s = copy.deepcopy(_vendor())
    del s["max_rounds"]
    del s["agents"][0]["role_description"]
    (tmp_path / "vendor_pricing.json").write_text(json.dumps(s), encoding="utf-8")
    config = build_negotiation_config("vendor_pricing", None, tmp_path)
    assert config["max_rounds"] == 10
    assert config["agents"][0]["role_description"] == ""


@pytest.mark.parametrize("origin", ["http://localhost:5174", "http://127.0.0.1:3000"])
def test_cors_allows_any_local_port(origin):
    r = client.options("/api/validate", headers={
        "Origin": origin, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == origin


def test_cors_rejects_other_sites():
    r = client.options("/api/validate", headers={
        "Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers


# ----------------------------------------------------------------------------
# Orchestrator + LLM Reasoning Engine endpoints (Task 2)
# ----------------------------------------------------------------------------

def _no_llm(monkeypatch):
    import backend.llm_engine as engine_mod
    monkeypatch.setenv("LLM_ENABLED", "false")
    monkeypatch.setattr(engine_mod, "_counteroffer_fn", lambda: None)


def test_orchestrator_run_uses_reasoning_engine(monkeypatch):
    _no_llm(monkeypatch)
    config = client.post("/api/config", json={"scenario_id": "vendor_pricing"}).json()["config"]
    res = client.post("/api/orchestrator/run", json=config)
    assert res.status_code == 200
    body = res.json()
    assert body["engine"] == "rule-based"
    assert body["status"] == "accepted"
    assert body["history"][0]["agent_id"] == "buyer"


def test_orchestrator_run_mock_engine(monkeypatch):
    _no_llm(monkeypatch)
    config = client.post("/api/config", json={"scenario_id": "vendor_pricing"}).json()["config"]
    res = client.post("/api/orchestrator/run?engine=mock", json=config)
    assert res.status_code == 200
    assert res.json()["engine"] == "mock"


def test_orchestrator_engine_status(monkeypatch):
    _no_llm(monkeypatch)
    res = client.get("/api/orchestrator/engine")
    assert res.status_code == 200
    assert res.json()["mode"] == "rule-based"


def _vendor_config():
    return client.post("/api/config", json={"scenario_id": "vendor_pricing"}).json()["config"]


def test_orchestrator_step_plays_one_turn_at_a_time(monkeypatch):
    _no_llm(monkeypatch)
    config, history = _vendor_config(), []
    for expected in ("buyer", "vendor", "buyer"):
        res = client.post("/api/orchestrator/step", json={"config": config, "history": history})
        assert res.status_code == 200
        body = res.json()
        assert body["turn"]["agent_id"] == expected
        assert body["turn"]["round"] == len(history) // len(config["agents"]) + 1
        assert body["engine"] == "rule-based"
        history.append({**body["turn"], "agent_name": "extra fields are ignored"})


def test_orchestrator_step_matches_full_run(monkeypatch):
    _no_llm(monkeypatch)
    config, history, status = _vendor_config(), [], "ongoing"
    while status == "ongoing":
        body = client.post("/api/orchestrator/step", json={"config": config, "history": history}).json()
        history.append(body["turn"])
        status = body["status"]
    full = client.post("/api/orchestrator/run", json=config).json()
    assert history == full["history"]
    assert status == full["status"]


def test_orchestrator_step_after_the_end_returns_no_turn(monkeypatch):
    _no_llm(monkeypatch)
    full = client.post("/api/orchestrator/run", json=_vendor_config()).json()
    res = client.post("/api/orchestrator/step", json={"config": _vendor_config(), "history": full["history"]})
    assert res.status_code == 200
    assert res.json()["turn"] is None
    assert res.json()["status"] == full["status"]


def test_orchestrator_step_rejects_wrong_turn_order(monkeypatch):
    _no_llm(monkeypatch)
    turn = {"agent_id": "vendor", "round": 1, "action": "counter", "offer": {"price": 38000},
            "reasoning": "", "stance": "firm"}
    res = client.post("/api/orchestrator/step", json={"config": _vendor_config(), "history": [turn]})
    assert res.status_code == 422


def test_orchestrator_step_rejects_invalid_config(monkeypatch):
    _no_llm(monkeypatch)
    res = client.post("/api/orchestrator/step", json={"config": {"scenario_id": ""}, "history": []})
    assert res.status_code == 400


def _practice_config(human_agent_id):
    config = _vendor_config()
    config["mode"] = "practice"
    config["human_agent_id"] = human_agent_id
    config["human_seat"] = human_agent_id
    return config


def _boundary_offer(agent):
    return {limit["item"]: limit["value"] for limit in agent["limits"]}


def test_human_turn_valid_counter_auto_responds_and_pauses_again(monkeypatch):
    _no_llm(monkeypatch)
    config = _practice_config("buyer")
    human = next(agent for agent in config["agents"] if agent["id"] == "buyer")
    response = client.post(
        "/api/orchestrator/human-turn?engine=mock",
        json={
            "config": config,
            "history": [],
            "turn": {
                "agent_id": "buyer",
                "action": "counter",
                "offer": _boundary_offer(human),
                "reasoning": "A reasonable opening.",
                "stance": "firm",
            },
            "auto_respond": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "waiting_for_human"
    assert body["human_agent_id"] == "buyer"
    assert body["mode"] == "practice"
    assert body["round"] == 1
    assert [turn["agent_id"] for turn in body["history"]] == ["buyer", "vendor"]
    assert [turn["round"] for turn in body["history"]] == [1, 1]
    assert body["latest_turn"] == body["history"][-1]
    assert [turn["actor"] for turn in body["history"]] == ["human", "ai"]


def test_human_seat_alias_and_human_first_move(monkeypatch):
    _no_llm(monkeypatch)
    config = _vendor_config()
    config["mode"] = "practice"
    config.pop("human_agent_id", None)
    config["human_seat"] = "vendor"
    ai_step = client.post(
        "/api/orchestrator/step?engine=mock",
        json={"config": config, "history": []},
    )
    assert ai_step.status_code == 200
    assert ai_step.json()["human_agent_id"] == "vendor"
    assert ai_step.json()["status"] == "waiting_for_human"
    assert ai_step.json()["turn"]["agent_id"] == "buyer"

    human = next(agent for agent in config["agents"] if agent["id"] == "vendor")
    response = client.post(
        "/api/orchestrator/human-turn?engine=mock",
        json={
            "config": config,
            "history": [ai_step.json()["turn"]],
            "turn": {
                "agent_id": "vendor",
                "action": "counter",
                "offer": _boundary_offer(human),
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "waiting_for_human"
    assert response.json()["history"][-1]["agent_id"] == "buyer"


@pytest.mark.parametrize("limit_type", ["min", "max"])
def test_human_counteroffer_enforces_reservation_limits(monkeypatch, limit_type):
    _no_llm(monkeypatch)
    config = _vendor_config()
    human = next(
        agent for agent in config["agents"]
        if any(limit["type"] == limit_type for limit in agent["limits"])
    )
    config = _practice_config(human["id"])
    human = next(agent for agent in config["agents"] if agent["id"] == human["id"])
    offer = _boundary_offer(human)
    boundary = next(limit for limit in human["limits"] if limit["type"] == limit_type)
    offer[boundary["item"]] += -1 if limit_type == "min" else 1
    history = []
    if human["id"] != config["agents"][0]["id"]:
        first_turn = client.post(
            "/api/orchestrator/step?engine=mock",
            json={"config": config, "history": []},
        ).json()["turn"]
        history.append(first_turn)

    response = client.post(
        "/api/orchestrator/human-turn",
        json={
            "config": config,
            "history": history,
            "turn": {"agent_id": human["id"], "action": "counter", "offer": offer},
        },
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert detail["message"] == "Invalid counteroffer"
    assert boundary["item"] in " ".join(detail["errors"])


@pytest.mark.parametrize("offer", [{}, {"price": None}, {"price": "not-a-number"}])
def test_human_counteroffer_rejects_missing_or_non_numeric_values(monkeypatch, offer):
    _no_llm(monkeypatch)
    config = _practice_config("buyer")
    response = client.post(
        "/api/orchestrator/human-turn",
        json={
            "config": config,
            "history": [],
            "turn": {"agent_id": "buyer", "action": "counter", "offer": offer},
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"]["message"] == "Invalid counteroffer"


def test_accept_and_reject_do_not_apply_counteroffer_boundaries(monkeypatch):
    _no_llm(monkeypatch)
    config = _practice_config("buyer")
    reject = client.post(
        "/api/orchestrator/human-turn?engine=mock",
        json={
            "config": config,
            "history": [],
            "turn": {"agent_id": "buyer", "action": "reject", "offer": {"price": -1}},
        },
    )
    assert reject.status_code == 200
    assert reject.json()["status"] == "rejected"

    config["human_agent_id"] = "vendor"
    config["human_seat"] = "vendor"
    first_ai_turn = client.post(
        "/api/orchestrator/step?engine=mock",
        json={"config": config, "history": []},
    ).json()["turn"]
    accept = client.post(
        "/api/orchestrator/human-turn?engine=mock",
        json={
            "config": config,
            "history": [first_ai_turn],
            "turn": {"agent_id": "vendor", "action": "accept", "offer": {"price": -1}},
        },
    )
    assert accept.status_code == 200
    assert accept.json()["status"] == "accepted"
    assert accept.json()["history"][-1]["offer"] == first_ai_turn["offer"]


def test_human_turn_rejects_submission_when_ai_is_expected(monkeypatch):
    _no_llm(monkeypatch)
    config = _practice_config("vendor")
    response = client.post(
        "/api/orchestrator/human-turn",
        json={
            "config": config,
            "history": [],
            "turn": {"agent_id": "vendor", "action": "reject", "offer": {}},
        },
    )
    assert response.status_code == 422


def test_config_rejects_conflicting_human_seat_aliases():
    config = _practice_config("buyer")
    config["human_seat"] = "vendor"
    response = client.post("/api/orchestrator/run", json=config)
    assert response.status_code == 400


@pytest.mark.parametrize(
    ("field", "value"),
    [("human_agent_id", 2), ("human_seat", 2), ("human_agent_id", "missing-agent")],
)
def test_invalid_human_agent_selection_is_rejected(field, value):
    config = _practice_config("buyer")
    config[field] = value
    response = client.post("/api/orchestrator/run", json=config)
    assert response.status_code == 400


def _counter_history_turn(agent, *, actor=None, action="counter", offer=None):
    turn = {
        "agent_id": agent["id"],
        "round": 1,
        "action": action,
        "offer": _boundary_offer(agent) if offer is None else offer,
        "reasoning": "Existing history entry.",
        "stance": "flexible",
    }
    if actor is not None:
        turn["actor"] = actor
    return turn


def test_history_replay_accepts_valid_simulation_and_practice_histories(monkeypatch):
    _no_llm(monkeypatch)
    config = _vendor_config()
    agents = config["agents"]
    simulation_history = [
        _counter_history_turn(agents[0]),
        _counter_history_turn(agents[1]),
    ]
    simulation = client.post(
        "/api/orchestrator/step?engine=mock",
        json={"config": config, "history": simulation_history},
    )
    assert simulation.status_code == 200
    assert simulation.json()["turn"]["agent_id"] == agents[0]["id"]

    practice = _practice_config(agents[0]["id"])
    practice_history = [
        _counter_history_turn(agents[0], actor="human"),
        _counter_history_turn(agents[1], actor="ai"),
    ]
    replay = client.post(
        "/api/orchestrator/step?engine=mock",
        json={"config": practice, "history": practice_history},
    )
    assert replay.status_code == 200
    assert replay.json()["status"] == "waiting_for_human"


def test_history_replay_rejects_incorrect_order_and_incomplete_turn(monkeypatch):
    _no_llm(monkeypatch)
    config = _vendor_config()
    agents = config["agents"]
    wrong_order = client.post(
        "/api/orchestrator/step",
        json={"config": config, "history": [_counter_history_turn(agents[1])]},
    )
    assert wrong_order.status_code == 422

    incomplete = _counter_history_turn(agents[0])
    del incomplete["offer"]
    incomplete_result = client.post(
        "/api/orchestrator/step",
        json={"config": config, "history": [incomplete]},
    )
    assert incomplete_result.status_code == 422


@pytest.mark.parametrize(
    ("agent_index", "actor"),
    [(0, "ai"), (1, "human")],
)
def test_practice_history_rejects_actor_impersonation(monkeypatch, agent_index, actor):
    _no_llm(monkeypatch)
    config = _practice_config("buyer")
    agents = config["agents"]
    history = [
        _counter_history_turn(agents[0], actor="human"),
        _counter_history_turn(agents[1], actor="ai"),
    ]
    history[agent_index]["actor"] = actor
    response = client.post(
        "/api/orchestrator/step",
        json={"config": config, "history": history},
    )
    assert response.status_code == 422


def test_practice_history_rejects_partial_actor_metadata(monkeypatch):
    _no_llm(monkeypatch)
    config = _practice_config("buyer")
    agents = config["agents"]
    history = [
        _counter_history_turn(agents[0], actor="human"),
        _counter_history_turn(agents[1]),
    ]
    response = client.post(
        "/api/orchestrator/step",
        json={"config": config, "history": history},
    )
    assert response.status_code == 422


def test_practice_human_turn_rejects_human_claim_at_an_ai_seat(monkeypatch):
    _no_llm(monkeypatch)
    config = _practice_config("buyer")
    ai = config["agents"][1]
    response = client.post(
        "/api/orchestrator/human-turn",
        json={
            "config": config,
            "history": [],
            "turn": {
                "agent_id": ai["id"],
                "actor": "human",
                "action": "counter",
                "offer": _boundary_offer(ai),
            },
        },
    )
    assert response.status_code == 422


def test_history_replay_rejects_invalid_action_and_counteroffer(monkeypatch):
    _no_llm(monkeypatch)
    config = _vendor_config()
    buyer = config["agents"][0]

    invalid_action = _counter_history_turn(buyer, action="bargain")
    action_result = client.post(
        "/api/orchestrator/step",
        json={"config": config, "history": [invalid_action]},
    )
    assert action_result.status_code == 422

    invalid_offer = _boundary_offer(buyer)
    invalid_offer["price"] += 1
    offer_result = client.post(
        "/api/orchestrator/step",
        json={"config": config, "history": [_counter_history_turn(buyer, offer=invalid_offer)]},
    )
    assert offer_result.status_code == 422


def test_human_endpoint_rejects_history_ai_impersonating_human(monkeypatch):
    _no_llm(monkeypatch)
    config = _practice_config("buyer")
    buyer = config["agents"][0]
    history = [_counter_history_turn(buyer, actor="ai")]
    response = client.post(
        "/api/orchestrator/human-turn",
        json={
            "config": config,
            "history": history,
            "turn": {"agent_id": "buyer", "action": "reject", "offer": {}},
        },
    )
    assert response.status_code == 422
