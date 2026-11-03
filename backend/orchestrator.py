"""Orchestrator Agent for Multi-Agent Negotiation Simulator (Tasks 2 & 4).

This module manages the turn-based negotiation lifecycle between autonomous
AI agents and optional human participants in Practice Mode. The orchestrator acts
as a neutral referee: it alternates turns between agents, maintains the conversation
history and state, advances round counters, pauses for human input when in Practice
Mode, detects stalls/deadlocks, and halts upon agreement, walkaway rejection, or impasse.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional, TypedDict


# ============================================================================
# 1. Turn, HumanTurn & DeadlockEvent Types
# ============================================================================
# Plain-English Explanation:
# - Turn: A structured record of an agent's or human's move in one negotiation step.
# - HumanTurn: Payload supplied by a human player (reasoning and stance are optional).
# - DeadlockEvent: Information about a detected negotiation stall, cyclical position,
#   or round exhaustion, along with progressive resolution outcomes.
# ============================================================================

class Turn(TypedDict):
    """Structured representation of an individual negotiation move."""
    agent_id: str
    round: int
    action: str  # Strictly one of: "accept", "counter", "reject"
    offer: dict[str, Any]  # Key-value terms, e.g. {"price": 37000}
    reasoning: str
    stance: str  # Strictly one of: "firm", "flexible", "urgent"


class HumanTurn(TypedDict, total=False):
    """Structured representation of a turn submitted by a human player."""
    agent_id: str
    round: int
    action: str  # "accept" | "counter" | "reject"
    offer: dict[str, Any]  # Key-value terms entered by human
    reasoning: Optional[str]  # Optional user explanation
    stance: Optional[str]  # Optional user stance ("firm" | "flexible" | "urgent")


class DeadlockEvent(TypedDict, total=False):
    """Structured event capturing a stalled or deadlocked negotiation."""
    type: str  # "stall" | "repeated_rejection" | "max_rounds" | "same_position" | "breakdown"
    round_triggered: int
    resolution_attempt: Optional[str]
    resolution_outcome: Optional[str]  # "compromise" | "stance_change" | "final_round" | "breakdown" | None
    details: Optional[str]


def create_human_turn(
    agent_id: str,
    action: str,
    offer: dict[str, Any],
    round_num: int,
    reasoning: Optional[str] = None,
    stance: Optional[str] = None,
) -> Turn:
    """Validate and construct a canonical Turn dictionary from human input.

    Args:
        agent_id: Identifier of the participating human agent.
        action: One of "accept", "counter", "reject".
        offer: Dictionary of negotiable items and numeric values.
        round_num: The round/turn index.
        reasoning: Optional rationale provided by user (defaults to clear explanation).
        stance: Tactical posture, one of "firm", "flexible", "urgent" (defaults to "flexible").

    Returns:
        A strictly compliant Turn dictionary.
    """
    act = str(action or "counter").strip().lower()
    if act not in ("accept", "counter", "reject"):
        raise ValueError(f"Invalid human action '{action}'. Must be 'accept', 'counter', or 'reject'.")

    if not isinstance(offer, dict):
        raise ValueError(f"Offer must be a dictionary, got {type(offer).__name__}.")

    stn = str(stance or "flexible").strip().lower()
    if stn not in ("firm", "flexible", "urgent"):
        stn = "flexible"

    rsn = str(reasoning or "").strip()
    if not rsn:
        rsn = f"Human participant ({agent_id}) submitted {act} offer."

    return {
        "agent_id": str(agent_id),
        "round": int(round_num),
        "action": act,
        "offer": offer,
        "reasoning": rsn,
        "stance": stn,
    }


# ============================================================================
# 2. NegotiationState Dataclass
# ============================================================================
# Plain-English Explanation:
# The NegotiationState holds the entire live memory of a negotiation session.
# It tracks the active scenario identifier, participating agent configs, cumulative
# turn history, round count, status ("ongoing", "accepted", "rejected", "deadlock",
# or "waiting_for_human"), winning agent, mode ("simulation" or "practice"),
# which seat is human (human_agent_id), and any deadlock event.
# ============================================================================

@dataclass
class NegotiationState:
    """Cumulative state of an ongoing or completed negotiation session."""
    scenario_id: str
    agents: list[dict[str, Any]]
    history: list[Turn] = field(default_factory=list)
    round: int = 0
    status: str = "ongoing"  # "ongoing" | "accepted" | "rejected" | "deadlock" | "waiting_for_human"
    winner: Optional[str] = None
    mode: str = "simulation"  # "simulation" | "practice"
    human_agent_id: Optional[str] = None
    deadlock_event: Optional[dict[str, Any]] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert the negotiation state to a plain serializable dictionary."""
        return {
            "scenario_id": self.scenario_id,
            "agents": self.agents,
            "history": self.history,
            "round": self.round,
            "status": self.status,
            "winner": self.winner,
            "mode": self.mode,
            "human_agent_id": self.human_agent_id,
            "deadlock_event": self.deadlock_event,
        }


# ============================================================================
# 3. NegotiationOrchestrator Class
# ============================================================================
# Plain-English Explanation:
# The NegotiationOrchestrator is the referee of the negotiation. It takes in
# the scenario configuration, starts the session, determines whose turn it is,
# updates state when a turn is submitted, detects deadlocks, evaluates whether
# the negotiation should pause for a human player or conclude, and executes
# the turn loop.
# ============================================================================

class NegotiationOrchestrator:
    """Manages the turn-based execution and state transitions of a negotiation."""

    def __init__(
        self,
        config: dict[str, Any],
        deadlock_checker: Optional[Callable[[NegotiationState, dict[str, Any]], Optional[dict[str, Any]]]] = None,
    ) -> None:
        """Initialize the orchestrator with a validated scenario configuration.

        Args:
            config: Scenario dictionary containing scenario_id, title, description,
                    max_rounds, mode, human_agent_id, and agent configs.
            deadlock_checker: Optional callback to inspect state for stalls/deadlocks.
        """
        self.config: dict[str, Any] = config
        self.scenario_id: str = str(config.get("scenario_id") or config.get("id") or "")
        self.title: str = str(config.get("title") or "")
        self.description: str = str(config.get("description") or "")
        self.max_rounds: int = int(config.get("max_rounds", 10))
        self.agents: list[dict[str, Any]] = list(config.get("agents") or [])

        # Mode configuration: "simulation" (AI vs AI) or "practice" (Human vs AI)
        raw_mode = str(config.get("mode") or "simulation").strip().lower()
        self.mode: str = "practice" if raw_mode == "practice" else "simulation"
        self.human_agent_id: Optional[str] = config.get("human_agent_id")
        if self.mode == "practice" and not self.human_agent_id and self.agents:
            self.human_agent_id = str(self.agents[0].get("id"))

        self.deadlock_checker = deadlock_checker

        if len(self.agents) < 2:
            raise ValueError(
                f"A negotiation requires at least 2 agents, found {len(self.agents)}."
            )

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # start() creates a brand-new, clean NegotiationState object.
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
            mode=self.mode,
            human_agent_id=self.human_agent_id,
            deadlock_event=None,
        )

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # _get_current_agent() figures out which agent needs to make the next move.
    # It alternates strictly between agents in order based on history length.
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
    # _check_deadlock() queries the deadlock module or custom hook to see if
    # the negotiation has reached an impasse or stall.
    # ------------------------------------------------------------------------
    def _check_deadlock(self, state: NegotiationState) -> Optional[dict[str, Any]]:
        """Evaluate if negotiation is stalled or deadlocked."""
        if callable(self.deadlock_checker):
            try:
                return self.deadlock_checker(state, self.config)
            except Exception:
                pass

        try:
            from backend.deadlock import check_deadlock
            return check_deadlock(state, self.config)
        except (ImportError, AttributeError):
            return None

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # _check_end() inspects the latest action, round count, and deadlock checks:
    # - "accept" -> Deal reached! status becomes "accepted", winner is recorded.
    # - "reject" -> Negotiation collapsed! status becomes "rejected", winner is None.
    # - round >= max_rounds -> Time ran out! status becomes "deadlock".
    # - Deadlock hook triggers breakdown -> status becomes "deadlock".
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
            return state

        if action == "reject":
            state.status = "rejected"
            state.winner = None
            return state

        # Check round limits
        if state.round >= self.max_rounds:
            state.status = "deadlock"
            state.winner = None
            if not state.deadlock_event:
                state.deadlock_event = {
                    "type": "max_rounds",
                    "round_triggered": state.round,
                    "resolution_attempt": "declare_breakdown",
                    "resolution_outcome": "breakdown",
                    "details": f"Reached maximum allowed rounds ({self.max_rounds}).",
                }
            return state

        # Check for deadlock / stall patterns via deadlock hook
        deadlock_info = self._check_deadlock(state)
        if deadlock_info:
            state.deadlock_event = deadlock_info
            outcome = str(deadlock_info.get("resolution_outcome") or "").lower()
            dtype = str(deadlock_info.get("type") or "").lower()
            if outcome == "breakdown" or dtype in ("breakdown", "max_rounds"):
                state.status = "deadlock"
                state.winner = None
                return state

        state.status = "ongoing"
        state.winner = None
        return state

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # step() records a completed turn into history, advances the round count,
    # and updates negotiation status (accept, reject, or deadlock).
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
        if state.status not in ("ongoing", "waiting_for_human"):
            return state

        # 1. Append the turn to cumulative history (every turn is preserved)
        state.history.append(turn)

        # 2. Advance the round counter
        state.round += 1

        # 3. Check for end conditions (accept, reject, or max_rounds deadlock)
        return self._check_end(state, turn)

    # ------------------------------------------------------------------------
    # Plain-English Explanation:
    # run_loop() executes the negotiation turn-by-turn.
    # In Simulation Mode: runs continuously until accepted, rejected, or deadlock.
    # In Practice Mode: if it is the human's turn to speak, it cleanly pauses
    # and returns with status="waiting_for_human" so the human can submit their move.
    # ------------------------------------------------------------------------
    def run_loop(
        self,
        agent_fn: Callable[[NegotiationState, dict[str, Any]], Turn],
        initial_state: Optional[NegotiationState] = None,
    ) -> NegotiationState:
        """Run the negotiation loop until a terminal state or human pause is reached.

        Args:
            agent_fn: A callable accepting (state, current_agent) and returning a Turn.
            initial_state: Optional existing state to resume from (e.g., after human turn).

        Returns:
            The NegotiationState at pause or conclusion.
        """
        state = initial_state if initial_state is not None else self.start()
        if state.status == "waiting_for_human":
            state.status = "ongoing"

        while state.status == "ongoing":
            current_agent = self._get_current_agent(state)

            # In Practice Mode: pause if the active agent is the human
            if self.mode == "practice" and current_agent.get("id") == self.human_agent_id:
                state.status = "waiting_for_human"
                return state

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
# action="counter".
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
            proposed = val * random.uniform(1.0, 1.15)
        else:
            proposed = val * random.uniform(0.85, 1.0)

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
        "mode": "simulation",
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
