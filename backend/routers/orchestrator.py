"""Orchestrator API router: endpoints to run or step the negotiation engine."""

from typing import Any
from fastapi import APIRouter, Body, HTTPException

from backend.llm_engine import make_agent_engine
from backend.orchestrator import NegotiationOrchestrator
from backend.validation import validate_config

router = APIRouter(prefix="/api/orchestrator", tags=["orchestrator"])


@router.post("/run", summary="Run a full negotiation loop using the Orchestrator")
def run_negotiation(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
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
        agent_engine = make_agent_engine(max_rounds=orchestrator.max_rounds)
        final_state = orchestrator.run_loop(agent_engine)
        return {
            "status": final_state.status,
            "round": final_state.round,
            "winner": final_state.winner,
            "history": final_state.history,
            "state": final_state.to_dict(),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Orchestration failure: {exc}") from exc
