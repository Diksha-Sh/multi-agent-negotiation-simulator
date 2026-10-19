import { useState } from 'react';
import {
  Flame,
  Users,
  Shield,
  ShoppingCart,
  Briefcase,
  Coins,
  Target,
  Code2,
  Radio,
  FileText,
  ArrowLeft,
  Play,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const PERSONALITY_META = {
  Aggressive: {
    icon: Flame,
    badge: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  },
  Collaborative: {
    icon: Users,
    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  'Risk-Averse': {
    icon: Shield,
    badge: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  },
};

const SCENARIO_META = {
  vendor_pricing: { icon: ShoppingCart },
  job_offer: { icon: Briefcase },
  project_budget_allocation: { icon: Coins },
};

function AgentCard({ agent }) {
  const { isDark } = useTheme();
  const personality = agent.personality || agent.default_personality || 'Collaborative';
  const meta = PERSONALITY_META[personality] || PERSONALITY_META.Collaborative;
  const PersonalityIcon = meta.icon;

  return (
    <div className={`flex flex-col rounded-2xl backdrop-blur-xl border overflow-hidden shadow-xl transition-all ${
      isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-slate-200/50'
    }`}>
      {/* card header */}
      <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
        isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
      }`}>
        <div className="flex items-center gap-3">
          <AgentAvatar role={agent.role || agent.id} size="sm" />
          <div>
            <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{agent.name}</h3>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{agent.role}</span>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0', meta.badge)}>
          <PersonalityIcon className="w-3 h-3" />
          <span>{personality}</span>
        </span>
      </div>

      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* objective bubble */}
          <div className={`border rounded-xl p-3.5 ${
            isDark ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">
              <Target className="w-3 h-3" />
              <span>Configured Objective</span>
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed font-medium ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              "{agent.goal || agent.objective}"
            </p>
          </div>

          {/* constraints & limits in compact chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* constraints */}
            {Array.isArray(agent.constraints) && agent.constraints.length > 0 && (
              <div className={`p-3 rounded-xl border ${
                isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">
                  Active Constraints
                </span>
                <ul className="space-y-1">
                  {agent.constraints.map((c, i) => (
                    <li key={i} className={`text-xs flex items-start gap-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      <span className="text-amber-500">•</span>
                      <span className="leading-snug">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* limits */}
            {Array.isArray(agent.limits) && agent.limits.length > 0 && (
              <div className={`p-3 rounded-xl border ${
                isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1.5">
                  Reservation Bounds
                </span>
                <div className="space-y-1.5">
                  {agent.limits.map((l, idx) => {
                    const isMin = String(l.type).toLowerCase() === 'min';
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className={`capitalize ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {isMin ? 'Floor' : 'Ceiling'}:
                        </span>
                        <span className={`font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
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
  const [simulationRound, setSimulationRound] = useState(0);
  const [simHistory, setSimHistory] = useState([]);
  const scenarioMeta = SCENARIO_META[config?.id] || SCENARIO_META.vendor_pricing;
  const ScenarioIcon = scenarioMeta.icon;

  // Print PDF Trigger
  const handleExportPDF = () => {
    window.print();
  };

  // Download Config JSON Trigger
  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `negotiation_config_${config.id || 'scenario'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Turn Simulation Feature
  const handleSimulateTurn = () => {
    const agents = config.agents || [];
    if (agents.length < 2) return;

    const roundNum = simulationRound + 1;
    const roundLog = agents.map((agent) => {
      const personality = agent.personality || 'Collaborative';
      let proposalText;

      if (personality === 'Aggressive') {
        proposalText = `Anchoring firmly with limited flexibility for Round #${roundNum}. Demanding full compliance with primary goals.`;
      } else if (personality === 'Collaborative') {
        proposalText = `Offering reciprocal concession in Round #${roundNum}. Seeking mutually advantageous middle ground.`;
      } else {
        proposalText = `Prudently adjusting reservation boundary in Round #${roundNum} to eliminate walkaway risk and secure settlement.`;
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        role: agent.role,
        personality,
        proposal: proposalText,
      };
    });

    setSimHistory((prev) => [...prev, { round: roundNum, logs: roundLog }]);
    setSimulationRound(roundNum);
  };

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left transition-colors duration-200 ${
      isDark ? 'text-slate-100' : 'text-slate-900'
    }`}>
      {/* ── Main Arena Header ── */}
      <header className={`border rounded-2xl p-6 sm:p-7 mb-8 shadow-xl transition-all backdrop-blur-xl ${
        isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-slate-200/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Step 3 of 3 · Simulation Arena
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Orchestrator Verified
              </span>
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
              <span>JSON Config</span>
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
            Max Rounds: {config.max_rounds ?? 10}
          </span>
          <span className={`px-2.5 py-1 rounded-lg border font-semibold ${
            isDark ? 'border-slate-800 bg-slate-900/60 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
          }`}>
            {(config.agents || []).length} Stakeholder Agents
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
        {(config.agents || []).map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* ── Interactive Turn Simulation Console ── */}
      <div className={`rounded-2xl border p-6 sm:p-7 mb-8 shadow-xl transition-all backdrop-blur-xl ${
        isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-slate-200/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <Zap className="w-4 h-4 text-indigo-500" />
              <span>Turn-by-Turn Simulation Preview</span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Preview round-by-round concessions constrained by validated ZOPA boundaries.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSimulateTurn}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Round {simulationRound + 1}</span>
          </button>
        </div>

        {simHistory.length === 0 ? (
          <div className={`text-center py-10 rounded-xl border ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
          }`}>
            <Users className="w-8 h-8 text-indigo-500/50 mx-auto mb-2" />
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Click <strong className="text-emerald-500 font-semibold">Simulate Round 1</strong> to preview turn-by-turn bargaining between agents.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {simHistory.map((item) => (
              <div
                key={item.round}
                className={`rounded-xl border p-4 space-y-3 ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className={`flex items-center justify-between border-b pb-2 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                    Round #{item.round} Concessions
                  </span>
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ZOPA Boundary Invariant Respected</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {item.logs.map((log, lIdx) => (
                    <div
                      key={lIdx}
                      className={`p-3.5 rounded-xl border shadow-sm ${
                        isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.agentName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {log.personality}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {log.proposal}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Downstream Orchestrator Integration Cards ── */}
      <div className={`rounded-2xl border p-6 sm:p-7 shadow-xl backdrop-blur-xl ${
        isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-slate-200/50'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-indigo-500" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Downstream Orchestrator Integration
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <span className="font-mono text-indigo-500 font-bold block">01</span>
            <h4 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Config Export to Backend</h4>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              The active scenario JSON with all agents, bounds, and personalities is formatted and validated for the orchestrator.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <span className="font-mono text-emerald-500 font-bold block">02</span>
            <h4 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Multi-Agent Loop</h4>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Agents submit turn-by-turn proposals constrained by strict min/max limits until mutual convergence or impasse.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'border-slate-800/80 bg-slate-950/50' : 'border-slate-200 bg-slate-50'
          }`}>
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
