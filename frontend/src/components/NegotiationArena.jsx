import { useEffect, useState } from 'react';
import {
  FileText,
  Code2,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Play,
  RotateCcw,
  ShoppingBag,
  Briefcase,
  Wallet,
  Users,
  Radio,
  Sparkles,
  Trophy,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';
import { getEngineStatus, runOrchestrator, stepOrchestrator } from '../services/api';

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

function AgentCard({ agent }) {
  const { isDark } = useTheme();
  const personality = agent.personality || agent.default_personality || 'Collaborative';
  const meta = PERSONALITY_META[personality] || PERSONALITY_META.Collaborative;

  return (
    <div
      className={`flex flex-col rounded-2xl border overflow-hidden shadow-xl transition-all ${
        isDark ? 'border-slate-800/80 bg-slate-900/60 backdrop-blur-xl' : 'border-slate-200/90 bg-white shadow-slate-200/50'
      }`}
    >
      {/* card header */}
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${
          isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <AgentAvatar role={agent.role || agent.id} size="sm" />
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{agent.name}</h3>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{agent.role}</span>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0', meta.badge)}>
          {personality}
        </span>
      </div>

      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* objective bubble */}
          <div
            className={`border rounded-xl p-3.5 ${
              isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">
              Configured Objective
            </span>
            <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              "{agent.goal || agent.objective}"
            </p>
          </div>

          {/* constraints & limits in compact chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* constraints */}
            {Array.isArray(agent.constraints) && agent.constraints.length > 0 && (
              <div
                className={`p-3 rounded-xl border ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">
                  Active Constraints
                </span>
                <ul className="space-y-1">
                  {agent.constraints.map((c, i) => (
                    <li key={i} className={`text-[11px] flex items-start gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <span className="text-amber-500">•</span>
                      <span className="leading-snug">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* limits */}
            {Array.isArray(agent.limits) && agent.limits.length > 0 && (
              <div
                className={`p-3 rounded-xl border ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1.5">
                  Reservation Bounds
                </span>
                <div className="space-y-1.5">
                  {agent.limits.map((l, idx) => {
                    const isMin = String(l.type).toLowerCase() === 'min';
                    return (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className={`capitalize ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isMin ? 'Floor' : 'Ceiling'}:
                        </span>
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {l.value} {l.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NegotiationArena({ config, onReset, currentUser }) {
  const { isDark } = useTheme();
  const [turns, setTurns] = useState([]);
  const [orchestratorStatus, setOrchestratorStatus] = useState('ongoing'); // 'ongoing' | 'accepted' | 'rejected' | 'deadlock'
  const [orchestratorWinner, setOrchestratorWinner] = useState(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isStepping, setIsStepping] = useState(false);
  // Which engine produced the turns: 'llm' | 'rule-based' | 'mixed' | 'mock' | 'offline'
  const [engineMode, setEngineMode] = useState(null);
  const [engineModel, setEngineModel] = useState(null);

  useEffect(() => {
    getEngineStatus()
      .then((status) => {
        setEngineMode(status.mode);
        setEngineModel(status.model);
      })
      .catch(() => setEngineMode('offline'));
  }, []);

  const withAgentInfo = (t, i) => {
    const agentObj = agents.find((a) => a.id === t.agent_id) || {};
    return { ...t, turn_number: i + 1, agent_name: agentObj.name || t.agent_id, role: agentObj.role || '' };
  };

  const scenarioMeta = SCENARIO_META[config?.id] || SCENARIO_META.vendor_pricing;
  const ScenarioIcon = scenarioMeta.icon;
  const maxRounds = Number(config?.max_rounds || 10);
  const agents = config?.agents || [];

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
  const generateLocalTurn = (currentTurnIndex) => {
    const activeAgent = agents[currentTurnIndex % agents.length];
    const currentRound = Math.floor(currentTurnIndex / agents.length) + 1;
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

    const isLastTurn = currentTurnIndex + 1 >= maxRounds * agents.length;
    let action = 'counter';
    if (currentRound >= 3 && Math.random() < 0.25) {
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
  };

  // Step 1 Turn at a time through the backend Orchestrator + LLM Reasoning Engine
  const handleSimulateNextTurn = async () => {
    if (orchestratorStatus !== 'ongoing' || isStepping) return;
    setIsStepping(true);
    try {
      const response = await stepOrchestrator(config, turns);
      if (response.turn) {
        setTurns([...turns, withAgentInfo(response.turn, turns.length)]);
      }
      setOrchestratorStatus(response.status || 'ongoing');
      setOrchestratorWinner(response.winner || null);
      if (response.engine) setEngineMode(response.engine);
      return;
    } catch {
      setEngineMode('offline');
    } finally {
      setIsStepping(false);
    }

    // Backend not reachable: local simulation
    const nextTurn = generateLocalTurn(turns.length);
    const updated = [...turns, nextTurn];
    setTurns(updated);

    if (nextTurn.action === 'accept') {
      setOrchestratorStatus('accepted');
      setOrchestratorWinner(nextTurn.agent_id);
    } else if (nextTurn.action === 'reject') {
      setOrchestratorStatus('rejected');
      setOrchestratorWinner(null);
    } else if (updated.length >= maxRounds * agents.length) {
      setOrchestratorStatus('deadlock');
      setOrchestratorWinner(null);
    }
  };

  // Run full Orchestrator loop via FastAPI backend or fast local runner
  const handleRunFullOrchestrator = async () => {
    setIsRunningAll(true);
    try {
      const response = await runOrchestrator(config);
      if (response && response.history) {
        setTurns(response.history.map(withAgentInfo));
        if (response.engine) setEngineMode(response.engine);
        setOrchestratorStatus(response.status || 'deadlock');
        setOrchestratorWinner(response.winner || null);
      }
    } catch {
      // Graceful client fallback: simulate full orchestrator loop
      setEngineMode('offline');
      let simulatedTurns = [];
      let status = 'ongoing';
      let winner = null;

      for (let i = 0; i < maxRounds * agents.length; i += 1) {
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

      if (status === 'ongoing') {
        status = 'deadlock';
      }

      setTurns(simulatedTurns);
      setOrchestratorStatus(status);
      setOrchestratorWinner(winner);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleResetArena = () => {
    setTurns([]);
    setOrchestratorStatus('ongoing');
    setOrchestratorWinner(null);
  };

  return (
    <div
      className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left transition-colors duration-200 ${
        isDark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      {/* ── Main Arena Header ── */}
      <header
        className={`border rounded-2xl p-6 sm:p-7 mb-8 shadow-xl transition-all backdrop-blur-xl ${
          isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-slate-200/50'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Step 3 of 3 · Simulation Arena
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Orchestrator Active
              </span>
              {engineMode && (
                <span
                  title={engineMode === 'offline' ? 'Backend not reachable: turns are simulated in the browser' : 'Reasoning engine used for the turns'}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold',
                    engineMode === 'llm'
                      ? 'bg-violet-500/10 text-violet-500 border-violet-500/30'
                      : engineMode === 'offline'
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-500 border-amber-500/30',
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {engineMode === 'llm'
                    ? `LLM Engine${engineModel ? ` · ${engineModel}` : ''}`
                    : engineMode === 'mixed'
                    ? 'LLM + Rule-based Fallback'
                    : engineMode === 'offline'
                    ? 'Offline Simulation'
                    : engineMode === 'mock'
                    ? 'Mock Engine'
                    : 'Rule-based Engine'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                <ScenarioIcon className="w-5 h-5" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {config.title}
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/25 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJSON}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
                isDark
                  ? 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Transcript JSON</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Scenario</span>
            </button>
          </div>
        </div>

        <p className={`text-xs sm:text-sm leading-relaxed mb-4 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {config.description}
        </p>

        {/* Minimal metadata chips */}
        <div className={`flex flex-wrap items-center gap-2 pt-3 border-t text-xs ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold">
            Max Rounds: {maxRounds}
          </span>
          <span className={`px-2.5 py-1 rounded-lg border font-semibold ${
            isDark ? 'border-slate-800 bg-slate-900/60 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
          }`}>
            {agents.length} Stakeholder Agents
          </span>
          {currentUser && (
            <span className={`px-2.5 py-1 rounded-lg border font-semibold ${
              isDark ? 'border-slate-800 bg-slate-900/60 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
            }`}>
              Operator: <strong className={isDark ? "text-slate-100" : "text-slate-900"}>{currentUser.name}</strong>
            </span>
          )}
        </div>
      </header>

      {/* ── Agents Face-off Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* ── Live Orchestrator Simulation Console ── */}
      <div className={`rounded-2xl border p-6 sm:p-7 mb-8 shadow-xl transition-all backdrop-blur-xl ${
        isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-slate-200/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Zap className="w-4 h-4 text-indigo-500" />
              <span>Orchestrator Execution Console</span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Executes turn sequence index 0 → 1 → 0 → 1, checks end conditions, and captures full structured Turns.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {turns.length > 0 && (
              <button
                type="button"
                onClick={handleResetArena}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-900'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              disabled={orchestratorStatus !== 'ongoing' || isStepping || isRunningAll}
              onClick={handleSimulateNextTurn}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStepping ? 'Thinking...' : 'Simulate Next Turn'}</span>
            </button>

            <button
              type="button"
              disabled={orchestratorStatus !== 'ongoing' || isRunningAll || isStepping}
              onClick={handleRunFullOrchestrator}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRunningAll ? 'Running Orchestrator...' : 'Run Full Loop'}</span>
            </button>
          </div>
        </div>

        {/* ── Terminal Outcome Banner if Finished ── */}
        {orchestratorStatus !== 'ongoing' && (
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

            <button
              type="button"
              onClick={handleDownloadJSON}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-current bg-current/10 hover:bg-current/20 transition-all cursor-pointer shrink-0"
            >
              Download Full Transcript
            </button>
          </div>
        )}

        {/* ── Turn by Turn List ── */}
        {turns.length === 0 ? (
          <div
            className={`text-center py-10 rounded-xl border ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <Users className="w-8 h-8 text-indigo-500/50 mx-auto mb-2" />
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Click <strong className="text-indigo-500 font-semibold">Simulate Next Turn</strong> or{' '}
              <strong className="text-emerald-500 font-semibold">Run Full Loop</strong> to execute the Orchestrator.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
            {turns.map((turn, tIdx) => {
              const action = String(turn.action || 'counter').toLowerCase();
              return (
                <div
                  key={tIdx}
                  className={`rounded-xl border p-4 transition-all ${
                    isDark ? 'border-slate-800/90 bg-slate-950/60' : 'border-slate-200 bg-slate-50/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/40 pb-2.5 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        Turn #{turn.turn_number || tIdx + 1}
                      </span>
                      <span className={`text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {turn.agent_name || turn.agent_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Action Pill */}
                      <span
                        className={cn(
                          'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border',
                          action === 'accept'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : action === 'reject'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        )}
                      >
                        {action}
                      </span>

                      {/* Stance Pill */}
                      {turn.stance && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/50">
                          {turn.stance}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Offer Terms */}
                  {turn.offer && Object.keys(turn.offer).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Proposed Offer:
                      </span>
                      {Object.entries(turn.offer).map(([key, val]) => (
                        <span
                          key={key}
                          className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        >
                          {key}: {val}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Reasoning */}
                  <p className={`text-xs leading-relaxed italic ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    "{turn.reasoning}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Downstream Orchestrator Integration Cards ── */}
      <div
        className={`rounded-2xl border p-6 sm:p-7 shadow-xl backdrop-blur-xl ${
          isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-slate-200/50'
        }`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-indigo-500" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Downstream Orchestrator Integration
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="font-mono text-indigo-500 font-bold block">01</span>
            <h4 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Config Export to Backend</h4>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              The active scenario JSON with all agents, bounds, and personalities is formatted and validated for the orchestrator.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="font-mono text-emerald-500 font-bold block">02</span>
            <h4 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Multi-Agent Loop</h4>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Agents submit turn-by-turn proposals constrained by strict min/max limits until mutual convergence or impasse.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border space-y-1.5 ${
              isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="font-mono text-sky-500 font-bold block">03</span>
            <h4 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Final Settlement Report</h4>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              The settlement terms and negotiation transcripts are verified against reservation boundaries and exportable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
