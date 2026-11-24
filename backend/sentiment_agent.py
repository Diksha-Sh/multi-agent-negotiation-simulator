"""Sentiment & Cognitive Trajectory Analysis Agent (Milestone 4 / Task 5).

Provides NLP lexical cue mining, game-theoretic tactical stance classification,
emotional trajectory modeling, and personalized negotiation coaching recommendations.

Cognitive States:
- "Confidence / Dominance": Early anchoring, firm boundary defense, low initial concessions.
- "Collaboration / Empathy": Reciprocal concessions, cooperative reasoning, agreement convergence.
- "Urgency / Anxiety": Late-round pressure, walkaway threats, mediator deadlock alerts.
"""

from __future__ import annotations

import math
import re
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field


# ============================================================================
# 1. Pydantic v2 Data Models
# ============================================================================

CognitiveState = Literal[
    "Confidence / Dominance",
    "Collaboration / Empathy",
    "Urgency / Anxiety",
]


class SentimentTrajectoryItem(BaseModel):
    """Structured representation of an individual turn's sentiment and cognitive stance."""

    round: int = Field(..., description="Negotiation round number (1-indexed)")
    agent_id: str = Field(..., description="Identifier of the acting agent (e.g. 'vendor', 'buyer')")
    sentiment_label: CognitiveState = Field(
        ..., description="Primary cognitive/emotional classification"
    )
    intensity_score: float = Field(
        ..., ge=0.0, le=1.0, description="Normalized cognitive intensity (0.0 to 1.0)"
    )
    tactical_stance: str = Field(
        ..., description="Tactical posture, e.g. 'anchoring', 'reciprocal_concession', 'settlement_acceptance'"
    )

    # UI & Backward-Compatibility convenience fields:
    turn_index: Optional[int] = Field(default=None, description="Global turn index (1-indexed)")
    action: Optional[str] = Field(default=None, description="Turn action ('accept', 'counter', 'reject')")
    stance: Optional[str] = Field(default=None, description="Stance attribute ('firm', 'flexible', 'urgent')")
    sentiment: Optional[str] = Field(default=None, description="Mirror of sentiment_label for UI compatibility")
    sentiment_score: Optional[float] = Field(default=None, description="Mirror of intensity_score for UI compatibility")
    description: Optional[str] = Field(default=None, description="Human-readable tactical summary of the turn")
    offer: Optional[dict[str, Any]] = Field(default=None, description="Offer payload for the turn")
    lexical_cues: list[str] = Field(default_factory=list, description="NLP lexical cue keywords detected in reasoning")


class AgentCoachingRecommendation(BaseModel):
    """Personalized strategic feedback and coaching recommendations for an agent."""

    agent_id: str = Field(..., description="Identifier of the agent")
    name: str = Field(..., description="Display name of the agent or participant")
    role_label: str = Field(..., description="'Human Participant' or 'AI Agent (Personality)'")
    is_human: bool = Field(default=False, description="Whether this agent seat was occupied by a human")
    strengths: list[str] = Field(default_factory=list, description="Demonstrated tactical strengths")
    weaknesses: list[str] = Field(default_factory=list, description="Observed tactical weaknesses or risks")
    coaching_tips: list[str] = Field(default_factory=list, description="Actionable strategic recommendations")
    tactical_profile: str = Field(..., description="Archetype, e.g. 'Firm Value Anchorer', 'Integrative Problem-Solver'")
    cognitive_bias: str = Field(..., description="Identified cognitive bias or 'None Detected (Principled Negotiator)'")
    concession_rate: float = Field(default=0.0, description="Average concession percentage relative to ZOPA")
    boundary_discipline: float = Field(default=100.0, description="Reservation boundary adherence score (0-100)")


class SentimentAnalysisResult(BaseModel):
    """Overall multi-turn cognitive sentiment analysis and recommendations dossier."""

    trajectory: list[SentimentTrajectoryItem] = Field(default_factory=list)
    dominant_sentiment: CognitiveState = Field(...)
    sentiment_distribution: dict[str, int] = Field(default_factory=dict)
    average_intensity: float = Field(..., ge=0.0, le=1.0)
    recommendations: dict[str, AgentCoachingRecommendation] = Field(default_factory=dict)
    cognitive_trajectory_summary: str = Field(..., description="Executive narrative of cognitive state shifts")


# ============================================================================
# 2. NLP Lexical Cue Dictionaries & Regex Patterns
# ============================================================================

DOMINANCE_KEYWORDS = [
    "firm", "floor", "minimum", "standard", "value", "cannot go lower", "non-negotiable",
    "cannot accept less", "holding", "hold", "anchor", "anchoring", "market value",
    "bottom line", "strict", "ceiling", "unyielding", "premium", "quality justifies",
    "margin", "target price", "standard terms", "unacceptable to lower",
]

COLLABORATION_KEYWORDS = [
    "meet halfway", "fair", "collaborate", "collaboration", "mutual", "flexible",
    "compromise", "partnership", "win-win", "work together", "middle ground", "concede",
    "willing to adjust", "reasonable", "integrative", "reciprocal", "good faith",
    "understand your position", "bridge the gap", "shared benefit", "accommodate",
    "constructive", "balanced",
]

URGENCY_KEYWORDS = [
    "final", "running out", "deadline", "deadlock", "mediator", "walk away", "last chance",
    "impasse", "urgent", "urgency", "time running out", "cannot wait", "at risk",
    "breakdown", "stalled", "out of time", "last offer", "reject", "terminate",
    "exhausted", "time is short", "pressing", "patience",
]


def _extract_lexical_cues(text: str) -> tuple[list[str], int, int, int]:
    """Scan reasoning text for assertiveness, collaboration, and urgency keyword cues.

    Returns:
        (matched_cues_list, dom_count, col_count, urg_count)
    """
    if not text:
        return [], 0, 0, 0

    lower = text.lower()
    matched: list[str] = []
    dom_count = 0
    col_count = 0
    urg_count = 0

    for kw in DOMINANCE_KEYWORDS:
        if kw in lower:
            matched.append(kw)
            dom_count += 1

    for kw in COLLABORATION_KEYWORDS:
        if kw in lower:
            matched.append(kw)
            col_count += 1

    for kw in URGENCY_KEYWORDS:
        if kw in lower:
            matched.append(kw)
            urg_count += 1

    return matched, dom_count, col_count, urg_count


def _is_numeric(val: Any) -> bool:
    """Check if value is a valid finite float/int."""
    return isinstance(val, (int, float)) and not isinstance(val, bool) and math.isfinite(val)


def _extract_primary_numeric(offer: Any) -> Optional[float]:
    """Extract primary numeric value (e.g. price or salary) from an offer dictionary."""
    if not isinstance(offer, dict):
        return None
    for key in ("price", "salary", "budget", "amount", "rate"):
        val = offer.get(key)
        if _is_numeric(val):
            return float(val)
    # Fallback: check any numeric value
    for val in offer.values():
        if _is_numeric(val):
            return float(val)
    return None


def _calculate_zopa_width(config: dict[str, Any]) -> float:
    """Calculate the estimated ZOPA range width from agent limit constraints."""
    limits_found: list[float] = []
    for agent in config.get("agents", []):
        for lim in agent.get("limits", []):
            val = lim.get("value")
            if _is_numeric(val):
                limits_found.append(float(val))

    if len(limits_found) >= 2:
        diff = abs(max(limits_found) - min(limits_found))
        if diff > 0:
            return diff

    return 5000.0  # sensible fallback scale if limits not specified


# ============================================================================
# 3. Emotional & Tactical Trajectory Engine
# ============================================================================

def analyze_sentiment_trajectory(
    state: Union[Any, dict[str, Any]],
    config: Optional[dict[str, Any]] = None,
    history: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    """Analyze the negotiation turn history across 4 cognitive signals.

    Args:
        state: NegotiationState object, or dictionary containing history/config,
               or list of turn dictionaries.
        config: Optional scenario configuration dictionary (if not inside state).
        history: Optional explicit list of turn dictionaries.

    Returns:
        List of turn sentiment trajectory dictionaries matching:
        {
            "round": int,
            "agent_id": str,
            "sentiment_label": "Confidence / Dominance" | "Collaboration / Empathy" | "Urgency / Anxiety",
            "intensity_score": float (0.0 to 1.0),
            "tactical_stance": str,
            ... (convenience fields for UI backwards compatibility)
        }
    """
    # 1. Normalize state/config/history input representations
    cfg: dict[str, Any] = {}
    turns: list[dict[str, Any]] = []
    deadlock_event: Optional[dict[str, Any]] = None

    if history is not None:
        turns = list(history)
        cfg = config or {}
    elif hasattr(state, "history") and hasattr(state, "agents"):
        # NegotiationState instance
        turns = [t if isinstance(t, dict) else t.__dict__ for t in state.history]
        cfg = config or {
            "scenario_id": getattr(state, "scenario_id", ""),
            "agents": getattr(state, "agents", []),
            "mode": getattr(state, "mode", "simulation"),
            "human_agent_id": getattr(state, "human_agent_id", None),
        }
        deadlock_event = getattr(state, "deadlock_event", None)
    elif isinstance(state, dict):
        turns = state.get("history") or []
        cfg = config or state.get("config") or state
        deadlock_event = state.get("deadlock_event")
    elif isinstance(state, list):
        turns = list(state)
        cfg = config or {}

    max_rounds = int(cfg.get("max_rounds", 10) or 10)
    zopa_width = _calculate_zopa_width(cfg)

    trajectory: list[dict[str, Any]] = []
    agent_previous_offer: dict[str, float] = {}
    agent_turn_count: dict[str, int] = {}

    for idx, turn in enumerate(turns):
        agent_id = str(turn.get("agent_id", "agent"))
        round_num = int(turn.get("round", math.ceil((idx + 1) / max(1, len(cfg.get("agents", [1, 2]))))))
        action = str(turn.get("action", "counter")).strip().lower()
        stance = str(turn.get("stance", "flexible")).strip().lower()
        reasoning = str(turn.get("reasoning", ""))
        current_offer = turn.get("offer", {})
        offer_num = _extract_primary_numeric(current_offer)

        agent_turn_count[agent_id] = agent_turn_count.get(agent_id, 0) + 1
        is_first_move = agent_turn_count[agent_id] == 1

        # --------------------------------------------------------------------
        # Signal 1: NLP Lexical & Reasoning Cues
        # --------------------------------------------------------------------
        cues, dom_cues, col_cues, urg_cues = _extract_lexical_cues(reasoning)

        score_dom = dom_cues * 1.5
        score_col = col_cues * 1.5
        score_urg = urg_cues * 1.8

        # --------------------------------------------------------------------
        # Signal 2: Stance & Action
        # --------------------------------------------------------------------
        if action == "accept":
            score_col += 5.0
            tactical_stance = "settlement_acceptance"
        elif action == "reject":
            score_urg += 5.0
            tactical_stance = "walkaway_rejection"
        else:  # counter / offer
            if stance == "firm":
                score_dom += 2.2
                tactical_stance = "anchoring" if is_first_move else "boundary_defense"
            elif stance == "urgent":
                score_urg += 2.5
                tactical_stance = "urgent_concession"
            else:  # flexible
                score_col += 1.8
                tactical_stance = "reciprocal_concession"

        # --------------------------------------------------------------------
        # Signal 3: Offer Delta & Concession Velocity
        # --------------------------------------------------------------------
        if action not in ("accept", "reject"):
            if is_first_move:
                score_dom += 2.0
                tactical_stance = "anchoring"
            elif offer_num is not None and agent_id in agent_previous_offer:
                prev_num = agent_previous_offer[agent_id]
                delta = abs(offer_num - prev_num)
                rel_delta = delta / max(1.0, zopa_width)

                if rel_delta < 0.005:  # Held position with zero or negligible concession
                    score_dom += 1.8
                    tactical_stance = "boundary_defense"
                elif rel_delta > 0.30:  # Significant concession
                    score_col += 2.2
                    if round_num >= max_rounds - 2:
                        score_urg += 1.5
                        tactical_stance = "urgent_concession"
                    else:
                        tactical_stance = "integrative_concession"
                else:  # Moderate concession
                    score_col += 1.6
                    tactical_stance = "reciprocal_concession"

        if offer_num is not None:
            agent_previous_offer[agent_id] = offer_num

        # --------------------------------------------------------------------
        # Signal 4: Round Pressure & Deadlock Proximity
        # --------------------------------------------------------------------
        round_pressure = round_num / max(1, max_rounds)
        if round_pressure >= 0.75:
            score_urg += round_pressure * 2.2
            if tactical_stance not in ("settlement_acceptance", "walkaway_rejection"):
                if round_pressure >= 0.90:
                    tactical_stance = "impasse_pressure"

        if deadlock_event or "deadlock" in reasoning.lower() or "mediator" in reasoning.lower():
            score_urg += 2.0
            if tactical_stance not in ("settlement_acceptance", "walkaway_rejection"):
                tactical_stance = "mediator_alignment" if "mediator" in reasoning.lower() else "impasse_pressure"

        # Baseline priors for early game
        if round_num <= 1:
            score_dom += 1.0

        # --------------------------------------------------------------------
        # Cognitive State Classification
        # --------------------------------------------------------------------
        if score_urg >= score_dom and score_urg >= score_col:
            sentiment_label: CognitiveState = "Urgency / Anxiety"
            winning_score = score_urg
        elif score_col >= score_dom:
            sentiment_label = "Collaboration / Empathy"
            winning_score = score_col
        else:
            sentiment_label = "Confidence / Dominance"
            winning_score = score_dom

        # Normalize intensity score into [0.45, 0.98] range
        total_score = max(1.0, score_dom + score_col + score_urg)
        ratio = winning_score / total_score
        intensity = round(min(0.98, max(0.45, 0.45 + 0.53 * ratio)), 2)

        # Build human-readable description
        if sentiment_label == "Confidence / Dominance":
            desc = f"Turn {idx + 1}: Asserting principled boundary ({tactical_stance}); holding baseline stance."
        elif sentiment_label == "Collaboration / Empathy":
            desc = f"Turn {idx + 1}: Advancing cooperative convergence ({tactical_stance}); seeking mutual value."
        else:
            desc = f"Turn {idx + 1}: Reacting to negotiation pressure ({tactical_stance}); round proximity {round_num}/{max_rounds}."

        item = {
            "round": round_num,
            "agent_id": agent_id,
            "sentiment_label": sentiment_label,
            "intensity_score": intensity,
            "tactical_stance": tactical_stance,
            # UI & Backward-Compatibility fields:
            "turn_index": idx + 1,
            "action": action,
            "stance": stance,
            "sentiment": sentiment_label,
            "sentiment_score": intensity if sentiment_label != "Urgency / Anxiety" else -intensity,
            "description": desc,
            "offer": current_offer,
            "lexical_cues": cues,
        }
        trajectory.append(item)

    return trajectory


# ============================================================================
# 4. Personalized Coaching Recommendations Engine
# ============================================================================

def generate_coaching_recommendations(
    config: dict[str, Any],
    history: list[dict[str, Any]],
    status: str = "accepted",
    resolution_score: Optional[dict[str, Any]] = None,
    deadlock_event: Optional[dict[str, Any]] = None,
) -> dict[str, dict[str, Any]]:
    """Synthesize deep, personalized tactical coaching for all participating agents.

    Evaluates anchor discipline, concession velocity & reciprocity, boundary safety,
    and identifies cognitive biases (Anchoring Rigidity, Winner's Curse, Loss Aversion).

    Args:
        config: Scenario configuration dictionary.
        history: Complete list of turn dictionaries.
        status: Final status ('accepted', 'deadlock', 'rejected').
        resolution_score: Optional resolution quality score object.
        deadlock_event: Optional deadlock event details.

    Returns:
        Dictionary mapping agent_id -> AgentCoachingRecommendation dictionary.
    """
    recommendations: dict[str, dict[str, Any]] = {}
    is_practice = str(config.get("mode", "")).lower() == "practice"
    human_id = config.get("human_agent_id") or config.get("human_seat")
    zopa_width = _calculate_zopa_width(config)

    for agent in config.get("agents", []):
        aid = str(agent.get("id", "agent"))
        name = str(agent.get("name", aid.capitalize()))
        personality = str(agent.get("personality", "Collaborative"))
        is_human = bool(is_practice and aid == human_id)

        agent_turns = [t for t in history if str(t.get("agent_id")) == aid]
        first_turn = agent_turns[0] if agent_turns else None
        last_turn = agent_turns[-1] if agent_turns else None

        strengths: list[str] = []
        weaknesses: list[str] = []
        coaching_tips: list[str] = []

        # --------------------------------------------------------------------
        # Metric 1: Opening Anchor & Boundary Discipline
        # --------------------------------------------------------------------
        boundary_safe = True
        limits = agent.get("limits", [])
        if last_turn and isinstance(last_turn.get("offer"), dict):
            last_off = last_turn["offer"]
            for lim in limits:
                item = lim.get("item")
                bound = lim.get("value")
                ltype = str(lim.get("type", "")).lower()
                if item in last_off and _is_numeric(last_off[item]) and _is_numeric(bound):
                    val = float(last_off[item])
                    b = float(bound)
                    if ltype == "min" and val < b:
                        boundary_safe = False
                    elif ltype == "max" and val > b:
                        boundary_safe = False

        if boundary_safe:
            strengths.append(
                f"Maintained strict reservation limit discipline without breaching hard constraints."
            )
        else:
            weaknesses.append(
                f"Breached reservation boundaries during late-stage concession compromises."
            )

        if first_turn:
            strengths.append(
                f"Established a decisive opening anchor in Round {first_turn.get('round', 1)}."
            )

        # --------------------------------------------------------------------
        # Metric 2: Concession Velocity & Reciprocity
        # --------------------------------------------------------------------
        concession_rate = 0.0
        cognitive_bias = "None Detected (Principled Negotiator)"
        tactical_profile = "Balanced Value Maximizer"

        if len(agent_turns) >= 2 and first_turn and last_turn:
            f_val = _extract_primary_numeric(first_turn.get("offer"))
            l_val = _extract_primary_numeric(last_turn.get("offer"))
            if f_val is not None and l_val is not None:
                net_concession = abs(l_val - f_val)
                concession_rate = round((net_concession / max(1.0, zopa_width)) * 100, 1)

                if net_concession == 0:
                    tactical_profile = "Firm Value Anchorer"
                    cognitive_bias = "Anchoring Rigidity"
                    weaknesses.append(
                        "Maintained a completely static position across rounds, contributing to negotiation friction."
                    )
                    coaching_tips.append(
                        "Introduce small, conditional concessions ('If you concede X, I can move on Y') to unlock deadlocks."
                    )
                elif concession_rate > 60.0:
                    tactical_profile = "Accommodating Conceder"
                    cognitive_bias = "Premature Concession / Winner's Curse"
                    weaknesses.append(
                        f"Conceded over {concession_rate}% of the ZOPA span, potentially leaving surplus on the table."
                    )
                    coaching_tips.append(
                        "Taper your concessions: decrease concession size in each successive round to signal boundary limits."
                    )
                else:
                    tactical_profile = "Integrative Problem-Solver"
                    strengths.append(
                        f"Executed disciplined reciprocal moves ({concession_rate}% of ZOPA span) balancing value capture with consensus."
                    )
                    coaching_tips.append(
                        "Explore multi-issue packaging and logrolling to trade off non-monetary items against core terms."
                    )
        elif len(agent_turns) == 1 and status == "accepted":
            tactical_profile = "Rapid Agreement Closer"
            cognitive_bias = "Winner's Curse Risk"
            coaching_tips.append(
                "Avoid accepting immediate first-round proposals without at least one probing counter-offer."
            )

        # --------------------------------------------------------------------
        # Metric 3: Outcome-Specific Strategic Guidance
        # --------------------------------------------------------------------
        if status == "accepted":
            strengths.append("Successfully guided the negotiation to a mutually ratified commercial settlement.")
            if is_human:
                coaching_tips.append(
                    "Great work reaching agreement! For future sessions, try anchoring 5-10% closer to your aspiration limit."
                )
        elif status == "deadlock":
            if cognitive_bias == "None Detected (Principled Negotiator)":
                cognitive_bias = "Loss Aversion / Impasse Trap"
            trigger_type = deadlock_event.get("type", "impasse") if deadlock_event else "stance rigidity"
            weaknesses.append(f"Negotiation collapsed into a formal deadlock triggered by '{trigger_type}'.")
            coaching_tips.append(
                "When negotiations stall, reframe demands around mutual gains or request mediator guidance earlier."
            )
        else:  # rejected
            weaknesses.append("Negotiation concluded with a walkaway rejection prior to finding common ground.")
            coaching_tips.append(
                "Calibrate counterparty limits in early turns to test whether a mutually viable ZOPA exists before walking away."
            )

        role_label = "Human Participant" if is_human else f"AI Agent ({personality})"

        recommendation = AgentCoachingRecommendation(
            agent_id=aid,
            name=name,
            role_label=role_label,
            is_human=is_human,
            strengths=strengths or ["Preserved tactical posture throughout rounds."],
            weaknesses=weaknesses or ["Pacing could be accelerated to conclude earlier in the cycle."],
            coaching_tips=coaching_tips or ["Continue balancing anchor assertiveness with collaborative flexibility."],
            tactical_profile=tactical_profile,
            cognitive_bias=cognitive_bias,
            concession_rate=concession_rate,
            boundary_discipline=100.0 if boundary_safe else 50.0,
        )

        recommendations[aid] = recommendation.model_dump()

    return recommendations


# ============================================================================
# 5. Full Sentiment & Cognitive Dossier Generator
# ============================================================================

def generate_sentiment_report(
    state: Union[Any, dict[str, Any]],
    config: Optional[dict[str, Any]] = None,
    history: Optional[list[dict[str, Any]]] = None,
    status: str = "accepted",
    deadlock_event: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Generate a comprehensive sentiment analysis report and coaching recommendations.

    Args:
        state: NegotiationState or dict.
        config: Optional configuration dictionary.
        history: Optional list of turn dictionaries.
        status: Final status ('accepted', 'deadlock', 'rejected').
        deadlock_event: Optional deadlock event dictionary.

    Returns:
        Structured SentimentAnalysisResult dictionary.
    """
    cfg = config or (state.get("config") if isinstance(state, dict) else getattr(state, "config", {})) or {}
    trajectory = analyze_sentiment_trajectory(state=state, config=cfg, history=history)

    # Calculate distributions & average intensity
    counts: dict[str, int] = {
        "Confidence / Dominance": 0,
        "Collaboration / Empathy": 0,
        "Urgency / Anxiety": 0,
    }
    total_intensity = 0.0

    for item in trajectory:
        lbl = item.get("sentiment_label", "Collaboration / Empathy")
        counts[lbl] = counts.get(lbl, 0) + 1
        total_intensity += float(item.get("intensity_score", 0.70))

    avg_intensity = round(total_intensity / max(1, len(trajectory)), 2)
    dominant = max(counts, key=counts.get) if trajectory else "Collaboration / Empathy"

    # Extract turn history for coaching
    turns = history if history is not None else (
        state.get("history") if isinstance(state, dict) else getattr(state, "history", [])
    )

    recommendations = generate_coaching_recommendations(
        config=cfg,
        history=turns or [],
        status=status,
        deadlock_event=deadlock_event,
    )

    # Narrative trajectory recap
    if len(trajectory) >= 2:
        first_label = trajectory[0]["sentiment_label"]
        last_label = trajectory[-1]["sentiment_label"]
        narrative = (
            f"Negotiation initiated with {first_label} as opening positions were established, "
            f"transitioning into {last_label} in the concluding rounds with an average cognitive intensity of {avg_intensity}."
        )
    elif trajectory:
        narrative = f"Negotiation concluded after a single exchange marked by {trajectory[0]['sentiment_label']}."
    else:
        narrative = "No turn exchanges recorded for sentiment analysis."

    result = SentimentAnalysisResult(
        trajectory=[SentimentTrajectoryItem(**item) for item in trajectory],
        dominant_sentiment=dominant,  # type: ignore[arg-type]
        sentiment_distribution=counts,
        average_intensity=avg_intensity,
        recommendations={k: AgentCoachingRecommendation(**v) for k, v in recommendations.items()},
        cognitive_trajectory_summary=narrative,
    )

    return result.model_dump()
