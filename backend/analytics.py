"""Performance Analytics Module (Milestone 4).

Aggregates and mines multi-session negotiation datasets to track:
1. Cross-session performance indicators (agreement rate, deadlock frequency, pacing).
2. Recurring deadlock triggers (stall, repeated_rejection, same_position, max_rounds).
3. Personality effectiveness & scenario difficulty metrics.
4. Actionable insights into areas where agents struggle to reach agreement.
"""

from __future__ import annotations

import math
from typing import Any, Optional


DEADLOCK_TYPES = ("same_position", "stall", "repeated_rejection", "max_rounds")
FINAL_STATUSES = ("accepted", "deadlock", "rejected")


def _is_num(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def normalize_session(session: dict[str, Any]) -> dict[str, Any]:
    """Accept both record shapes: the frontend history record (turns, total_rounds,
    scenario_title, config.deadlock_event) and the compact sample shape (rounds, history)."""
    config = session.get("config") if isinstance(session.get("config"), dict) else {}
    history = session.get("history") or session.get("turns") or []
    history = [t for t in history if isinstance(t, dict)]
    agents = config.get("agents") or []
    agent_count = max(1, len(agents) or 2)
    rounds = session.get("rounds") or session.get("total_rounds")
    if not _is_num(rounds) or rounds <= 0:
        rounds = math.ceil(len(history) / agent_count) if history else 0
    scenario_id = session.get("scenario_id") or config.get("scenario_id") or config.get("id") or "custom"
    title = (
        session.get("scenario_title") or session.get("title") or config.get("title")
        or str(scenario_id).replace("_", " ").title()
    )
    deadlock_event = session.get("deadlock_event") or config.get("deadlock_event")
    return {
        "id": session.get("id") or session.get("session_id"),
        "scenario_id": scenario_id,
        "title": title,
        "status": str(session.get("status") or "unknown").lower(),
        "winner": session.get("winner"),
        "rounds": float(rounds),
        "history": history,
        "config": config,
        "agents": agents,
        "mode": session.get("mode") or config.get("mode") or "simulation",
        "deadlock_event": deadlock_event if isinstance(deadlock_event, dict) else None,
    }


def _negotiable_item(agents: list[dict[str, Any]]) -> Optional[tuple[str, float, float]]:
    """First item two agents pull in opposite directions, with its deal zone (low, high)."""
    by_item: dict[str, list[dict[str, Any]]] = {}
    for agent in agents:
        for limit in agent.get("limits") or []:
            if isinstance(limit, dict) and _is_num(limit.get("value")):
                by_item.setdefault(str(limit.get("item")), []).append(limit)
    for item, limits in by_item.items():
        types = {str(l.get("type")).lower() for l in limits}
        if types == {"min", "max"}:
            low = max(float(l["value"]) for l in limits if str(l.get("type")).lower() == "min")
            high = min(float(l["value"]) for l in limits if str(l.get("type")).lower() == "max")
            if high > low:
                return item, low, high
    return None


def value_shares(session: dict[str, Any]) -> Optional[dict[str, float]]:
    """Share of the deal zone each agent captured in an accepted deal (0..1, sums to 1).

    A buyer (max limit) captures more the lower the price; a seller (min limit) the higher.
    """
    s = session if "agents" in session and "rounds" in session else normalize_session(session)
    if s["status"] != "accepted" or not s["history"]:
        return None
    zone = _negotiable_item(s["agents"])
    final = s["history"][-1].get("offer") or {}
    if not zone or not _is_num(final.get(zone[0])):
        return None
    item, low, high = zone
    position = min(1.0, max(0.0, (float(final[item]) - low) / (high - low)))  # 0 = low end, 1 = high end
    shares: dict[str, float] = {}
    for agent in s["agents"]:
        limit = next((l for l in agent.get("limits") or [] if l.get("item") == item), None)
        if limit:
            is_max = str(limit.get("type")).lower() == "max"
            shares[str(agent.get("id"))] = round(1.0 - position if is_max else position, 3)
    return shares or None


def analyze_performance(sessions: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculate multi-session metrics, trend distributions, and operational insights.

    An empty list returns zeroed metrics (never sample data), so a new user is not shown
    numbers that are not theirs. GET /api/analytics passes the sample sessions explicitly.
    """
    # Only finished negotiations count; an 'ongoing' or 'waiting_for_human' record is not a result.
    normalized = [
        n for n in (normalize_session(s) for s in sessions or [] if isinstance(s, dict))
        if n["status"] in FINAL_STATUSES
    ]
    total_sessions = len(normalized)
    accepted_sessions = sum(1 for s in normalized if s["status"] == "accepted")
    deadlocked_sessions = sum(1 for s in normalized if s["status"] == "deadlock")
    rejected_sessions = sum(1 for s in normalized if s["status"] == "rejected")

    def pct(part: float, whole: float) -> float:
        return round(part / whole * 100, 1) if whole else 0.0

    agreement_rate = pct(accepted_sessions, total_sessions)
    deadlock_rate = pct(deadlocked_sessions, total_sessions)
    rounds_list = [s["rounds"] for s in normalized if s["rounds"] > 0]
    avg_rounds = round(sum(rounds_list) / len(rounds_list), 1) if rounds_list else 0.0

    # Sessions that hit a deadlock but still ended in a deal (the resolution ladder worked)
    resolved_by_ladder = sum(1 for s in normalized if s["deadlock_event"] and s["status"] == "accepted")

    # Recurring deadlock triggers (any session that hit one, even if the ladder then found a deal)
    deadlock_triggers: dict[str, int] = {t: 0 for t in DEADLOCK_TYPES}
    unclassified = 0
    for s in normalized:
        trigger = (s["deadlock_event"] or {}).get("type")
        if trigger in deadlock_triggers:
            deadlock_triggers[trigger] += 1
        elif s["status"] == "deadlock":
            unclassified += 1  # older records saved without their deadlock event
    if unclassified:
        deadlock_triggers["unclassified"] = unclassified

    # Breakdown by scenario + heatmap rows + value win-rates
    order: list[str] = []
    groups: dict[str, list[dict[str, Any]]] = {}
    for s in normalized:
        if s["scenario_id"] not in groups:
            order.append(s["scenario_id"])
            groups[s["scenario_id"]] = []
        groups[s["scenario_id"]].append(s)

    scenario_breakdown = []
    heatmap_rows = []
    win_rates = []
    for scen_id in order:
        group = groups[scen_id]
        tot = len(group)
        acc = sum(1 for s in group if s["status"] == "accepted")
        dl = sum(1 for s in group if s["status"] == "deadlock")
        rnds = [s["rounds"] for s in group if s["rounds"] > 0]
        title = group[0]["title"]
        scenario_breakdown.append({
            "scenario_id": scen_id,
            "title": title,
            "total_runs": tot,
            "agreement_rate": pct(acc, tot),
            "deadlock_rate": pct(dl, tot),
            "avg_rounds": round(sum(rnds) / len(rnds), 1) if rnds else 0.0,
        })

        cells = {"accepted": acc, "rejected": sum(1 for s in group if s["status"] == "rejected"), "breakdown": dl}
        for t in DEADLOCK_TYPES:
            cells[t] = sum(1 for s in group if (s["deadlock_event"] or {}).get("type") == t)
        heatmap_rows.append({
            "scenario_id": scen_id,
            "title": title,
            "total": tot,
            "counts": cells,
            "rates": {k: pct(v, tot) for k, v in cells.items()},
        })

        names: dict[str, str] = {}
        tally: dict[str, dict[str, float]] = {}
        even = deals = 0
        for s in group:
            for agent in s["agents"]:
                names.setdefault(str(agent.get("id")), str(agent.get("name") or agent.get("id")))
            shares = value_shares(s)
            if not shares:
                continue
            deals += 1
            best_id, best = max(shares.items(), key=lambda kv: kv[1])
            if abs(best - 0.5) <= 0.05:
                even += 1
            for aid, share in shares.items():
                t = tally.setdefault(aid, {"wins": 0, "share_sum": 0.0})
                t["share_sum"] += share
                if aid == best_id and abs(best - 0.5) > 0.05:
                    t["wins"] += 1
        win_rates.append({
            "scenario_id": scen_id,
            "title": title,
            "deals": deals,
            "even_deals": even,
            "agents": [
                {
                    "id": aid,
                    "name": names.get(aid, aid),
                    "value_wins": int(t["wins"]),
                    "win_rate": pct(t["wins"], deals),
                    "avg_value_share": round(t["share_sum"] / deals * 100, 1) if deals else 0.0,
                }
                for aid, t in tally.items()
            ],
        })

    # Personality pairing matrix (first agent's personality x second agent's personality)
    pairs: dict[tuple[str, str], dict[str, float]] = {}
    for s in normalized:
        if len(s["agents"]) < 2:
            continue
        a = str(s["agents"][0].get("personality") or "Collaborative")
        b = str(s["agents"][1].get("personality") or "Collaborative")
        cell = pairs.setdefault((a, b), {"runs": 0, "accepted": 0, "deadlock_events": 0, "rounds": 0.0})
        cell["runs"] += 1
        cell["accepted"] += s["status"] == "accepted"
        cell["deadlock_events"] += bool(s["deadlock_event"]) or s["status"] == "deadlock"
        cell["rounds"] += s["rounds"]
    personality_matrix = [
        {
            "first": a,
            "second": b,
            "runs": int(c["runs"]),
            "agreement_rate": pct(c["accepted"], c["runs"]),
            "deadlock_event_rate": pct(c["deadlock_events"], c["runs"]),
            "avg_rounds": round(c["rounds"] / c["runs"], 1) if c["runs"] else 0.0,
        }
        for (a, b), c in sorted(pairs.items())
    ]

    return {
        "total_sessions": total_sessions,
        "agreement_rate": agreement_rate,
        "deadlock_rate": deadlock_rate,
        "avg_rounds": avg_rounds,
        "status_distribution": {
            "accepted": accepted_sessions,
            "deadlock": deadlocked_sessions,
            "rejected": rejected_sessions,
        },
        "deadlock_triggers": deadlock_triggers,
        "scenario_breakdown": scenario_breakdown,
        "deadlock_heatmap": {
            "columns": ["accepted", *DEADLOCK_TYPES, "breakdown", "rejected"],
            "rows": heatmap_rows,
        },
        "win_rates": win_rates,
        "personality_matrix": personality_matrix,
        "resolved_by_ladder": resolved_by_ladder,
        "key_insights": _insights(total_sessions, agreement_rate, deadlock_triggers, avg_rounds,
                                  scenario_breakdown, personality_matrix, resolved_by_ladder, deadlocked_sessions),
    }


def _num(value: float) -> str:
    """1 decimal, without a trailing .0 (100.0 -> 100)."""
    return f"{value:.1f}".rstrip("0").rstrip(".")


def _insights(total: int, agreement_rate: float, triggers: dict[str, int], avg_rounds: float,
              scenarios: list[dict[str, Any]], matrix: list[dict[str, Any]],
              resolved: int = 0, breakdowns: int = 0) -> list[str]:
    """Plain statements that only claim what the data shows."""
    if not total:
        return ["No completed negotiations yet. Run a simulation or practice session to populate analytics."]
    insights = [f"{_num(agreement_rate)}% of {total} completed negotiations ended in an agreement, "
                f"taking {_num(avg_rounds)} rounds on average."]
    hits = {k: v for k, v in triggers.items() if v}
    if hits:
        top, count = max(hits.items(), key=lambda kv: kv[1])
        insights.append(f"The most frequent deadlock trigger is '{top.replace('_', ' ')}' ({count} of {total} sessions).")
    else:
        insights.append("No deadlock was triggered in these sessions.")
    if resolved:
        insights.append(f"The deadlock resolution ladder turned {resolved} of {resolved + breakdowns} "
                        f"stuck negotiations into agreements.")
    if len(scenarios) > 1:
        hardest = max(scenarios, key=lambda s: (s["deadlock_rate"], s["avg_rounds"]))
        insights.append(f"{hardest['title']} takes the longest to settle: {_num(hardest['avg_rounds'])} rounds on average"
                        f"{', ' + _num(hardest['deadlock_rate']) + '% end in deadlock' if hardest['deadlock_rate'] else ''}.")
    tried = [m for m in matrix if m["runs"]]
    if tried:
        worst = max(tried, key=lambda m: (m["deadlock_event_rate"], m["avg_rounds"]))
        if worst["deadlock_event_rate"] > 0:
            insights.append(f"{worst['first']} vs {worst['second']} is the most deadlock-prone pairing "
                            f"({_num(worst['deadlock_event_rate'])}% of {worst['runs']} runs hit a deadlock).")
    return insights


def get_sample_sessions() -> list[dict[str, Any]]:
    """Return realistic historical session logs for immediate benchmarking."""
    return [
        {
            "session_id": "sim-vp-101",
            "scenario_id": "vendor_pricing",
            "mode": "simulation",
            "status": "accepted",
            "winner": "vendor",
            "rounds": 3,
            "final_offer": {"price": 36460},
        },
        {
            "session_id": "prac-vp-102",
            "scenario_id": "vendor_pricing",
            "mode": "practice",
            "status": "accepted",
            "winner": "vendor",
            "rounds": 4,
            "final_offer": {"price": 37750},
        },
        {
            "session_id": "sim-jo-103",
            "scenario_id": "job_offer",
            "mode": "simulation",
            "status": "accepted",
            "winner": "candidate",
            "rounds": 2,
            "final_offer": {"salary": 14.5, "remote_days": 2},
        },
        {
            "session_id": "sim-pb-104",
            "scenario_id": "project_budget_allocation",
            "mode": "simulation",
            "status": "accepted",
            "winner": "project_manager",
            "rounds": 3,
            "final_offer": {"project_allocation": 76.8, "total_budget": 100.0},
        },
        {
            "session_id": "sim-vp-105",
            "scenario_id": "vendor_pricing",
            "mode": "simulation",
            "status": "deadlock",
            "winner": None,
            "rounds": 6,
            "deadlock_event": {"type": "same_position", "resolution_attempt": "suggest_compromise"},
        },
        {
            "session_id": "prac-jo-106",
            "scenario_id": "job_offer",
            "mode": "practice",
            "status": "deadlock",
            "winner": None,
            "rounds": 5,
            "deadlock_event": {"type": "stall", "resolution_attempt": "modify_stance"},
        },
        {
            "session_id": "sim-vp-107",
            "scenario_id": "vendor_pricing",
            "mode": "simulation",
            "status": "accepted",
            "winner": "buyer",
            "rounds": 3,
            "final_offer": {"price": 36200},
        },
    ]


PERSONALITIES = ("Aggressive", "Collaborative", "Risk-Averse")
DEMO_SCENARIOS = ("vendor_pricing", "job_offer", "project_budget_allocation")


def generate_demo_sessions() -> list[dict[str, Any]]:
    """Real negotiations run by the rule-based engine, in the same shape as saved history records.

    - 27 simulations: every scenario with all 9 personality pairings.
    - 3 practice sessions: a stubborn human (first seat) repeats one offer and the AI
      opponent works through the deadlock resolution ladder.
    Deterministic: no LLM and no randomness, so the demo is the same every time.
    """
    from backend.llm_engine import make_agent_engine
    from backend.orchestrator import NegotiationOrchestrator, Turn
    from backend.scenario_loader import build_negotiation_config

    runs: list[tuple[str, str, str, bool]] = [
        (scen, a, b, False) for scen in DEMO_SCENARIOS for a in PERSONALITIES for b in PERSONALITIES
    ]
    runs += [(scen, "Collaborative", "Aggressive", True) for scen in DEMO_SCENARIOS]

    sessions: list[dict[str, Any]] = []
    for index, (scen, first, second, practice) in enumerate(runs, start=1):
        config = build_negotiation_config(scen)
        config["agents"][0]["personality"] = first
        config["agents"][1]["personality"] = second
        engine = make_agent_engine(int(config.get("max_rounds", 10)), use_llm=False)
        agent_fn = engine
        if practice:
            # Scripted human: the orchestrator runs it like any agent, then the record is
            # labelled as a practice session (a live practice run pauses for real input).
            human = config["agents"][0]
            stubborn = _stubborn_offer(config)

            def agent_fn(state, agent, _engine=engine, _human=human["id"], _offer=stubborn):
                if agent["id"] != _human:
                    return _engine(state, agent)
                return Turn(agent_id=_human, round=state.round + 1, action="counter", offer=dict(_offer),
                            reasoning="Human input: holding my position.", stance="firm")

        orchestrator = NegotiationOrchestrator(config)
        state = orchestrator.run_loop(agent_fn)
        turns = [dict(t) for t in state.history]
        event = dict(state.deadlock_event) if state.deadlock_event else None
        if event:
            config["deadlock_event"] = event
        if practice:
            config["mode"] = "practice"
            config["human_agent_id"] = config["agents"][0]["id"]
        sessions.append({
            "id": f"demo-{index:02d}-{scen}",
            "scenario_id": scen,
            "scenario_title": config.get("title") or scen.replace("_", " ").title(),
            "status": state.status,
            "winner": state.winner,
            "total_rounds": math.ceil(len(turns) / len(config["agents"])),
            "total_turns": len(turns),
            "mode": "practice" if practice else "simulation",
            "config": config,
            "turns": turns,
            "deadlock_event": event,
            "created_at": None,
            "is_demo": True,
        })
    return sessions


def _stubborn_offer(config: dict[str, Any]) -> dict[str, Any]:
    """An in-limits offer 25% into the deal zone from the first agent's side, held every turn."""
    agents = config["agents"]
    offer: dict[str, Any] = {}
    for limit in agents[0].get("limits") or []:
        item, value = limit["item"], float(limit["value"])
        others = [l for a in agents[1:] for l in a.get("limits") or [] if l.get("item") == item]
        opposite = next((float(l["value"]) for l in others if l.get("type") != limit.get("type")), None)
        if opposite is None:
            offer[item] = limit["value"]
            continue
        point = opposite + (value - opposite) * 0.25  # close to the human's best end
        offer[item] = int(round(point)) if float(limit["value"]).is_integer() and abs(point) > 100 else round(point, 2)
    return offer
