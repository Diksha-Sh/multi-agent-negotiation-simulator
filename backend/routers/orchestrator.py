"""Orchestrator API router: endpoints to run, step, or play in Practice Mode."""

from typing import Any, Literal
from fastapi import APIRouter, Body, HTTPException, Query

from backend.deadlock import check_deadlock, resolve_deadlock
from backend.llm_engine import engine_mode, engine_status, make_agent_engine
from backend.orchestrator import (
    NegotiationOrchestrator,
    Turn,
    create_human_turn,
    mock_agent_fn,
)
from backend.validation import validate_config, validate_counteroffer

router = APIRouter(prefix="/api/orchestrator", tags=["orchestrator"])

TURN_KEYS = ("agent_id", "round", "action", "offer", "reasoning", "stance")


def _validated_config(payload: Any) -> dict[str, Any]:
    config = payload.get("config", payload) if isinstance(payload, dict) else payload
    val = validate_config(config)
    if not val.get("valid", False):
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid negotiation configuration", "errors": val.get("errors", [])},
        )
    return config


def _normalized_offer(offer: dict[str, Any]) -> dict[str, Any]:
    return {item.strip(): value for item, value in offer.items()}


def _replay_history(
    orchestrator: NegotiationOrchestrator,
    history: list[dict[str, Any]],
) -> NegotiationState:
    agent_ids = [str(agent.get("id")) for agent in orchestrator.agents]
    has_actor_metadata = any("actor" in turn for turn in history)
    if orchestrator.mode == "practice" and has_actor_metadata and any(
        "actor" not in turn for turn in history
    ):
        raise HTTPException(status_code=422, detail="Practice history has incomplete actor metadata.")

    state = orchestrator.start()
    for index, raw in enumerate(history):
        if state.status not in ("ongoing", "waiting_for_human"):
            raise HTTPException(status_code=422, detail="History contains turns after the negotiation ended.")

        expected = agent_ids[index % len(agent_ids)]
        if str(raw.get("agent_id")) != expected:
            raise HTTPException(
                status_code=422,
                detail=f"Turn {index + 1} should be by '{expected}', got '{raw.get('agent_id')}'.",
            )
        required = TURN_KEYS
        missing = [key for key in required if key not in raw]
        if missing:
            raise HTTPException(
                status_code=422,
                detail=f"Turn {index + 1} is missing required fields: {', '.join(missing)}.",
            )
        round_number = raw.get("round")
        if isinstance(round_number, bool) or not isinstance(round_number, int) or round_number < 1:
            raise HTTPException(status_code=422, detail=f"Turn {index + 1} has an invalid round number.")

        action = raw.get("action")
        if not isinstance(action, str) or action.strip().lower() not in ("accept", "counter", "reject"):
            raise HTTPException(status_code=422, detail=f"Turn {index + 1} has an invalid action.")
        action = action.strip().lower()
        if not isinstance(raw.get("offer"), dict):
            raise HTTPException(status_code=422, detail=f"Turn {index + 1} offer must be an object.")
        if not isinstance(raw.get("reasoning"), str):
            raise HTTPException(status_code=422, detail=f"Turn {index + 1} reasoning must be text.")
        if raw.get("stance") not in ("firm", "flexible", "urgent"):
            raise HTTPException(status_code=422, detail=f"Turn {index + 1} has an invalid stance.")

        if orchestrator.mode == "practice":
            expected_actor = "human" if expected == orchestrator.human_agent_id else "ai"
            supplied_actor = raw.get("actor")
            if supplied_actor is not None and supplied_actor != expected_actor:
                raise HTTPException(
                    status_code=422,
                    detail=f"Turn {index + 1} must be attributed to the {expected_actor} participant.",
                )

        if action == "counter":
            agent = orchestrator.agents[index % len(agent_ids)]
            errors = validate_counteroffer(agent, raw.get("offer"))
            if errors:
                raise HTTPException(
                    status_code=422,
                    detail={"message": f"Invalid counteroffer in turn {index + 1}", "errors": errors},
                )
            normalized_offer = _normalized_offer(raw["offer"])
        else:
            normalized_offer = raw["offer"]

        turn = Turn(**{key: raw.get(key) for key in TURN_KEYS})
        turn["action"] = action
        turn["offer"] = normalized_offer
        turn["reasoning"] = raw["reasoning"]
        turn["stance"] = raw["stance"]
        if orchestrator.mode == "practice":
            turn["actor"] = expected_actor
        state = orchestrator.step(state, turn)
    return state


@router.post("/run", summary="Run a full negotiation loop using the Orchestrator")
def run_negotiation(
    payload: dict[str, Any] = Body(...),
    engine: Literal["llm", "mock"] = Query(
        "llm",
        description="llm: LLM Reasoning Engine (rule-based when no API key is set); mock: random test agent",
    ),
) -> dict[str, Any]:
    """Execute a negotiation session using the Orchestrator.

    Takes a scenario config (with optional mode="simulation" | "practice"),
    runs the loop (or pauses at human's turn if in Practice Mode), and returns
    the state with full turn history.
    """
    config = _validated_config(payload)

    try:
        orchestrator = NegotiationOrchestrator(config)
        agent_fn = mock_agent_fn if engine == "mock" else make_agent_engine(orchestrator.max_rounds)
        final_state = orchestrator.run_loop(agent_fn)
        if final_state.mode == "practice":
            for turn in final_state.history:
                turn["actor"] = "ai"
        return {
            "status": final_state.status,
            "round": final_state.round,
            "winner": final_state.winner,
            "history": final_state.history,
            "state": final_state.to_dict(),
            "mode": final_state.mode,
            "human_agent_id": final_state.human_agent_id,
            "deadlock_event": final_state.deadlock_event,
            "engine": "mock" if engine == "mock" else engine_mode(agent_fn),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {exc}") from exc


@router.post("/step", summary="Play the next turn only (for step-by-step mode in the arena)")
def step_negotiation(
    payload: dict[str, Any] = Body(
        ...,
        examples=[{"config": {"scenario_id": "vendor_pricing", "agents": ["..."]}, "history": []}],
    ),
    engine: Literal["llm", "mock"] = Query("llm", description="llm or mock, as in /run"),
) -> dict[str, Any]:
    """Body: {"config": <negotiation config>, "history": [<turns so far>]}.

    Replays the history, asks the engine for the next turn and returns it with the new status.
    """
    config = _validated_config(payload.get("config"))
    history = payload.get("history") or []
    if not isinstance(history, list) or not all(isinstance(t, dict) for t in history):
        raise HTTPException(status_code=422, detail="history must be a list of turn objects.")

    orchestrator = NegotiationOrchestrator(config)
    state = _replay_history(orchestrator, history)

    if state.status not in ("ongoing", "waiting_for_human"):
        return {
            "turn": None,
            "status": state.status,
            "round": state.round,
            "winner": state.winner,
            "engine": None,
            "mode": state.mode,
            "human_agent_id": state.human_agent_id,
            "history": state.history,
            "latest_turn": state.history[-1] if state.history else None,
            "deadlock_event": state.deadlock_event,
        }

    # In Practice Mode: if the next turn belongs to human, report waiting_for_human
    current_agent = orchestrator._get_current_agent(state)
    if orchestrator.mode == "practice" and current_agent.get("id") == orchestrator.human_agent_id:
        state.status = "waiting_for_human"
        return {
            "turn": None,
            "status": state.status,
            "round": state.round,
            "winner": state.winner,
            "engine": None,
            "mode": state.mode,
            "human_agent_id": state.human_agent_id,
            "history": state.history,
            "latest_turn": state.history[-1] if state.history else None,
            "deadlock_event": state.deadlock_event,
        }

    try:
        agent_fn = mock_agent_fn if engine == "mock" else make_agent_engine(orchestrator.max_rounds)
        turn = agent_fn(state, current_agent)
        if orchestrator.mode == "practice":
            turn["actor"] = "ai"
        state = orchestrator.step(state, turn)
        if (
            state.status == "ongoing"
            and orchestrator.mode == "practice"
            and orchestrator._get_current_agent(state).get("id") == orchestrator.human_agent_id
        ):
            state.status = "waiting_for_human"
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {exc}") from exc

    return {
        "turn": turn,
        "status": state.status,
        "round": state.round,
        "winner": state.winner,
        "history": state.history,
        "latest_turn": state.history[-1] if state.history else None,
        "mode": state.mode,
        "human_agent_id": state.human_agent_id,
        "deadlock_event": state.deadlock_event,
        "engine": "mock" if engine == "mock" else engine_mode(agent_fn),
    }


@router.post("/human-turn", summary="Submit a human participant's turn in Practice Mode")
def submit_human_turn(
    payload: dict[str, Any] = Body(...),
    engine: Literal["llm", "mock"] = Query("llm", description="Engine used for AI counter-response"),
) -> dict[str, Any]:
    """Submit a human participant's offer in Practice Mode.

    Body:
    {
        "config": <scenario config with mode="practice">,
        "history": [<previous turns>],
        "turn": {
            "agent_id": "buyer",
            "action": "counter",
            "offer": {"price": 38000},
            "reasoning": "...",
            "stance": "flexible"
        },
        "auto_respond": true  // If true (default), AI immediately generates next turn
    }
    """
    config = _validated_config(payload.get("config"))
    # Ensure config reflects practice mode
    if str(config.get("mode") or "").lower() != "practice":
        config["mode"] = "practice"

    history = payload.get("history") or []
    if not isinstance(history, list) or not all(isinstance(t, dict) for t in history):
        raise HTTPException(status_code=422, detail="history must be a list of turn objects.")

    turn_payload = payload.get("turn")
    if not isinstance(turn_payload, dict):
        raise HTTPException(status_code=422, detail="Missing or invalid 'turn' object in payload.")

    orchestrator = NegotiationOrchestrator(config)
    # 1. Replay history
    state = _replay_history(orchestrator, history)

    if state.status not in ("ongoing", "waiting_for_human"):
        return {
            "status": state.status,
            "round": state.round,
            "winner": state.winner,
            "history": state.history,
            "state": state.to_dict(),
            "latest_turn": state.history[-1] if state.history else None,
            "mode": state.mode,
            "human_agent_id": state.human_agent_id,
            "deadlock_event": state.deadlock_event,
            "message": "Negotiation has already concluded.",
        }

    # 2. Verify active agent matches human agent
    current_agent = orchestrator._get_current_agent(state)
    target_human_id = str(turn_payload.get("agent_id") or "")
    if turn_payload.get("actor", "human") != "human":
        raise HTTPException(status_code=422, detail="Submitted turns must be attributed to the human participant.")
    if str(current_agent.get("id")) != orchestrator.human_agent_id:
        raise HTTPException(
            status_code=422,
            detail=f"It is turn for AI agent '{current_agent.get('id')}', not the configured human agent.",
        )
    if target_human_id != orchestrator.human_agent_id:
        raise HTTPException(
            status_code=422,
            detail=f"Human turns may only be submitted for '{orchestrator.human_agent_id}'.",
        )

    # 3. Create canonical human turn
    action = str(turn_payload.get("action") or "counter").strip().lower()
    offer = turn_payload.get("offer") or {}
    if action == "counter":
        errors = validate_counteroffer(current_agent, offer)
        if errors:
            raise HTTPException(status_code=422, detail={"message": "Invalid counteroffer", "errors": errors})
        offer = _normalized_offer(offer)
    elif action == "accept":
        if not state.history or state.history[-1].get("agent_id") == orchestrator.human_agent_id:
            raise HTTPException(status_code=422, detail="There is no opponent proposal to accept.")
        offer = dict(state.history[-1].get("offer") or {})

    try:
        human_turn = create_human_turn(
            agent_id=target_human_id,
            action=action,
            offer=offer,
            round_num=state.round + 1,
            reasoning=turn_payload.get("reasoning"),
            stance=turn_payload.get("stance"),
        )
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err)) from val_err

    # 4. Step state with human turn
    state = orchestrator.step(state, human_turn)
    human_turn["actor"] = "human"

    # 5. Auto-respond with AI if requested and state is ongoing
    auto_respond = bool(payload.get("auto_respond", True))
    agent_fn = mock_agent_fn if engine == "mock" else make_agent_engine(orchestrator.max_rounds)

    if auto_respond and state.status == "ongoing":
        first_ai_turn_index = len(state.history)
        state = orchestrator.run_loop(agent_fn, initial_state=state)
        for ai_turn in state.history[first_ai_turn_index:]:
            ai_turn["actor"] = "ai"

    return {
        "status": state.status,
        "round": state.round,
        "winner": state.winner,
        "history": state.history,
        "state": state.to_dict(),
        "latest_turn": state.history[-1] if state.history else None,
        "human_turn": human_turn,
        "mode": state.mode,
        "human_agent_id": state.human_agent_id,
        "deadlock_event": state.deadlock_event,
        "engine": "mock" if engine == "mock" else engine_mode(agent_fn),
    }


_DEADLOCK_EXAMPLE = {
    "config": {
        "scenario_id": "vendor_pricing",
        "title": "Vendor Pricing",
        "description": "Buyer and vendor agree a unit price.",
        "max_rounds": 10,
        "deadlock": {"stall_rounds": 2, "min_move_pct": 1, "rejection_limit": 3},
        "agents": [
            {"id": "buyer", "name": "Buyer", "role": "Procurement Manager", "goal": "Pay as little as possible",
             "constraints": ["Budget at most 40000"], "personality": "Collaborative",
             "limits": [{"item": "price", "type": "max", "value": 40000, "unit": "INR"}]},
            {"id": "vendor", "name": "Vendor", "role": "Sales Head", "goal": "Sell as high as possible",
             "constraints": ["Price at least 35000"], "personality": "Aggressive",
             "limits": [{"item": "price", "type": "min", "value": 35000, "unit": "INR"}]},
        ],
    },
    "history": [
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 36000}, "reasoning": "", "stance": "firm"},
        {"agent_id": "vendor", "round": 2, "action": "counter", "offer": {"price": 39000}, "reasoning": "", "stance": "firm"},
        {"agent_id": "buyer", "round": 3, "action": "counter", "offer": {"price": 36000}, "reasoning": "", "stance": "firm"},
        {"agent_id": "vendor", "round": 4, "action": "counter", "offer": {"price": 39000}, "reasoning": "", "stance": "firm"},
        {"agent_id": "buyer", "round": 5, "action": "counter", "offer": {"price": 36000}, "reasoning": "", "stance": "firm"},
        {"agent_id": "vendor", "round": 6, "action": "counter", "offer": {"price": 39000}, "reasoning": "", "stance": "firm"},
    ],
}

_DEADLOCK_RESPONSES = {
    200: {
        "description": "Deadlock check result",
        "content": {"application/json": {"example": {
            "deadlock_detected": True,
            "active": True,
            "deadlock_event": {
                "type": "same_position",
                "round_triggered": 6,
                "resolution_attempt": "suggest_compromise",
                "resolution_outcome": None,
                "details": "Both sides repeated the same offers for 2 rounds in a row.",
                "message": "Mediator suggests meeting in the middle: price 37,500.",
                "compromise_offer": {"price": 37500},
                "level": 1,
                "attempts": [],
            },
            "resolution": {
                "action": "suggest_compromise",
                "status": "ongoing",
                "message": "Mediator suggests meeting in the middle: price 37,500.",
                "compromise_offer": {"price": 37500},
                "recommended_stance": "flexible",
            },
            "status": "ongoing",
            "round": 6,
        }}},
    },
    400: {"description": "Invalid negotiation config (validation errors listed)"},
    422: {"description": "history is not a list of turns, or the turn order is wrong"},
}


@router.post(
    "/check-deadlock",
    summary="Check whether a negotiation is stuck, and what to do about it",
    responses=_DEADLOCK_RESPONSES,
)
def check_negotiation_deadlock(
    payload: dict[str, Any] = Body(..., examples=[_DEADLOCK_EXAMPLE]),
) -> dict[str, Any]:
    """Replay the history and return the deadlock state after the last turn.

    You normally do **not** need to call this: `/run`, `/step` and `/human-turn`
    run the same check automatically after every turn and return `deadlock_event`.
    This endpoint is for testing and for inspecting a history.

    **Detection** (thresholds in optional `config.deadlock`):
    - `same_position`: both sides repeated their offer for `stall_rounds` turns (default 2)
    - `repeated_rejection`: one side proposed the same terms `rejection_limit` times (default 3)
      while the other side kept moving
    - `stall`: both sides moved less than `min_move_pct` % per offer (default 1) for `stall_rounds` turns
    - `max_rounds`: the round limit was reached

    **Resolution ladder** (next step each time it gets stuck again):
    `suggest_compromise` → `modify_stance` → `trigger_final_round` → `declare_breakdown`.

    `resolution_outcome` is `null` while an attempt is in progress, then
    `compromise` / `stance_change` / `final_round` when it worked, or `breakdown`.
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Body must be an object with 'config' and 'history'.")
    config = _validated_config(payload.get("config"))
    history = payload.get("history") or []
    if not isinstance(history, list) or not all(isinstance(turn, dict) for turn in history):
        raise HTTPException(status_code=422, detail="history must be a list of turn objects.")

    orchestrator = NegotiationOrchestrator(config)
    state = _replay_history(orchestrator, history)

    event = state.deadlock_event or check_deadlock(state, config)
    resolution = resolve_deadlock(state, event, config) if event else None
    active = bool(event) and event.get("resolution_outcome") is None  # attempt still in progress
    return {
        "deadlock_detected": event is not None,
        "active": active,
        "deadlock_event": event,
        "resolution": resolution,
        "status": state.status,
        "round": state.round,
    }


@router.get("/engine", summary="Which reasoning engine is active (LLM or rule-based)")
def get_engine_status() -> dict[str, Any]:
    """Mode, model and whether the counteroffer module is available. Never returns the API key."""
    return engine_status()
