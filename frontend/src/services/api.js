// All calls from the frontend to the backend API (backend/main.py).
// Change the address with VITE_API_URL in frontend/.env.local (see .env.example).

export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function request(path, { method = 'GET', body } = {}) {
  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error(
      `Cannot reach the backend at ${API_BASE}. Start it with: python -m backend.server`,
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data && data.detail ? data.detail : response.statusText;
    throw new Error(`Backend error ${response.status}: ${detail}`);
  }
  return data;
}

/** GET /api/health -> { status: "ok" } */
export function checkHealth() {
  return request('/api/health');
}

/** GET /api/scenarios -> all scenarios (for the scenario cards) */
export function getScenarios() {
  return request('/api/scenarios');
}

/** GET /api/scenarios/{id} -> one scenario with its agents */
export function getScenario(scenarioId) {
  return request(`/api/scenarios/${encodeURIComponent(scenarioId)}`);
}

/** GET /api/personalities -> the three personalities */
export function getPersonalities() {
  return request('/api/personalities');
}

/** POST /api/validate -> { valid, errors } for the config built on Start */
export function validateConfig(config) {
  return request('/api/validate', { method: 'POST', body: config });
}

/** POST /api/config -> { config, validation } built from a scenario and personality choices */
export function buildConfig(scenarioId, personalities = {}) {
  return request('/api/config', {
    method: 'POST',
    body: { scenario_id: scenarioId, personalities },
  });
}
