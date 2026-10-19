"""Configuration endpoints: validate the config built on Start, or build it."""

from typing import Any

from fastapi import APIRouter, Body, HTTPException

from backend.routers.scenarios import get_scenario_or_404
from backend.scenario_loader import build_negotiation_config
from backend.schemas import ConfigRequest
from backend.validation import validate_config

router = APIRouter(prefix="/api", tags=["configuration"])


@router.post("/validate", summary="Check a negotiation config before Start")
def validate(config: Any = Body(..., description="The final config built on Start")) -> dict[str, Any]:
    """Always answers 200 with {"valid": bool, "errors": [...]}.

    The frontend keeps Start blocked while valid is false and shows the errors.
    """
    return validate_config(config)


@router.post(
    "/config",
    summary="Build the final config from a scenario and personality choices, and validate it",
    responses={
        404: {"description": "No scenario with this id"},
        422: {"description": "Personality choice for an agent that is not in the scenario"},
    },
)
def build_config(request: ConfigRequest) -> dict[str, Any]:
    scenario = get_scenario_or_404(request.scenario_id)

    agent_ids = {agent["id"] for agent in scenario["agents"]}
    unknown = sorted(set(request.personalities) - agent_ids)
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown agent id(s) for scenario '{request.scenario_id}': {unknown}. "
            f"Valid ids: {sorted(agent_ids)}",
        )

    config = build_negotiation_config(request.scenario_id, request.personalities)
    return {"config": config, "validation": validate_config(config)}
