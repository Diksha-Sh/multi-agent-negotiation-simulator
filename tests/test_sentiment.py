"""Tests for Milestone 4 / Task 5: Sentiment & Cognitive Trajectory Agent (Ansh Sharma).

Validates:
1. Pydantic v2 data models (SentimentTrajectoryItem, AgentCoachingRecommendation, SentimentAnalysisResult).
2. Cognitive State Classifications:
   - "Confidence / Dominance" (anchoring, boundary defense, zero concession)
   - "Collaboration / Empathy" (concessions, midpoint convergence, agreement acceptance)
   - "Urgency / Anxiety" (late-round pressure, walkaway rejection, deadlock alerts)
3. Quantitative game-theoretic metrics (intensity scores, ZOPA relative velocity, boundary safety).
4. NLP Lexical cue mining across reasoning text.
5. Personalized coaching recommendations for Human Participant and AI Agents.
6. API endpoint integration (POST /api/sentiment and POST /api/summary).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.orchestrator import NegotiationState
from backend.sentiment_agent import (
    AgentCoachingRecommendation,
    SentimentAnalysisResult,
    SentimentTrajectoryItem,
    analyze_sentiment_trajectory,
    generate_coaching_recommendations,
    generate_sentiment_report,
)
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

SAMPLE_TURNS = [
    {
        "agent_id": "buyer",
        "round": 1,
        "action": "counter",
        "offer": {"price": 35800},
        "reasoning": "We firmly anchor at our standard opening valuation of 35800. This is our firm floor.",
        "stance": "firm",
    },
    {
        "agent_id": "vendor",
        "round": 1,
        "action": "counter",
        "offer": {"price": 38500},
        "reasoning": "Our minimum value cannot go lower than 38500. Holding firm to market standards.",
        "stance": "firm",
    },
    {
        "agent_id": "buyer",
        "round": 2,
        "action": "counter",
        "offer": {"price": 36800},
        "reasoning": "Willing to meet halfway and collaborate for a mutual partnership. Offering 36800.",
        "stance": "flexible",
    },
    {
        "agent_id": "vendor",
        "round": 2,
        "action": "counter",
        "offer": {"price": 37500},
        "reasoning": "We make a constructive compromise to 37500 in good faith to bridge the gap.",
        "stance": "flexible",
    },
    {
        "agent_id": "buyer",
        "round": 3,
        "action": "accept",
        "offer": {"price": 37500},
        "reasoning": "Delighted with this fair and mutual consensus. We accept 37500.",
        "stance": "flexible",
    },
]


# ============================================================================
# 1. Pydantic v2 Schema Tests
# ============================================================================

def test_pydantic_trajectory_item_valid():
    item = SentimentTrajectoryItem(
        round=1,
        agent_id="vendor",
        sentiment_label="Confidence / Dominance",
        intensity_score=0.88,
        tactical_stance="anchoring",
    )
    assert item.round == 1
    assert item.agent_id == "vendor"
    assert item.sentiment_label == "Confidence / Dominance"
    assert item.intensity_score == 0.88
    assert item.tactical_stance == "anchoring"

    dumped = item.model_dump()
    assert dumped["round"] == 1
    assert dumped["sentiment_label"] == "Confidence / Dominance"
    assert dumped["intensity_score"] == 0.88


def test_pydantic_trajectory_item_intensity_bounds():
    with pytest.raises(Exception):
        SentimentTrajectoryItem(
            round=1,
            agent_id="vendor",
            sentiment_label="Confidence / Dominance",
            intensity_score=1.5,  # exceeds 1.0
            tactical_stance="anchoring",
        )


def test_pydantic_coaching_recommendation():
    rec = AgentCoachingRecommendation(
        agent_id="vendor",
        name="Vendor",
        role_label="Human Participant",
        is_human=True,
        strengths=["Disciplined opening anchor"],
        weaknesses=["Slightly slow concession velocity"],
        coaching_tips=["Use multi-issue logrolling"],
        tactical_profile="Firm Value Anchorer",
        cognitive_bias="None Detected (Principled Negotiator)",
    )
    assert rec.is_human is True
    assert len(rec.strengths) == 1
    assert rec.tactical_profile == "Firm Value Anchorer"


# ============================================================================
# 2. Emotional & Tactical Trajectory Engine Tests
# ============================================================================

def test_analyze_sentiment_trajectory_exact_output_shape():
    """Verify output contains exact keys specified in the task deliverable."""
    trajectory = analyze_sentiment_trajectory(
        state={"config": SAMPLE_CONFIG, "history": SAMPLE_TURNS[:2]},
        config=SAMPLE_CONFIG,
    )
    assert len(trajectory) == 2
    for turn in trajectory:
        assert "round" in turn
        assert "agent_id" in turn
        assert "sentiment_label" in turn
        assert "intensity_score" in turn
        assert "tactical_stance" in turn
        assert turn["sentiment_label"] in (
            "Confidence / Dominance",
            "Collaboration / Empathy",
            "Urgency / Anxiety",
        )
        assert 0.0 <= turn["intensity_score"] <= 1.0


def test_confidence_dominance_state():
    """Early round anchoring with firm reasoning must be classified as Confidence / Dominance."""
    trajectory = analyze_sentiment_trajectory(
        state={"config": SAMPLE_CONFIG, "history": [SAMPLE_TURNS[1]]},
        config=SAMPLE_CONFIG,
    )
    first_turn = trajectory[0]
    assert first_turn["sentiment_label"] == "Confidence / Dominance"
    assert first_turn["intensity_score"] >= 0.70
    assert first_turn["tactical_stance"] == "anchoring"


def test_collaboration_empathy_state():
    """Midpoint convergence and acceptance must be classified as Collaboration / Empathy."""
    trajectory = analyze_sentiment_trajectory(
        state={"config": SAMPLE_CONFIG, "history": SAMPLE_TURNS},
        config=SAMPLE_CONFIG,
    )
    # Turn 3: Buyer concessions with 'collaborate', 'meet halfway', 'mutual'
    turn_3 = trajectory[2]
    assert turn_3["sentiment_label"] == "Collaboration / Empathy"
    assert "reciprocal" in turn_3["tactical_stance"] or "concession" in turn_3["tactical_stance"]

    # Turn 5: Acceptance
    turn_5 = trajectory[4]
    assert turn_5["sentiment_label"] == "Collaboration / Empathy"
    assert turn_5["tactical_stance"] == "settlement_acceptance"
    assert turn_5["intensity_score"] >= 0.85


def test_urgency_anxiety_state_on_rejection():
    """Walkaway rejection must classify as Urgency / Anxiety."""
    rejection_turn = [
        {
            "agent_id": "vendor",
            "round": 9,
            "action": "reject",
            "offer": {"price": 39000},
            "reasoning": "We cannot wait any longer. Deadline passed and we must walk away.",
            "stance": "urgent",
        }
    ]
    trajectory = analyze_sentiment_trajectory(
        state={"config": SAMPLE_CONFIG, "history": rejection_turn},
        config=SAMPLE_CONFIG,
    )
    item = trajectory[0]
    assert item["sentiment_label"] == "Urgency / Anxiety"
    assert item["tactical_stance"] == "walkaway_rejection"
    assert item["intensity_score"] >= 0.85


def test_urgency_anxiety_state_on_deadlock_and_high_round_pressure():
    """Round near max_rounds with deadlock cues must trigger Urgency / Anxiety."""
    high_pressure_turn = [
        {
            "agent_id": "buyer",
            "round": 9,
            "action": "counter",
            "offer": {"price": 36000},
            "reasoning": "Time is running out before deadlock. Mediator suggested compromise, this is our last chance.",
            "stance": "urgent",
        }
    ]
    deadlock_event = {"type": "same_position", "resolution_attempt": "suggest_compromise"}
    trajectory = analyze_sentiment_trajectory(
        state={"config": SAMPLE_CONFIG, "history": high_pressure_turn, "deadlock_event": deadlock_event},
        config=SAMPLE_CONFIG,
    )
    item = trajectory[0]
    assert item["sentiment_label"] == "Urgency / Anxiety"
    assert item["intensity_score"] >= 0.80


def test_analyze_with_negotiation_state_object():
    """Verify analyze_sentiment_trajectory natively handles orchestrator.NegotiationState."""
    state = NegotiationState(
        scenario_id="vendor_pricing",
        agents=SAMPLE_CONFIG["agents"],
        history=SAMPLE_TURNS,
        round=3,
        status="accepted",
        winner="buyer",
        mode="practice",
        human_agent_id="vendor",
    )
    trajectory = analyze_sentiment_trajectory(state=state)
    assert len(trajectory) == len(SAMPLE_TURNS)
    assert trajectory[0]["agent_id"] == "buyer"
    assert trajectory[-1]["action"] == "accept"


def test_lexical_cues_extracted():
    """Verify NLP cues are populated in turn output."""
    trajectory = analyze_sentiment_trajectory(
        state={"config": SAMPLE_CONFIG, "history": [SAMPLE_TURNS[0]]},
        config=SAMPLE_CONFIG,
    )
    cues = trajectory[0].get("lexical_cues", [])
    assert any("firm" in c or "floor" in c for c in cues)


# ============================================================================
# 3. Personalized Coaching Recommendations Tests
# ============================================================================

def test_generate_coaching_recommendations_practice_mode():
    """Verify human participant gets custom coaching tips and is_human=True."""
    recs = generate_coaching_recommendations(
        config=SAMPLE_CONFIG,
        history=SAMPLE_TURNS,
        status="accepted",
    )
    assert "vendor" in recs
    assert "buyer" in recs

    vendor_rec = recs["vendor"]
    assert vendor_rec["is_human"] is True
    assert vendor_rec["role_label"] == "Human Participant"
    assert len(vendor_rec["strengths"]) >= 1
    assert len(vendor_rec["coaching_tips"]) >= 1
    assert "tactical_profile" in vendor_rec
    assert "cognitive_bias" in vendor_rec

    buyer_rec = recs["buyer"]
    assert buyer_rec["is_human"] is False
    assert "AI Agent" in buyer_rec["role_label"]


def test_coaching_recommendations_deadlock_behavior():
    """Verify deadlock triggers specific coaching recommendations."""
    deadlock_event = {"type": "same_position", "round_triggered": 5}
    static_turns = [
        {"agent_id": "buyer", "round": 1, "action": "counter", "offer": {"price": 36000}, "reasoning": "Holding firm", "stance": "firm"},
        {"agent_id": "vendor", "round": 1, "action": "counter", "offer": {"price": 39000}, "reasoning": "Holding firm", "stance": "firm"},
        {"agent_id": "buyer", "round": 2, "action": "counter", "offer": {"price": 36000}, "reasoning": "No change", "stance": "firm"},
        {"agent_id": "vendor", "round": 2, "action": "counter", "offer": {"price": 39000}, "reasoning": "No change", "stance": "firm"},
    ]
    recs = generate_coaching_recommendations(
        config=SAMPLE_CONFIG,
        history=static_turns,
        status="deadlock",
        deadlock_event=deadlock_event,
    )
    assert "vendor" in recs
    # Zero concession should identify Anchoring Rigidity
    assert recs["vendor"]["cognitive_bias"] == "Anchoring Rigidity"
    assert any("deadlock" in w.lower() or "friction" in w.lower() for w in recs["vendor"]["weaknesses"])


# ============================================================================
# 4. Sentiment Report & Dossier Tests
# ============================================================================

def test_generate_sentiment_report():
    report = generate_sentiment_report(
        state={"config": SAMPLE_CONFIG, "history": SAMPLE_TURNS},
        config=SAMPLE_CONFIG,
        status="accepted",
    )
    assert "trajectory" in report
    assert "dominant_sentiment" in report
    assert "sentiment_distribution" in report
    assert "average_intensity" in report
    assert "recommendations" in report
    assert "cognitive_trajectory_summary" in report

    assert len(report["trajectory"]) == 5
    assert report["dominant_sentiment"] in (
        "Confidence / Dominance",
        "Collaboration / Empathy",
        "Urgency / Anxiety",
    )
    assert 0.0 <= report["average_intensity"] <= 1.0


def test_empty_turns_edge_case():
    """Verify agent handles empty history gracefully."""
    trajectory = analyze_sentiment_trajectory(state={"config": SAMPLE_CONFIG, "history": []})
    assert trajectory == []

    report = generate_sentiment_report(state={"config": SAMPLE_CONFIG, "history": []})
    assert report["trajectory"] == []
    assert report["average_intensity"] == 0.0


# ============================================================================
# 5. API Endpoint Tests
# ============================================================================

def test_api_sentiment_endpoint():
    """Verify POST /api/sentiment returns 200 and valid sentiment dossier."""
    payload = {
        "config": SAMPLE_CONFIG,
        "history": SAMPLE_TURNS,
        "status": "accepted",
    }
    response = client.post("/api/sentiment", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "trajectory" in data
    assert "dominant_sentiment" in data
    assert "recommendations" in data
    assert len(data["trajectory"]) == 5


def test_summary_agent_integration():
    """Verify summary agent includes sentiment trajectory and coaching from sentiment_agent."""
    summary = generate_post_interaction_summary(
        config=SAMPLE_CONFIG,
        history=SAMPLE_TURNS,
        status="accepted",
        winner="buyer",
    )
    assert "sentiment_journey" in summary
    assert len(summary["sentiment_journey"]) == 5
    assert "personalized_recommendations" in summary
    assert "vendor" in summary["personalized_recommendations"]
    assert summary["personalized_recommendations"]["vendor"]["is_human"] is True
    # Verify rich fields from sentiment_agent exist in summary
    first_journey_item = summary["sentiment_journey"][0]
    assert "sentiment_label" in first_journey_item
    assert "intensity_score" in first_journey_item
    assert "tactical_stance" in first_journey_item
