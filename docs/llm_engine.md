# LLM Reasoning Engine (Task 2)

File: `backend/llm_engine.py`. Tests: `tests/test_llm_engine.py`.

The engine decides each agent's move. It plugs into the Orchestrator with the agreed contract:

```python
def my_agent_engine(state: NegotiationState, agent: dict) -> Turn
```

```python
from backend.orchestrator import NegotiationOrchestrator
from backend.llm_engine import make_agent_engine

orch = NegotiationOrchestrator(config)
final_state = orch.run_loop(make_agent_engine(orch.max_rounds))
```

`make_agent_engine(max_rounds)` passes the round limit so agents feel time pressure. `my_agent_engine` reads the limit from the scenario file (default 10).

## How one turn is decided

| Step | What happens |
|---|---|
| 1. Strategy | Rule-based recommended move: opening anchor, a concession curve per personality, and an accept rule. The integrated `backend/counteroffer.py` (`evaluate_offer`) helps evaluate the other side's offer |
| 2. Prompt | Persona, role, goal, constraints, hard limits, personality profile (`scenarios/personalities.json`), full history, and the recommended move |
| 3. LLM | OpenAI-compatible chat API (Groq by default). Reply: `{"action", "offer", "reasoning", "stance"}` as JSON |
| 4. Guardrails | Fixes anything invalid: action and stance values, offers outside hard limits, taking back an earlier concession, accepting when nothing is on the table, walking away from a valid offer |
| 5. Fallback | No API key, or the LLM fails twice: the recommended move with a template reasoning is used |

The output is always the locked Turn:

```json
{"agent_id": "vendor", "round": 2, "action": "counter", "offer": {"price": 37400},
 "reasoning": "...", "stance": "flexible"}
```

## Personalities

| Personality | Opening | Concessions |
|---|---|---|
| Aggressive | Far beyond its target | Late and small (holds out) |
| Collaborative | Moderately beyond its target | Steady |
| Risk-Averse | Close to its target | Early |

Items that every agent limits in the same direction (for example both cap `total_budget` at 100) are shared caps: agents propose the tightest cap instead of bargaining over them.

## Settings

Copy the committed `.env.example` to `.env` in the project root and add your key (`.env` is git-ignored):

```
LLM_API_KEY=your-groq-key
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
```

Free Groq key: https://console.groq.com, then API Keys. For OpenAI, set `LLM_BASE_URL=https://api.openai.com/v1` and `LLM_MODEL=gpt-4o-mini`. Set `LLM_ENABLED=false` to force the rule-based engine. Do not commit `.env` or print its values in logs.

## API integration

`POST /api/orchestrator/run` creates the engine with the scenario's `max_rounds` and passes it to the existing `NegotiationOrchestrator.run_loop()` interface. Its response retains the existing `status`, `round`, `winner`, `history`, and `state` fields; the API does not expose an engine-mode endpoint or an engine badge.

With no key, the API runs the rule-based engine and counteroffer evaluator without network calls. A configured key enables the LLM path unless `LLM_ENABLED=false`. An LLM provider failure is retried once and then that turn falls back to the rule-based recommendation. A fallback result must not be described as LLM-generated.

If the free Groq tier answers 429 (rate limit), the engine waits up to 5 seconds and retries once, then falls back to the rule-based move for that turn.

## Run

```bash
python -m backend.llm_engine        # negotiates all 3 scenarios and prints the transcripts
python -m pytest tests/test_llm_engine.py -v
```

## Interface with the counteroffer module

The engine calls `evaluate_offer(incoming_offer, agent_config)` from `backend/counteroffer.py` when the other side has made an offer, and expects:

```python
{"action": "accept" | "counter" | "reject", "counteroffer": dict | None, "reasoning": str, "stance": str}
```

An `accept` is followed when the incoming terms are also feasible under the strategy's guardrails. A `counter` value is used when it concedes more than the time-based curve. A `reject` for an offer outside the limits becomes a counter, so one bad offer does not end the negotiation. Any error inside the module is logged and skipped.
