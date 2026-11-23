"""Tests for Milestone 4: Post-Interaction Summary Agent & Performance Analytics."""

import pytest
from fastapi.testclient import TestClient

from backend.analytics import analyze_performance, get_sample_sessions
from backend.main import app
from backend.summary_agent import generate_post_interaction_summary

client = TestClient(app)

SAMPLE_CONFIG = {
    "scenario_id": "vendor_pricing",
    "title": "Vendor Pricing Negotiation",
    "max_rounds": 10,
    "mode": "practice",
    "human_agent_id": "vendor",
    "agents": [
        {
            "id": "buyer",
            "name": "Buyer",
            "personality": "Collaborative",
            "limits": [{"item": "price", "type": "max", "value": 40000, "unit": "INR"}],
        },
        {
            "id": "vendor",
            "name": "Vendor",
            "personality": "Risk-Averse",
            "limits": [{"item": "price", "type": "min", "value": 35000, "unit": "INR"}],
        },
    ],
}

SAMPLE_HISTORY = [
    {
        "agent_id": "buyer",
        "round": 1,
        "action": "counter",
        "offer": {"price": 35800},
        "reasoning": "Buyer opens with 35800",
        "stance": "firm",
    },
    {
        "agent_id": "vendor",
        "round": 1,
        "action": "counter",
        "offer": {"price": 38500},
        "reasoning": "Vendor counters with 38500",
        "stance": "flexible",
    },
    {
        "agent_id": "buyer",
        "round": 2,
        "action": "accept",
        "offer": {"price": 37750},
        "reasoning": "Buyer accepts 37750",
        "stance": "flexible",
    },
]


def test_generate_post_interaction_summary_accepted():
    summary = generate_post_interaction_summary(
        config=SAMPLE_CONFIG,
        history=SAMPLE_HISTORY,
        status="accepted",
        winner="buyer",
    )
    assert summary["status"] == "accepted"
    assert summary["rounds_completed"] == 2
    assert summary["final_agreement"] == {"price": 37750}
    assert "resolution_quality" in summary
    assert summary["resolution_quality"]["overall_score"] > 60
    assert len(summary["sentiment_journey"]) == 3
    assert "vendor" in summary["personalized_recommendations"]
    assert "buyer" in summary["personalized_recommendations"]
    assert summary["personalized_recommendations"]["vendor"]["is_human"] is True


def test_generate_post_interaction_summary_deadlock():
    deadlock_event = {
        "type": "same_position",
        "resolution_attempt": "suggest_compromise",
    }
    summary = generate_post_interaction_summary(
        config=SAMPLE_CONFIG,
        history=SAMPLE_HISTORY[:2],
        status="deadlock",
        winner=None,
        deadlock_event=deadlock_event,
    )
    assert summary["status"] == "deadlock"
    assert summary["deadlock_summary"]["type"] == "same_position"
    assert summary["resolution_quality"]["overall_score"] < 70
    assert "deadlock" in summary["executive_summary"].lower()


def test_analyze_performance_empty_and_samples():
    sample_sessions = get_sample_sessions()
    assert len(sample_sessions) >= 5

    res = analyze_performance(sample_sessions)
    assert res["total_sessions"] == len(sample_sessions)
    assert res["agreement_rate"] > 0
    assert "deadlock_triggers" in res
    assert "same_position" in res["deadlock_triggers"]
    assert len(res["scenario_breakdown"]) >= 1


def test_api_summary_endpoint():
    payload = {
        "config": SAMPLE_CONFIG,
        "history": SAMPLE_HISTORY,
        "status": "accepted",
        "winner": "buyer",
    }
    response = client.post("/api/summary", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "resolution_quality" in data
    assert "sentiment_journey" in data
    assert "personalized_recommendations" in data


def test_api_analytics_endpoints():
    # GET /api/analytics
    get_res = client.get("/api/analytics")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert "total_sessions" in get_data
    assert "agreement_rate" in get_data

    # POST /api/analytics
    post_res = client.post("/api/analytics", json={"sessions": get_sample_sessions()[:3]})
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["total_sessions"] == 3
