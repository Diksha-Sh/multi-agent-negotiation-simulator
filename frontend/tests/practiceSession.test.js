import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  createResetSessionState,
  initializePracticeSession,
  runPracticeUntilHuman,
} from '../src/services/practiceSession.js';

const practiceScenarios = [
  { file: '../src/data/vendor_pricing.json', humanAgentId: 'buyer' },
  { file: '../src/data/job_offer.json', humanAgentId: 'candidate' },
  { file: '../src/data/project_budget_allocation.json', humanAgentId: 'project_manager' },
].map(({ file, humanAgentId }) => ({
  config: {
    ...JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')),
    mode: 'practice',
    human_agent_id: humanAgentId,
    human_seat: humanAgentId,
  },
  humanAgentId,
}));

test('starts directly at the human turn when the human agent is first', async () => {
  const config = {
    agents: [{ id: 'candidate' }, { id: 'employer' }],
  };
  let runCount = 0;

  const response = await initializePracticeSession(config, 'candidate', async () => {
    runCount += 1;
    return { status: 'accepted', history: [{ agent_id: 'candidate' }] };
  });

  assert.equal(runCount, 0);
  assert.deepEqual(response, { status: 'waiting_for_human', history: [] });
});

test('preserves automatic initialization when the human agent is second', async () => {
  const config = {
    agents: [{ id: 'candidate' }, { id: 'employer' }],
  };
  const response = { status: 'waiting_for_human', history: [{ agent_id: 'candidate' }] };
  let runCount = 0;

  const result = await initializePracticeSession(config, 'employer', async (receivedConfig) => {
    runCount += 1;
    assert.equal(receivedConfig, config);
    return response;
  });

  assert.equal(runCount, 1);
  assert.equal(result, response);
});

test('preserves the transcript when Practice Mode is already waiting for the human', async () => {
  const config = { max_rounds: 5, agents: [{ id: 'buyer' }, { id: 'seller' }] };
  const history = [
    { agent_id: 'buyer', action: 'counter', offer: { price: 80 } },
    { agent_id: 'seller', action: 'counter', offer: { price: 85 } },
  ];
  let receivedHistory;

  const response = await runPracticeUntilHuman(config, history, async (receivedConfig, turns) => {
    assert.equal(receivedConfig, config);
    receivedHistory = turns;
    return { status: 'waiting_for_human', history: turns };
  });

  assert.deepEqual(receivedHistory, history);
  assert.deepEqual(response.history, history);
  assert.equal(response.status, 'waiting_for_human');
});

test('does not request an AI move when the next Practice Mode turn is human', async () => {
  const config = {
    mode: 'practice',
    human_agent_id: 'candidate',
    agents: [{ id: 'candidate' }, { id: 'employer' }],
  };
  let calls = 0;

  const response = await runPracticeUntilHuman(config, [], async () => {
    calls += 1;
    throw new Error('The AI must not run before the first human offer.');
  });

  assert.equal(calls, 0);
  assert.deepEqual(response, { status: 'waiting_for_human', history: [] });
});

test('continues from existing history until Practice Mode returns to the human', async () => {
  const config = {
    mode: 'practice',
    human_agent_id: 'buyer',
    max_rounds: 5,
    agents: [{ id: 'buyer' }, { id: 'seller' }],
  };
  const initialHistory = [
    { agent_id: 'buyer', action: 'counter', offer: { price: 80 } },
  ];
  const aiTurn = { agent_id: 'seller', action: 'counter', offer: { price: 85 } };
  let calls = 0;

  const response = await runPracticeUntilHuman(config, initialHistory, async (_config, history) => {
    calls += 1;
    assert.deepEqual(history, initialHistory);
    return {
      status: 'waiting_for_human',
      turn: aiTurn,
      history: [...history, aiTurn],
    };
  });

  assert.equal(calls, 1);
  assert.deepEqual(response.history, [...initialHistory, aiTurn]);
  assert.equal(response.status, 'waiting_for_human');
});

for (const { config, humanAgentId } of practiceScenarios) {
  test(`${config.id} starts with an empty human-first Practice Mode session`, async () => {
    assert.equal(config.agents[0].id, humanAgentId);
    let aiRuns = 0;
    const runOrchestrator = async () => {
      aiRuns += 1;
      return { status: 'accepted', history: [{ agent_id: config.agents[0].id }] };
    };

    const response = await initializePracticeSession(config, humanAgentId, runOrchestrator);

    assert.equal(aiRuns, 0);
    assert.deepEqual(response, { status: 'waiting_for_human', history: [] });
  });

  test(`${config.id} does not request an AI step before the human offer`, async () => {
    let aiSteps = 0;
    const response = await runPracticeUntilHuman(config, [], async () => {
      aiSteps += 1;
      throw new Error('The AI must not run while the human is next.');
    });

    assert.equal(aiSteps, 0);
    assert.deepEqual(response, { status: 'waiting_for_human', history: [] });
  });

  test(`${config.id} reset clears the outcome and restores the first human turn`, () => {
    assert.deepEqual(createResetSessionState(config, humanAgentId), {
      turns: [],
      status: 'waiting_for_human',
      winner: null,
      deadlockEvent: null,
    });
  });
}
