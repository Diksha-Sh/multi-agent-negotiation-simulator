"""Request bodies accepted by the API."""

from pydantic import BaseModel, Field


class ConfigRequest(BaseModel):
    """Body for POST /api/config."""

    scenario_id: str = Field(..., description="Scenario id, e.g. vendor_pricing")
    personalities: dict[str, str] = Field(
        default_factory=dict,
        description="User's choices as {agent_id: personality}. "
        "Agents not listed keep their default personality.",
    )
