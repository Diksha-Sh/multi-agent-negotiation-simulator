export function createResetSessionState(config, humanAgentId) {
  const agents = config?.agents || [];
  const resolvedHumanAgentId = humanAgentId
    ?? config?.human_agent_id
    ?? config?.human_seat
    ?? agents[0]?.id;
  const isHumanFirstPractice = (
    String(config?.mode || '').toLowerCase() === 'practice'
    && agents[0]?.id === resolvedHumanAgentId
  );

  return {
    turns: [],
    status: isHumanFirstPractice ? 'waiting_for_human' : 'ongoing',
    winner: null,
    deadlockEvent: null,
  };
}

export async function initializePracticeSession(config, humanAgentId, runOrchestrator) {
  if (config?.agents?.[0]?.id === humanAgentId) {
    return { status: 'waiting_for_human', history: [] };
  }

  return runOrchestrator(config);
}

export async function runPracticeUntilHuman(config, history, stepOrchestrator) {
  const agents = config?.agents || [];
  const agentCount = Math.max(1, agents.length || 2);
  const humanAgentId = config?.human_agent_id
    ?? config?.human_seat
    ?? agents[0]?.id;
  const maxTurns = (Number(config?.max_rounds) || 10) * agentCount;
  let currentHistory = Array.isArray(history) ? history : [];
  let response;

  do {
    const nextAgent = agents[currentHistory.length % agentCount];
    if (
      String(config?.mode || '').toLowerCase() === 'practice'
      && nextAgent?.id === humanAgentId
    ) {
      return {
        ...(response || {}),
        status: 'waiting_for_human',
        history: currentHistory,
      };
    }

    response = await stepOrchestrator(config, currentHistory);
    if (Array.isArray(response?.history)) {
      currentHistory = response.history;
    } else if (response?.turn) {
      currentHistory = [...currentHistory, response.turn];
    }

    if (response?.status !== 'ongoing' || !response?.turn) break;
  } while (currentHistory.length < maxTurns);

  return { ...response, history: currentHistory };
}
