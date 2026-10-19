import json
from pathlib import Path

SCENARIO_DIR = Path(__file__).resolve().parent.parent / "scenarios"
PERSONALITIES = ["Aggressive", "Collaborative", "Risk-Averse"]

# Files in scenarios/ that are not scenario templates.
NON_SCENARIO_FILES = {"personalities.json"}


class ScenarioFileError(Exception):
    """A file in scenarios/ is not valid JSON or is not a scenario object."""


def load_all_scenarios(folder=SCENARIO_DIR):
    scenarios = []
    for file in sorted(Path(folder).glob("*.json")):
        if file.name in NON_SCENARIO_FILES:
            continue
        # utf-8-sig also accepts files saved with a BOM by some Windows editors.
        with open(file, encoding="utf-8-sig") as f:
            try:
                scenario = json.load(f)
            except json.JSONDecodeError as exc:
                raise ScenarioFileError(f"scenarios/{file.name} is not valid JSON: {exc}") from exc
        if not isinstance(scenario, dict) or "id" not in scenario:
            raise ScenarioFileError(f"scenarios/{file.name} is not a scenario (missing 'id').")
        scenarios.append(scenario)
    return scenarios


def load_scenario(scenario_id, folder=SCENARIO_DIR):
    for scenario in load_all_scenarios(folder):
        if scenario["id"] == scenario_id:
            return scenario
    raise ValueError(f"No scenario found with id '{scenario_id}'")


def build_negotiation_config(scenario_id, personality_choices=None, folder=SCENARIO_DIR):
    personality_choices = personality_choices or {}
    scenario = load_scenario(scenario_id, folder)

    agents = []
    for agent in scenario["agents"]:
        chosen = personality_choices.get(agent["id"], agent["default_personality"])
        agents.append({
            "id": agent["id"],
            "name": agent["name"],
            "role": agent["role"],
            "role_description": agent.get("role_description", ""),
            "goal": agent["goal"],
            "constraints": agent["constraints"],
            "limits": agent["limits"],
            "personality": chosen,
        })

    return {
        "scenario_id": scenario["id"],
        "title": scenario["title"],
        "description": scenario["description"],
        "max_rounds": scenario.get("max_rounds", 10),
        "agents": agents,
    }


if __name__ == "__main__":
    print("Available scenarios:")
    for s in load_all_scenarios():
        print(" -", s["id"], "|", s["title"])

    config = build_negotiation_config("vendor_pricing", {"vendor": "Risk-Averse"})
    print("\nFinal config handed to the Orchestrator:")
    print(json.dumps(config, indent=2))
