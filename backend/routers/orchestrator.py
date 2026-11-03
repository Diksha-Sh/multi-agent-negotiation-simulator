"""Orchestrator API router: endpoints to run, step, or play in Practice Mode."""

from typing import Any, Literal, Optional
from fastapi import APIRouter, Body, HTTPException, Query

from backend.deadlock import check_deadlock, resolve_deadlock
from backend.llm_engine import engine_mode, engine_status, make_agent_engine
from backend.orchestrator import (
    NegotiationOrchestrator,
    NegotiationState,
    Turn,
    create_human_turn,
    mock_agent_fn,
)
from backend.validation import validate_config

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
    agent_ids = [str(a.get("id")) for a in orchestrator.agents]
    state = orchestrator.start()
    for index, raw in enumerate(history):
        expected = agent_ids[index % len(agent_ids)]
        if str(raw.get("agent_id")) != expected:
            raise HTTPException(
                status_code=422,
                detail=f"Turn {index + 1} should be by '{expected}', got '{raw.get('agent_id')}'.",
            )
        turn = Turn(**{key: raw.get(key) for key in TURN_KEYS})
        turn["offer"] = turn["offer"] if isinstance(turn["offer"], dict) else {}
        state = orchestrator.step(state, turn)
        if state.status not in ("ongoing", "waiting_for_human"):
            break

    if state.status not in ("ongoing", "waiting_for_human"):
        return {
            "turn": None,
            "status": state.status,
            "round": state.round,
            "winner": state.winner,
            "engine": None,
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
            "deadlock_event": state.deadlock_event,
        }

    try:
        agent_fn = mock_agent_fn if engine == "mock" else make_agent_engine(orchestrator.max_rounds)
        turn = agent_fn(state, current_agent)
        state = orchestrator.step(state, turn)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {exc}") from exc

    return {
        "turn": turn,
        "status": state.status,
        "round": state.round,
        "winner": state.winner,
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
    agent_ids = [str(a.get("id")) for a in orchestrator.agents]
    state = orchestrator.start()

    # 1. Replay history
    for index, raw in enumerate(history):
        expected = agent_ids[index % len(agent_ids)]
        if str(raw.get("agent_id")) != expected:
            raise HTTPException(
                status_code=422,
                detail=f"Turn {index + 1} should be by '{expected}', got '{raw.get('agent_id')}'.",
            )
        turn = Turn(**{key: raw.get(key) for key in TURN_KEYS})
        turn["offer"] = turn["offer"] if isinstance(turn["offer"], dict) else {}
        state = orchestrator.step(state, turn)
        if state.status not in ("ongoing", "waiting_for_human"):
            break

    if state.status not in ("ongoing", "waiting_for_human"):
        return {
            "status": state.status,
            "round": state.round,
            "winner": state.winner,
            "history": state.history,
            "state": state.to_dict(),
            "latest_turn": state.history[-1] if state.history else None,
            "deadlock_event": state.deadlock_event,
            "message": "Negotiation has already concluded.",
        }

    # 2. Verify active agent matches human agent
    current_agent = orchestrator._get_current_agent(state)
    target_human_id = str(turn_payload.get("agent_id") or orchestrator.human_agent_id or current_agent.get("id"))
    if target_human_id != str(current_agent.get("id")):
        raise HTTPException(
            status_code=422,
            detail=f"It is turn for '{current_agent.get('id')}', but human submitted move for '{target_human_id}'.",
        )

    # 3. Create canonical human turn
    try:
        human_turn = create_human_turn(
            agent_id=target_human_id,
            action=turn_payload.get("action", "counter"),
            offer=turn_payload.get("offer") or {},
            round_num=state.round + 1,
            reasoning=turn_payload.get("reasoning"),
            stance=turn_payload.get("stance"),
        )
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err)) from val_err

    # 4. Step state with human turn
    state = orchestrator.step(state, human_turn)

    # 5. Auto-respond with AI if requested and state is ongoing
    auto_respond = bool(payload.get("auto_respond", True))
    agent_fn = mock_agent_fn if engine == "mock" else make_agent_engine(orchestrator.max_rounds)

    if auto_respond and state.status == "ongoing":
        state = orchestrator.run_loop(agent_fn, initial_state=state)

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


@router.post("/check-deadlock", summary="Evaluate if ongoing negotiation has stalled or deadlocked")
def check_negotiation_deadlock(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    """Inspect current negotiation history and check for stall or deadlock patterns."""
    config = _validated_config(payload.get("config"))
    history = payload.get("history") or []

    orchestrator = NegotiationOrchestrator(config)
    state = orchestrator.start()
    for raw in history:
        turn = Turn(**{key: raw.get(key) for key in TURN_KEYS})
        turn["offer"] = turn["offer"] if isinstance(turn["offer"], dict) else {}
        state = orchestrator.step(state, turn)
        if state.status not in ("ongoing", "waiting_for_human"):
            break

    deadlock_event = check_deadlock(state, config)
    resolution = resolve_deadlock(state, deadlock_event, config) if deadlock_event else None

    return {
        "deadlock_detected": deadlock_event is not None,
        "deadlock_event": deadlock_event,
        "resolution": resolution,
        "status": state.status,
        "round": state.round,
    }


@router.get("/engine", summary="Which reasoning engine is active (LLM or rule-based)")
def get_engine_status() -> dict[str, Any]:
    """Mode, model and whether the counteroffer module is available. Never returns the API key."""
    return engine_status()
