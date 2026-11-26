"""Tests for the Performance Dashboard analytics (Milestone 4).

Covers the record normalisation used by the dashboard, value-share win rates, the
scenario x deadlock heatmap, the personality matrix and the engine-played demo dataset.

Run from the repo root:  python -m pytest tests/test_dashboard_analytics.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.analytics import (  # noqa: E402
    analyze_performance,
    generate_demo_sessions,
    normalize_session,
    value_shares,
)
from backend.main import app  # noqa: E402

client = TestClient(app)

AGENTS = [
    {"id": "buyer", "name": "Buyer", "personality": "Aggressive",
     "limits": [{"item": "price", "type": "max", "value": 40000}]},
    {"id": "vendor", "name": "Vendor", "personality": "Collaborative",
     "limits": [{"item": "price", "type": "min", "value": 35000}]},
]


def record(status="accepted", final_price=36000, deadlock=None, scenario="vendor_pricing", turns=None):
    """A session in the exact shape the frontend saves to History."""
    config = {"scenario_id": scenario, "title": "Vendor Pricing", "agents": AGENTS}
    if deadlock:
        config["deadlock_event"] = deadlock
    turns = turns or [
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 35500}},
        {"agent_id": "vendor", "round": 1, "action": "counter", "offer": {"price": final_price}},
        {"agent_id": "buyer", "round": 2, "action": "accept" if status == "accepted" else "counter",
         "offer": {"price": final_price}},
    ]
    return {
        "id": "sim-1", "scenario_id": scenario, "scenario_title": "Vendor Pricing", "status": status,
        "winner": "buyer" if status == "accepted" else None, "total_rounds": 2, "total_turns": len(turns),
        "config": config, "turns": turns,
    }


def test_normalize_reads_frontend_record_shape():
    s = normalize_session(record(deadlock={"type": "stall"}))
    assert s["history"][0]["offer"] == {"price": 35500}
    assert s["rounds"] == 2
    assert s["title"] == "Vendor Pricing"
    assert s["deadlock_event"] == {"type": "stall"}
    assert len(s["agents"]) == 2


def test_normalize_reads_compact_sample_shape():
    s = normalize_session({"scenario_id": "job_offer", "status": "accepted", "rounds": 3})
    assert s["rounds"] == 3
    assert s["title"] == "Job Offer"
    assert s["history"] == []


def test_empty_sessions_give_zeroes_not_sample_data():
    result = analyze_performance([])
    assert result["total_sessions"] == 0
    assert result["agreement_rate"] == 0
    assert result["scenario_breakdown"] == []
    assert "No completed negotiations" in result["key_insights"][0]


def test_unfinished_sessions_are_not_counted():
    result = analyze_performance([record(), record(status="ongoing"), record(status="waiting_for_human")])
    assert result["total_sessions"] == 1


def test_value_shares_split_the_deal_zone():
    # 36000 is 20% into the 35000-40000 zone: the buyer (max limit) keeps 80% of it.
    shares = value_shares(record(final_price=36000))
    assert shares == {"buyer": 0.8, "vendor": 0.2}
    assert value_shares(record(status="deadlock")) is None


def test_win_rates_count_who_captured_more_value():
    sessions = [record(final_price=36000), record(final_price=39000), record(final_price=37500)]
    rows = analyze_performance(sessions)["win_rates"]
    vendor_row = rows[0]
    assert vendor_row["deals"] == 3
    assert vendor_row["even_deals"] == 1  # 37500 is the midpoint
    agents = {a["id"]: a for a in vendor_row["agents"]}
    assert agents["buyer"]["value_wins"] == 1
    assert agents["vendor"]["value_wins"] == 1
    assert agents["buyer"]["avg_value_share"] == 50.0


def test_heatmap_counts_triggers_and_outcomes():
    sessions = [
        record(),
        record(deadlock={"type": "same_position", "resolution_outcome": "compromise"}),
        record(status="deadlock", deadlock={"type": "max_rounds", "resolution_outcome": "breakdown"}),
    ]
    heatmap = analyze_performance(sessions)["deadlock_heatmap"]
    assert heatmap["columns"] == ["accepted", "same_position", "stall", "repeated_rejection",
                                  "max_rounds", "breakdown", "rejected"]
    row = heatmap["rows"][0]
    assert row["counts"]["accepted"] == 2
    assert row["counts"]["same_position"] == 1
    assert row["counts"]["max_rounds"] == 1
    assert row["counts"]["breakdown"] == 1
    assert row["rates"]["accepted"] == 66.7


def test_deadlock_without_event_is_unclassified():
    triggers = analyze_performance([record(status="deadlock")])["deadlock_triggers"]
    assert triggers["unclassified"] == 1
    assert triggers["same_position"] == 0


def test_resolved_by_ladder_and_insights():
    sessions = [record(deadlock={"type": "stall"}), record()]
    result = analyze_performance(sessions)
    assert result["resolved_by_ladder"] == 1
    assert any("1 of 2 negotiations (50%) hit a deadlock" in line and "turned 1 of them" in line
               for line in result["key_insights"])


def test_deadlock_event_rate_counts_resolved_and_unresolved_deadlocks():
    sessions = [
        record(deadlock={"type": "stall"}),                      # stuck, then a deal
        record(status="deadlock", deadlock={"type": "max_rounds"}),  # stuck, no deal
        record(),                                                # never stuck
        record(),
    ]
    result = analyze_performance(sessions)
    assert result["deadlock_events"] == 2
    assert result["deadlock_event_rate"] == 50.0
    assert result["deadlock_rate"] == 25.0     # only runs that ENDED in deadlock
    assert result["no_deal_rate"] == 25.0


def test_personality_matrix():
    matrix = analyze_performance([record(), record(deadlock={"type": "stall"})])["personality_matrix"]
    assert matrix == [{
        "first": "Aggressive", "second": "Collaborative", "runs": 2,
        "agreement_rate": 100.0, "deadlock_event_rate": 50.0, "avg_rounds": 2.0,
    }]


def test_demo_sessions_are_real_engine_runs():
    sessions = generate_demo_sessions()
    assert len(sessions) == 30
    assert {s["scenario_id"] for s in sessions} == {"vendor_pricing", "job_offer", "project_budget_allocation"}
    assert all(s["turns"] and s["status"] == "accepted" for s in sessions)
    # Every pairing really negotiates (no turn-2 accept at a hard limit).
    assert all(s["total_turns"] >= 3 for s in sessions if s["scenario_id"] != "vendor_pricing")
    practice = [s for s in sessions if s["mode"] == "practice"]
    assert len(practice) == 3
    assert all(s["deadlock_event"]["resolution_attempt"] == "trigger_final_round" for s in practice)
    assert generate_demo_sessions() == sessions  # deterministic


def test_api_demo_sessions_endpoint():
    response = client.get("/api/analytics/demo-sessions")
    assert response.status_code == 200
    body = response.json()
    assert len(body["sessions"]) == 30
    assert body["analytics"]["total_sessions"] == 30
    assert body["analytics"]["resolved_by_ladder"] > 0


def test_api_analytics_accepts_frontend_records():
    response = client.post("/api/analytics", json={"sessions": [record(), record(status="deadlock")]})
    assert response.status_code == 200
    body = response.json()
    assert body["total_sessions"] == 2
    assert body["agreement_rate"] == 50.0
    assert body["win_rates"][0]["deals"] == 1


def test_resolution_quality_score_reaches_dashboard_analytics():
    """The dashboard gets the same Resolution Quality Score the summary agent computes."""
    from backend.scoring_engine import score_negotiation
    sessions = generate_demo_sessions()[:6]
    result = analyze_performance(sessions)
    assert set(result["session_scores"]) == {s["id"] for s in sessions}
    first = sessions[0]
    expected = score_negotiation(first["config"], first["turns"], first["status"], first["config"].get("deadlock_event"))
    assert result["session_scores"][first["id"]]["overall_score"] == round(expected["overall_score"], 1)
    assert result["session_scores"][first["id"]]["tier"] == expected["tier"]
    scores = [v["overall_score"] for v in result["session_scores"].values()]
    assert result["avg_resolution_score"] == round(sum(scores) / len(scores), 1)
    assert sum(result["resolution_tiers"].values()) == len(sessions)
    assert all(row["avg_resolution_score"] is not None for row in result["scenario_breakdown"])
    assert any("resolution quality score" in line for line in result["key_insights"])


def test_resolution_quality_is_empty_safe():
    result = analyze_performance([])
    assert result["avg_resolution_score"] is None
    assert result["session_scores"] == {}
    # a record without a config cannot be scored, but still counts as a session
    bare = analyze_performance([{"id": "x", "status": "accepted", "history": []}])
    assert bare["total_sessions"] == 1 and bare["session_scores"] == {}
