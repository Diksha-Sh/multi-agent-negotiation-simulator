"""Scenario endpoints: the scenario cards and the role cards."""

from typing import Any

from fastapi import APIRouter, HTTPException

from backend.scenario_loader import load_all_scenarios, load_scenario

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


def get_scenario_or_404(scenario_id: str) -> dict[str, Any]:
    """Return the scenario, or raise a 404 error if the id is unknown."""
    try:
        return load_scenario(scenario_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("", summary="All scenarios (for the scenario cards)")
def list_scenarios() -> list[dict[str, Any]]:
    return load_all_scenarios()


@router.get(
    "/{scenario_id}",
    summary="One scenario with its agents (for the role cards)",
    responses={404: {"description": "No scenario with this id"}},
)
def get_scenario(scenario_id: str) -> dict[str, Any]:
    return get_scenario_or_404(scenario_id)
