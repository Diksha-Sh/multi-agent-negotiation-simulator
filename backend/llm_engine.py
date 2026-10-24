"""LLM Reasoning Engine for the Multi-Agent Negotiation Simulator (Task 2).

Plugs into the Orchestrator:

    from backend.llm_engine import make_agent_engine
    engine = make_agent_engine(max_rounds=orchestrator.max_rounds)
    final_state = orchestrator.run_loop(engine)

or, with the default round count of the scenario:

    from backend.llm_engine import my_agent_engine
    final_state = orchestrator.run_loop(my_agent_engine)

How one turn is decided:

1. Strategy. A rule-based strategy works out the recommended move: the
   opening anchor, a time-based concession that depends on the personality,
   and when to accept. If Harini's counteroffer module
   (backend/counteroffer.py, evaluate_offer) is present, its decision is
   used as well.
2. LLM. The agent's prompt (persona, goal, constraints, limits,
   personality, full history and the recommended move) is sent to an
   OpenAI-compatible chat API (Groq by default). The LLM answers with
   action, offer, reasoning and stance as JSON.
3. Guardrails. The answer is checked: valid action and stance, every offer
   inside the agent's hard limits, no going back on earlier concessions,
   and accept/reject only when allowed. Anything invalid is corrected.
4. Fallback. Without an API key, or when the LLM call fails, the
   recommended move is used with a template reasoning, so negotiations and
   tests always run.

Settings come from environment variables or a .env file in the project root
(see .env.example): LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_TEMPERATURE,
LLM_TIMEOUT, LLM_ENABLED.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Optional

from backend.orchestrator import NegotiationState, Turn

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parent.parent
PERSONALITIES_FILE = ROOT_DIR / "scenarios" / "personalities.json"

ACTIONS = ("accept", "counter", "reject")
STANCES = ("firm", "flexible", "urgent")
DEFAULT_MAX_ROUNDS = 10

# How far beyond its target an agent opens (share of its negotiating room).
OPENING_ANCHOR = {"Aggressive": 1.0, "Collaborative": 0.4, "Risk-Averse": 0.2}

# Concession curve: offer = opening + (limit - opening) * progress ** (1 / beta).
# beta < 1 concedes late (holds out), beta > 1 concedes early.
CONCESSION_BETA = {"Aggressive": 0.4, "Collaborative": 1.0, "Risk-Averse": 2.0}

# Room to negotiate when the goal names no target beyond the hard limit.
DEFAULT_ROOM = 0.20

DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "openai/gpt-oss-120b"


# ============================================================================
# 1. Settings
# ============================================================================

def _load_dotenv() -> None:
    """Read KEY=VALUE lines from .env files without overriding real env vars."""
    for path in (ROOT_DIR / ".env", ROOT_DIR / "backend" / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def get_llm_settings() -> dict[str, Any]:
    """Return the LLM settings. The API key is never logged or returned by the API."""
    _load_dotenv()
    api_key = (
        os.getenv("LLM_API_KEY")
        or os.getenv("GROQ_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or ""
    ).strip()
    enabled = os.getenv("LLM_ENABLED", "true").strip().lower() not in ("0", "false", "no", "off")
    return {
        "api_key": api_key,
        "base_url": os.getenv("LLM_BASE_URL", DEFAULT_BASE_URL).rstrip("/"),
        "model": os.getenv("LLM_MODEL", DEFAULT_MODEL),
        "temperature": float(os.getenv("LLM_TEMPERATURE", "0.4")),
        "timeout": float(os.getenv("LLM_TIMEOUT", "30")),
        "max_tokens": int(os.getenv("LLM_MAX_TOKENS", "1500")),
        "enabled": enabled and bool(api_key),
    }


def engine_status() -> dict[str, Any]:
    """Which mode the engine runs in, for the API and the UI (no secrets)."""
    s = get_llm_settings()
    return {
        "mode": "llm" if s["enabled"] else "rule-based",
        "model": s["model"] if s["enabled"] else None,
        "base_url": s["base_url"] if s["enabled"] else None,
        "counteroffer_module": _counteroffer_fn() is not None,
    }


@lru_cache(maxsize=1)
def _personality_profiles() -> dict[str, dict[str, Any]]:
    try:
        with open(PERSONALITIES_FILE, encoding="utf-8-sig") as f:
            return {p["name"]: p for p in json.load(f)}
    except (OSError, ValueError, KeyError, TypeError):
        return {}


def _counteroffer_fn() -> Optional[Callable[[dict, dict], dict]]:
    """Harini's evaluate_offer(incoming_offer, agent_config), if it is in the repo."""
    try:
        from backend.counteroffer import evaluate_offer  # type: ignore
    except Exception:  # module not merged yet, or fails to import
        return None
    return evaluate_offer


# ============================================================================
# 2. Reading an agent and the history
# ============================================================================

def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _personality(agent: dict[str, Any]) -> str:
    value = str(agent.get("personality") or agent.get("default_personality") or "Collaborative")
    for name in OPENING_ANCHOR:
        if value.strip().lower() == name.lower():
            return name
    return "Collaborative"


def _limits(agent: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """{item: {"type": "min"|"max", "value": float, "unit": str}} for numeric limits."""
    result: dict[str, dict[str, Any]] = {}
    for lim in agent.get("limits") or []:
        if not isinstance(lim, dict):
            continue
        item, l_type, value = lim.get("item"), str(lim.get("type", "")).lower(), lim.get("value")
        if isinstance(item, str) and item.strip() and l_type in ("min", "max") and _is_number(value):
            result[item.strip()] = {"type": l_type, "value": float(value), "unit": str(lim.get("unit", ""))}
    return result


NUMBER_WORDS = {"one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
                "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10"}


def _goal_numbers(goal: str) -> list[tuple[int, float]]:
    """(position, value) for every number in the goal, including 'two', 'three', ..."""
    text = re.sub(r"\b(" + "|".join(NUMBER_WORDS) + r")\b",
                  lambda m: NUMBER_WORDS[m.group(1).lower()].ljust(len(m.group(1))), goal, flags=re.IGNORECASE)
    return [(m.start(), float(m.group().replace(",", "")))
            for m in re.finditer(r"(?<![A-Za-z0-9])\d[\d,]*(?:\.\d+)?", text)]


def _item_spans(goal: str, item: str) -> list[tuple[int, int]]:
    """(start, end) of every goal word that matches a word of the item name (e.g. 'remote' for remote_days)."""
    words = [w[:5] for w in re.split(r"[_\s]+", item.lower()) if len(w) > 2]
    return [(m.start(), m.end()) for w in words for m in re.finditer(r"\b" + re.escape(w) + r"\w*", goal.lower())]


def _gap(pos: int, span: tuple[int, int]) -> int:
    start, end = span
    return 0 if start <= pos <= end else min(abs(pos - start), abs(pos - end))


def _goal_target(agent: dict[str, Any], item: str, limit: dict[str, Any]) -> float:
    """The value the agent hopes for: agent["targets"], else the number in the goal that belongs to this item."""
    targets = agent.get("targets")
    target = None
    if isinstance(targets, dict) and _is_number(targets.get(item)):
        target = float(targets[item])
    else:
        goal = str(agent.get("goal", ""))
        items = [i for i in _limits(agent)] or [item]
        spans = {i: _item_spans(goal, i) for i in items}
        for pos, value in _goal_numbers(goal):
            # Give each number to the item mentioned closest to it.
            distances = {i: min(_gap(pos, sp) for sp in ss) for i, ss in spans.items() if ss}
            if distances and min(distances, key=distances.get) == item:
                target = value
                break
        if target is None and len(items) == 1:
            numbers = _goal_numbers(goal)
            if len(numbers) == 1:
                target = numbers[0][1]
    if target is None:
        target = limit["value"]
    # Never on the wrong side of the hard limit.
    return min(target, limit["value"]) if limit["type"] == "max" else max(target, limit["value"])


def _better_for_me(a: float, b: float, l_type: str) -> bool:
    """True if value a is at least as good as b for an agent with this limit type."""
    return a <= b if l_type == "max" else a >= b


def _within(value: float, limit: dict[str, Any]) -> bool:
    return value <= limit["value"] if limit["type"] == "max" else value >= limit["value"]


def _clamp(value: float, limit: dict[str, Any]) -> float:
    return min(value, limit["value"]) if limit["type"] == "max" else max(value, limit["value"])


def _tidy(value: float, limit: dict[str, Any]) -> float | int:
    """Round to a sensible precision without crossing the hard limit."""
    unit = limit.get("unit", "").lower()
    if "day" in unit or abs(limit["value"]) >= 1000:
        return int(_clamp(round(value), limit))
    rounded = round(value, 2)
    if not _within(rounded, limit):
        rounded = limit["value"]
    return rounded


def _last_offer(state: NegotiationState, agent_id: str, mine: bool) -> Optional[dict[str, Any]]:
    """The latest offer made by this agent (mine=True) or by anyone else (mine=False)."""
    for turn in reversed(state.history):
        if (turn.get("agent_id") == agent_id) == mine and isinstance(turn.get("offer"), dict) and turn["offer"]:
            return turn["offer"]
    return None


# ============================================================================
# 3. Rule-based strategy (the recommended move)
# ============================================================================

def _progress(state: NegotiationState, max_rounds: int) -> float:
    """0.0 on the first turn, 1.0 on the last turn."""
    if max_rounds <= 1:
        return 1.0
    return min(1.0, max(0.0, state.round / (max_rounds - 1)))


def _opening(agent: dict[str, Any], item: str, limit: dict[str, Any], personality: str) -> float:
    target = _goal_target(agent, item, limit)
    if target == limit["value"]:
        # The goal only restates the limit: aim a bit better than the limit.
        step = abs(limit["value"]) * DEFAULT_ROOM
        target = limit["value"] - step if limit["type"] == "max" else limit["value"] + step
    room = abs(limit["value"] - target)
    shift = OPENING_ANCHOR[personality] * room
    opening = target - shift if limit["type"] == "max" else target + shift
    return max(opening, 0.0) if limit["value"] >= 0 else opening


def _stance(personality: str, progress: float, action: str) -> str:
    if action == "accept":
        return "flexible"
    if progress >= 0.75:
        return "urgent"
    return "firm" if personality == "Aggressive" else "flexible"


def recommend_move(state: NegotiationState, agent: dict[str, Any], max_rounds: int) -> dict[str, Any]:
    """Work out the rule-based move: {"action", "offer", "stance", "notes"}."""
    agent_id = str(agent.get("id", "agent"))
    personality = _personality(agent)
    limits = _limits(agent)
    progress = _progress(state, max_rounds)
    incoming = _last_offer(state, agent_id, mine=False)
    previous = _last_offer(state, agent_id, mine=True)
    notes: list[str] = []

    if not limits:
        offer = dict(previous or incoming or {})
        return {"action": "counter", "offer": offer, "stance": _stance(personality, progress, "counter"),
                "notes": ["Agent has no numeric limits."]}

    # Items every agent limits in the same direction (e.g. both cap total_budget at 100)
    # are shared caps, not something to bargain over: propose the tightest cap.
    others = [a for a in state.agents if str(a.get("id")) != agent_id]
    shared: dict[str, float] = {}
    for item, limit in limits.items():
        other_limits = [_limits(a).get(item) for a in others]
        if other_limits and all(o and o["type"] == limit["type"] for o in other_limits):
            values = [limit["value"]] + [o["value"] for o in other_limits]
            shared[item] = min(values) if limit["type"] == "max" else max(values)

    # Time-based concession from the opening anchor towards the hard limit.
    beta = CONCESSION_BETA[personality]
    candidate: dict[str, float] = {}
    for item, limit in limits.items():
        if item in shared:
            candidate[item] = shared[item]
            continue
        opening = _opening(agent, item, limit, personality)
        candidate[item] = opening + (limit["value"] - opening) * (progress ** (1.0 / beta))
        # Never ask for less than the other side already offers.
        if incoming and _is_number(incoming.get(item)) and _within(float(incoming[item]), limit) \
                and _better_for_me(float(incoming[item]), candidate[item], limit["type"]):
            candidate[item] = float(incoming[item])

    # Harini's counteroffer module, when present, can move the offer further.
    evaluate = _counteroffer_fn()
    module_decision = None
    if evaluate and incoming and set(incoming) == set(limits):
        try:
            module_decision = evaluate(dict(incoming), agent)
        except Exception as exc:  # keep the negotiation running
            notes.append(f"Counteroffer module error: {exc}")
    if module_decision and module_decision.get("action") == "counter" and isinstance(module_decision.get("counteroffer"), dict):
        for item, value in module_decision["counteroffer"].items():
            if item in candidate and _is_number(value):
                # Keep whichever is more concessive (closer to the other side).
                if _better_for_me(candidate[item], float(value), limits[item]["type"]):
                    candidate[item] = float(value)
        notes.append("Counteroffer module consulted.")

    # Never go back on a concession already made.
    if previous:
        for item, limit in limits.items():
            if _is_number(previous.get(item)) and _better_for_me(candidate[item], float(previous[item]), limit["type"]):
                candidate[item] = float(previous[item])

    candidate = {item: _clamp(v, limits[item]) for item, v in candidate.items()}

    # Accept when the incoming offer is inside the limits and at least as good as the counter.
    if incoming and set(limits) <= set(incoming) and all(_is_number(incoming[i]) for i in limits):
        inside = all(_within(float(incoming[i]), limits[i]) for i in limits)
        good_enough = all(_better_for_me(float(incoming[i]), candidate[i], limits[i]["type"]) for i in limits)
        module_accepts = bool(module_decision and module_decision.get("action") == "accept")
        if inside and (good_enough or module_accepts):
            return {"action": "accept", "offer": dict(incoming), "stance": "flexible",
                    "notes": notes + ["Incoming offer meets the current acceptance threshold."]}
        if not inside:
            notes.append("Incoming offer breaks a hard limit.")

    offer = {item: _tidy(v, limits[item]) for item, v in candidate.items()}
    if previous:  # rounding must not undo the no-going-back rule
        for item, limit in limits.items():
            if _is_number(previous.get(item)) and _better_for_me(offer[item], float(previous[item]), limit["type"]):
                offer[item] = previous[item]
    return {"action": "counter", "offer": offer, "stance": _stance(personality, progress, "counter"), "notes": notes}


def _template_reasoning(agent: dict[str, Any], move: dict[str, Any], incoming: Optional[dict[str, Any]]) -> str:
    name = agent.get("name", "Agent")
    personality = _personality(agent)
    terms = ", ".join(f"{k} {v}" for k, v in move["offer"].items())
    if move["action"] == "accept":
        return f"{name} accepts the offer ({terms}) because it is within its limits and meets its current goal."
    if move["action"] == "reject":
        return f"{name} walks away: the offer on the table breaks its hard limits."
    style = {
        "Aggressive": "holds a strong position and concedes only a little",
        "Collaborative": "moves towards a fair middle ground",
        "Risk-Averse": "makes a reasonable concession to keep the deal alive",
    }[personality]
    opener = "opens with" if not incoming else "counters with"
    return f"{name} {opener} {terms}. As a {personality} negotiator it {style}."


# ============================================================================
# 4. Prompt and LLM call
# ============================================================================

def build_prompt(state: NegotiationState, agent: dict[str, Any], move: dict[str, Any],
                 max_rounds: int) -> list[dict[str, str]]:
    """Chat messages for this agent's turn."""
    agent_id = str(agent.get("id", "agent"))
    personality = _personality(agent)
    profile = _personality_profiles().get(personality, {})
    limits = _limits(agent)
    previous = _last_offer(state, agent_id, mine=True)
    incoming = _last_offer(state, agent_id, mine=False)

    limit_lines = [
        f"- {item}: {'at most' if l['type'] == 'max' else 'at least'} {l['value']:g} {l['unit']}".rstrip()
        for item, l in limits.items()
    ]
    ranges = []
    for item, l in limits.items():
        start = previous.get(item) if previous and _is_number(previous.get(item)) else move["offer"].get(item)
        if _is_number(start):
            low, high = sorted((float(start), l["value"]))
            ranges.append(f"- {item}: between {low:g} and {high:g}")

    names = {str(a.get("id")): a.get("name", a.get("id")) for a in state.agents}
    history_lines = [
        f"Round {t.get('round')} - {names.get(str(t.get('agent_id')), t.get('agent_id'))}: "
        f"{str(t.get('action', '')).upper()} {json.dumps(t.get('offer', {}))} "
        f"[{t.get('stance', '')}] \"{t.get('reasoning', '')}\""
        for t in state.history
    ] or ["(no moves yet - you make the opening offer)"]

    system = "\n".join([
        f"You are {agent.get('name', agent_id)}, the {agent.get('role', 'negotiator')} in a negotiation.",
        f"Role: {agent.get('role_description', '')}",
        f"Goal: {agent.get('goal', '')}",
        "Constraints:",
        *[f"- {c}" for c in (agent.get("constraints") or [])],
        "Hard limits (never cross these):",
        *limit_lines,
        "",
        f"Personality: {personality}. {profile.get('description', '')}",
        f"Opening stance: {profile.get('opening_stance', '')}",
        f"Concession style: {profile.get('concession_style', '')}",
        f"Risk attitude: {profile.get('risk_attitude', '')}",
        f"Example of how you talk: \"{profile.get('example_phrase', '')}\"",
        "",
        "Rules:",
        "- Choose one action: accept (agree to the other side's latest offer), counter (make a new offer) or reject (walk away for good).",
        "- Only accept an offer that is inside your hard limits. Only reject if the other side's offer breaks your hard limits and you are giving up.",
        "- When you counter, offer a value for every item, inside your hard limits, and never go back on an earlier concession.",
        "- stance is one of: firm, flexible, urgent.",
        "- reasoning: 1-3 sentences, first person, in character, explaining your move to the other side. Do not reveal your hard limits.",
        "Reply with JSON only, in this shape:",
        '{"action": "accept|counter|reject", "offer": {"item": number}, "reasoning": "...", "stance": "firm|flexible|urgent"}',
    ])

    user = "\n".join([
        f"Scenario: {state.scenario_id}. This is turn {state.round + 1} of {max_rounds}.",
        "Negotiation so far:",
        *history_lines,
        "",
        f"The other side's latest offer: {json.dumps(incoming) if incoming else 'none yet'}",
        f"Your previous offer: {json.dumps(previous) if previous else 'none yet'}",
        f"Your strategy advisor recommends: {move['action']} {json.dumps(move['offer'])} (stance: {move['stance']}).",
        "If you counter, keep each item in this range:",
        *(ranges or ["- (no numeric items)"]),
        "Make your move now.",
    ])
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def _call_llm(messages: list[dict[str, str]], settings: dict[str, Any]) -> str:
    """Send the chat messages to an OpenAI-compatible API and return the reply text."""
    import httpx

    body = {
        "model": settings["model"],
        "messages": messages,
        "temperature": settings["temperature"],
        # Reasoning models (e.g. gpt-oss) spend tokens thinking before they answer.
        "max_tokens": settings.get("max_tokens", 1500),
        "response_format": {"type": "json_object"},
    }
    if "gpt-oss" in settings["model"]:
        body["reasoning_effort"] = "low"  # faster replies; the move itself is simple
    response = httpx.post(
        f"{settings['base_url']}/chat/completions",
        headers={"Authorization": f"Bearer {settings['api_key']}", "Content-Type": "application/json"},
        json=body,
        timeout=settings["timeout"],
    )
    if response.status_code >= 400:
        # Show the provider's own message (e.g. model_not_found) in the log, never the key.
        logger.warning("LLM API error %s: %s", response.status_code, response.text[:300])
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def _wait_if_rate_limited(exc: Exception) -> None:
    """On HTTP 429 (free-tier rate limit) wait briefly before the retry."""
    import time

    response = getattr(exc, "response", None)
    if response is None or getattr(response, "status_code", None) != 429:
        return
    try:
        delay = float(response.headers.get("retry-after", "2"))
    except (TypeError, ValueError):
        delay = 2.0
    time.sleep(min(max(delay, 0.5), 5.0))


def parse_llm_reply(text: str) -> dict[str, Any]:
    """Pull the JSON object out of the reply (handles ```json fences and extra text)."""
    if not isinstance(text, str):
        raise ValueError("LLM reply is not text.")
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("No JSON object in the LLM reply.")
    data = json.loads(cleaned[start:end + 1])
    if not isinstance(data, dict):
        raise ValueError("LLM reply JSON is not an object.")
    return data


# ============================================================================
# 5. Guardrails
# ============================================================================

def apply_guardrails(reply: dict[str, Any], state: NegotiationState, agent: dict[str, Any],
                     move: dict[str, Any]) -> dict[str, Any]:
    """Turn the LLM reply into a move that follows every negotiation rule."""
    agent_id = str(agent.get("id", "agent"))
    limits = _limits(agent)
    incoming = _last_offer(state, agent_id, mine=False)
    previous = _last_offer(state, agent_id, mine=True)

    action = str(reply.get("action", "")).strip().lower()
    stance = str(reply.get("stance", "")).strip().lower()
    reasoning = str(reply.get("reasoning", "")).strip()
    if stance not in STANCES:
        stance = move["stance"]

    incoming_ok = bool(incoming) and set(limits) <= set(incoming or {}) and all(
        _is_number(incoming[i]) and _within(float(incoming[i]), limits[i]) for i in limits
    )

    if action == "accept":
        if incoming_ok:
            return {"action": "accept", "offer": dict(incoming), "stance": stance, "reasoning": reasoning}
        action = "counter"  # nothing acceptable on the table
    if action == "reject":
        if incoming and not incoming_ok:
            return {"action": "reject", "offer": dict(incoming), "stance": stance, "reasoning": reasoning}
        action = "counter"  # walking away from a valid offer is not allowed
    if action != "counter":
        action = move["action"]
        if action == "accept":
            return {"action": "accept", "offer": dict(move["offer"]), "stance": stance, "reasoning": reasoning}

    raw_offer = reply.get("offer") if isinstance(reply.get("offer"), dict) else {}
    offer: dict[str, Any] = {}
    for item, limit in limits.items():
        value = raw_offer.get(item)
        value = float(value) if _is_number(value) else float(move["offer"].get(item, limit["value"]))
        value = _clamp(value, limit)
        if previous and _is_number(previous.get(item)) and _better_for_me(value, float(previous[item]), limit["type"]):
            value = float(previous[item])
        offer[item] = _tidy(value, limit)
        if previous and _is_number(previous.get(item)) and _better_for_me(offer[item], float(previous[item]), limit["type"]):
            offer[item] = previous[item]
    if not limits:
        offer = dict(move["offer"])
    return {"action": "counter", "offer": offer, "stance": stance, "reasoning": reasoning}


# ============================================================================
# 6. The engine
# ============================================================================

def _scenario_max_rounds(scenario_id: str) -> int:
    try:
        from backend.scenario_loader import load_scenario
        return int(load_scenario(scenario_id).get("max_rounds", DEFAULT_MAX_ROUNDS))
    except Exception:
        return DEFAULT_MAX_ROUNDS


def make_agent_engine(max_rounds: Optional[int] = None, use_llm: Optional[bool] = None
                      ) -> Callable[[NegotiationState, dict[str, Any]], Turn]:
    """Create an engine for orchestrator.run_loop().

    Args:
        max_rounds: the negotiation's round limit (orchestrator.max_rounds), used for time pressure.
        use_llm: force the LLM on/off. None means: use it when an API key is configured.
    """

    stats = {"llm_turns": 0, "rule_turns": 0}

    def engine(state: NegotiationState, agent: dict[str, Any]) -> Turn:
        rounds = max_rounds or _scenario_max_rounds(state.scenario_id)
        agent_id = str(agent.get("id", "agent"))
        incoming = _last_offer(state, agent_id, mine=False)
        move = recommend_move(state, agent, rounds)

        final: Optional[dict[str, Any]] = None
        settings = get_llm_settings()
        llm_on = settings["enabled"] if use_llm is None else (use_llm and bool(settings["api_key"]))
        if llm_on:
            messages = build_prompt(state, agent, move, rounds)
            for attempt in range(2):
                try:
                    reply = parse_llm_reply(_call_llm(messages, settings))
                    final = apply_guardrails(reply, state, agent, move)
                    break
                except Exception as exc:
                    logger.warning("LLM turn failed (attempt %d) for %s: %s", attempt + 1, agent_id, exc)
                    if attempt == 0:
                        _wait_if_rate_limited(exc)

        stats["llm_turns" if final is not None else "rule_turns"] += 1
        if final is None:
            final = {"action": move["action"], "offer": move["offer"], "stance": move["stance"],
                     "reasoning": _template_reasoning(agent, move, incoming)}
        if not final.get("reasoning"):
            final["reasoning"] = _template_reasoning(agent, final, incoming)

        return Turn(
            agent_id=agent_id,
            round=state.round + 1,
            action=final["action"],
            offer=dict(final["offer"]),
            reasoning=final["reasoning"],
            stance=final["stance"],
        )

    engine.stats = stats  # type: ignore[attr-defined]
    return engine


def engine_mode(engine: Callable[..., Any]) -> str:
    """'llm', 'rule-based' or 'mixed', from the turns an engine actually played."""
    stats = getattr(engine, "stats", None) or {}
    llm, rules = stats.get("llm_turns", 0), stats.get("rule_turns", 0)
    if llm and rules:
        return "mixed"
    return "llm" if llm else "rule-based"


def my_agent_engine(state: NegotiationState, agent: dict[str, Any]) -> Turn:
    """Engine with the contract agreed in the team: (state, agent) -> Turn."""
    return make_agent_engine()(state, agent)


if __name__ == "__main__":
    from backend.orchestrator import NegotiationOrchestrator
    from backend.scenario_loader import build_negotiation_config

    logging.basicConfig(level=logging.INFO)
    print("Engine:", engine_status())
    for scenario_id in ("vendor_pricing", "job_offer", "project_budget_allocation"):
        config = build_negotiation_config(scenario_id)
        orch = NegotiationOrchestrator(config)
        final_state = orch.run_loop(make_agent_engine(orch.max_rounds))
        print(f"\n=== {config['title']} -> {final_state.status.upper()} after {final_state.round} turns")
        for t in final_state.history:
            print(f"  R{t['round']:>2} {t['agent_id']:<16} {t['action']:<7} {json.dumps(t['offer'])}  [{t['stance']}]  {t['reasoning']}")
