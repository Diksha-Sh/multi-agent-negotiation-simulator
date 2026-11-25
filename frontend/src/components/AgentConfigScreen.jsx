import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Bot,
  UserCheck,
  Mic,
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

// Max rounds: a whole number from 2 to 50 (empty or invalid -> default 10).
function clampRounds(value) {
  const n = Number(value);
  if (value === '' || value === null || !Number.isFinite(n)) return 10;
  return Math.min(50, Math.max(2, Math.round(n)));
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
    activeStyles: 'border-[#EE2A54] ring-1 ring-[#EE2A54]/60 bg-[#EE2A54]/15 text-white shadow-[0_0_20px_rgba(216,63,135,0.2)]',
    desc: 'High opening anchor, slow concessions, firm pressure.',
  },
  {
    id: 'Collaborative',
    name: 'Collaborative',
    icon: Users,
    badge: 'Mutual Gain · Balanced',
    anchorStat: '60%',
    flexStat: '80%',
    riskStat: 'Low',
    activeStyles: 'border-[#EE2A54] ring-1 ring-[#EE2A54]/60 bg-[#1D2B78]/35 text-white shadow-[0_0_20px_rgba(68,49,141,0.3)]',
    desc: 'Reciprocal concessions, balanced trade-offs, steady convergence.',
  },
  {
    id: 'Risk-Averse',
    name: 'Risk-Averse',
    icon: Shield,
    badge: 'Safe · Closes Early',
    anchorStat: '40%',
    flexStat: '90%',
    riskStat: 'Zero',
    activeStyles: 'border-[#1CD4A3] ring-1 ring-[#1CD4A3]/60 bg-[#1CD4A3]/15 text-white shadow-[0_0_20px_rgba(233,128,116,0.2)]',
    desc: 'Avoids deadlock, concedes early to secure agreement.',
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

        // Check if value violates agent's baseline reservation constraints
        const baselineAgent = (scenario?.agents || []).find((a) => a.id === agent.id);
        const baselineLimit = (baselineAgent?.limits || []).find(
          (bl) => String(bl.item || 'price').trim() === itemKey && String(bl.type || '').toLowerCase() === type
        );
        if (baselineLimit) {
          const baseVal = Number(baselineLimit.value);
          if (type === 'min' && val < baseVal) {
            errors.push(
              `${agent.name} floor for ${itemKey.replace(/_/g, ' ')} (${val} ${l.unit || 'INR'}) violates constraint: cannot be below minimum acceptable of ${baseVal} ${l.unit || 'INR'}.`
            );
          }
          if (type === 'max' && val > baseVal) {
            errors.push(
              `${agent.name} ceiling for ${itemKey.replace(/_/g, ' ')} (${val} ${l.unit || 'INR'}) violates constraint: cannot exceed maximum acceptable of ${baseVal} ${l.unit || 'INR'}.`
            );
          }
        }

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
  const [mode, setMode] = useState(() => selectedScenario?.mode || 'simulation');
  const [humanAgentId, setHumanAgentId] = useState(() => selectedScenario?.human_agent_id || selectedScenario?.human_seat || agents[0]?.id || 'buyer');
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
    setMode(scenario?.mode || 'simulation');
    setHumanAgentId(scenario?.human_agent_id || scenario?.human_seat || scenario?.agents?.[0]?.id || 'buyer');
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
      max_rounds: clampRounds(maxRounds),
      mode: mode,
      human_agent_id: mode === 'practice' ? humanAgentId : null,
      human_seat: mode === 'practice' ? humanAgentId : null,
      validation_status: agreement.valid ? 'VALID' : 'INVALID',
      agents: agents.map((agent) => {
        const cfg = agentConfigs[agent.id] || {};
        // Clamp limit values to their baseline reservation boundaries so the
        // agent always negotiates from its true hard limits, regardless of any
        // edits made on the config screen.
        const baselineAgent = (scenario?.agents || []).find((a) => a.id === agent.id);
        const sanitizedLimits = (cfg.limits || agent.limits || []).map((l) => {
          const rawVal =
            l.value === '' || l.value === null || Number.isNaN(Number(l.value))
              ? null
              : Number(l.value);
          if (rawVal === null) return { item: l.item, type: l.type, value: null, unit: l.unit || '' };
          const lType = String(l.type || '').toLowerCase();
          const itemKey = String(l.item || 'price').trim();
          const baselineLim = (baselineAgent?.limits || []).find(
            (bl) => String(bl.item || 'price').trim() === itemKey && String(bl.type || '').toLowerCase() === lType
          );
          let safeVal = rawVal;
          if (baselineLim) {
            const baseVal = Number(baselineLim.value);
            // A vendor floor cannot go below baseline (would open up the ZOPA unfairly).
            // A buyer ceiling cannot go above baseline (AI would open incorrectly high).
            if (lType === 'min') safeVal = Math.max(rawVal, baseVal);
            if (lType === 'max') safeVal = Math.min(rawVal, baseVal);
          }
          return { item: l.item, type: l.type, value: safeVal, unit: l.unit || '' };
        });
        return {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          role_description: agent.role_description || '',
          goal: cfg.objective || agent.goal || '',
          objective: cfg.objective || agent.goal || '',
          constraints: cfg.constraints || agent.constraints || [],
          limits: sanitizedLimits,
          personality: cfg.personality || agent.default_personality || 'Collaborative',
        };
      }),
    };
  }, [scenario, maxRounds, mode, humanAgentId, agreement, agents, agentConfigs]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <button
              type="button"
              onClick={onBack}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-[#131B4B] border-[#1D2B78] text-[#A3B3D9] hover:text-white hover:border-[#EE2A54]'
                  : 'bg-white border-[#1D2B78]/20 text-[#131B4B] shadow-sm'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#EE2A54]/15 text-[#EE2A54] border border-[#EE2A54]/40">
              <Sliders className="w-3.5 h-3.5" />
              <span>Step 2 · Configure Agents</span>
            </span>
          </div>

          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#131B4B]'}`}>
            {scenario.title}
          </h1>
          <p className={`text-sm mt-1 max-w-2xl ${isDark ? 'text-[#A3B3D9]' : 'text-[#131B4B]/75'}`}>
            {scenario.description}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={handleChaosMode}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? 'bg-[#131B4B] border-[#1D2B78] text-white hover:border-[#EE2A54]'
                : 'bg-white border-[#1D2B78]/20 text-[#131B4B] shadow-sm'
            }`}
            title="Randomize personalities"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#1CD4A3]" />
            <span>Randomize</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRadarModal(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? 'bg-[#131B4B] border-[#1D2B78] text-white hover:border-[#EE2A54]'
                : 'bg-white border-[#1D2B78]/20 text-[#131B4B] shadow-sm'
            }`}
            title="View personality radar charts"
          >
            <Activity className="w-3.5 h-3.5 text-[#EE2A54]" />
            <span>Radar</span>
          </button>

          {/* Max Rounds Stepper */}
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-semibold ${
            isDark
              ? 'bg-[#131B4B] border-white/15 text-white'
              : 'bg-white border border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <span>Rounds:</span>
            <input
              type="number"
              min="2"
              max="50"
              step="1"
              value={maxRounds}
              onChange={(e) => setMaxRounds(e.target.value)}
              onBlur={() => setMaxRounds(clampRounds(maxRounds))}
              className={`w-12 text-center font-bold rounded-lg py-0.5 outline-none border text-xs ${
                isDark
                  ? 'bg-[#0A102E] border-white/15 focus:border-[#EE2A54] text-[#1CD4A3]'
                  : 'bg-slate-50 border-slate-300 focus:border-indigo-500 text-indigo-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ── Chaos Alert Toast ── */}
      {chaosToast && (
        <div className="p-3.5 mb-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold flex items-center gap-2.5 shadow-lg backdrop-blur-md">
          <Zap className="w-4 h-4 text-[#EE2A54] shrink-0" />
          <span>{chaosToast}</span>
        </div>
      )}

      {/* ── MODE + SEAT SELECTION ── */}
      <div className={`rounded-2xl border p-5 mb-5 shadow-lg ${
        isDark ? 'bg-[#131B4B]/85 border-[#1D2B78]' : 'bg-white border-[#1D2B78]/20'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#1CD4A3]">Mode</span>
            <div className={`p-1.5 rounded-xl border inline-flex flex-wrap items-center gap-1.5 ${
              isDark ? 'bg-[#0A102E] border-[#1D2B78]/70' : 'bg-[#F4F7FC] border-[#1D2B78]/20'
            }`}>
              <button
                type="button"
                onClick={() => setMode('simulation')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer',
                  mode === 'simulation'
                    ? 'bg-[#1D2B78] text-white shadow-sm'
                    : isDark ? 'text-[#A3B3D9] hover:text-white' : 'text-[#131B4B]/70 hover:text-[#131B4B]'
                )}
              >
                <Bot className="w-4 h-4" />
                <span>AI vs AI</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('practice')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer',
                  mode === 'practice'
                    ? 'bg-[#EE2A54] text-white shadow-[0_4px_16px_rgba(216,63,135,0.4)]'
                    : isDark ? 'text-[#A3B3D9] hover:text-white' : 'text-[#131B4B]/70 hover:text-[#131B4B]'
                )}
              >
                <Mic className="w-4 h-4" />
                <span>Human vs AI (Voice + Practice)</span>
              </button>
            </div>
          </div>

          {mode === 'practice' && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-[#131B4B]'}`}>
                <UserCheck className="w-4 h-4 text-[#EE2A54]" />
                Play as:
              </span>
              {agents.map((agent) => {
                const isSelected = humanAgentId === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setHumanAgentId(agent.id)}
                    className={cn(
                      'px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center gap-2',
                      isSelected
                        ? 'border-[#EE2A54] bg-[#EE2A54]/20 text-white shadow-sm'
                        : isDark ? 'border-[#1D2B78]/70 bg-[#0A102E] text-[#A3B3D9] hover:text-white' : 'border-[#1D2B78]/20 bg-[#F4F7FC] text-[#131B4B]'
                    )}
                  >
                    <span>{agent.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── AGREEMENT ZONE BAR ── */}
      <div className={`rounded-2xl border p-5 mb-6 shadow-md ${
        isDark ? 'bg-[#131B4B]/85 border-[#1D2B78]' : 'bg-white border-[#1D2B78]/20'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-[#EE2A54]" />
            <span className="text-sm font-extrabold uppercase tracking-wider">Agreement Zone (ZOPA)</span>
            {agreement.valid ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Feasible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-[#EE2A54]/15 text-[#EE2A54] border border-[#EE2A54]/40">
                <AlertTriangle className="w-3.5 h-3.5" />
                Impasse
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <span className={isDark ? 'text-[#A3B3D9]' : 'text-[#131B4B]/70'}>Forecast:</span>
            <strong className={conflict.textColor}>{conflict.status}</strong>
            <span className="px-3 py-1 rounded-full bg-[#1D2B78]/40 text-white border border-[#1D2B78] text-xs font-bold">
              {conflict.dealProb}% Deal Rate
            </span>
          </div>
        </div>

        {agreement.overlaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono font-bold text-[#1CD4A3]">
                Floor ({agreement.overlaps[0].minAgent}): {agreement.overlaps[0].min} {agreement.overlaps[0].unit}
              </span>
              <span className="text-xs font-bold uppercase text-[#A3B3D9]">
                {agreement.overlaps[0].item}
              </span>
              <span className="font-mono font-bold text-[#EE2A54]">
                Ceiling ({agreement.overlaps[0].maxAgent}): {agreement.overlaps[0].max} {agreement.overlaps[0].unit}
              </span>
            </div>
            <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-[#0A102E]' : 'bg-slate-200'}`}>
              {agreement.overlaps[0].isFeasible ? (
                <div className="h-full bg-gradient-to-r from-[#1D2B78] via-[#EE2A54] to-[#1CD4A3] rounded-full" />
              ) : (
                <div className="h-full bg-rose-500 rounded-full" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SIDE-BY-SIDE AGENT CARDS (ALL IMPORTANT OPTIONS VISIBLE, NO HIDDEN DROPDOWNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {agents.map((agent, aIdx) => {
          const cfg = agentConfigs[agent.id] || {};
          const currentP = cfg.personality || agent.default_personality || 'Collaborative';
          const selectedMeta = PERSONALITIES.find((p) => p.id === currentP) || PERSONALITIES[1];
          const isHuman = mode === 'practice' && humanAgentId === agent.id;

          return (
            <div
              key={agent.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between space-y-5 transition-all shadow-lg ${
                isHuman
                  ? 'border-[#EE2A54] ring-2 ring-[#EE2A54]/40 bg-[#131B4B]'
                  : isDark
                  ? 'bg-[#131B4B]/85 border-[#1D2B78]'
                  : 'bg-white border-[#1D2B78]/20'
              }`}
            >
              {/* Agent Header */}
              <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-[#1D2B78]/50' : 'border-[#1D2B78]/15'}`}>
                <div className="flex items-center gap-3">
                  <AgentAvatar role={agent.role || agent.id} size="md" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-[#131B4B]'}`}>
                        {agent.name}
                      </h2>
                      <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                        isDark ? 'bg-[#0A102E] text-[#A3B3D9] border-[#1D2B78]/60' : 'bg-[#F4F7FC] text-[#1D2B78] border-[#1D2B78]/20'
                      }`}>
                        {aIdx === 0 ? 'Agent A' : 'Agent B'}
                      </span>
                      {mode === 'practice' && (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          isHuman
                            ? 'bg-[#EE2A54] text-white border-[#EE2A54]'
                            : 'bg-[#1D2B78]/40 text-[#1CD4A3] border-[#1D2B78]'
                        }`}>
                          {isHuman ? 'You (Voice/Human)' : 'AI'}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${isDark ? 'text-[#A3B3D9]' : 'text-[#131B4B]/70'}`}>{agent.role}</p>
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
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer ${
                    isDark ? 'border-[#1D2B78] text-[#A3B3D9] hover:text-white' : 'border-[#1D2B78]/20 text-[#131B4B]'
                  }`}
                  title="Reset to scenario defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* 1. Personality Pills */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1CD4A3] mb-2.5">
                  Personality
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PERSONALITIES.map((p) => {
                    const isSelected = currentP === p.id;
                    const IconComp = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdate(agent.id, 'personality', p.id)}
                        className={cn(
                          'px-3 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
                          isSelected
                            ? p.activeStyles
                            : isDark
                            ? 'bg-[#0A102E]/80 border-[#1D2B78]/60 text-[#A3B3D9] hover:text-white'
                            : 'bg-[#F4F7FC] border-[#1D2B78]/20 text-[#131B4B]'
                        )}
                      >
                        <IconComp className="w-4 h-4 shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-[#A3B3D9]' : 'text-[#131B4B]/75'}`}>
                  <strong className={isDark ? 'text-white' : 'text-[#131B4B]'}>{selectedMeta.badge}</strong> — {selectedMeta.desc}
                </p>
              </div>

              {/* 2. Reservation Limits */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1CD4A3] mb-2.5">
                  Reservation Limits
                </label>
                <div className="space-y-2.5">
                  {(cfg.limits || []).map((l, idx) => {
                    const isMin = String(l.type).toLowerCase() === 'min';
                    const val = Number(l.value);
                    const itemKey = String(l.item || 'price').trim();
                    const baselineAgent = (scenario?.agents || []).find((a) => a.id === agent.id);
                    const baselineLimit = (baselineAgent?.limits || []).find(
                      (bl) => String(bl.item || 'price').trim() === itemKey && String(bl.type || '').toLowerCase() === String(l.type || '').toLowerCase()
                    );
                    const baseVal = baselineLimit ? Number(baselineLimit.value) : null;
                    const isViolated = baseVal !== null && Number.isFinite(val) && (
                      (isMin && val < baseVal) || (!isMin && val > baseVal)
                    );

                    return (
                      <div key={idx} className="space-y-1">
                        <div
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                            isViolated
                              ? 'border-rose-500 bg-rose-500/10'
                              : isDark ? 'bg-[#0A102E]/90 border-[#1D2B78]/60' : 'bg-[#F4F7FC] border-[#1D2B78]/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase border',
                              isMin ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-[#EE2A54]/15 text-[#EE2A54] border-[#EE2A54]/30'
                            )}>
                              {isMin ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                              <span>{isMin ? 'Min' : 'Max'}</span>
                            </span>
                            <span className={`font-bold capitalize ${isDark ? 'text-white' : 'text-[#131B4B]'}`}>
                              {(l.item || '').replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={l.value ?? ''}
                              onChange={(e) => handleLimitChange(agent.id, idx, e.target.value)}
                              className={`w-28 border rounded-xl px-3 py-1.5 text-right font-mono font-bold text-sm outline-none ${
                                isViolated
                                  ? 'border-rose-500 bg-rose-950/40 text-rose-300'
                                  : isDark
                                  ? 'bg-[#131B4B] border-[#1D2B78] text-white focus:border-[#EE2A54]'
                                  : 'bg-white border-[#1D2B78]/30 text-[#131B4B] focus:border-[#EE2A54]'
                              }`}
                            />
                            <span className={`text-xs font-bold ${isDark ? 'text-[#A3B3D9]' : 'text-[#1D2B78]'}`}>{l.unit}</span>
                          </div>
                        </div>

                        {isViolated && (
                          <p className="text-xs text-rose-400 font-semibold px-1 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{isMin ? `Min allowed: ${baseVal} ${l.unit}` : `Max allowed: ${baseVal} ${l.unit}`}</span>
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Goal & Key Constraints (Always Visible, No Hidden Dropdowns) */}
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#1CD4A3] mb-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>Primary Goal</span>
                  </label>
                  <input
                    type="text"
                    value={cfg.objective || ''}
                    onChange={(e) => handleUpdate(agent.id, 'objective', e.target.value)}
                    className={`w-full rounded-xl px-3.5 py-2.5 text-sm border focus:border-[#EE2A54] outline-none ${
                      isDark ? 'bg-[#0A102E]/90 border-[#1D2B78]/60 text-white' : 'bg-[#F4F7FC] border-[#1D2B78]/20 text-[#131B4B]'
                    }`}
                    placeholder="Agent's primary negotiation goal..."
                  />
                </div>

                {Array.isArray(cfg.constraints) && cfg.constraints.length > 0 && (
                  <div className={`rounded-xl border p-3.5 ${isDark ? 'border-[#1D2B78]/50 bg-[#0A102E]/60' : 'border-[#1D2B78]/15 bg-[#F4F7FC]'}`}>
                    <span className={`block text-xs font-extrabold uppercase tracking-wider mb-2 ${isDark ? 'text-[#1CD4A3]' : 'text-[#1D2B78]'}`}>
                      Rules &amp; Constraints
                    </span>
                    <ul className="space-y-1.5">
                      {cfg.constraints.map((c, i) => (
                        <li key={i} className={`text-xs flex items-start gap-2 ${isDark ? 'text-[#A3B3D9]' : 'text-[#131B4B]/80'}`}>
                          <span className="text-[#EE2A54] font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ERRORS ── */}
      {!agreement.valid && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 mb-5 text-sm text-rose-400 space-y-1">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Fix these limit issues before starting:</span>
          </div>
          {agreement.errors.map((err, i) => (
            <p key={i} className="pl-6">• {err}</p>
          ))}
        </div>
      )}

      {backendErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 mb-5 text-sm text-rose-400 space-y-1">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Backend Validation Failed:</span>
          </div>
          {backendErrors.map((err, i) => (
            <p key={i} className="pl-6">• {err}</p>
          ))}
        </div>
      )}

      {/* ── BOTTOM ACTION BAR ── */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border shadow-lg ${
        isDark ? 'bg-[#131B4B]/90 border-[#1D2B78]' : 'bg-white border-[#1D2B78]/20'
      }`}>
        <div className="flex items-center gap-2.5 text-sm font-bold">
          {agreement.valid ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Ready to launch {mode === 'practice' ? 'Practice + Voice' : 'Simulation'} Arena</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span className="text-rose-400">Adjust limits to open agreement zone</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowPayloadModal(true)}
            className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold border cursor-pointer ${
              isDark ? 'bg-[#0A102E] border-[#1D2B78] text-[#A3B3D9] hover:text-white' : 'bg-[#F4F7FC] border-[#1D2B78]/20 text-[#131B4B]'
            }`}
          >
            <Code2 className="w-4 h-4 text-[#1CD4A3]" />
            <span>Inspect JSON</span>
          </button>

          <button
            type="button"
            disabled={!agreement.valid || isValidating}
            onClick={handleLaunchNegotiation}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white bg-[#EE2A54] hover:bg-[#d62249] transition-all shadow-[0_6px_22px_rgba(216,63,135,0.45)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isValidating
                ? 'Validating...'
                : mode === 'practice'
                ? 'Start Voice Practice Arena'
                : 'Start Simulation Arena'}
            </span>
          </button>
        </div>
      </div>

      {/* ── Cognitive Radar Modal ── */}
      {showRadarModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 sm:p-7 shadow-2xl space-y-6 ${
            isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2.5 text-base font-bold">
                <Activity className="w-4 h-4 text-[#EE2A54]" />
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
        </div>,
        document.body,
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