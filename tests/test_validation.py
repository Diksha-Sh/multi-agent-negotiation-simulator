"""Tests for backend/validation.py.  Run from the repo root:  python -m pytest -v"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.validation import ALLOWED_PERSONALITIES, validate_config  # noqa: E402

SCENARIOS = ROOT / "scenarios"


def make_config(scenario: dict) -> dict:
    """Same shape build_negotiation_config produces: default personality filled in."""
    return {
        "scenario_id": scenario["id"],
        "title": scenario["title"],
        "description": scenario["description"],
        "max_rounds": scenario.get("max_rounds", 10),
        "agents": [
            {
                "id": a["id"],
                "name": a["name"],
                "role": a["role"],
                "role_description": a.get("role_description", ""),
                "goal": a["goal"],
                "constraints": a["constraints"],
                "limits": a["limits"],
                "personality": a["default_personality"],
            }
            for a in scenario["agents"]
        ],
    }


@pytest.fixture
def config() -> dict:
    """A valid config: buyer max 40 vs vendor min 35 on price."""
    return {
        "scenario_id": "test",
        "title": "Test",
        "description": "Test scenario",
        "max_rounds": 10,
        "agents": [
            {"id": "buyer", "name": "Buyer", "role": "Procurement Manager",
             "role_description": "Buys", "goal": "Pay as little as possible",
             "constraints": ["Max budget 40 lakh"],
             "limits": [{"item": "price", "type": "max", "value": 40, "unit": "lakh INR"}],
             "personality": "Collaborative"},
            {"id": "vendor", "name": "Vendor", "role": "Sales Head",
             "role_description": "Sells", "goal": "Sell as high as possible",
             "constraints": ["Minimum price 35 lakh"],
             "limits": [{"item": "price", "type": "min", "value": 35, "unit": "lakh INR"}],
             "personality": "Aggressive"},
        ],
    }


# --- personalities.json ------------------------------------------------------

def test_personalities_file_has_the_three_personalities():
    data = json.loads((SCENARIOS / "personalities.json").read_text(encoding="utf-8"))
    assert [p["name"] for p in data] == ["Aggressive", "Collaborative", "Risk-Averse"]
    fields = {"name", "description", "opening_stance", "concession_style",
              "risk_attitude", "example_phrase"}
    for p in data:
        assert set(p) == fields
        assert all(isinstance(p[f], str) and p[f].strip() for f in fields)
    assert ALLOWED_PERSONALITIES == ("Aggressive", "Collaborative", "Risk-Averse")


# --- valid configs -----------------------------------------------------------

def test_valid_config(config):
    assert validate_config(config) == {"valid": True, "errors": []}


@pytest.mark.parametrize(
    "path", sorted(p for p in SCENARIOS.glob("*.json") if p.name != "personalities.json"),
    ids=lambda p: p.stem,
)
def test_every_scenario_file_gives_a_valid_config(path):
    result = validate_config(make_config(json.loads(path.read_text(encoding="utf-8-sig"))))
    assert result["valid"], result["errors"]


def test_equal_limits_are_a_possible_deal(config):
    config["agents"][1]["limits"][0]["value"] = 40  # buyer max 40, vendor min 40
    assert validate_config(config)["valid"]


# --- each check --------------------------------------------------------------

def test_no_scenario_selected(config):
    config["scenario_id"] = ""
    assert "No scenario selected." in validate_config(config)["errors"]


def test_fewer_than_two_agents(config):
    config["agents"] = config["agents"][:1]
    errors = validate_config(config)["errors"]
    assert any("at least 2 agents" in e for e in errors)


@pytest.mark.parametrize("field", ["name", "role", "goal"])
def test_missing_text_field(config, field):
    config["agents"][0][field] = "   "
    assert f"Agent 'buyer' has no {field}." in validate_config(config)["errors"]


@pytest.mark.parametrize("value", [[], [""], None])
def test_missing_constraints(config, value):
    config["agents"][1]["constraints"] = value
    assert "Agent 'vendor' has no constraints." in validate_config(config)["errors"]


def test_no_personality_selected(config):
    config["agents"][1]["personality"] = ""
    assert "Agent 'vendor' has no personality selected." in validate_config(config)["errors"]


@pytest.mark.parametrize("bad", ["aggressive", "Risk Averse", "Friendly"])
def test_invalid_personality(config, bad):
    config["agents"][0]["personality"] = bad
    errors = validate_config(config)["errors"]
    assert any("invalid personality" in e and bad in e for e in errors)


def test_no_limits(config):
    config["agents"][0]["limits"] = []
    assert "Agent 'buyer' has no limits." in validate_config(config)["errors"]


def test_malformed_limit(config):
    config["agents"][0]["limits"] = [{"item": "", "type": "maximum", "value": "40"}]
    errors = validate_config(config)["errors"]
    assert "Agent 'buyer': limit #1 has no item." in errors
    assert "Agent 'buyer': limit #1 type must be 'min' or 'max'." in errors
    assert "Agent 'buyer': limit #1 value must be a number." in errors


def test_deal_impossible(config):
    config["agents"][0]["limits"][0]["value"] = 30  # buyer max 30 < vendor min 35
    errors = validate_config(config)["errors"]
    assert len(errors) == 1
    assert "No deal is possible on 'price'" in errors[0]


def test_same_direction_limits_are_not_compared(config):
    config["agents"][1]["limits"] = [{"item": "price", "type": "max", "value": 10, "unit": ""}]
    assert validate_config(config)["valid"]


def test_duplicate_agent_ids(config):
    config["agents"][1]["id"] = "buyer"
    assert "Agent id 'buyer' is used more than once." in validate_config(config)["errors"]


def test_reports_all_errors_at_once(config):
    broken = copy.deepcopy(config)
    broken["scenario_id"] = ""
    broken["agents"][0]["personality"] = ""
    broken["agents"][1]["goal"] = ""
    assert len(validate_config(broken)["errors"]) == 3


@pytest.mark.parametrize("bad", [None, "text", [], {"scenario_id": "x"}])
def test_never_raises_on_garbage(bad):
    result = validate_config(bad)
    assert result["valid"] is False and result["errors"]
