# Task 3: End-to-End Testing and Documentation

**Execution date:** 2026-10-24  
**Project root tested:** `C:\Users\Abirami S\negotiation-main`  
**Python:** 3.13.17  
**Frontend:** Vite 8.3.4, React 19

## Scope and Workflow

The application has a FastAPI backend, a React/Vite frontend, JSON scenario templates, and a Python `NegotiationOrchestrator`. The main workflow is:

1. `GET /api/scenarios` lists scenarios and `GET /api/scenarios/{scenario_id}` supplies scenario/agent details.
2. The frontend selects a scenario and default or custom agent personalities.
3. `POST /api/config` builds the final agent configuration. `POST /api/validate` validates a complete configuration.
4. `POST /api/orchestrator/run` validates and runs a complete negotiation, returning status, winner, turns, and final state.

The orchestration API currently runs `mock_agent_fn`, not an LLM reasoning engine. That mock always returns `counter`; there is no LLM module or external API key configuration in this checkout. Thus acceptance and rejection are covered by orchestrator unit tests with controlled agent functions, but the live API's current mock runs terminate by maximum-round deadlock.

## Test Plan and Results

| ID | Test case | Expected result | Actual result | Status |
|---|---|---|---|---|
| A01 | Run the existing pytest suite | All collected tests pass | Initial run: 77 passed. After Task 3 coverage was added: 83 passed, 0 failed, 0 skipped. One Starlette/httpx deprecation warning. | PASS |
| A02 | Health, scenario list/details, personality list | 200 responses; all three scenario IDs and three personalities returned | Passed in API tests and live health check. | PASS |
| A03 | Build each scenario config with defaults | Valid config containing both agents and their declared defaults | All three returned `validation.valid=true`; defaults matched each scenario file. | PASS |
| A04 | Override a personality | Selected value appears in the built config and survives orchestration | `job_offer` employer changed to `Aggressive`; config remained valid and the state retained the selection. | PASS |
| A05 | Validate missing fields, invalid personalities/limits, impossible bounds, malformed values | Invalid config returns specific validation errors without an uncaught exception | Existing unit/API tests passed, including `Friendly`, missing fields, malformed limits, impossible bounds, NaN/infinity, and garbage input. | PASS |
| A06 | Run config-to-orchestrator for all scenarios | Alternating agent IDs, one stored turn per round, complete history and terminal status at max rounds | Each scenario returned 10 turns, alternating agents, turn numbers 1-10, status `deadlock`, and no winner. | PASS |
| A07 | Accept, reject, deadlock, and max-round conditions | Accept/reject terminate; counter-only loop deadlocks at configured maximum | Existing orchestrator tests passed for all four conditions, including controlled early acceptance and rejection. | PASS |
| A08 | Unknown scenario and unknown agent ID | Scenario returns 404; unknown personality-map agent returns 422 | Live API returned 404 and 422 respectively; existing API tests passed. | PASS |
| A09 | Invalid personality, invalid/missing run config, malformed request JSON | Validation error or documented client-error status | Live API: invalid personality `200` with `validation.valid=false`; empty orchestrator object `400`; missing config body `422`; malformed JSON `422`. API tests cover invalid config and malformed run body. | PASS |
| A10 | Scenario file handling and CORS | Clear errors for malformed scenario files; local frontend origins permitted, remote origin rejected | Existing API tests passed for bad JSON/missing scenario ID, BOM, localhost origins, and rejection of a remote origin. | PASS |
| F01 | Frontend ESLint | No lint errors | `npm run lint` and focused component lint both exited 0. | PASS |
| F02 | Frontend production build | Vite creates production bundle | `npm run build` succeeded. | PASS |
| F03 | Full browser walkthrough | Select scenario, customize agents, start and inspect transcript/status | Completed all three scenarios in the browser through configuration and API-backed Run Full Loop. Project Budget Allocation also used a custom Aggressive personality for the Finance Manager. Each showed 10 turns and a deadlock status; API regression tests verified alternating order. | PASS |
| F04 | Offline fallback round cap | With the orchestrator request unavailable, fallback stops at configured `max_rounds` | Blocked the run endpoint, disabled random early acceptance, set the limit to 3; UI showed exactly 3 turns and deadlock at round 3. | PASS |
| F05 | Transcript JSON export | Download a valid JSON transcript with status, turns, and round count | Triggered the export in the browser and captured the generated data URL. Filename was `negotiation_transcript_vendor_pricing.json`; parsed payload was valid and contained 3 turns, `deadlock`, and 3 rounds. | PASS |
| F06 | PDF export action | Export control invokes browser print | Verified the button invokes `window.print()`. The native print dialog and saving an actual PDF were not automated. | PARTIAL |
| L01 | Real-LLM workflow | Run a negotiation using the intended LLM reasoning engine | Blocked: this checkout contains no LLM reasoning-engine implementation or LLM configuration contract. No live LLM test was attempted. | BLOCKED |

## Live Scenario Runs

The following results came from live HTTP requests to `127.0.0.1:8000`, using `POST /api/config` followed by `POST /api/orchestrator/run`. Each actual request/response, including the complete 10-turn history, is saved as JSON:

| Scenario ID | Agents/defaults | Result | Transcript |
|---|---|---|---|
| `vendor_pricing` | buyer: Collaborative; vendor: Risk-Averse | 10 turns; alternating buyer/vendor; deadlock at max rounds | [task3_transcripts/vendor_pricing.json](task3_transcripts/vendor_pricing.json) |
| `job_offer` | candidate: Collaborative; employer: Risk-Averse | 10 turns; alternating candidate/employer; deadlock at max rounds | [task3_transcripts/job_offer.json](task3_transcripts/job_offer.json) |
| `project_budget_allocation` | project_manager: Collaborative; finance_manager: Risk-Averse | 10 turns; alternating project_manager/finance_manager; deadlock at max rounds | [task3_transcripts/project_budget_allocation.json](task3_transcripts/project_budget_allocation.json) |

The offers and reasoning in these transcripts are generated by the deterministic orchestration structure plus randomized mock offer values. They are not LLM-generated results. Because every mock action is `counter`, these runs do not demonstrate deal acceptance, rejection, or genuine strategic concessions.

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
- **Existing documentation was stale/incomplete.** Added the orchestrator route and mock behavior to `backend_api.md`; replaced the old “project budget to be added” placeholder in `agent_definitions.md` with the current scenario data.

## Setup and Commands

Run commands from the repository root (`negotiation-main`). Use separate PowerShell terminals for backend and frontend.

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
py -3.13 -m pytest -v
cd frontend
npm run lint
npm run build
```

## Limitations and Remaining Checks

- No external LLM reasoning engine is present or invoked. No key is needed for the current mock; a real LLM-backed run cannot be tested until an engine and its credential/configuration contract exist.
- The real-LLM workflow is blocked until the engine implementation and its configuration/credential requirements are supplied. No credentials were requested or used, and no LLM test result is claimed.
- The orchestrator returns structured `Turn` history and a final status; it does not evaluate whether each proposed offer is accepted by the other agent or calculate a negotiated settlement. Existing scenarios validate overlapping limits, but acceptance is supplied by the agent function.
- Browser walkthroughs covered scenario selection, configuration, personality customization, launch, and API-backed full-loop execution for all three scenarios. The offline fallback's round cap and JSON transcript generation were also checked. PDF export was verified through the browser print call, but saving a PDF through the native print dialog remains unverified.
- The first pytest invocation in the open `multi-agent-negotiation-simulator` folder found 0 tests because that folder contains only a standalone `index.html` and one scenario file. The 83-test results above were run from the full `negotiation-main` worktree, which contains the backend, frontend, scenarios, docs, and tests.
