"""Unit and integration tests for NegotiationOrchestrator (Task 2)."""

import json
import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.orchestrator import (
    NegotiationOrchestrator,
    NegotiationState,
    Turn,
    mock_agent_fn,
)


@pytest.fixture
def sample_config():
    """Return a standard 2-agent scenario configuration dictionary."""
    return {
        "scenario_id": "test_pricing",
        "title": "Test Pricing Negotiation",
        "description": "A test negotiation between buyer and seller.",
        "max_rounds": 4,
        "agents": [
            {
                "id": "buyer",
                "name": "Buyer Agent",
                "role": "Procurement",
                "goal": "Pay under 100",
                "constraints": ["Max budget is 100"],
                "limits": [{"item": "price", "type": "max", "value": 100, "unit": "USD"}],
                "personality": "Collaborative",
            },
            {
                "id": "seller",
                "name": "Seller Agent",
                "role": "Vendor",
                "goal": "Sell above 70",
                "constraints": ["Min price is 70"],
                "limits": [{"item": "price", "type": "min", "value": 70, "unit": "USD"}],
                "personality": "Aggressive",
            },
        ],
    }


# ============================================================================
# 1. Initialization and Start Tests
# ============================================================================

def test_orchestrator_initialization(sample_config):
    """Test that the orchestrator initializes properties accurately."""
    orch = NegotiationOrchestrator(sample_config)
    assert orch.scenario_id == "test_pricing"
    assert orch.max_rounds == 4
    assert len(orch.agents) == 2


def test_orchestrator_requires_at_least_two_agents():
    """Verify ValueError is raised if fewer than 2 agents are provided."""
    invalid_config = {
        "scenario_id": "lone_wolf",
        "max_rounds": 5,
        "agents": [{"id": "only_one"}],
    }
    with pytest.raises(ValueError, match="at least 2 agents"):
        NegotiationOrchestrator(invalid_config)


def test_orchestrator_start_returns_initial_state(sample_config):
    """Verify start() initializes clean state with round 0 and ongoing status."""
    orch = NegotiationOrchestrator(sample_config)
    state = orch.start()

    assert isinstance(state, NegotiationState)
    assert state.scenario_id == "test_pricing"
    assert state.round == 0
    assert state.status == "ongoing"
    assert state.history == []
    assert state.winner is None


# ============================================================================
# 2. Turn Order & Alternation Tests
# ============================================================================

def test_alternating_turn_order(sample_config):
    """Verify agent order strictly alternates index 0, 1, 0, 1..."""
    orch = NegotiationOrchestrator(sample_config)
    state = orch.start()

    assert orch._get_current_agent(state)["id"] == "buyer"

    # Simulate 1st turn by buyer
    turn1: Turn = {
        "agent_id": "buyer",
        "round": 1,
        "action": "counter",
        "offer": {"price": 80},
        "reasoning": "First offer",
        "stance": "flexible",
    }
    state = orch.step(state, turn1)
    assert orch._get_current_agent(state)["id"] == "seller"

    # Simulate 2nd turn by seller
    turn2: Turn = {
        "agent_id": "seller",
        "round": 2,
        "action": "counter",
        "offer": {"price": 95},
        "reasoning": "Counter offer",
        "stance": "firm",
    }
    state = orch.step(state, turn2)
    assert orch._get_current_agent(state)["id"] == "buyer"


def test_history_grows_every_step(sample_config):
    """Verify that every submitted turn is preserved in state.history."""
    orch = NegotiationOrchestrator(sample_config)
    state = orch.start()

    for r in range(1, 4):
        turn: Turn = {
            "agent_id": "buyer" if r % 2 != 0 else "seller",
            "round": r,
            "action": "counter",
            "offer": {"price": 85},
            "reasoning": f"Round {r} step",
            "stance": "flexible",
        }
        state = orch.step(state, turn)
        assert len(state.history) == r
        assert state.history[-1] == turn


# ============================================================================
# 3. Terminal Conditions: Accept, Reject, Deadlock
# ============================================================================

def test_action_accept_terminates_with_winner(sample_config):
    """Verify action='accept' transitions status to 'accepted' and marks winner."""
    orch = NegotiationOrchestrator(sample_config)
    state = orch.start()

    accept_turn: Turn = {
        "agent_id": "seller",
        "round": 1,
        "action": "accept",
        "offer": {"price": 85},
        "reasoning": "Terms are satisfactory",
        "stance": "flexible",
    }
    state = orch.step(state, accept_turn)

    assert state.status == "accepted"
    assert state.winner == "seller"


def test_action_reject_terminates_without_winner(sample_config):
    """Verify action='reject' transitions status to 'rejected' with no winner."""
    orch = NegotiationOrchestrator(sample_config)
    state = orch.start()

    reject_turn: Turn = {
        "agent_id": "buyer",
        "round": 1,
        "action": "reject",
        "offer": {"price": 60},
        "reasoning": "Unacceptable boundary breach",
        "stance": "firm",
    }
    state = orch.step(state, reject_turn)

    assert state.status == "rejected"
    assert state.winner is None


def test_deadlock_fires_at_max_rounds(sample_config):
    """Verify deadlock status when max_rounds is reached without agreement."""
    sample_config["max_rounds"] = 3
    orch = NegotiationOrchestrator(sample_config)
    state = orch.start()

    for r in range(1, 4):
        turn: Turn = {
            "agent_id": "buyer" if r % 2 != 0 else "seller",
            "round": r,
            "action": "counter",
            "offer": {"price": 80 + r},
            "reasoning": "Continuing negotiation",
            "stance": "flexible",
        }
        state = orch.step(state, turn)

    assert state.round == 3
    assert state.status == "deadlock"
    assert state.winner is None


def test_step_ignores_further_turns_if_already_terminated(sample_config):
    """Verify step() is a no-op once terminal status is reached."""
    orch = NegotiationOrchestrator(sample_config)
    state = orch.start()

    # End the negotiation
    state = orch.step(state, {
        "agent_id": "buyer",
        "round": 1,
        "action": "accept",
        "offer": {"price": 90},
        "reasoning": "Deal accepted",
        "stance": "flexible",
    })
    assert state.status == "accepted"

    # Attempt another step
    state = orch.step(state, {
        "agent_id": "seller",
        "round": 2,
        "action": "counter",
        "offer": {"price": 95},
        "reasoning": "Should be ignored",
        "stance": "firm",
    })
    assert state.round == 1
    assert len(state.history) == 1
    assert state.status == "accepted"


# ============================================================================
# 4. run_loop & Mock Agent Tests
# ============================================================================

def test_run_loop_with_mock_agent(sample_config):
    """Verify run_loop executes the full negotiation cleanly to completion."""
    sample_config["max_rounds"] = 4
    orch = NegotiationOrchestrator(sample_config)

    final_state = orch.run_loop(mock_agent_fn)

    assert final_state.status == "deadlock"  # mock_agent_fn only counters
    assert final_state.round == 4
    assert len(final_state.history) == 4
    for t in final_state.history:
        assert t["action"] == "counter"
        assert "price" in t["offer"]


def test_run_loop_early_acceptance(sample_config):
    """Verify run_loop halts early when an agent chooses to accept."""
    orch = NegotiationOrchestrator(sample_config)

    def accepting_agent(state: NegotiationState, agent: dict) -> Turn:
        if state.round == 1:
            return {
                "agent_id": agent["id"],
                "round": state.round + 1,
                "action": "accept",
                "offer": {"price": 90},
                "reasoning": "Accepting terms in round 2",
                "stance": "flexible",
            }
        return mock_agent_fn(state, agent)

    final_state = orch.run_loop(accepting_agent)

    assert final_state.status == "accepted"
    assert final_state.round == 2
    assert len(final_state.history) == 2
    assert final_state.winner == "seller"


# ============================================================================
# 5. Testing with All 3 Real Project Scenarios
# ============================================================================

@pytest.mark.parametrize("filename", [
    "vendor_pricing.json",
    "job_offer.json",
    "project_budget_allocation.json",
])
def test_all_scenarios_run_in_orchestrator(filename):
    """Verify all 3 scenarios load and execute seamlessly in the orchestrator."""
    scenarios_dir = Path(__file__).resolve().parent.parent / "scenarios"
    filepath = scenarios_dir / filename
    assert filepath.is_file(), f"Scenario file {filepath} not found"

    with open(filepath, encoding="utf-8-sig") as f:
        data = json.load(f)

    config = {
        "scenario_id": data["id"],
        "title": data["title"],
        "description": data["description"],
        "max_rounds": data.get("max_rounds", 6),
        "agents": data["agents"],
    }

    orch = NegotiationOrchestrator(config)
    final_state = orch.run_loop(mock_agent_fn)

    assert final_state.round == config["max_rounds"]
    assert final_state.status == "deadlock"
    assert len(final_state.history) == config["max_rounds"]
