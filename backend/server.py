"""Start the backend server.

Run from the repository root:
    python -m backend.server

This is the same as:
    uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000

Address and auto-reload come from backend/config.py (HOST, PORT, RELOAD).
"""

import uvicorn

from backend.config import HOST, PORT, RELOAD


def run() -> None:
    print(f"Backend running at http://{HOST}:{PORT}  (API docs: http://{HOST}:{PORT}/docs)")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=RELOAD)


if __name__ == "__main__":
    run()
