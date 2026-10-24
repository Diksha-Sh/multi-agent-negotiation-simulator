"""Root entry point for orchestrator.py.

Imports and exposes the entire Orchestrator engine from backend.orchestrator.
Allows running directly as:
    python orchestrator.py
"""

from backend.orchestrator import (
    NegotiationOrchestrator,
    NegotiationState,
    Turn,
    _find_scenario_path,
    mock_agent_fn,
)

__all__ = [
    "Turn",
    "NegotiationState",
    "NegotiationOrchestrator",
    "mock_agent_fn",
]

if __name__ == "__main__":
    import json

    scenario_path = _find_scenario_path("vendor_pricing.json")
    print(f"Loading scenario configuration from: {scenario_path}\n")

    with open(scenario_path, encoding="utf-8-sig") as f:
        scenario_data = json.load(f)

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

