# Backend API (Task 1)

The backend is a small FastAPI server that connects the React frontend to the Python code.

- **Scenarios and personalities** are served from the `scenarios/` folder. That folder is the one source of truth, so the frontend doesn't need its own copies.
- **The config built on Start** is checked by `validate_config` before the negotiation can begin.

## Files

The folder structure, with a description of each file, is in `backend/README.md`. The main files are:

| File | Purpose |
|---|---|
| `backend/server.py` | Starts the server: `python -m backend.server` |
| `backend/main.py` | FastAPI app, CORS, routers |
| `backend/routers/` | The endpoints, one file per resource |
| `backend/config.py`, `backend/schemas.py` | Settings and request models |
| `backend/scenario_loader.py` | Loads scenarios and builds the final config |
| `backend/validation.py` | `validate_config(config)`, which runs the six checks before Start |
| `frontend/src/services/api.js` | All frontend calls to the API |
| `tests/test_api.py`, `tests/test_validation.py` | Tests |

## Run it

From the repository root, run the backend in one terminal:

```bash
pip install -r backend/requirements.txt
python -m backend.server
```

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs (try every endpoint in the browser)

Run the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:5173. The backend accepts requests (CORS) from `localhost` and `127.0.0.1` on any port, because Vite moves to 5174 or higher when 5173 is busy. Other websites are rejected.

Run the tests from the repository root:

```bash
python -m pytest -v
```

## Endpoints

| Method | URL | Returns |
|---|---|---|
| GET | `/api/health` | `{"status": "ok"}` |
| GET | `/api/scenarios` | All scenarios, for the scenario cards |
| GET | `/api/scenarios/{scenario_id}` | One scenario with its agents, for the role cards. **404** if the id is unknown |
| GET | `/api/personalities` | The three personalities from `scenarios/personalities.json` |
| POST | `/api/validate` | `{"valid": true/false, "errors": [...]}` for the config sent in the body |
| POST | `/api/config` | Builds the final config from a scenario id and personality choices, and validates it |
| POST | `/api/orchestrator/run` | Runs a complete negotiation using the LLM reasoning engine, with rule-based fallback, and returns status, round count, winner and full turn history |

### POST /api/validate

Send the config exactly as the Agent Configuration screen builds it on Start. Extra fields such as `objective` are fine.

```json
{
  "scenario_id": "vendor_pricing",
  "title": "Vendor Pricing Negotiation",
  "description": "...",
  "max_rounds": 10,
  "agents": [
    {"id": "buyer", "name": "Buyer", "role": "Procurement Manager", "role_description": "...",
     "goal": "...", "constraints": ["..."],
     "limits": [{"item": "price", "type": "max", "value": 40000, "unit": "INR"}],
     "personality": "Collaborative"},
    {"id": "vendor", "...": "..."}
  ]
}
```

Response (always status 200):

```json
{"valid": false, "errors": ["Agent 'vendor' has no goal."]}
```

### POST /api/config

Request:

```json
{"scenario_id": "vendor_pricing", "personalities": {"vendor": "Risk-Averse"}}
```

Agents not listed in `personalities` keep their `default_personality`.

Response:

```json
{
  "config": {"scenario_id": "vendor_pricing", "title": "...", "description": "...", "max_rounds": 10,
             "agents": [{"id": "buyer", "personality": "Collaborative", "...": "..."},
                        {"id": "vendor", "personality": "Risk-Averse", "...": "..."}]},
  "validation": {"valid": true, "errors": []}
}
```

Errors:

| Status | When |
|---|---|
| 404 | Unknown `scenario_id` |
| 422 | A personality choice for an agent id that isn't in the scenario |

### POST /api/orchestrator/run

Send the final config returned by `POST /api/config` as the request body. The route also accepts it wrapped as `{"config": {...}}`.

```json
{
  "scenario_id": "vendor_pricing",
  "title": "Vendor Pricing Negotiation",
  "description": "...",
  "max_rounds": 10,
  "agents": ["... validated agent objects ..."]
}
```

The response contains `status`, `round`, `winner`, `history`, and the complete final `state`. The route passes `make_agent_engine(max_rounds=...)` to the orchestrator's `run_loop()`. Without an API key (or with `LLM_ENABLED=false`), the engine uses its rule-based strategy and counteroffer evaluator. With a configured key and `LLM_ENABLED=true`, it attempts the configured OpenAI-compatible provider and falls back to the rule-based strategy if the call fails. The response shape is unchanged.

To configure a provider, copy the root `.env.example` to `.env` and set `LLM_API_KEY` locally. The root `.env` is ignored by Git; never commit or share it. `httpx`, already listed in `backend/requirements.txt`, is used for provider requests. A successful fallback run does not establish that an external LLM call succeeded.

| Status | When |
|---|---|
| 400 | The supplied negotiation config fails `validate_config` |
| 422 | The request body is missing or malformed JSON |
| 500 | An unexpected error occurs while running the orchestrator |

## Using it from the frontend

All API calls are in **`frontend/src/services/api.js`**. Components import a function from it instead of calling `fetch` themselves.

| Function | Calls |
|---|---|
| `checkHealth()` | `GET /api/health` |
| `getScenarios()` | `GET /api/scenarios` |
| `getScenario(id)` | `GET /api/scenarios/{id}` |
| `getPersonalities()` | `GET /api/personalities` |
| `validateConfig(config)` | `POST /api/validate` |
| `buildConfig(id, personalities)` | `POST /api/config` |

Each function returns the JSON response. If the backend isn't running or returns an error, it throws an `Error` with a readable message.

**Start button (connected).** `AgentConfigScreen.jsx` calls `validateConfig(config)` when "Launch Simulation" is clicked.

- If the config is valid, the app moves on to the simulation screen.
- If it isn't, the errors are listed above the button and the user stays on the screen.
- The button shows "Validating…" while the check runs.

**Backend address.** The default is `http://127.0.0.1:8000`. To change it, copy `frontend/.env.example` to `frontend/.env.local` (git ignores it) and edit `VITE_API_URL`.

**Optional next step: load scenarios from the backend.** This would replace the copies in `frontend/src/data/`:

```js
import { getScenarios } from '../services/api';
const scenarios = await getScenarios();
```

## Notes

- `scenario_loader.py` skips `personalities.json` when it reads the `scenarios/` folder. Before this fix, `load_scenario("vendor_pricing")` and `load_scenario("project_budget_allocation")` crashed, because the personalities file is a list and not a scenario.
- A limit box that is cleared or filled with something other than a number is sent as `null`. Validation reports "limit #n value must be a number".
- Limit values must be real numbers: `NaN` and `Infinity` are rejected.
- A broken file in `scenarios/` (invalid JSON, or no `id`) makes the scenario endpoints answer 500, with a message that names the file.
- Scenario files saved with a BOM (some Windows editors add one) load normally.
