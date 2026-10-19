import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Sliders,
  Shuffle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Target,
  TrendingUp,
  TrendingDown,
  Code2,
  Play,
  Zap,
  Flame,
  Users,
  Shield,
  X,
  Scale,
} from 'lucide-react';
import vendorPricing from '../data/vendor_pricing.json';
import { AgentAvatar } from './AgentAvatars';
import { PersonalityRadar } from './PersonalityRadar';
import { predictConflict } from './ConflictPredictor';
import { PayloadInspectorModal } from './PayloadInspectorModal';
import { validateConfig } from '../services/api';
import { useTheme } from '../context/ThemeContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/* ────────────────────────── Rich Personality Archetypes with Traits ────────────────────────── */
const PERSONALITIES = [
  {
    id: 'Aggressive',
    name: 'Aggressive',
    icon: Flame,
    badge: 'High Anchor · Hardline',
    anchorStat: '95%',
    flexStat: '15%',
    riskStat: 'High',
    activeStyles: 'border-rose-500/80 ring-1 ring-rose-500/50 bg-rose-500/10 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.12)]',
    desc: 'Commands high initial anchor, concedes slowly, leverages walkaway pressure.',
  },
  {
    id: 'Collaborative',
    name: 'Collaborative',
    icon: Users,
    badge: 'Mutual Gain · Win-Win',
    anchorStat: '60%',
    flexStat: '80%',
    riskStat: 'Low',
    activeStyles: 'border-indigo-500/80 ring-1 ring-indigo-500/50 bg-indigo-500/10 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.12)]',
    desc: 'Offers reciprocal concessions, explores trade-offs, drives mutual value expansion.',
  },
  {
    id: 'Risk-Averse',
    name: 'Risk-Averse',
    icon: Shield,
    badge: 'Walkaway Guard · Closes Early',
    anchorStat: '40%',
    flexStat: '90%',
    riskStat: 'Zero',
    activeStyles: 'border-sky-500/80 ring-1 ring-sky-500/50 bg-sky-500/10 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.12)]',
    desc: 'Guards strictly against impasse, concedes steadily to guarantee settlement.',
  },
];

/* ────────────────────────── Mathematical ZOPA Calculator ────────────────────────── */
function computeAgreementZone(scenario, agentConfigs) {
  const agents = scenario?.agents || [];
  const bounds = {};
  const errors = [];

  for (const agent of agents) {
    const cfg = agentConfigs[agent.id] || {};
    const goal = (cfg.objective !== undefined ? cfg.objective : agent.goal || '').trim();
    if (!goal) {
      errors.push(`${agent.name} requires a defined objective.`);
    }

    const limits = cfg.limits || agent.limits || [];
    for (const l of limits) {
      const val = Number(l.value);
      if (Number.isNaN(val) || l.value === '' || l.value === null) {
        errors.push(`Invalid limit value for ${agent.name}.`);
      } else {
        const itemKey = String(l.item || 'price').trim();
        const type = String(l.type || 'min').toLowerCase();
        if (!bounds[itemKey]) {
          bounds[itemKey] = { min: null, max: null, minAgent: '', maxAgent: '', unit: l.unit || '' };
        }
        if (type === 'min') {
          bounds[itemKey].min = val;
          bounds[itemKey].minAgent = agent.name;
        } else {
          bounds[itemKey].max = val;
          bounds[itemKey].maxAgent = agent.name;
        }
      }
    }
  }

  const overlaps = [];
  for (const [item, b] of Object.entries(bounds)) {
    if (b.min !== null && b.max !== null) {
      const isFeasible = b.max >= b.min;
      const spread = b.max - b.min;
      overlaps.push({
        item: item.replace(/_/g, ' '),
        min: b.min,
        max: b.max,
        minAgent: b.minAgent,
        maxAgent: b.maxAgent,
        unit: b.unit,
        isFeasible,
        spread,
      });

      if (!isFeasible) {
        errors.push(
          `Impasse on ${item.replace(/_/g, ' ')}: ${b.maxAgent} ceiling (${b.max} ${b.unit}) is below ${b.minAgent} floor (${b.min} ${b.unit}).`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors, overlaps };
}

export default function AgentConfigScreen({
  selectedScenario = vendorPricing,
  onBack,
  onStartNegotiation,
}) {
  const { isDark } = useTheme();
  const scenario = selectedScenario || vendorPricing;
  const agents = useMemo(() => scenario?.agents || [], [scenario]);

  const [maxRounds, setMaxRounds] = useState(() => scenario?.max_rounds ?? 10);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [chaosToast, setChaosToast] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [backendErrors, setBackendErrors] = useState([]);

  // Initialize agent state
  const [agentConfigs, setAgentConfigs] = useState(() => {
    const initial = {};
    for (const agent of agents) {
      initial[agent.id] = {
        objective: agent.goal || agent.objective || '',
        constraints: Array.isArray(agent.constraints) ? [...agent.constraints] : [],
        limits: Array.isArray(agent.limits) ? agent.limits.map((l) => ({ ...l })) : [],
        personality: agent.default_personality || 'Collaborative',
      };
    }
    return initial;
  });

  // Re-sync if scenario changes via standard React state-from-props pattern
  const [prevScenarioId, setPrevScenarioId] = useState(scenario?.id);
  if (scenario?.id !== prevScenarioId) {
    setPrevScenarioId(scenario?.id);
    setMaxRounds(scenario?.max_rounds ?? 10);
    setBackendErrors([]);
    const initial = {};
    for (const agent of scenario?.agents || []) {
      initial[agent.id] = {
        objective: agent.goal || agent.objective || '',
        constraints: Array.isArray(agent.constraints) ? [...agent.constraints] : [],
        limits: Array.isArray(agent.limits) ? agent.limits.map((l) => ({ ...l })) : [],
        personality: agent.default_personality || 'Collaborative',
      };
    }
    setAgentConfigs(initial);
  }

  const handleUpdate = (agentId, field, value) => {
    setAgentConfigs((prev) => ({
      ...prev,
      [agentId]: {
        ...prev[agentId],
        [field]: value,
      },
    }));
  };

  const handleLimitChange = (agentId, limitIndex, newValue) => {
    setAgentConfigs((prev) => {
      const currentLimits = prev[agentId]?.limits || [];
      const updated = currentLimits.map((lim, idx) => {
        if (idx === limitIndex) {
          return { ...lim, value: newValue };
        }
        return lim;
      });
      return {
        ...prev,
        [agentId]: {
          ...prev[agentId],
          limits: updated,
        },
      };
    });
  };

  // Chaos Mode (Randomizer)
  const handleChaosMode = () => {
    const personalityOptions = ['Aggressive', 'Collaborative', 'Risk-Averse'];
    const updated = {};
    for (const agent of agents) {
      const randomPersonality = personalityOptions[Math.floor(Math.random() * personalityOptions.length)];
      updated[agent.id] = {
        ...agentConfigs[agent.id],
        personality: randomPersonality,
      };
    }
    setAgentConfigs(updated);
    setChaosToast('Chaos Mode Triggered: Personalities randomized for stress testing');
    setTimeout(() => setChaosToast(null), 3500);
  };

  // Compute live ZOPA
  const agreement = useMemo(
    () => computeAgreementZone(scenario, agentConfigs),
    [scenario, agentConfigs]
  );

  // Downstream payload builder
  const formattedPayload = useMemo(() => {
    return {
      scenario_id: scenario.id || scenario.scenario_id,
      id: scenario.id || scenario.scenario_id,
      title: scenario.title,
      description: scenario.description,
      max_rounds: Number(maxRounds) || 10,
      validation_status: agreement.valid ? 'VALID' : 'INVALID',
      agents: agents.map((agent) => {
        const cfg = agentConfigs[agent.id] || {};
        return {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          role_description: agent.role_description || '',
          goal: cfg.objective || agent.goal || '',
          objective: cfg.objective || agent.goal || '',
          constraints: cfg.constraints || agent.constraints || [],
          limits: (cfg.limits || agent.limits || []).map((l) => ({
            item: l.item,
            type: l.type,
            value:
              l.value === '' || l.value === null || Number.isNaN(Number(l.value))
                ? null
                : Number(l.value),
            unit: l.unit || '',
          })),
          personality: cfg.personality || agent.default_personality || 'Collaborative',
        };
      }),
    };
  }, [scenario, maxRounds, agreement, agents, agentConfigs]);

  const p1 = agentConfigs[agents[0]?.id]?.personality || 'Collaborative';
  const p2 = agentConfigs[agents[1]?.id]?.personality || 'Collaborative';
  const conflict = predictConflict(p1, p2);

  // Handle Launch Negotiation with Backend validation
  const handleLaunchNegotiation = async () => {
    setIsValidating(true);
    setBackendErrors([]);
    try {
      if (typeof validateConfig === 'function') {
        const result = await validateConfig(formattedPayload);
        if (result && !result.valid) {
          setBackendErrors(result.errors || ['Configuration failed backend validation.']);
          return;
        }
      }
    } catch (err) {
      console.warn('Backend validation call skipped:', err);
    } finally {
      setIsValidating(false);
    }

    if (typeof onStartNegotiation === 'function') {
      onStartNegotiation(formattedPayload);
    }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* ── TOP CONTROL DECK ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2.5">
            <button
              type="button"
              onClick={onBack}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                  : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-indigo-400 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Scenario</span>
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Sliders className="w-3 h-3" />
              <span>Step 2 of 3 · Agent Configuration Studio</span>
            </span>
          </div>

          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {scenario.title}
          </h1>
          <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {scenario.description}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          {/* Chaos Test */}
          <button
            type="button"
            onClick={handleChaosMode}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-xl border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-indigo-400 shadow-sm'
            }`}
            title="Randomize personalities for stress testing"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Chaos Test</span>
          </button>

          {/* Cognitive Radar */}
          <button
            type="button"
            onClick={() => setShowRadarModal(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-xl border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-indigo-400 shadow-sm'
            }`}
            title="View pentagon cognitive radar charts"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>View Radar</span>
          </button>

          {/* Max Rounds Stepper */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-semibold ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/80 text-slate-300'
              : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <span>Rounds:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={maxRounds}
              onChange={(e) => setMaxRounds(e.target.value)}
              className={`w-12 text-center font-bold rounded-lg py-0.5 outline-none border text-xs ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-indigo-300'
                  : 'bg-slate-50 border-slate-300 focus:border-indigo-500 text-indigo-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Chaos Alert Toast ── */}
      {chaosToast && (
        <div className="p-3.5 mb-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold flex items-center gap-2.5 shadow-lg backdrop-blur-md">
          <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>{chaosToast}</span>
        </div>
      )}

      {/* ── CENTRAL TELEMETRY: HIGH-TECH ZOPA OVERLAP GAUGE ── */}
      <div className={`rounded-2xl backdrop-blur-xl border p-5 sm:p-6 mb-8 transition-all relative overflow-hidden shadow-2xl ${
        isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-slate-200/50'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 text-sm sm:text-base font-bold ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}>
              <Scale className="w-4 h-4 text-indigo-500" />
              <span>Mathematical ZOPA Feasibility Monitor</span>
            </div>
            {agreement.valid ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Agreement Zone Open (Feasible)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Impasse (Ceiling Below Floor)</span>
              </span>
            )}
          </div>

          {/* Game-Theoretic Forecast Dial */}
          <div className={`inline-flex items-center gap-2.5 text-xs px-3.5 py-1.5 rounded-xl border font-semibold ${
            isDark ? 'border-slate-800/80 bg-slate-950/80 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}>
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Forecast:</span>
            <strong className={`font-bold ${conflict.textColor}`}>{conflict.status}</strong>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-bold">
              {conflict.dealProb}% Deal Rate
            </span>
          </div>
        </div>

        {/* Live Visual Meter */}
        {agreement.overlaps.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className={`block text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Floor ({agreement.overlaps[0].minAgent})
                </span>
                <span className="text-emerald-500 text-base sm:text-xl font-bold font-mono">
                  {agreement.overlaps[0].min} {agreement.overlaps[0].unit}
                </span>
              </div>

              <div className="text-center">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-500 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  {agreement.overlaps[0].item}
                </span>
              </div>

              <div className="text-right">
                <span className={`block text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Ceiling ({agreement.overlaps[0].maxAgent})
                </span>
                <span className="text-indigo-500 text-base sm:text-xl font-bold font-mono">
                  {agreement.overlaps[0].max} {agreement.overlaps[0].unit}
                </span>
              </div>
            </div>

            {/* Glowing Gradient Progress Track */}
            <div className={`w-full h-3 rounded-full overflow-hidden border p-0.5 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-100'
            }`}>
              {agreement.overlaps[0].isFeasible ? (
                <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/20" />
              ) : (
                <div className="h-full bg-rose-500 rounded-full transition-all duration-300" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BATTLE ARENA: SIDE-BY-SIDE BALANCED GLASS CARDS (AGENT 1 VS AGENT 2) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {agents.map((agent, aIdx) => {
          const cfg = agentConfigs[agent.id] || {};
          const currentP = cfg.personality || agent.default_personality || 'Collaborative';

          return (
            <div
              key={agent.id}
              className={`rounded-2xl backdrop-blur-xl border p-6 flex flex-col justify-between space-y-6 transition-all duration-200 shadow-2xl ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
                  : 'bg-white border-slate-200/90 shadow-slate-200/50 hover:border-slate-300'
              }`}
            >
              {/* Agent Identity Header */}
              <div className={`flex items-center justify-between pb-4 border-b ${
                isDark ? 'border-slate-800/80' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-3.5">
                  <AgentAvatar role={agent.role || agent.id} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${
                        isDark ? 'text-slate-100' : 'text-slate-900'
                      }`}>
                        {agent.name}
                      </h2>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                        isDark ? 'bg-slate-800/80 text-slate-400 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        Agent {aIdx === 0 ? 'A' : 'B'}
                      </span>
                    </div>
                    <p className={`text-xs font-medium mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {agent.role}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdate(agent.id, 'objective', agent.goal || '');
                    handleUpdate(agent.id, 'personality', agent.default_personality || 'Collaborative');
                    if (agent.limits) {
                      handleUpdate(agent.id, 'limits', agent.limits.map((l) => ({ ...l })));
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer px-2.5 py-1 rounded-lg border ${
                    isDark
                      ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Reset to scenario defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* 1. Personality Selection (Tactile Cards with Stats) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2.5">
                  Behavioral Personality Style
                </label>

                <div className="space-y-2.5">
                  {PERSONALITIES.map((p) => {
                    const isSelected = currentP === p.id;
                    const IconComp = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdate(agent.id, 'personality', p.id)}
                        className={cn(
                          'w-full p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-3.5',
                          isSelected
                            ? p.activeStyles
                            : isDark
                            ? 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700/80 hover:bg-slate-900/60'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-100'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                              isSelected
                                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-500'
                                : isDark
                                ? 'bg-slate-900 border-slate-800 text-slate-400'
                                : 'bg-white border-slate-200 text-slate-500'
                            )}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                {p.name}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                              }`}>
                                {p.badge}
                              </span>
                            </div>
                            <p className={`text-[11px] leading-snug line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {p.desc}
                            </p>
                          </div>
                        </div>

                        {/* Stat Snapshot */}
                        <div className={`hidden sm:flex flex-col text-right shrink-0 text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Anchor: {p.anchorStat}</span>
                          <span>Flex: {p.flexStat}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Primary Objective */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2">
                  <Target className="w-3.5 h-3.5" />
                  <span>Primary Objective</span>
                </div>
                <textarea
                  rows={2}
                  value={cfg.objective || ''}
                  onChange={(e) => handleUpdate(agent.id, 'objective', e.target.value)}
                  className={`w-full rounded-lg p-3 text-xs sm:text-sm font-medium border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none ${
                    isDark
                      ? 'bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                  placeholder="Define the agent's primary negotiation target..."
                />
              </div>

              {/* 3. Reservation Boundaries (ZOPA Bounds) */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Reservation Boundaries (ZOPA Bounds)</span>
                </div>
                <div className="space-y-2.5">
                  {(cfg.limits || []).map((l, idx) => {
                    const isMin = String(l.type).toLowerCase() === 'min';
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border',
                              isMin
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            )}
                          >
                            {isMin ? (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                <span>MIN (Floor)</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3" />
                                <span>MAX (Ceiling)</span>
                              </>
                            )}
                          </span>
                          <span className={`font-semibold capitalize truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {(l.item || '').replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={l.value ?? ''}
                            onChange={(e) => handleLimitChange(agent.id, idx, e.target.value)}
                            className={`w-28 border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1 text-right font-mono font-bold text-xs sm:text-sm outline-none transition-colors ${
                              isDark ? 'bg-slate-950/80 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {l.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Behavioral Constraints */}
              {Array.isArray(cfg.constraints) && cfg.constraints.length > 0 && (
                <div className={`pt-4 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
                  <span className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Active Constraints
                  </span>
                  <ul className="space-y-1.5">
                    {cfg.constraints.map((c, i) => (
                      <li key={i} className={`text-xs flex items-start gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span className="leading-snug">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Impasse Alerts if Mathematical Collision ── */}
      {!agreement.valid && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 mb-8 text-xs sm:text-sm text-rose-500 space-y-1.5">
          <div className="font-bold flex items-center gap-2 text-sm text-rose-500">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Mathematical Impasse Detected in Reservation Boundaries:</span>
          </div>
          {agreement.errors.map((err, i) => (
            <p key={i} className="pl-6 font-medium">• {err}</p>
          ))}
        </div>
      )}

      {/* ── Backend Validation Errors ── */}
      {backendErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 mb-8 text-xs sm:text-sm text-rose-500 space-y-1.5">
          <div className="font-bold flex items-center gap-2 text-sm text-rose-500">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Backend API Invariant Check Failed:</span>
          </div>
          {backendErrors.map((err, i) => (
            <p key={i} className="pl-6 font-medium">• {err}</p>
          ))}
        </div>
      )}

      {/* ── BOTTOM FLOATING ACTION DOCK ── */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-5 p-5 sm:p-6 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all ${
        isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-slate-200/50'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            {agreement.valid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className={`text-sm sm:text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  Ready for Simulation Arena
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span className="text-sm sm:text-base font-bold text-rose-500">
                  Adjust Limits to Re-Open Agreement Zone
                </span>
              </>
            )}
          </div>
          <span className={`text-xs block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Both agent profiles verified against mathematical constraints and system validation rules.
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowPayloadModal(true)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Inspect JSON</span>
          </button>

          <button
            type="button"
            disabled={!agreement.valid || isValidating}
            onClick={handleLaunchNegotiation}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isValidating ? 'Validating API...' : 'Start Simulation Arena'}</span>
          </button>
        </div>
      </div>

      {/* ── Cognitive Radar Modal ── */}
      {showRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 sm:p-7 shadow-2xl space-y-6 ${
            isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2.5 text-base font-bold">
                <Activity className="w-4 h-4 text-indigo-500" />
                <span>Cognitive Personality Radars</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRadarModal(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="text-center">
                <span className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {agents[0]?.name} ({p1})
                </span>
                <PersonalityRadar personality={p1} size={230} />
              </div>
              <div className="text-center">
                <span className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {agents[1]?.name} ({p2})
                </span>
                <PersonalityRadar personality={p2} size={230} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payload Inspector Modal ── */}
      <PayloadInspectorModal
        isOpen={showPayloadModal}
        onClose={() => setShowPayloadModal(false)}
        payload={formattedPayload}
      />
    </div>
  );
}