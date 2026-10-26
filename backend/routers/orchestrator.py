"""Orchestrator API router: endpoints to run or step the negotiation engine."""

from typing import Any, Literal
from fastapi import APIRouter, Body, HTTPException, Query

from backend.llm_engine import engine_mode, engine_status, make_agent_engine
from backend.orchestrator import NegotiationOrchestrator, Turn, mock_agent_fn
from backend.validation import validate_config

router = APIRouter(prefix="/api/orchestrator", tags=["orchestrator"])


@router.post("/run", summary="Run a full negotiation loop using the Orchestrator")
def run_negotiation(
    payload: dict[str, Any] = Body(...),
    engine: Literal["llm", "mock"] = Query(
        "llm",
        description="llm: LLM Reasoning Engine (rule-based when no API key is set); mock: random test agent",
    ),
) -> dict[str, Any]:
    """Execute a complete negotiation session using the Orchestrator.

    Takes a scenario config (from Task 1), validates it, runs the loop,
    and returns the final state with full turn history.
    """
    config = payload.get("config", payload) if isinstance(payload, dict) else payload

    # Validate configuration before running
    val = validate_config(config)
    if not val.get("valid", False):
        raise HTTPException(
            status_code=400,
            detail={"message": "Invalid negotiation configuration", "errors": val.get("errors", [])},
        )

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
            "engine": "mock" if engine == "mock" else engine_mode(agent_fn),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {exc}") from exc


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
    Extra fields on the turns (agent_name, turn_number, ...) are ignored.
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
        if state.status != "ongoing":
            break

    if state.status != "ongoing":
        return {"turn": None, "status": state.status, "round": state.round,
                "winner": state.winner, "engine": None}

    try:
        agent_fn = mock_agent_fn if engine == "mock" else make_agent_engine(orchestrator.max_rounds)
        agent = orchestrator._get_current_agent(state)
        turn = agent_fn(state, agent)
        state = orchestrator.step(state, turn)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {exc}") from exc
    return {
        "turn": turn,
        "status": state.status,
        "round": state.round,
        "winner": state.winner,
        "engine": "mock" if engine == "mock" else engine_mode(agent_fn),
    }


@router.get("/engine", summary="Which reasoning engine is active (LLM or rule-based)")
def get_engine_status() -> dict[str, Any]:
    """Mode, model and whether the counteroffer module is available. Never returns the API key."""
    return engine_status()
