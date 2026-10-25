# Task 3: End-to-End Testing and Documentation

**Execution date:** 2026-10-25
**Project root tested:** `C:\Users\Abirami S\negotiation-main`  
**Python:** 3.13.17
**Frontend:** Vite 8.3.4, React 19

## Scope and Workflow

The application has a FastAPI backend, a React/Vite frontend, JSON scenario templates, and a Python `NegotiationOrchestrator`. The main workflow is:

1. `GET /api/scenarios` lists scenarios and `GET /api/scenarios/{scenario_id}` supplies scenario/agent details.
2. The frontend selects a scenario and default or custom agent personalities.
3. `POST /api/config` builds the final agent configuration. `POST /api/validate` validates a complete configuration.
4. `POST /api/orchestrator/run` validates and runs a complete negotiation with `make_agent_engine(max_rounds=...)` through the orchestrator's existing `run_loop()` interface.

The API now uses the LLM reasoning engine, which applies its rule-based strategy and Harini's `evaluate_offer()` counteroffer module. Without a configured key, or when `LLM_ENABLED=false`, it runs offline without making provider requests. With a key and LLM enabled, it can use the configured OpenAI-compatible provider and falls back to the rule-based strategy on request failure. The API response shape is unchanged.

## Test Plan and Results

| ID | Test case | Expected result | Actual result | Status |
|---|---|---|---|---|
| A01 | Run the complete backend pytest suite | All collected tests pass | Latest run: `py -3.13 -m pytest -q`: 149 passed, 0 failed. One Starlette deprecation warning: `httpx` with `starlette.testclient` is deprecated. | PASS |
| A02 | Health, scenario list/details, personality list | 200 responses; all three scenario IDs and three personalities returned | Passed in API tests and live health check. | PASS |
| A03 | Build each scenario config with defaults | Valid config containing both agents and their declared defaults | All three returned `validation.valid=true`; defaults matched each scenario file. | PASS |
| A04 | Override a personality | Selected value appears in the built config and survives orchestration | `job_offer` employer changed to `Aggressive`; config remained valid and the state retained the selection. | PASS |
| A05 | Validate missing fields, invalid personalities/limits, impossible bounds, malformed values | Invalid config returns specific validation errors without an uncaught exception | Existing unit/API tests passed, including `Friendly`, missing fields, malformed limits, impossible bounds, NaN/infinity, and garbage input. | PASS |
| A06 | Run config-to-orchestrator for all scenarios | Valid alternating turns, offers inside both agents' compatible limits, and acceptance of the actual incoming offer | With `LLM_ENABLED=false`, Vendor Pricing was accepted in 3 turns (buyer); Job Offer in 2 turns (employer); Project Budget Allocation in 2 turns (finance manager). Offers, action/stance values, history, monotonic concessions, bilateral feasibility, and accepted-offer provenance were checked. | PASS |
| A07 | Accept, reject, deadlock, and max-round conditions | Accept/reject terminate; counter-only loop deadlocks at configured maximum | Existing orchestrator tests passed for all four conditions, including controlled early acceptance and rejection. | PASS |
| A08 | Unknown scenario and unknown agent ID | Scenario returns 404; unknown personality-map agent returns 422 | Live API returned 404 and 422 respectively; existing API tests passed. | PASS |
| A09 | Invalid personality, invalid/missing run config, malformed request JSON | Validation error or documented client-error status | Live API: invalid personality `200` with `validation.valid=false`; empty orchestrator object `400`; missing config body `422`; malformed JSON `422`. API tests cover invalid config and malformed run body. | PASS |
| A10 | Scenario file handling and CORS | Clear errors for malformed scenario files; local frontend origins permitted, remote origin rejected | Existing API tests passed for bad JSON/missing scenario ID, BOM, localhost origins, and rejection of a remote origin. | PASS |
| F01 | Frontend ESLint | No lint errors | From `frontend/`, `npm run lint` exited 0 after integration. | PASS |
| F02 | Frontend production build | Vite creates production bundle | From `frontend/`, `npm run build` succeeded after integration (Vite 8.3.4). | PASS |
| F03 | Full browser walkthrough | Select scenario, customize agents, start and inspect transcript/status | The previously completed Task 3 browser walkthrough exercised the pre-integration mock flow. A browser walkthrough of the newly integrated engine was not repeated; API behavior was checked with FastAPI `TestClient`. | PRIOR RUN |
| F04 | Frontend offline fallback round cap | With the orchestrator request unavailable, fallback stops at configured `max_rounds` | Previously verified before this integration: blocked the run endpoint, set the limit to 3, and observed 3 turns and deadlock at round 3. | PRIOR RUN |
| F05 | Transcript JSON export | Download a valid JSON transcript with status, turns, and round count | Previously verified before this integration: captured the export data URL for `negotiation_transcript_vendor_pricing.json`; it contained 3 turns and deadlock at 3 rounds. The browser export was not repeated after integration. | PRIOR RUN |
| F06 | PDF export action | Export control invokes browser print | Verified the button invokes `window.print()`. The native print dialog and saving an actual PDF were not automated. | PARTIAL |
| L01 | Rule-based fallback and counteroffer integration | Run all scenarios without a key; use the evaluator and enforce guardrails | `engine_status()` reported `rule-based` and `counteroffer_module=true`. All three scenarios completed successfully; direct module tests and LLM-engine tests passed. | PASS |
| L02 | Real-LLM workflow | Verify a successful call to a configured provider | Not attempted: no API key was configured or used. The LLM path is covered with mocked responses, not a real provider call. | NOT TESTED |

## Live Scenario Runs

The following results came from FastAPI `TestClient` requests using `POST /api/config` followed by `POST /api/orchestrator/run`, with `LLM_ENABLED=false`. Each complete request configuration and response history is saved as JSON. These are rule-based results, not LLM-generated:

| Scenario ID | Agents/defaults | Result | Transcript |
|---|---|---|---|
| `vendor_pricing` | buyer: Collaborative; vendor: Risk-Averse | 3 turns; accepted by buyer | [task3_transcripts/vendor_pricing.json](task3_transcripts/vendor_pricing.json) |
| `job_offer` | candidate: Collaborative; employer: Risk-Averse | 2 turns; accepted by employer | [task3_transcripts/job_offer.json](task3_transcripts/job_offer.json) |
| `project_budget_allocation` | project_manager: Collaborative; finance_manager: Risk-Averse | 2 turns; accepted by finance_manager | [task3_transcripts/project_budget_allocation.json](task3_transcripts/project_budget_allocation.json) |

Each transcript includes `execution_mode: "rule-based fallback (LLM_ENABLED=false)"` so the results cannot be mistaken for live LLM output. Offers respect the acting agent's limits and, where the scenario has an overlapping agreement range, both agents' hard limits. Concessions do not reverse earlier moves. Every recorded acceptance uses the immediately preceding agent's actual offer and satisfies all participants' limits.

## Error Cases Verified

- Unknown scenario: `GET /api/scenarios/not_a_scenario` and `POST /api/config` with that ID return 404.
- Unknown agent in a personality override: `POST /api/config` returns 422.
- Invalid personality value: config endpoint returns 200 with validation errors; orchestrator endpoint rejects the invalid config with 400.
- Missing/invalid orchestrator config: an empty JSON object returns 400; no request body returns 422.
- Malformed JSON body: FastAPI returns 422.
- Validation tests additionally cover absent scenario ID, fewer than two agents, blank required fields, malformed limit objects, non-finite numbers, duplicate IDs, impossible deal bounds, and arbitrary garbage input.

## Defects Found and Changes Made

- **Frontend offline turn cap differed from the backend.** The backend treats `max_rounds` as a maximum number of turns, while the local fallback allowed `max_rounds × agent_count`. Updated `NegotiationArena.jsx` so single-step and full-loop fallback execution stop at `max_rounds`, and the exported transcript's `rounds` count now matches the backend turn count.
- **Orchestrator API flow lacked regression coverage.** Added API tests for config-to-run flows across all scenarios, alternating agent order, history and round numbering, custom personality preservation, invalid config, missing config, and malformed JSON. No existing assertions were removed or weakened.
- **Orchestrator integration.** The API now selects the engine with the scenario's round limit and runs it through `run_loop()`. Added coverage for rule-based API runs, scenario limits, concession direction, and the real counteroffer-module hook.
- **LLM setup and API documentation.** Added `.env.example` instructions and documented the LLM-enabled and offline fallback behavior without implying the API exposes unsupported step/status endpoints.
- **Transcript updates.** Replaced the old mock deadlock transcripts with the observed rule-based accepted runs and marked each transcript's execution mode.

## Setup and Commands

Run commands from the repository root (`negotiation-main`). Use separate PowerShell terminals for backend and frontend.

The backend uses the existing `httpx` requirement for optional OpenAI-compatible requests; no package manifest change was needed. Copy `.env.example` to `.env` in the repository root only if configuring a provider. Add the key locally; `.env` is git-ignored. No key is required for fallback or tests.

Install backend dependencies and run the API:

```powershell
py -3.13 -m pip install -r backend/requirements.txt
py -3.13 -m backend.server
```

The API is at `http://127.0.0.1:8000`; Swagger is at `http://127.0.0.1:8000/docs`.

Install and run the frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Vite prints its URL (normally `http://localhost:5173`). The frontend API base defaults to `http://127.0.0.1:8000`; set `VITE_API_URL` in `frontend/.env.local` to change it.

Run backend and frontend checks:

```powershell
py -3.13 -m pytest -q
cd frontend
npm run lint
npm run build
```

## Limitations and Remaining Checks

- A successful live LLM provider call was not verified: no API key was configured or used. The engine's LLM request/guardrail paths were tested with mocked provider replies; the three recorded scenarios used the rule-based fallback.
- The engine and counteroffer module evaluate offers, maintain limits and concessions, and can accept/reject/counter. When participants' limits overlap, generated offers remain in the shared feasible range. If no agreement range exists, no offer can satisfy both parties; each counter remains bounded by its maker's own limits. These checks do not constitute a real provider-generated negotiation.
- The integrated API was verified with `TestClient`, not a new browser walkthrough. The previous browser walkthrough and frontend offline fallback results are retained above as pre-integration checks. Frontend lint and production build were rerun after integration.
- PDF export was verified through the browser print call in the earlier Task 3 run, but the native print dialog and saving an actual PDF remain unverified.
- The latest full current-worktree backend suite was run with `py -3.13 -m pytest -q`: 149 passed. It reported one Starlette/httpx deprecation warning.
