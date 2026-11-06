# Deadlock Detection and Resolution (Task 4)

`backend/deadlock.py` watches the negotiation after every turn. When the agents
are stuck it raises a **deadlock event** and tries to fix it, one step at a time.

## How it plugs in

```
agent turn ──► Orchestrator.step() ──► check_deadlock(state, config)
                                            │
                    state.deadlock_event ◄──┘   (returned by /run, /step, /human-turn)
                                            │
next turn ──► LLM Reasoning Engine reads active_resolution(state)
              and moves the agent's offer (and tells the LLM in the prompt)
```

The check runs automatically inside the orchestrator, so the frontend never has
to call it. `POST /api/orchestrator/check-deadlock` exists for testing and for
inspecting a history.

## Detection rules

| Type | When it fires |
|---|---|
| `same_position` | Both agents repeated their offer unchanged for the last `stall_rounds` turns each |
| `repeated_rejection` | One agent proposed the same terms `rejection_limit` times in a row and was turned down each time, while the other side kept moving |
| `stall` | Both agents still move, but each of their last `stall_rounds` moves is smaller than `min_move_pct` % |
| `max_rounds` | The round count reached `max_rounds` (no deal) |

After an event, only turns **after** it count towards the next one, so the same
problem is not reported every turn.

Settings (optional, in the negotiation config):

```json
"deadlock": {"stall_rounds": 2, "min_move_pct": 1, "rejection_limit": 3}
```

| Setting | Default | Allowed |
|---|---|---|
| `stall_rounds` | 2 | whole number 1–10 |
| `min_move_pct` | 1 | number 0.01–50 |
| `rejection_limit` | 3 | whole number 2–10 |

`validate_config` rejects values outside these ranges.

## Resolution ladder

Each time the negotiation gets stuck again, the next step is tried:

| Level | `resolution_attempt` | What the agents do next | `resolution_outcome` if it works |
|---|---|---|---|
| 1 | `suggest_compromise` | Offer the midpoint of the two latest offers, kept inside every agent's limits | `compromise` |
| 2 | `modify_stance` | Close half of the remaining gap to the other side, stance `flexible` | `stance_change` |
| 3 | `trigger_final_round` | Each agent gets one last turn: best final offer, or accept if the offer is inside its limits; stance `urgent` | `final_round` |
| 4 | `declare_breakdown` | Negotiation ends, status `deadlock` | `breakdown` |

If no compromise is possible (no deal zone), level 1 is skipped.

`resolution_outcome` is `null` while an attempt is in progress. It is filled in when
both sides move again or a deal is accepted, and set to `breakdown` if an agent walks
away, the final round ends with no deal, or the round limit is reached.

The engine only ever moves an offer **towards** the other side, never past its own
hard limits, and never asks for less than the other side already offers.

With the LLM on, the mediator's step is added to the prompt, and the guardrails hold
the LLM to it: a counter that concedes less than the recommended step is raised to it,
and in the final round a valid offer is accepted even if the LLM tries to counter.

## Deadlock event

```json
{
  "type": "same_position",
  "round_triggered": 6,
  "resolution_attempt": "suggest_compromise",
  "resolution_outcome": null,
  "details": "Both sides repeated the same offers for 2 rounds in a row.",
  "message": "Mediator suggests meeting in the middle: price 37,500.",
  "compromise_offer": {"price": 37500},
  "level": 1,
  "attempts": []
}
```

`type`, `round_triggered`, `resolution_attempt` and `resolution_outcome` are the
fields agreed with the Arena UI. `details`, `message`, `compromise_offer`, `level`
and `attempts` (earlier events, oldest first) are extra information the UI can show.

## Functions

| Function | Purpose |
|---|---|
| `check_deadlock(state, config)` | New or updated event after the latest turn, or `None` |
| `resolve_deadlock(state, event)` | The action for the agents: `action`, `status`, `message`, and `compromise_offer` / `recommended_stance` / `turns_left` |
| `active_resolution(state)` | The step the engine must follow this turn (used by `llm_engine.py`) |
| `finalize_deadlock_event(state)` | Closes an open attempt on accept or reject (called by the orchestrator) |
| `max_rounds_event(state, max_rounds)` | Event for running out of rounds |

All of them depend only on the turn history, so the API rebuilds the same result
when it replays a history.

## API

`POST /api/orchestrator/check-deadlock`

Body: `{"config": <negotiation config>, "history": [<turns>]}`

Response:

```json
{
  "deadlock_detected": true,
  "active": true,
  "deadlock_event": { "...": "see above" },
  "resolution": {"action": "suggest_compromise", "status": "ongoing",
                 "message": "...", "compromise_offer": {"price": 37500},
                 "recommended_stance": "flexible"},
  "status": "ongoing",
  "round": 6
}
```

- `400`: invalid config (validation errors listed)
- `422`: `history` is not a list of turns, or the turn order is wrong

Full examples are in Swagger at `http://localhost:8000/docs`.

## Tests

`tests/test_deadlock.py` covers each rule, the ladder order, outcomes on accept and
reject, the final round, compromise limits, engine behaviour, settings validation
and the API.

```
python -m pytest tests/test_deadlock.py -v
```
