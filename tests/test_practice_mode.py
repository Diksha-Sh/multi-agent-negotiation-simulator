"""Unit and integration tests for Practice Mode and Orchestrator Extension (Task 4)."""

import pytest
from backend.orchestrator import (
    DeadlockEvent,
    HumanTurn,
    NegotiationOrchestrator,
    NegotiationState,
    Turn,
    create_human_turn,
    mock_agent_fn,
)
from backend.deadlock import check_deadlock, resolve_deadlock


@pytest.fixture
def practice_config():
    """Return a 2-agent configuration configured for Practice Mode."""
    return {
        "scenario_id": "vendor_pricing",
        "title": "Vendor Pricing Negotiation",
        "description": "Wholesale price bargaining.",
        "max_rounds": 6,
        "mode": "practice",
        "human_agent_id": "buyer",
        "agents": [
            {
                "id": "buyer",
                "name": "Human Buyer",
                "role": "Procurement Lead",
                "goal": "Pay under 38000",
                "constraints": ["Max budget is 40000"],
                "limits": [{"item": "price", "type": "max", "value": 40000, "unit": "INR"}],
                "personality": "Collaborative",
            },
            {
                "id": "vendor",
                "name": "AI Vendor",
                "role": "Supplier",
                "goal": "Sell above 36000",
                "constraints": ["Min price is 35000"],
                "limits": [{"item": "price", "type": "min", "value": 35000, "unit": "INR"}],
                "personality": "Aggressive",
            },
        ],
    }


def test_practice_mode_initialization(practice_config):
    """Verify that mode and human_agent_id are correctly initialized."""
    orch = NegotiationOrchestrator(practice_config)
    assert orch.mode == "practice"
    assert orch.human_agent_id == "buyer"

    state = orch.start()
    assert state.mode == "practice"
    assert state.human_agent_id == "buyer"
    assert state.status == "ongoing"
    assert state.history == []


def test_practice_mode_pauses_when_human_is_first(practice_config):
    """When human is Agent 0, run_loop should immediately pause with status 'waiting_for_human'."""
    orch = NegotiationOrchestrator(practice_config)
    state = orch.run_loop(mock_agent_fn)

    assert state.status == "waiting_for_human"
    assert len(state.history) == 0
    assert state.round == 0


def test_practice_mode_pauses_when_human_is_second(practice_config):
    """When human is Agent 1, AI Agent 0 takes Turn 1, then pauses for human."""
    practice_config["human_agent_id"] = "vendor"
    orch = NegotiationOrchestrator(practice_config)
    state = orch.run_loop(mock_agent_fn)

    assert state.status == "waiting_for_human"
    assert len(state.history) == 1
    assert state.history[0]["agent_id"] == "buyer"
    assert state.round == 1


def test_create_human_turn_valid():
    """Verify create_human_turn generates a canonical Turn object."""
    turn = create_human_turn(
        agent_id="buyer",
        action="counter",
        offer={"price": 37000},
        round_num=1,
        reasoning="Offering fair compromise",
        stance="flexible",
    )
    assert turn["agent_id"] == "buyer"
    assert turn["round"] == 1
    assert turn["action"] == "counter"
    assert turn["offer"] == {"price": 37000}
    assert turn["reasoning"] == "Offering fair compromise"
    assert turn["stance"] == "flexible"


def test_create_human_turn_defaults():
    """Verify create_human_turn assigns safe defaults when reasoning or stance are omitted."""
    turn = create_human_turn(
        agent_id="buyer",
        action="counter",
        offer={"price": 38000},
        round_num=2,
    )
    assert turn["stance"] == "flexible"
    assert "Human participant" in turn["reasoning"]


def test_create_human_turn_invalid_action():
    """Verify create_human_turn rejects non-standard actions."""
    with pytest.raises(ValueError, match="Invalid human action"):
        create_human_turn(
            agent_id="buyer",
            action="haggle",
            offer={"price": 37000},
            round_num=1,
        )


def test_create_human_turn_invalid_offer():
    """Verify create_human_turn rejects non-dictionary offers."""
    with pytest.raises(ValueError, match="Offer must be a dictionary"):
        create_human_turn(
            agent_id="buyer",
            action="counter",
            offer=37000,  # type: ignore
            round_num=1,
        )


def test_practice_mode_turn_cycle(practice_config):
    """Simulate a multi-turn Practice Mode exchange: Human counter -> AI counter -> Human accept."""
    orch = NegotiationOrchestrator(practice_config)
    state = orch.run_loop(mock_agent_fn)
    assert state.status == "waiting_for_human"

    # Turn 1: Human (Buyer) submits counteroffer
    human_turn_1 = create_human_turn(
        agent_id="buyer",
        action="counter",
        offer={"price": 36500},
        round_num=state.round + 1,
        reasoning="Buyer opens bidding at 36500",
    )
    state = orch.step(state, human_turn_1)
    assert state.status == "ongoing"
    assert len(state.history) == 1

    # Resume loop -> AI (Vendor) takes Turn 2, then pauses for Human (Buyer) again
    state = orch.run_loop(mock_agent_fn, initial_state=state)
    assert state.status == "waiting_for_human"
    assert len(state.history) == 2
    assert state.history[1]["agent_id"] == "vendor"

    # Turn 3: Human (Buyer) accepts AI vendor's counteroffer
    human_turn_2 = create_human_turn(
        agent_id="buyer",
        action="accept",
        offer=state.history[1]["offer"],
        round_num=state.round + 1,
        reasoning="Accepting vendor counteroffer",
    )
    state = orch.step(state, human_turn_2)
    assert state.status == "accepted"
    assert state.winner == "buyer"
    assert len(state.history) == 3


def test_deadlock_detection_at_max_rounds(practice_config):
    """Verify deadlock detection terminates negotiation when max_rounds is exhausted."""
    practice_config["max_rounds"] = 2
    orch = NegotiationOrchestrator(practice_config)
    state = orch.start()

    turn1 = create_human_turn("buyer", "counter", {"price": 36000}, 1)
    state = orch.step(state, turn1)

    turn2 = create_human_turn("vendor", "counter", {"price": 39000}, 2)
    state = orch.step(state, turn2)

    assert state.status == "deadlock"
    assert state.winner is None
    assert state.deadlock_event is not None
    assert state.deadlock_event.get("type") == "max_rounds"


def test_deadlock_detection_same_position(practice_config):
    """Verify deadlock detection triggers when an agent repeatedly holds identical offers."""
    practice_config["max_rounds"] = 10  # leave room so the round limit is not what stops it
    orch = NegotiationOrchestrator(practice_config)
    state = orch.start()

    # Repeat exact same offers
    for r in range(1, 7):
        aid = "buyer" if r % 2 != 0 else "vendor"
        offer = {"price": 36000} if aid == "buyer" else {"price": 39000}
        t = create_human_turn(aid, "counter", offer, r)
        state = orch.step(state, t)

    event = check_deadlock(state, practice_config, consecutive_stall_limit=3)
    assert event is not None
    assert event["type"] == "same_position"

    res = resolve_deadlock(state, event, practice_config)
    assert res["action"] in ("suggest_compromise", "modify_stance")
