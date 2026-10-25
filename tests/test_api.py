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
    assert result["round"] < config["max_rounds"]
    assert [turn["agent_id"] for turn in result["history"]] == [
        config["agents"][index % len(config["agents"])]["id"]
        for index in range(result["round"])
    ]
    assert [turn["round"] for turn in result["history"]] == list(
        range(1, result["round"] + 1)
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
