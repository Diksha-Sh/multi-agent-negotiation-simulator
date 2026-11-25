import { useCallback, useEffect, useRef, useState } from 'react';
import { saveSimulationRecord } from '../services/supabase';
import {
  FileText,
  Code2,
  ArrowLeft,
  Zap,
  Play,
  RotateCcw,
  ShoppingBag,
  Briefcase,
  Wallet,
  Sparkles,
  Trophy,
  AlertTriangle,
  XCircle,
  Database,
  Check,
  User,
  Award,
  BarChart3,
  Mic,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import NegotiationTranscript from './NegotiationTranscript';
import NegotiationMetricsPanel from './NegotiationMetricsPanel';
import DeadlockBanner from './DeadlockBanner';
import HumanInputPanel from './HumanInputPanel';
import PostInteractionSummaryModal from './PostInteractionSummaryModal';
import { useTheme } from '../context/ThemeContext';
import { getEngineStatus, runOrchestrator, stepOrchestrator, submitHumanTurn } from '../services/api';

// Offline fallback only: kept outside the component so renders stay pure.
const randomChance = () => Math.random();
const EMPTY_AGENTS = [];

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const PERSONALITY_META = {
  Aggressive: {
    badge: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  },
  Collaborative: {
    badge: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  },
  'Risk-Averse': {
    badge: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
  },
};

const SCENARIO_META = {
  vendor_pricing: { icon: ShoppingBag },
  job_offer: { icon: Briefcase },
  project_budget_allocation: { icon: Wallet },
};

function AgentCard({ agent, isHuman = false }) {
  const { isDark } = useTheme();
  const personality = agent.personality || agent.default_personality || 'Collaborative';
  const meta = PERSONALITY_META[personality] || PERSONALITY_META.Collaborative;

  return (
    <div
      className={`liquid-glass flex flex-col rounded-2xl border overflow-hidden shadow-lg transition-all ${
        isHuman
          ? 'border-[#EE2A54] ring-1 ring-[#EE2A54]/40 bg-[#131B4B]'
          : isDark
          ? 'border-white/15 bg-[#131B4B]/80'
          : 'border-[#0E153A]/15 bg-white'
      }`}
    >
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
          isHuman
            ? 'border-[#EE2A54]/30 bg-[#EE2A54]/10'
            : isDark
            ? 'border-white/10 bg-[#0A102E]/70'
            : 'border-[#0E153A]/10 bg-[#F4F7FC]'
        }`}
      >
        <div className="flex items-center gap-3">
          <AgentAvatar role={agent.role || agent.id} size="sm" />
          <div>
            <h3 className={`text-sm font-extrabold ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>{agent.name}</h3>
            <span className={`text-xs ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/70'}`}>{agent.role}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHuman && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EE2A54] text-white">
              You
            </span>
          )}
          <span className={cn('inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0', meta.badge)}>
            {personality}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {Array.isArray(agent.limits) && agent.limits.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {agent.limits.map((l, idx) => {
              const isMin = String(l.type).toLowerCase() === 'min';
              return (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 ${
                    isDark ? 'border-white/10 bg-[#0A102E]/80' : 'border-[#0E153A]/15 bg-[#F4F7FC]'
                  }`}
                >
                  <span className={isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]'}>
                    {isMin ? 'Min' : 'Max'} {(l.item || '').replace(/_/g, ' ')}:
                  </span>
                  <span className={`font-mono font-bold ${isDark ? 'text-[#1CD4A3]' : 'text-[#0E153A]'}`}>
                    {l.value} {l.unit}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {(agent.goal || agent.objective) && (
          <p className={`text-xs leading-relaxed ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/80'}`}>
            <strong className={isDark ? 'text-white' : 'text-[#0E153A]'}>Goal:</strong> {agent.goal || agent.objective}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NegotiationArena({ config, onReset, currentUser, onOpenDashboard, onTerminalOutcome, onSwitchToPractice }) {
  const { isDark } = useTheme();
  const [turns, setTurns] = useState([]);
  const isPracticeMode = (config?.mode || '').toLowerCase() === 'practice';
  const configuredHumanAgentId = config?.human_agent_id ?? config?.human_seat;
  const humanAgentId = isPracticeMode
    ? configuredHumanAgentId ?? config?.agents?.[0]?.id
    : null;

  const [orchestratorStatus, setOrchestratorStatus] = useState('ongoing');
  const [orchestratorWinner, setOrchestratorWinner] = useState(null);
  const [deadlockEvent, setDeadlockEvent] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isStepping, setIsStepping] = useState(false);
  const [isSubmittingHumanTurn, setIsSubmittingHumanTurn] = useState(false);
  const [arenaError, setArenaError] = useState('');
  const [practiceInitGeneration, setPracticeInitGeneration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(isPracticeMode);
  const sessionGenerationRef = useRef(0);
  const practiceInitRequestRef = useRef(null);
  const practiceInitContextRef = useRef(null);
  const terminalCallbackKeyRef = useRef('');
  // Which engine produced the turns: 'llm' | 'rule-based' | 'mixed' | 'mock' | 'offline'
  const [engineMode, setEngineMode] = useState(null);
  const [engineModel, setEngineModel] = useState(null);

  const [hasSaved, setHasSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Milestone 4: Modals for Post-Interaction Summary and Performance Analytics
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const scenarioMeta = SCENARIO_META[config?.id] || SCENARIO_META.vendor_pricing;
  const ScenarioIcon = scenarioMeta.icon;
  const maxRounds = Number(config?.max_rounds || 10);
  const agents = config?.agents || EMPTY_AGENTS;

  useEffect(() => {
    getEngineStatus()
      .then((status) => {
        setEngineMode(status.mode);
        setEngineModel(status.model);
      })
      .catch((err) => {
        if (err.isNetworkError) {
          setEngineMode('offline');
        } else {
          setArenaError(err.message);
        }
      });
  }, []);

  useEffect(() => {
    const terminalKey = JSON.stringify({
      status: orchestratorStatus,
      winner: orchestratorWinner,
      lastTurn: turns[turns.length - 1] || null,
      deadlockEvent,
    });
    if (terminalCallbackKeyRef.current === terminalKey) return;
    if (
      ['accepted', 'deadlock', 'rejected'].includes(orchestratorStatus) &&
      typeof onTerminalOutcome === 'function'
    ) {
      terminalCallbackKeyRef.current = terminalKey;
      onTerminalOutcome({
        status: orchestratorStatus,
        winner: orchestratorWinner,
        history: turns,
        deadlockEvent,
      });
    }
  }, [orchestratorStatus, orchestratorWinner, deadlockEvent, turns, onTerminalOutcome]);

  const withAgentInfo = useCallback((t, i) => {
    const agentObj = agents.find((a) => a.id === t.agent_id) || {};
    return { ...t, turn_number: i + 1, agent_name: agentObj.name || t.agent_id, role: agentObj.role || '' };
  }, [agents]);

  const saveCurrentSimulation = async (customStatus, customWinner, customTurns, customDeadlock) => {
    const requestGeneration = sessionGenerationRef.current;
    const finalTurns = customTurns || turns;
    const finalStatus = customStatus || orchestratorStatus;
    const finalWinner = customWinner !== undefined ? customWinner : orchestratorWinner;
    const finalDeadlock = customDeadlock !== undefined ? customDeadlock : deadlockEvent;

    if (hasSaved || isSaving || !finalTurns || finalTurns.length === 0) return;
    setIsSaving(true);
    try {
      await saveSimulationRecord({
        userId: currentUser?.id || null,
        scenarioId: config.scenario_id || config.id || 'custom',
        scenarioTitle: config.title || 'Negotiation Session',
        status: finalStatus,
        winner: finalWinner,
        totalRounds: Math.ceil(finalTurns.length / (agents.length || 2)),
        totalTurns: finalTurns.length,
        config,
        turns: finalTurns,
        deadlockEvent: finalDeadlock || null,
      });
      if (sessionGenerationRef.current === requestGeneration) {
        setHasSaved(true);
      }
    } catch (err) {
      console.warn('Simulation save warning:', err);
    } finally {
      if (sessionGenerationRef.current === requestGeneration) {
        setIsSaving(false);
      }
    }
  };

  // Submit human participant turn in Practice Mode
  const handleSubmitHumanTurn = async (turnPayload) => {
    if (isSubmittingHumanTurn) return;
    const requestGeneration = sessionGenerationRef.current;
    setIsSubmittingHumanTurn(true);
    setArenaError('');

    try {
      const response = await submitHumanTurn(config, turnPayload, turns, true);
      if (sessionGenerationRef.current !== requestGeneration) return;
      if (response && response.history) {
        const mapped = response.history.map(withAgentInfo);
        setTurns(mapped);
        if (response.engine) setEngineMode(response.engine);
        const st = response.status || 'waiting_for_human';
        const win = response.winner || null;
        const dl = response.deadlock_event || null;
        setArenaError('');
        setOrchestratorStatus(st);
        setOrchestratorWinner(win);
        setDeadlockEvent(dl);

        if (st === 'accepted' || st === 'rejected' || st === 'deadlock') {
          saveCurrentSimulation(st, win, mapped, dl);
        }
      }
    } catch (err) {
      if (sessionGenerationRef.current !== requestGeneration) return;
      if (!err.isNetworkError) {
        setArenaError(err.message || 'The backend could not process your turn.');
        return;
      }
      console.warn('Backend unavailable; using local simulation fallback:', err);
      setEngineMode('offline');

      // Local fallback: add human turn
      const currentHumanTurn = {
        ...turnPayload,
        round: Math.floor(turns.length / (agents.length || 2)) + 1,
        turn_number: turns.length + 1,
        agent_name: agents.find((a) => a.id === turnPayload.agent_id)?.name || turnPayload.agent_id,
        role: agents.find((a) => a.id === turnPayload.agent_id)?.role || '',
      };
      const afterHumanTurns = [...turns, currentHumanTurn];

      if (turnPayload.action === 'accept') {
        setTurns(afterHumanTurns);
        setOrchestratorStatus('accepted');
        setOrchestratorWinner(turnPayload.agent_id);
        setDeadlockEvent(null);
        saveCurrentSimulation('accepted', turnPayload.agent_id, afterHumanTurns, null);
      } else if (turnPayload.action === 'reject') {
        setTurns(afterHumanTurns);
        setOrchestratorStatus('rejected');
        setOrchestratorWinner(null);
        setDeadlockEvent(null);
        saveCurrentSimulation('rejected', null, afterHumanTurns, null);
      } else if (afterHumanTurns.length >= maxRounds * (agents.length || 2)) {
        setTurns(afterHumanTurns);
        setOrchestratorStatus('deadlock');
        setOrchestratorWinner(null);
        setDeadlockEvent({
          type: 'max_rounds',
          round_triggered: maxRounds,
          resolution_attempt: null,
          resolution_outcome: null,
        });
        saveCurrentSimulation('deadlock', null, afterHumanTurns, { type: 'max_rounds', round_triggered: maxRounds, resolution_attempt: null, resolution_outcome: 'breakdown' });
      } else {
        // AI opponent makes counter-turn
        const aiTurn = generateLocalTurn(afterHumanTurns.length);
        const fullTurns = [...afterHumanTurns, aiTurn];
        setTurns(fullTurns);

        if (aiTurn.action === 'accept') {
          setOrchestratorStatus('accepted');
          setOrchestratorWinner(aiTurn.agent_id);
          setDeadlockEvent(null);
          saveCurrentSimulation('accepted', aiTurn.agent_id, fullTurns, null);
        } else if (aiTurn.action === 'reject') {
          setOrchestratorStatus('rejected');
          setOrchestratorWinner(null);
          setDeadlockEvent(null);
          saveCurrentSimulation('rejected', null, fullTurns, null);
        } else if (fullTurns.length >= maxRounds * (agents.length || 2)) {
          setOrchestratorStatus('deadlock');
          setOrchestratorWinner(null);
          setDeadlockEvent({
            type: 'max_rounds',
            round_triggered: maxRounds,
            resolution_attempt: null,
            resolution_outcome: null,
          });
          saveCurrentSimulation('deadlock', null, fullTurns, { type: 'max_rounds', round_triggered: maxRounds, resolution_attempt: null, resolution_outcome: 'breakdown' });
        } else {
          setOrchestratorStatus('waiting_for_human');
        }
      }
    } finally {
      if (sessionGenerationRef.current === requestGeneration) {
        setIsSubmittingHumanTurn(false);
      }
    }
  };

  // Print PDF Trigger
  const handleExportPDF = () => {
    window.print();
  };

  // Download Config JSON Trigger
  const handleDownloadJSON = () => {
    const transcriptPayload = {
      ...config,
      orchestration_result: {
        status: orchestratorStatus,
        total_turns: turns.length,
        rounds: Math.ceil(turns.length / (agents.length || 2)),
        winner: orchestratorWinner,
        history: turns,
      },
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transcriptPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `negotiation_transcript_${config.id || 'scenario'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Generate a mock turn locally if offline or step-by-step
  const generateLocalTurn = useCallback((currentTurnIndex) => {
    const activeAgent = agents[currentTurnIndex % agents.length];
    const agentCount = agents.length || 2;
    const currentRound = Math.floor(currentTurnIndex / agentCount) + 1;
    const limits = activeAgent?.limits || [];

    const offer = {};
    for (const lim of limits) {
      const item = lim.item || 'price';
      const lType = String(lim.type || 'min').toLowerCase();
      const val = Number(lim.value || 0);

      if (lType === 'min') {
        const factor = 1.0 + (0.15 * Math.max(0, (maxRounds - currentRound) / maxRounds));
        offer[item] = Number.isInteger(val) ? Math.round(val * factor) : Number((val * factor).toFixed(2));
      } else {
        const factor = 1.0 - (0.15 * Math.max(0, (maxRounds - currentRound) / maxRounds));
        offer[item] = Number.isInteger(val) ? Math.round(val * factor) : Number((val * factor).toFixed(2));
      }
    }
    if (Object.keys(offer).length === 0) {
      offer.price = 37500;
    }

    const isLastTurn = currentTurnIndex + 1 >= maxRounds * agentCount;
    let action = 'counter';
    if (currentRound >= 3 && randomChance() < 0.25) {
      action = 'accept';
    } else if (isLastTurn) {
      action = 'counter'; // reaches max rounds -> deadlock
    }

    return {
      agent_id: activeAgent.id,
      agent_name: activeAgent.name,
      role: activeAgent.role,
      round: currentRound,
      turn_number: currentTurnIndex + 1,
      action,
      offer,
      reasoning: `${activeAgent.name} proposes terms balancing strategic leverage with agreement viability for Round #${currentRound}.`,
      stance: currentRound >= maxRounds - 2 ? 'urgent' : currentRound === 1 ? 'firm' : 'flexible',
    };
  }, [agents, maxRounds]);

  useEffect(() => {
    practiceInitContextRef.current = {
      config,
      agents,
      humanAgentId,
      maxRounds,
      withAgentInfo,
      generateLocalTurn,
    };
  }, [agents, config, generateLocalTurn, humanAgentId, maxRounds, withAgentInfo]);

  useEffect(() => {
    if (!isPracticeMode) return undefined;
    const generation = practiceInitGeneration;
    const context = practiceInitContextRef.current;
    let active = true;

    if (practiceInitRequestRef.current?.generation !== generation) {
      practiceInitRequestRef.current = {
        generation,
        promise: runOrchestrator(context.config),
      };
    }

    practiceInitRequestRef.current.promise
      .then((response) => {
        if (!active || sessionGenerationRef.current !== generation || !response) return;
        const mapped = (response.history || []).map(context.withAgentInfo);
        setTurns(mapped);
        setOrchestratorStatus(response.status || 'ongoing');
        setOrchestratorWinner(response.winner || null);
        setDeadlockEvent(response.deadlock_event || null);
        if (response.engine) setEngineMode(response.engine);
        setIsInitializing(false);
      })
      .catch((err) => {
        if (!active || sessionGenerationRef.current !== generation) return;
        if (!err.isNetworkError) {
          setArenaError(err.message || 'The backend could not initialize Practice Mode.');
          setIsInitializing(false);
          return;
        }

        setEngineMode('offline');
        const localTurns = [];
        let status = 'ongoing';
        let winner = null;
        for (let index = 0; index < context.maxRounds * (context.agents.length || 2); index += 1) {
          const agent = context.agents[index % (context.agents.length || 2)];
          if (agent?.id === context.humanAgentId) {
            status = 'waiting_for_human';
            break;
          }
          const turn = context.generateLocalTurn(index);
          localTurns.push(turn);
          if (turn.action === 'accept') {
            status = 'accepted';
            winner = turn.agent_id;
            break;
          }
          if (turn.action === 'reject') {
            status = 'rejected';
            break;
          }
        }
        if (status === 'ongoing') {
          status = 'deadlock';
          setDeadlockEvent({
            type: 'max_rounds',
            round_triggered: context.maxRounds,
            resolution_attempt: null,
            resolution_outcome: null,
          });
        }
        setTurns(localTurns);
        setOrchestratorStatus(status);
        setOrchestratorWinner(winner);
        setIsInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [isPracticeMode, practiceInitGeneration]);

  // Step 1 Turn at a time through the backend Orchestrator + LLM Reasoning Engine
  const handleSimulateNextTurn = async () => {
    if ((orchestratorStatus !== 'ongoing' && orchestratorStatus !== 'waiting_for_human') || isStepping) return;
    const requestGeneration = sessionGenerationRef.current;
    setIsStepping(true);
    setArenaError('');
    try {
      const response = await stepOrchestrator(config, turns);
      if (sessionGenerationRef.current !== requestGeneration) return;
      const updatedTurns = response.turn ? [...turns, withAgentInfo(response.turn, turns.length)] : turns;
      if (response.turn) {
        setTurns(updatedTurns);
      }
      const stepStatus = response.status || 'ongoing';
      setOrchestratorStatus(stepStatus);
      setOrchestratorWinner(response.winner || null);
      setDeadlockEvent(response.deadlock_event || null);
      if (response.engine) setEngineMode(response.engine);
      // A negotiation finished turn by turn is saved to History like a full run.
      if (stepStatus === 'accepted' || stepStatus === 'rejected' || stepStatus === 'deadlock') {
        saveCurrentSimulation(stepStatus, response.winner || null, updatedTurns, response.deadlock_event || null);
      }
      return;
    } catch (err) {
      if (sessionGenerationRef.current !== requestGeneration) return;
      if (!err.isNetworkError) {
        setArenaError(err.message || 'The backend could not advance the negotiation.');
        return;
      }
      setEngineMode('offline');
    } finally {
      if (sessionGenerationRef.current === requestGeneration) {
        setIsStepping(false);
      }
    }

    // Backend not reachable: local simulation
    const nextAgent = agents[turns.length % (agents.length || 2)];
    if (isPracticeMode && nextAgent?.id === humanAgentId) {
      setOrchestratorStatus('waiting_for_human');
      return;
    }
    const nextTurn = generateLocalTurn(turns.length);
    const updated = [...turns, nextTurn];
    setTurns(updated);

    if (nextTurn.action === 'accept') {
      setOrchestratorStatus('accepted');
      setOrchestratorWinner(nextTurn.agent_id);
      setDeadlockEvent(null);
      saveCurrentSimulation('accepted', nextTurn.agent_id, updated, null);
    } else if (nextTurn.action === 'reject') {
      setOrchestratorStatus('rejected');
      setOrchestratorWinner(null);
      setDeadlockEvent(null);
      saveCurrentSimulation('rejected', null, updated, null);
    } else if (updated.length >= maxRounds * (agents.length || 2)) {
      setOrchestratorStatus('deadlock');
      setOrchestratorWinner(null);
      setDeadlockEvent({
        type: 'max_rounds',
        round_triggered: maxRounds,
        resolution_attempt: null,
        resolution_outcome: null,
      });
      saveCurrentSimulation('deadlock', null, updated, { type: 'max_rounds', round_triggered: maxRounds, resolution_attempt: null, resolution_outcome: 'breakdown' });
    } else if (isPracticeMode) {
      const nextAgentIndex = updated.length % (agents.length || 2);
      if (agents[nextAgentIndex]?.id === humanAgentId) {
        setOrchestratorStatus('waiting_for_human');
      }
    }
  };

  // Run full Orchestrator loop via FastAPI backend or fast local runner
  const handleRunFullOrchestrator = async () => {
    const requestGeneration = sessionGenerationRef.current;
    setIsRunningAll(true);
    setArenaError('');
    try {
      const response = await runOrchestrator(config);
      if (sessionGenerationRef.current !== requestGeneration) return;
      if (response && response.history) {
        const mapped = response.history.map(withAgentInfo);
        setTurns(mapped);
        if (response.engine) setEngineMode(response.engine);
        const st = response.status || 'deadlock';
        const win = response.winner || null;
        const dl = response.deadlock_event || response.deadlock || (st === 'deadlock' ? { type: 'max_rounds', round_triggered: Math.ceil(mapped.length / (agents.length || 2)), resolution_attempt: null, resolution_outcome: null } : null);
        setOrchestratorStatus(st);
        setOrchestratorWinner(win);
        setDeadlockEvent(dl);
        setArenaError('');
        if (st === 'accepted' || st === 'rejected' || st === 'deadlock') {
          saveCurrentSimulation(st, win, mapped, dl);
        }
      }
    } catch (err) {
      if (sessionGenerationRef.current !== requestGeneration) return;
      if (!err.isNetworkError) {
        setArenaError(err.message || 'The backend could not run the negotiation.');
        return;
      }
      // Graceful client fallback: simulate orchestrator loop
      setEngineMode('offline');
      let simulatedTurns = [];
      let status = 'ongoing';
      let winner = null;

      for (let i = turns.length; i < maxRounds * (agents.length || 2); i += 1) {
        if (isPracticeMode) {
          const activeAgentIndex = i % (agents.length || 2);
          if (agents[activeAgentIndex]?.id === humanAgentId) {
            status = 'waiting_for_human';
            break;
          }
        }
        const turn = generateLocalTurn(i);
        simulatedTurns.push(turn);
        if (turn.action === 'accept') {
          status = 'accepted';
          winner = turn.agent_id;
          break;
        } else if (turn.action === 'reject') {
          status = 'rejected';
          break;
        }
      }

      let dl = null;
      if (status === 'ongoing') {
        status = 'deadlock';
        dl = {
          type: 'max_rounds',
          round_triggered: maxRounds,
          resolution_attempt: null,
          resolution_outcome: null,
        };
      }

      const fullHistory = [...turns, ...simulatedTurns];
      setTurns(fullHistory);
      setOrchestratorStatus(status);
      setOrchestratorWinner(winner);
      setDeadlockEvent(dl);
      if (status === 'accepted' || status === 'rejected' || status === 'deadlock') {
        saveCurrentSimulation(status, winner, fullHistory, dl);
      }
    } finally {
      if (sessionGenerationRef.current === requestGeneration) {
        setIsRunningAll(false);
      }
    }
  };

  const handleResetArena = () => {
    sessionGenerationRef.current += 1;
    terminalCallbackKeyRef.current = '';
    setTurns([]);
    setArenaError('');
    if (typeof onTerminalOutcome === 'function') onTerminalOutcome(null);
    if (isPracticeMode && humanAgentId === agents[0]?.id) {
      setOrchestratorStatus('waiting_for_human');
    } else {
      setOrchestratorStatus('ongoing');
    }
    setOrchestratorWinner(null);
    setDeadlockEvent(null);
    setHasSaved(false);
    setIsSaving(false);
    setIsRunningAll(false);
    setIsStepping(false);
    setIsSubmittingHumanTurn(false);
    setIsInitializing(isPracticeMode);
    if (isPracticeMode) {
      setPracticeInitGeneration((generation) => generation + 1);
    }
  };

  return (
    <>
      <div
        className={`screen-content w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left transition-colors duration-200 ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}
      >
      {/* ── Clean Arena Header ── */}
      <header
        className={`liquid-glass border rounded-2xl p-5 sm:p-6 mb-6 shadow-xl transition-all ${
          isDark ? 'border-white/15 bg-[#131B4B]/85' : 'border-[#0E153A]/15 bg-white shadow-sm'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EE2A54]/15 text-[#EE2A54] border border-[#EE2A54]/40">
                {isPracticeMode ? <Mic className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isPracticeMode ? 'Practice + Voice Mode' : 'AI vs AI Simulation'}</span>
              </span>
              {engineMode && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${
                    isDark ? 'bg-[#0A102E] text-[#1CD4A3] border-[#1CD4A3]/40' : 'bg-[#F4F7FC] text-[#0E153A] border-[#0E153A]/15'
                  }`}
                >
                  {engineMode === 'llm'
                    ? `LLM Engine${engineModel ? ` · ${engineModel}` : ''}`
                    : engineMode === 'offline'
                    ? 'Offline Fallback'
                    : 'Rule-Based Engine'}
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full border text-xs font-bold ${
                  isDark ? 'border-white/15 bg-[#0A102E] text-[#A3B3D9]' : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A]'
                }`}
              >
                Max {maxRounds} Rounds
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EE2A54]/15 border border-[#EE2A54]/40 text-[#EE2A54] flex items-center justify-center shrink-0">
                <ScenarioIcon className="w-5 h-5" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                {config.title}
              </h1>
            </div>
          </div>

          {/* Clean Single-Line Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onOpenDashboard?.()}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? 'border-white/15 bg-[#0A102E] text-white hover:border-[#1CD4A3]'
                  : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A] hover:border-[#EE2A54]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#1CD4A3]" />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1D2B78] hover:bg-[#EE2A54] text-white transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={saveCurrentSimulation}
              disabled={hasSaved || isSaving || turns.length === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                hasSaved
                  ? 'bg-[#1CD4A3]/15 text-[#1CD4A3] border-[#1CD4A3]/40'
                  : isDark
                  ? 'border-white/15 bg-[#0A102E] text-white hover:border-[#EE2A54]'
                  : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A]'
              }`}
            >
              {hasSaved ? <Check className="w-3.5 h-3.5 text-[#1CD4A3]" /> : <Database className="w-3.5 h-3.5 text-[#EE2A54]" />}
              <span>{hasSaved ? 'Saved' : isSaving ? 'Saving...' : 'Save Run'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJSON}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? 'border-white/15 bg-[#0A102E] text-white hover:border-[#EE2A54]'
                  : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#1CD4A3]" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isDark
                  ? 'border-white/15 bg-[#0A102E]/70 text-[#A3B3D9] hover:text-white'
                  : 'border-[#0E153A]/15 bg-white text-[#0E153A]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Arena</span>
            </button>
          </div>
        </div>
      </header>

      {arenaError && !(isPracticeMode && orchestratorStatus === 'waiting_for_human') && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm" role="alert">
          {arenaError}
        </div>
      )}

      {/* ── Agents Face-off Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isHuman={isPracticeMode && agent.id === humanAgentId}
          />
        ))}
      </div>

      {/* ── Step 2: Live Metrics & ZOPA Telemetry Panel ── */}
      <NegotiationMetricsPanel
        turns={turns}
        agents={agents}
        maxRounds={maxRounds}
      />

      {/* ── Step 3: Dedicated Deadlock Event Banner ── */}
      <DeadlockBanner
        deadlockEvent={deadlockEvent}
        status={orchestratorStatus}
        currentRound={Math.ceil(turns.length / (agents.length || 2))}
      />

      {/* ── Practice Mode: Interactive Human Input Console ── */}
      {isPracticeMode && orchestratorStatus === 'waiting_for_human' && (
        <div className="mb-8">
          <HumanInputPanel
            key={`${humanAgentId}-${practiceInitGeneration}-${turns.length}`}
            config={config}
            humanAgentId={humanAgentId}
            currentRound={Math.floor(turns.length / (agents.length || 2)) + 1}
            latestTurn={turns.length > 0 ? turns[turns.length - 1] : null}
            onSubmitTurn={handleSubmitHumanTurn}
            isSubmitting={isSubmittingHumanTurn}
            isInitializing={isInitializing}
            submissionError={arenaError}
          />
        </div>
      )}

      {/* ── Live Orchestrator Simulation Console ── */}
      <div className={`liquid-glass rounded-2xl border p-6 mb-8 shadow-xl transition-all ${
        isDark ? 'border-white/15 bg-[#131B4B]/85' : 'border-[#0E153A]/15 bg-white shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className={`flex items-center gap-2 text-lg font-extrabold ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
              <Zap className="w-5 h-5 text-[#EE2A54]" />
              <span>{isPracticeMode ? 'Practice & Voice Arena' : 'Simulation Console'}</span>
            </div>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
              {isPracticeMode
                ? `Playing as ${agents.find((a) => a.id === humanAgentId)?.name || humanAgentId}. Use your Voice Mic or type an offer above.`
                : 'Step through turn-by-turn or run the full autonomous negotiation loop.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!isPracticeMode && typeof onSwitchToPractice === 'function' && (
              <button
                type="button"
                onClick={onSwitchToPractice}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#1CD4A3]/15 hover:bg-[#1CD4A3] text-[#1CD4A3] hover:text-[#0A102E] border border-[#1CD4A3]/50 transition-all cursor-pointer shrink-0"
                title="Switch to Human vs AI Mode with Voice Mic"
              >
                <Mic className="w-4 h-4" />
                <span>Play with Voice Mic</span>
              </button>
            )}

            {(turns.length > 0 || isPracticeMode) && (
              <button
                type="button"
                onClick={handleResetArena}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isDark ? 'border-white/15 bg-[#0A102E] text-[#A3B3D9] hover:text-white' : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              disabled={(orchestratorStatus !== 'ongoing' && orchestratorStatus !== 'waiting_for_human') || isStepping || isRunningAll || isInitializing}
              onClick={handleSimulateNextTurn}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#1D2B78] hover:bg-[#273999] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition-all cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {isStepping
                  ? 'Thinking...'
                  : isPracticeMode
                  ? 'Advance / AI Move'
                  : 'Next Turn'}
              </span>
            </button>

            <button
              type="button"
              disabled={(orchestratorStatus !== 'ongoing' && orchestratorStatus !== 'waiting_for_human') || isRunningAll || isStepping || isInitializing}
              onClick={handleRunFullOrchestrator}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-[#EE2A54] hover:bg-[#d62249] disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-[0_4px_16px_rgba(238,42,84,0.45)] transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isRunningAll
                  ? 'Running...'
                  : isPracticeMode
                  ? 'Run Until Your Turn'
                  : 'Run Full Loop'}
              </span>
            </button>
          </div>
        </div>

        {/* ── Waiting for Human Notice inside Console ── */}
        {isPracticeMode && orchestratorStatus === 'waiting_for_human' && (
          <div className="p-3.5 mb-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Your move is required! Formulate your offer in the <strong>Interactive Human Input Console</strong> above.</span>
            </div>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Active Turn
            </span>
          </div>
        )}

        {/* ── Terminal Outcome Banner if Finished ── */}
        {(orchestratorStatus === 'accepted' || orchestratorStatus === 'deadlock' || orchestratorStatus === 'rejected') && (
          <div
            className={`p-4 mb-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in ${
              orchestratorStatus === 'accepted'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : orchestratorStatus === 'deadlock'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center gap-3">
              {orchestratorStatus === 'accepted' ? (
                <Trophy className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : orchestratorStatus === 'deadlock' ? (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              )}
              <div>
                <span className="font-extrabold text-sm uppercase tracking-wider block">
                  Negotiation Outcome: {orchestratorStatus}
                </span>
                <span className="text-xs opacity-90">
                  {orchestratorStatus === 'accepted'
                    ? `Consensus reached! Accepted by agent '${orchestratorWinner}' after ${turns.length} turns.`
                    : orchestratorStatus === 'deadlock'
                    ? `Max round limit (${maxRounds}) reached without agreement. Neutral deadlock declared.`
                    : 'An agent rejected the negotiation boundary. Session terminated without accord.'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowSummaryModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#EE2A54] hover:bg-[#d62249] text-white transition-all shadow-[0_4px_16px_rgba(238,42,84,0.45)] cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>View Outcome &amp; Score</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadJSON}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold border border-current bg-current/10 hover:bg-current/20 transition-all cursor-pointer shrink-0"
              >
                Download Transcript
              </button>
            </div>
          </div>
        )}

        {/* ── Negotiation Dialogue Transcript ── */}
        <div className="pt-2">
          <NegotiationTranscript turns={turns} agents={agents} />
        </div>
      </div>
      </div>
      <section id="print-area">
        <header className="print-header">
          <h1>{config.title || 'Negotiation Report'}</h1>
          <p>{config.description}</p>
        </header>

        <div className="print-meta-grid">
          <div className="print-meta-item">
            <span>Outcome</span>
            <strong>{orchestratorStatus}</strong>
          </div>
          <div className="print-meta-item">
            <span>Turns</span>
            <strong>{turns.length}</strong>
          </div>
          <div className="print-meta-item">
            <span>Maximum rounds</span>
            <strong>{maxRounds}</strong>
          </div>
          <div className="print-meta-item">
            <span>Outcome agent</span>
            <strong>{agents.find((agent) => agent.id === orchestratorWinner)?.name || 'Not applicable'}</strong>
          </div>
        </div>

        <h2 className="print-section-title">Agents and constraints</h2>
        <div className="print-agents-grid">
          {agents.map((agent) => (
            <article className="print-agent-card" key={agent.id}>
              <h2>{agent.name}</h2>
              <span className="print-agent-role">{agent.role}</span>
              <div className="print-section-title">Objective</div>
              <div className="print-box">{agent.goal}</div>
              <div className="print-section-title">Limits</div>
              <table className="print-limits-table">
                <tbody>
                  {(agent.limits || []).map((limit) => (
                    <tr key={`${agent.id}-${limit.item}`}>
                      <td>{limit.item}</td>
                      <td>{limit.type} {limit.value} {limit.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>

        <h2 className="print-section-title">Negotiation transcript</h2>
        {turns.length === 0 ? (
          <p>No turns have been recorded.</p>
        ) : (
          turns.map((turn, index) => (
            <article className="print-box" key={`${turn.agent_id}-${index}`}>
              <strong>Turn {turn.turn_number || index + 1}: {turn.agent_name || turn.agent_id}</strong>
              <div>Action: {turn.action} · Stance: {turn.stance || 'not specified'}</div>
              <div>
                Offer: {Object.entries(turn.offer || {}).map(([key, value]) => `${key}: ${value}`).join(', ') || 'None'}
              </div>
              <div>{turn.reasoning}</div>
            </article>
          ))
        )}
        <footer className="print-footer">
          <span>Generated by NegotiationAI</span>
          <span>{config.title || 'Negotiation report'}</span>
        </footer>
      </section>

      {/* ── Milestone 4: Post-Interaction Summary Dossier Modal ── */}
      <PostInteractionSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        config={config}
        history={turns}
        status={orchestratorStatus}
        winner={orchestratorWinner}
        deadlockEvent={deadlockEvent}
      />

      {/* ── Milestone 4: Multi-Session Performance Analytics Modal ── */}
    </>
  );
}
