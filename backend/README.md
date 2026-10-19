# Backend

This is the Python FastAPI backend for the Multi-Agent Negotiation Simulator. It serves the scenarios and personalities, and it validates the negotiation config before the user can press Start.

## Structure

```
backend/
├── README.md            this file
├── requirements.txt     Python packages
├── __init__.py
├── server.py            starts the server  →  python -m backend.server
├── main.py              creates the FastAPI app, CORS, includes the routers
├── config.py            settings: host/port, file locations, allowed frontend addresses
├── schemas.py           request bodies (Pydantic models)
├── routers/             API endpoints, one file per resource
│   ├── health.py            GET  /api/health
│   ├── scenarios.py         GET  /api/scenarios, /api/scenarios/{id}
│   ├── personalities.py     GET  /api/personalities
│   └── configuration.py     POST /api/validate, /api/config
├── scenario_loader.py   loads scenarios and builds the final config
└── validation.py        validate_config(config): the six checks before Start
```

Related folders at the repository root:

| Folder | Contents |
|---|---|
| `scenarios/` | Scenario templates and `personalities.json`, the single source of truth for the data |
| `tests/` | `test_api.py` and `test_validation.py` |
| `docs/backend_api.md` | Endpoint reference with request and response examples |

## Setup

Run this from the repository root:

```bash
pip install -r backend/requirements.txt
```

## Run

```bash
python -m backend.server
```

To change the address, set the environment variables `API_HOST`, `API_PORT` or `API_RELOAD`, or edit `config.py`.

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs

The frontend (`cd frontend && npm run dev`, on http://localhost:5173) calls this API through `frontend/src/services/api.js`. The API accepts requests from `localhost` and `127.0.0.1` on any port (`FRONTEND_ORIGIN_REGEX` in `config.py`).

## Test

```bash
python -m pytest -v
```

## Adding an endpoint

1. Create `routers/<name>.py` with `router = APIRouter(prefix="/api/...", tags=[...])`.
2. Put any request models in `schemas.py`.
3. Register the router in `main.py` with `app.include_router(<name>.router)`.
4. Add tests in `tests/`.
