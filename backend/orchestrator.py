"""Orchestrator Agent for Multi-Agent Negotiation Simulator (Task 2).

This module manages the turn-based negotiation lifecycle between autonomous
AI agents. The orchestrator acts as a neutral referee: it alternates turns
between agents, maintains the conversation history and state, advances round
counters, and halts the simulation upon agreement, walkaway rejection, or deadlock.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional, TypedDict


# ============================================================================
# 1. Turn TypedDict
# ============================================================================
# Plain-English Explanation:
# A Turn represents a single move made by an agent during one negotiation step.
# It records who spoke (agent_id), what round it was (round), what action they took
# ("accept", "counter", or "reject"), the specific terms proposed in the offer,
# the agent's internal explanation (reasoning), and their psychological stance
# ("firm", "flexible", or "urgent").
# ============================================================================

class Turn(TypedDict):
    """Structured representation of an individual negotiation move."""
    agent_id: str
    round: int
    action: str  # Strictly one of: "accept", "counter", "reject"
    offer: dict[str, Any]  # Key-value terms, e.g. {"price": 37000}
    reasoning: str
    stance: str  # Strictly one of: "firm", "flexible", "urgent"


# ============================================================================
# 2. NegotiationState Dataclass
# ============================================================================
# Plain-English Explanation:
# The NegotiationState holds the entire live memory of a negotiation session.
# It tracks the active scenario identifier, the list of participating agent configs,
# the cumulative list of every Turn taken so far (history), the current round count,
# the session status ("ongoing", "accepted", "rejected", or "deadlock"), and the
# agent_id of the winning party if an offer was accepted.
# ============================================================================

@dataclass
class NegotiationState:
    """Cumulative state of an ongoing or completed negotiation session."""
    scenario_id: str
    agents: list[dict[str, Any]]
    history: list[Turn] = field(default_factory=list)
    round: int = 0
    status: str = "ongoing"  # "ongoing" | "accepted" | "rejected" | "deadlock"
    winner: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert the negotiation state to a plain serializable dictionary."""
        return {
            "scenario_id": self.scenario_id,
            "agents": self.agents,
            "history": self.history,
            "round": self.round,
            "status": self.status,
            "winner": self.winner,
        }


# ============================================================================
# 3. NegotiationOrchestrator Class
# ============================================================================
# Plain-English Explanation:
# The NegotiationOrchestrator is the referee of the negotiation. It takes in
# the scenario configuration from Task 1, starts the session, determines whose
# turn it is to speak, updates state when a turn is submitted, evaluates whether
# the negotiation should end, and runs the entire negotiation loop with any
# pluggable agent reasoning function (LLM engine or mock function).
# ============================================================================

class NegotiationOrchestrator:
    """Manages the turn-based execution and state transitions of a negotiation."""

    def __init__(self, config: dict[str, Any]) -> None:
        """Initialize the orchestrator with a validated scenario configuration.

        Args:
            config: Scenario dictionary containing scenario_id, title, description,
                    max_rounds, and a list of participating agent configs.
        """
        self.config: dict[str, Any] = config
        self.scenario_id: str = str(config.get("scenario_id") or config.get("id") or "")
        self.title: str = str(config.get("title") or "")
        self.description: str = str(config.get("description") or "")
        self.max_rounds: int = int(config.get("max_rounds", 10))
        self.agents: list[dict[str, Any]] = list(config.get("agents") or [])

        if len(self.agents) < 2:
            raise ValueError(
                f"A negotiation requires at least 2 agents, found {len(self.agents)}."
            )

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # start() creates a brand-new, clean NegotiationState object. The round
    # counter is set to 0, history is empty, status is "ongoing", and no winner
    # is declared yet.
    # ------------------------------------------------------------------------
    def start(self) -> NegotiationState:
        """Initialize a fresh negotiation session.

        Returns:
            The initial NegotiationState with round=0 and status="ongoing".
        """
        return NegotiationState(
            scenario_id=self.scenario_id,
            agents=self.agents,
            history=[],
            round=0,
            status="ongoing",
            winner=None,
        )

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # _get_current_agent() figures out which agent needs to make the next move.
    # It alternates strictly between agents in order: Agent 0, Agent 1, Agent 0,
    # Agent 1... based on how many turns have already been recorded in history.
    # ------------------------------------------------------------------------
    def _get_current_agent(self, state: NegotiationState) -> dict[str, Any]:
        """Determine which agent takes the next turn based on history length.

        Turn order strictly alternates across agents: index 0, index 1, index 0...

        Args:
            state: The current negotiation state.

        Returns:
            The agent configuration dictionary of the active agent.
        """
        if not state.agents:
            raise ValueError("State contains no participating agents.")
        current_index = len(state.history) % len(state.agents)
        return state.agents[current_index]

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # _check_end() inspects the latest action and round count to determine if the
    # negotiation is finished:
    # - "accept" -> Deal reached! status becomes "accepted", winner is the accepting agent.
    # - "reject" -> Negotiation collapsed! status becomes "rejected", winner is None.
    # - round >= max_rounds -> Time ran out! status becomes "deadlock", winner is None.
    # - otherwise -> status remains "ongoing".
    # ------------------------------------------------------------------------
    def _check_end(self, state: NegotiationState, turn: Turn) -> NegotiationState:
        """Evaluate terminal conditions for the negotiation session.

        Args:
            state: The current negotiation state.
            turn: The turn that was just completed.

        Returns:
            The updated NegotiationState with its status and winner updated.
        """
        action = str(turn.get("action", "")).strip().lower()

        if action == "accept":
            state.status = "accepted"
            state.winner = turn.get("agent_id")
        elif action == "reject":
            state.status = "rejected"
            state.winner = None
        elif state.round >= self.max_rounds:
            state.status = "deadlock"
            state.winner = None
        else:
            state.status = "ongoing"
            state.winner = None

        return state

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # step() records a completed turn into history, advances the round count by 1,
    # and checks if the negotiation has ended (accept, reject, or deadlock).
    # It returns the updated state.
    # ------------------------------------------------------------------------
    def step(self, state: NegotiationState, turn: Turn) -> NegotiationState:
        """Record an agent's turn, advance the round, and update negotiation status.

        Args:
            state: The active negotiation state before this move.
            turn: The Turn object containing the agent's action and proposal.

        Returns:
            The updated NegotiationState after applying the turn.
        """
        # If negotiation already reached a terminal outcome, do not mutate further
        if state.status != "ongoing":
            return state

        # 1. Append the turn to cumulative history (every turn is preserved)
        state.history.append(turn)

        # 2. Advance the round counter
        state.round += 1

        # 3. Check for end conditions (accept, reject, or max_rounds deadlock)
        return self._check_end(state, turn)

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # run_loop() executes the complete negotiation from start to finish. In every
    # loop iteration, it asks the active agent for their move (using agent_fn),
    # feeds that move into step(), and keeps going until the status is no longer
    # "ongoing". Any agent function (LLM engine or mock) can plug into this.
    # ------------------------------------------------------------------------
    def run_loop(
        self, agent_fn: Callable[[NegotiationState, dict[str, Any]], Turn]
    ) -> NegotiationState:
        """Run the full negotiation loop until a terminal state is reached.

        Args:
            agent_fn: A callable accepting (state, current_agent) and returning a Turn.

        Returns:
            The final NegotiationState.
        """
        state = self.start()
        while state.status == "ongoing":
            current_agent = self._get_current_agent(state)
            turn = agent_fn(state, current_agent)
            state = self.step(state, turn)
        return state


# ============================================================================
# 4. Mock Agent Function for Testing & Verification
# ============================================================================
# Plain-English Explanation:
# mock_agent_fn simulates an agent's decision without calling an actual LLM.
# It inspects the agent's limits, picks a realistic numerical value within those
# limits, generates dummy reasoning, and returns a valid Turn object with
# action="counter". This allows full end-to-end testing of the Orchestrator loop
# before the LLM Reasoning Engine is plugged in.
# ============================================================================

def mock_agent_fn(state: NegotiationState, agent: dict[str, Any]) -> Turn:
    """Generate a valid mock Turn constrained by the agent's reservation limits.

    Args:
        state: The current negotiation state.
        agent: The configuration dictionary of the agent taking the turn.

    Returns:
        A valid Turn TypedDict with action="counter".
    """
    offer: dict[str, Any] = {}
    limits = agent.get("limits") or []

    for lim in limits:
        item = str(lim.get("item", "price"))
        l_type = str(lim.get("type", "min")).lower()
        val = float(lim.get("value", 0))

        # Generate a reasonable proposed value within boundary
        if l_type == "min":
            # Seller / recipient floor: propose at or above the minimum
            proposed = val * random.uniform(1.0, 1.15)
        else:
            # Buyer / payer ceiling: propose at or below the maximum
            proposed = val * random.uniform(0.85, 1.0)

        # Preserve integer format if original limit was integer-based
        offer[item] = int(round(proposed)) if float(val).is_integer() else round(proposed, 2)

    # Fallback if no limits were defined
    if not offer:
        offer["price"] = random.randint(35000, 40000)

    current_round = state.round + 1
    stances = ["firm", "flexible", "urgent"]
    chosen_stance = "flexible" if current_round < 8 else random.choice(stances)

    return Turn(
        agent_id=str(agent.get("id", "agent")),
        round=current_round,
        action="counter",
        offer=offer,
        reasoning=(
            f"{agent.get('name', 'Agent')} proposes a counteroffer within reservation "
            f"limits to advance negotiation towards mutual agreement."
        ),
        stance=chosen_stance,
    )


# ============================================================================
# 5. Helper Function to Locate Scenarios
# ============================================================================
# Plain-English Explanation:
# Searches for a scenario JSON file in either the current working directory,
# the project root, or parent folders, so that the script runs seamlessly
# regardless of which folder terminal is opened in.
# ============================================================================

def _find_scenario_path(filename: str = "vendor_pricing.json") -> Path:
    """Locate scenario file across workspace directory variants."""
    candidates = [
        Path.cwd() / "scenarios" / filename,
        Path(__file__).resolve().parent / "scenarios" / filename,
        Path(__file__).resolve().parent.parent / "scenarios" / filename,
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"Could not find '{filename}' in candidate paths: {candidates}")


# ============================================================================
# 6. Executable Demo Block (__main__)
# ============================================================================
# Plain-English Explanation:
# When this file is run directly (python orchestrator.py), it loads the Vendor
# Pricing scenario, initializes the Orchestrator, runs the full loop using the
# mock agent, prints every turn as formatted JSON, and outputs the final outcome.
# ============================================================================

if __name__ == "__main__":
    scenario_path = _find_scenario_path("vendor_pricing.json")
    print(f"Loading scenario configuration from: {scenario_path}\n")

    with open(scenario_path, encoding="utf-8-sig") as f:
        scenario_data = json.load(f)

    # Format into Task 1 config specification
    config = {
        "scenario_id": scenario_data.get("id", "vendor_pricing"),
        "title": scenario_data.get("title", "Vendor Pricing Negotiation"),
        "description": scenario_data.get("description", ""),
        "max_rounds": scenario_data.get("max_rounds", 10),
        "agents": scenario_data.get("agents", []),
    }

    orchestrator = NegotiationOrchestrator(config)
    print("=" * 70)
    print(f"STARTING SIMULATION: {config['title']} (Max Rounds: {config['max_rounds']})")
    print("=" * 70)

    final_state = orchestrator.run_loop(mock_agent_fn)

    print("\n" + "=" * 70)
    print("TURN-BY-TURN NEGOTIATION TRANSCRIPT")
    print("=" * 70)

    for idx, turn in enumerate(final_state.history, start=1):
        print(f"\n--- Turn #{idx} (Round {turn['round']}) | Agent: '{turn['agent_id']}' ---")
        print(json.dumps(turn, indent=2))

    print("\n" + "=" * 70)
    print("FINAL NEGOTIATION OUTCOME")
    print("=" * 70)
    print(f"Status:       {final_state.status.upper()}")
    print(f"Total Rounds: {final_state.round}")
    print(f"Total Turns:  {len(final_state.history)}")
    print(f"Winner:       {final_state.winner if final_state.winner else 'None (Deadlock / Impasse)'}")
    print("=" * 70)

