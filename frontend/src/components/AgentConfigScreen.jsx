import { useState, useMemo, useEffect } from 'react';
import vendorPricing from '../data/vendor_pricing.json';
import { AgentAvatar } from './AgentAvatars';
import { PersonalityRadar } from './PersonalityRadar';
import { predictConflict } from './ConflictPredictor';
import { PayloadInspectorModal } from './PayloadInspectorModal';
import { useTheme } from '../context/ThemeContext';
import { validateConfig } from '../services/api';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/* ────────────────────────── Rich Personality Archetypes with Traits ────────────────────────── */
const PERSONALITIES = [
  {
    id: 'Aggressive',
    name: 'Aggressive',
    icon: '🦁',
    badge: 'High Anchor · Hardline',
    anchorStat: '95%',
    flexStat: '15%',
    riskStat: 'High',
    lightActive: 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-400/40 shadow-md',
    darkActive: 'bg-rose-950/40 border-rose-500 text-rose-100 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/50',
    desc: 'Commands high initial anchor, concedes slowly, leverages walkaway pressure.',
  },
  {
    id: 'Collaborative',
    name: 'Collaborative',
    icon: '🤝',
    badge: 'Mutual Gain · Win-Win',
    anchorStat: '60%',
    flexStat: '80%',
    riskStat: 'Low',
    lightActive: 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-400/40 shadow-md',
    darkActive: 'bg-emerald-950/40 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/50',
    desc: 'Offers reciprocal concessions, explores trade-offs, drives mutual value.',
  },
  {
    id: 'Risk-Averse',
    name: 'Risk-Averse',
    icon: '🛡️',
    badge: 'Walkaway Guard · Closes Early',
    anchorStat: '40%',
    flexStat: '90%',
    riskStat: 'Zero',
    lightActive: 'bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-400/40 shadow-md',
    darkActive: 'bg-sky-950/40 border-sky-500 text-sky-100 ring-2 ring-sky-500/50 shadow-lg shadow-sky-950/50',
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
  scenarios = [],
  selectedScenario = vendorPricing,
  onSelectScenario,
  onBack,
  onStartNegotiation,
}) {
  const { isDark } = useTheme();
  const scenario = selectedScenario || vendorPricing;
  const agents = scenario?.agents || [];

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

  // Re-sync if scenario changes
  useEffect(() => {
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
  }, [scenario?.id]);

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
    setChaosToast('⚡ Chaos Mode Triggered: Personalities randomized for stress testing!');
    setTimeout(() => setChaosToast(null), 4000);
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
      // If backend is not currently running, proceed with frontend ZOPA verification
      console.warn('Backend validation call skipped:', err);
    } finally {
      setIsValidating(false);
    }

    if (typeof onStartNegotiation === 'function') {
      onStartNegotiation(formattedPayload);
    }
  };

  return (
    <div
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left transition-colors duration-200 ${
        isDark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      {/* ── TOP CONTROL DECK ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={onBack}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-sm'
              }`}
            >
              <span>←</span>
              <span>Change Scenario</span>
            </button>
            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Step 2 of 3 · Agent Configuration Studio
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {scenario.title}
          </h1>
          <p className={`text-sm mt-1 max-w-2xl font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {scenario.description}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap self-start sm:self-center">
          {/* Chaos Test */}
          <button
            type="button"
            onClick={handleChaosMode}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Randomize personalities for stress testing"
          >
            <span>🎲</span>
            <span>Chaos Test</span>
          </button>

          {/* Cognitive Radar */}
          <button
            type="button"
            onClick={() => setShowRadarModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="View pentagon cognitive radar charts"
          >
            <span>🕸️</span>
            <span>View Radar</span>
          </button>

          {/* Max Rounds Stepper */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700 shadow-sm'
            }`}
          >
            <span>Rounds:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={maxRounds}
              onChange={(e) => setMaxRounds(e.target.value)}
              className={`w-12 text-center font-black rounded-lg py-1 outline-none border text-sm ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-blue-400'
                  : 'bg-slate-100 border-slate-300 text-blue-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Chaos Alert ── */}
      {chaosToast && (
        <div className="p-4 mb-6 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-500 text-sm font-bold flex items-center gap-2.5 animate-bounce">
          <span>⚡</span>
          <span>{chaosToast}</span>
        </div>
      )}

      {/* ── CENTRAL TELEMETRY: HIGH-TECH ZOPA OVERLAP GAUGE ── */}
      <div
        className={`rounded-3xl border p-6 sm:p-7 mb-8 transition-all relative overflow-hidden ${
          isDark
            ? 'bg-[#0f1420] border-slate-800 shadow-2xl'
            : 'bg-white border-slate-200 shadow-lg'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm sm:text-base font-black uppercase tracking-wider">
              Mathematical ZOPA Feasibility Monitor
            </span>
            {agreement.valid ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Agreement Zone Open (Feasible)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30">
                ⚠️ Impasse (Ceiling Below Floor)
              </span>
            )}
          </div>

          {/* Game-Theoretic Forecast Dial */}
          <div
            className={`inline-flex items-center gap-3 text-xs px-4 py-2 rounded-2xl border font-bold ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Convergence Forecast:</span>
            <strong className={`text-sm ${conflict.textColor}`}>{conflict.status}</strong>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-black">
              {conflict.dealProb}% Deal Rate
            </span>
          </div>
        </div>

        {/* Live Visual Meter */}
        {agreement.overlaps.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Reservation Floor ({agreement.overlaps[0].minAgent})
                </span>
                <span className="text-emerald-500 text-lg sm:text-2xl font-black">
                  {agreement.overlaps[0].min} {agreement.overlaps[0].unit}
                </span>
              </div>

              <div className="text-center">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-blue-500 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  {agreement.overlaps[0].item}
                </span>
              </div>

              <div className="text-right">
                <span className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Reservation Ceiling ({agreement.overlaps[0].maxAgent})
                </span>
                <span className="text-blue-500 text-lg sm:text-2xl font-black">
                  {agreement.overlaps[0].max} {agreement.overlaps[0].unit}
                </span>
              </div>
            </div>

            {/* Glowing Gradient Progress Track */}
            <div
              className={`w-full h-4 rounded-full overflow-hidden border p-0.5 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
              }`}
            >
              {agreement.overlaps[0].isFeasible ? (
                <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/20" />
              ) : (
                <div className="h-full bg-rose-500 rounded-full transition-all duration-300" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BATTLE ARENA: AGENT 1 VS AGENT 2 STUDIO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {agents.map((agent, aIdx) => {
          const cfg = agentConfigs[agent.id] || {};
          const currentP = cfg.personality || agent.default_personality || 'Collaborative';

          return (
            <div
              key={agent.id}
              className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between space-y-7 transition-all duration-200 relative ${
                isDark
                  ? 'bg-[#0f1420] border-slate-800 shadow-2xl'
                  : 'bg-white border-slate-200 shadow-xl'
              }`}
            >
              {/* Agent Identity Header */}
              <div
                className={`flex items-center justify-between pb-5 border-b ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <AgentAvatar role={agent.role || agent.id} size="md" />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        {agent.name}
                      </h2>
                      <span
                        className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full uppercase ${
                          isDark
                            ? 'bg-slate-900 text-slate-300 border border-slate-800'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        Agent {aIdx + 1}
                      </span>
                    </div>
                    <p className={`text-xs sm:text-sm font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
                  className={`text-xs font-bold transition-all cursor-pointer px-3 py-1.5 rounded-xl border ${
                    isDark
                      ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title="Reset to scenario defaults"
                >
                  ↺ Reset
                </button>
              </div>

              {/* 1. Personality Selection (Tactile Cards with Stats) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-blue-500 mb-3">
                  Behavioral Personality Style
                </label>

                <div className="space-y-3">
                  {PERSONALITIES.map((p) => {
                    const isSelected = currentP === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdate(agent.id, 'personality', p.id)}
                        className={cn(
                          'w-full p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between gap-4',
                          isSelected
                            ? isDark
                              ? p.darkActive
                              : p.lightActive
                            : isDark
                            ? 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="text-3xl shrink-0">{p.icon}</span>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-black tracking-tight text-current">
                                {p.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isSelected
                                    ? 'bg-current/10 border-current/20'
                                    : isDark
                                    ? 'bg-slate-900 border-slate-800 text-slate-400'
                                    : 'bg-slate-200 border-slate-300 text-slate-600'
                                }`}
                              >
                                {p.badge}
                              </span>
                            </div>
                            <p className="text-xs leading-snug line-clamp-1 opacity-80">
                              {p.desc}
                            </p>
                          </div>
                        </div>

                        {/* Stat Snapshot */}
                        <div className="hidden sm:flex flex-col text-right shrink-0 text-[11px] font-mono">
                          <span className="font-bold">Anchor: {p.anchorStat}</span>
                          <span className="opacity-70">Flex: {p.flexStat}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Primary Objective */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-blue-500 mb-2">
                  🎯 Primary Objective
                </label>
                <textarea
                  rows={2}
                  value={cfg.objective || ''}
                  onChange={(e) => handleUpdate(agent.id, 'objective', e.target.value)}
                  className={`w-full rounded-2xl p-4 text-sm font-medium outline-none transition-all border ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm'
                  }`}
                  placeholder="Define the agent's primary negotiation target..."
                />
              </div>

              {/* 3. Reservation Boundaries (ZOPA Limits) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-blue-500 mb-2">
                  📏 Reservation Boundaries (ZOPA Bounds)
                </label>
                <div className="space-y-3">
                  {(cfg.limits || []).map((l, idx) => {
                    const isMin = String(l.type).toLowerCase() === 'min';
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border text-sm ${
                          isDark
                            ? 'bg-slate-950/80 border-slate-800'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'text-xs font-black px-2.5 py-1 rounded-lg border uppercase tracking-wider',
                              isMin
                                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                                : 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                            )}
                          >
                            {isMin ? 'Floor' : 'Ceiling'}
                          </span>
                          <span className="font-bold capitalize truncate">
                            {(l.item || '').replace(/_/g, ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={l.value ?? ''}
                            onChange={(e) => handleLimitChange(agent.id, idx, e.target.value)}
                            className={`w-28 border rounded-xl px-3 py-1.5 text-right text-base font-black outline-none transition-colors ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 shadow-sm'
                            }`}
                          />
                          <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
                <div
                  className={`pt-4 border-t ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <span
                    className={`block text-[11px] font-black uppercase tracking-wider mb-2.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Active Constraints
                  </span>
                  <ul className="space-y-2">
                    {cfg.constraints.map((c, i) => (
                      <li
                        key={i}
                        className={`text-xs sm:text-sm flex items-start gap-2.5 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        <span className="text-blue-500 font-black text-base leading-none">•</span>
                        <span className="leading-snug font-medium">{c}</span>
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
        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/40 mb-8 text-sm text-rose-500 space-y-2 animate-bounce">
          <div className="font-black flex items-center gap-2 text-base">
            <span>⚠️</span>
            <span>Mathematical Impasse Detected in Reservation Boundaries:</span>
          </div>
          {agreement.errors.map((err, i) => (
            <p key={i} className="pl-7 font-bold">• {err}</p>
          ))}
        </div>
      )}

      {/* ── Backend Validation Errors ── */}
      {backendErrors.length > 0 && (
        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/40 mb-8 text-sm text-rose-500 space-y-2">
          <div className="font-black flex items-center gap-2 text-base">
            <span>⚠️</span>
            <span>Backend API Invariant Check Failed:</span>
          </div>
          {backendErrors.map((err, i) => (
            <p key={i} className="pl-7 font-bold">• {err}</p>
          ))}
        </div>
      )}

      {/* ── BOTTOM FLOATING ACTION DOCK ── */}
      <div
        className={`flex flex-col sm:flex-row items-center justify-between gap-5 p-6 sm:p-7 rounded-3xl border transition-all ${
          isDark
            ? 'bg-[#0f1420] border-slate-800 shadow-2xl'
            : 'bg-white border-slate-200 shadow-xl'
        }`}
      >
        <div>
          <span className="text-base sm:text-lg font-black block">
            {agreement.valid ? '✓ Ready for Simulation Arena' : '⚠️ Adjust Limits to Re-Open Agreement Zone'}
          </span>
          <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Both agent profiles verified against mathematical constraints and backend/validation.py rules.
          </span>
        </div>

        <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowPayloadModal(true)}
            className={`px-5 py-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-sm'
            }`}
          >
            📦 Inspect JSON
          </button>

          <button
            type="button"
            disabled={!agreement.valid || isValidating}
            onClick={handleLaunchNegotiation}
            className="px-8 py-3.5 rounded-2xl font-black text-sm text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isValidating ? 'Validating API...' : 'Start Simulation Arena 🚀'}
          </button>
        </div>
      </div>

      {/* ── Cognitive Radar Modal ── */}
      {showRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border ${
              isDark ? 'bg-[#0f1420] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-4 border-b ${
                isDark ? 'border-slate-800' : 'border-slate-100'
              }`}
            >
              <h3 className="text-lg font-black flex items-center gap-2">
                <span>🕸️</span>
                <span>Cognitive Personality Radars</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRadarModal(false)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="text-center">
                <span className="block text-sm font-black mb-2">
                  {agents[0]?.name} ({p1})
                </span>
                <PersonalityRadar personality={p1} size={230} />
              </div>
              <div className="text-center">
                <span className="block text-sm font-black mb-2">
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