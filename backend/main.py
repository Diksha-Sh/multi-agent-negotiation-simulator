"""FastAPI application: entry point of the backend.

Start the server from the repository root with:
    python -m backend.server

Interactive docs: http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import API_TITLE, API_VERSION, FRONTEND_ORIGIN_REGEX
from backend.routers import configuration, health, orchestrator, personalities, scenarios
from backend.scenario_loader import ScenarioFileError

app = FastAPI(
    title=API_TITLE,
    description="Scenario selection and agent configuration (Task 1).",
    version=API_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=FRONTEND_ORIGIN_REGEX,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)



@app.exception_handler(ScenarioFileError)
def scenario_file_error(_request: Request, exc: ScenarioFileError) -> JSONResponse:
    """A broken file in scenarios/: answer with a clear message instead of a bare 500."""
    return JSONResponse(status_code=500, content={"detail": str(exc)})


app.include_router(health.router)
app.include_router(scenarios.router)
app.include_router(personalities.router)
app.include_router(configuration.router)
app.include_router(orchestrator.router)
