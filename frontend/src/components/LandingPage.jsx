import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Layers,
  Sliders,
  Play,
  ShoppingCart,
  Briefcase,
  Coins,
  Brain,
  Handshake,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Shield,
  Flame,
  Users,
  Terminal,
  Lock,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

/* ─────────────── Market Strip Data ─────────────── */
const DESK_METRICS = [
  { key: 'VENDOR_PROCUREMENT', val: '₹35,000 – ₹40,000', tag: 'ZOPA +5K', tone: 'emerald' },
  { key: 'COMPENSATION_PACKAGE', val: '12 – 15 LPA · 2–3D', tag: 'MULTI-ISSUE', tone: 'amber' },
  { key: 'CAPITAL_ALLOCATION', val: '₹60L – ₹80L / 100L', tag: 'SHARED CAP', tone: 'amber' },
  { key: 'GUARDRAILS', val: 'LIMIT + CONCESSION', tag: 'ENFORCED', tone: 'emerald' },
  { key: 'DEADLOCK_LADDER', val: '4-STAGE MEDIATOR', tag: 'TASK 4 LIVE', tone: 'rose' },
];

/* ─────────────── Interactive Live Deal Room Preview Cases ─────────────── */
const PREVIEW_MODES = {
  settlement: {
    id: 'settlement',
    label: 'AI Simulation',
    contract: 'CONTRACT #VP-204 · Bulk Unit Procurement',
    modeBadge: 'Autonomous Loop',
    floor: 35000,
    ceiling: 40000,
    dealPrice: 36460,
    status: 'SETTLED · ROUND 1',
    statusTone: 'emerald',
    steps: [
      {
        turn: 1,
        side: 'Buyer',
        role: 'Procurement · Collaborative',
        action: 'OPEN BID',
        price: 35800,
        note: 'Anchors 40% below ₹37,000 target inside buyer budget ceiling.',
        tone: 'amber',
      },
      {
        turn: 2,
        side: 'Vendor',
        role: 'Sales Head · Risk-Averse',
        action: 'COUNTER',
        price: 36460,
        note: 'Concedes early to protect commercial deal certainty above ₹35K floor.',
        tone: 'emerald',
      },
      {
        turn: 3,
        side: 'Buyer',
        role: 'Procurement · Collaborative',
        action: 'ACCEPT',
        price: 36460,
        note: 'Offer falls inside ₹37K target goal & ₹40K ceiling. Contract signed.',
        tone: 'emerald',
      },
    ],
  },
  practice: {
    id: 'practice',
    label: 'Practice Seat',
    contract: 'PRACTICE DESK · Human Vendor vs AI Buyer',
    modeBadge: 'Human-in-the-Loop',
    floor: 35000,
    ceiling: 40000,
    dealPrice: 37750,
    status: 'AWAITING YOUR MOVE',
    statusTone: 'amber',
    steps: [
      {
        turn: 1,
        side: 'AI Buyer',
        role: 'Collaborative Engine',
        action: 'OPEN BID',
        price: 35800,
        note: 'Orchestrator pauses after Turn 1 and hands desk control to Human Vendor.',
        tone: 'amber',
      },
      {
        turn: '✗',
        side: 'Guardrail',
        role: 'Validation Firewall',
        action: 'BLOCKED 34,000',
        price: 34000,
        note: 'HTTP 422 · Cannot breach Vendor minimum reservation floor of ₹35,000.',
        tone: 'rose',
      },
      {
        turn: 2,
        side: 'Human (You)',
        role: 'Vendor Seat',
        action: 'COUNTER',
        price: 38500,
        note: 'Valid counteroffer inside feasible zone submitted to orchestrator.',
        tone: 'emerald',
      },
      {
        turn: 3,
        side: 'AI Buyer',
        role: 'Collaborative Engine',
        action: 'COUNTER',
        price: 37750,
        note: 'Recalculates concession curve and narrows bid gap to ₹750.',
        tone: 'amber',
      },
    ],
  },
  deadlock: {
    id: 'deadlock',
    label: 'Deadlock Mediator',
    contract: 'IMPASSE PROTOCOL · Aggressive vs Aggressive',
    modeBadge: '4-Step Escalation',
    floor: 35000,
    ceiling: 40000,
    dealPrice: 37500,
    status: 'COMPROMISE RESOLVED',
    statusTone: 'rose',
    steps: [
      {
        turn: 'R1–R3',
        side: 'Both Sides',
        role: 'Hardline Positions',
        action: 'STALLED',
        price: 36000,
        secondaryPrice: 39000,
        note: 'Buyer holds ₹36,000 while Vendor locks at ₹39,000 for 2+ rounds.',
        tone: 'rose',
      },
      {
        turn: 'ALERT',
        side: 'Deadlock Engine',
        role: 'Detector Triggered',
        action: 'SAME_POSITION',
        price: 37500,
        note: 'Escalation Rung 1: Mediator computes exact midpoint ₹37,500 compromise.',
        tone: 'amber',
      },
      {
        turn: 'R4',
        side: 'Settlement',
        role: 'Mediator Adopted',
        action: 'RESOLVED',
        price: 37500,
        note: 'Both agents adopt midpoint proposal inside feasible ZOPA.',
        tone: 'emerald',
      },
    ],
  },
};

/* ─────────────── Scenarios ─────────────── */
const SCENARIOS = [
  {
    id: 'vendor_pricing',
    icon: ShoppingCart,
    code: 'VP-01',
    title: 'Vendor Pricing',
    subtitle: 'Procurement Buyer vs Wholesale Vendor',
    badge: 'Single-Issue',
    metric: '₹35,000 – ₹40,000 INR',
    desc: 'Negotiate wholesale order price while honoring buyer ceiling and supplier cost floor.',
    agent1Role: 'buyer',
    agent1Name: 'Buyer',
    agent2Role: 'vendor',
    agent2Name: 'Vendor',
  },
  {
    id: 'job_offer',
    icon: Briefcase,
    code: 'JO-02',
    title: 'Executive Job Offer',
    subtitle: 'Senior Developer vs Hiring Manager',
    badge: 'Multi-Issue',
    metric: '12 – 15 LPA · 2–3 Remote Days',
    desc: 'Trade off base compensation against weekly remote flexibility across two coupled issues.',
    agent1Role: 'candidate',
    agent1Name: 'Candidate',
    agent2Role: 'hiring',
    agent2Name: 'Manager',
  },
  {
    id: 'project_budget_allocation',
    icon: Coins,
    code: 'PB-03',
    title: 'Q4 Budget Allocation',
    subtitle: 'Project Lead vs Finance Director',
    badge: 'Cap Constraint',
    metric: '₹60L – ₹80L under ₹100L Cap',
    desc: 'Allocate quarterly sprint funding under a strict non-negotiable expenditure cap.',
    agent1Role: 'pm',
    agent1Name: 'Project Lead',
    agent2Role: 'finance',
    agent2Name: 'Finance Dir.',
  },
];

/* ─────────────── Tasks 1-4 Architecture ─────────────── */
const PIPELINE_MODULES = [
  {
    step: 'TASK 01',
    icon: Layers,
    title: 'Scenario & ZOPA Studio',
    text: 'Loads real economic scenarios, configures agent goals/personalities, and verifies mathematical ZOPA feasibility pre-launch.',
  },
  {
    step: 'TASK 02',
    icon: Brain,
    title: 'Orchestrator & Reasoning',
    text: 'Neutral turn referee interleaving LLM reasoning + structured rule fallback with full round/stance tracking.',
  },
  {
    step: 'TASK 03',
    icon: Shield,
    title: 'Guardrails & Counteroffer',
    text: 'Blocks illegal offers breaking reservation floors/ceilings, prevents backwards concessions, and scores multi-issue trade-offs.',
  },
  {
    step: 'TASK 04',
    icon: Handshake,
    title: 'Practice Mode & Deadlock',
    text: 'Hands any agent seat to a human participant while running 4-stage stall detection and midpoint mediation live.',
  },
];

function pct(val, min, max) {
  return Math.max(4, Math.min(96, ((val - min) / (max - min)) * 100));
}

export default function LandingPage({ onStart }) {
  const { isDark } = useTheme();
  const [selectedScenarioId, setSelectedScenarioId] = useState('vendor_pricing');
  const [previewKey, setPreviewKey] = useState('settlement');
  const [visibleSteps, setVisibleSteps] = useState(3);

  const preview = PREVIEW_MODES[previewKey];

  // Reveal remaining steps asynchronously after switching tabs or replaying
  useEffect(() => {
    const total = PREVIEW_MODES[previewKey].steps.length;
    const timers = [];
    for (let i = 2; i <= total; i += 1) {
      timers.push(setTimeout(() => setVisibleSteps(i), (i - 1) * 550));
    }
    return () => timers.forEach(clearTimeout);
  }, [previewKey]);

  const handleSelectPreview = (nextKey) => {
    setVisibleSteps(1);
    setPreviewKey(nextKey);
  };

  const replayPreview = () => {
    setVisibleSteps(1);
    const total = preview.steps.length;
    for (let i = 2; i <= total; i += 1) {
      setTimeout(() => setVisibleSteps(i), (i - 1) * 550);
    }
  };

  const activeStepData = preview.steps[Math.min(visibleSteps, preview.steps.length) - 1] || preview.steps[0];
  const selectedScenarioObj = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  return (
    <div
      className={`min-h-[calc(100vh-65px)] w-full text-left relative overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-[#fafaf9] text-zinc-900'
      }`}
    >
      {/* Subtle architectural hairline grid (no loud blue neon blobs) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle at 85% 15%, rgba(245, 158, 11, 0.06), transparent 45%), radial-gradient(circle at 15% 85%, rgba(16, 185, 129, 0.04), transparent 45%), linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(24,24,27,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.03) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 48px 48px, 48px 48px',
        }}
      />

      {/* ═══════════════ TOP REALISTIC DESK TAPE ═══════════════ */}
      <div
        className={`relative z-10 border-b text-[11px] font-mono ${
          isDark ? 'bg-zinc-950/90 border-zinc-800/80 text-zinc-400' : 'bg-white border-stone-200 text-zinc-600'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`font-bold tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
              DEAL DESK ONLINE
            </span>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            {DESK_METRICS.map((m) => (
              <div key={m.key} className="flex items-center gap-2">
                <span className="opacity-60">{m.key}</span>
                <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{m.val}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    m.tone === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : m.tone === 'rose'
                      ? 'bg-rose-500/15 text-rose-500'
                      : 'bg-amber-500/15 text-amber-500'
                  }`}
                >
                  {m.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-16 relative z-10">
        {/* ════════════════════════════════════════════════════════
            SPLIT EXECUTIVE WORKSPACE HERO (NO BIG BLUE CENTERED TITLE)
           ════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* ── LEFT COLUMN: Editorial Thesis + Quick Contract Desk (6 cols) ── */}
          <div className="lg:col-span-6 space-y-6 pt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border text-[11px] font-mono font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-500 border-amber-500/25">
              <Terminal className="w-3.5 h-3.5" />
              <span>Multi-Agent Commercial Bargaining Workbench</span>
            </div>

            <h1
              className={`text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.12] ${
                isDark ? 'text-zinc-50' : 'text-zinc-900'
              }`}
            >
              Simulate high-stakes deals{' '}
              <span className="text-amber-500">before putting real numbers</span>{' '}
              on the table.
            </h1>

            <p className={`text-sm sm:text-[15px] leading-relaxed max-w-xl ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Pit autonomous AI agents with calibrated risk profiles against each other — or step directly into the{' '}
              <strong className={isDark ? 'text-zinc-200' : 'text-zinc-900'}>Practice Seat</strong> yourself while mathematical ZOPA guardrails and 4-stage deadlock mediation oversee every round.
            </p>

            {/* Quick Contract Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  Select a Real-World Contract to Launch
                </span>
                <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                  269 Automated Checks Passing
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SCENARIOS.map((sc) => {
                  const IconComp = sc.icon;
                  const active = selectedScenarioId === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(sc.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? isDark
                            ? 'bg-zinc-900 border-amber-500/70 ring-1 ring-amber-500/30 shadow-lg shadow-amber-500/5'
                            : 'bg-white border-amber-600 ring-1 ring-amber-500/30 shadow-md'
                          : isDark
                          ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                          : 'bg-white/70 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <IconComp className={`w-4 h-4 ${active ? 'text-amber-500' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                        <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                          {sc.code}
                        </span>
                      </div>
                      <div className={`text-xs font-bold leading-snug mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {sc.title}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-500 font-semibold truncate">
                        {sc.metric}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onStart && onStart(selectedScenarioObj)}
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Open {selectedScenarioObj.title}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onStart && onStart()}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800'
                    : 'bg-white border-stone-300 text-zinc-800 hover:bg-stone-100'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Compare All 3 Scenarios</span>
              </button>
            </div>

            {/* Compact Realistic Highlights */}
            <div className={`grid grid-cols-3 gap-4 pt-4 border-t ${isDark ? 'border-zinc-800/80' : 'border-stone-200'}`}>
              <div>
                <div className="text-base font-extrabold font-mono text-amber-500">ZOPA</div>
                <div className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Hard floor & ceiling enforcement
                </div>
              </div>
              <div>
                <div className="text-base font-extrabold font-mono text-emerald-500">PRACTICE</div>
                <div className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Take any seat against AI opponent
                </div>
              </div>
              <div>
                <div className="text-base font-extrabold font-mono text-rose-500">DEADLOCK</div>
                <div className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Auto midpoint & 4-rung escalation
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Interactive Live Deal Monitor (6 cols) ── */}
          <div className="lg:col-span-6">
            <div
              className={`rounded-2xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-stone-200 shadow-stone-300/40'
              }`}
            >
              {/* Monitor Title Bar */}
              <div
                className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                  isDark ? 'bg-zinc-950/80 border-zinc-800' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className={`text-[11px] font-mono font-bold tracking-wide ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    LIVE DESK PREVIEW
                  </span>
                </div>

                {/* Mode Switcher Tabs inside Monitor */}
                <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-stone-100 border-stone-200'}`}>
                  {Object.values(PREVIEW_MODES).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectPreview(m.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        previewKey === m.id
                          ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                          : isDark
                          ? 'text-zinc-400 hover:text-zinc-200'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monitor Contract Header & ZOPA Range Gauge */}
              <div className="p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {preview.contract}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                          preview.statusTone === 'emerald'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : preview.statusTone === 'rose'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        }`}
                      >
                        {preview.statusTone === 'emerald' && <CheckCircle2 className="w-3 h-3" />}
                        {preview.statusTone === 'rose' && <ShieldAlert className="w-3 h-3" />}
                        {preview.statusTone === 'amber' && <Sliders className="w-3 h-3" />}
                        {preview.status}
                      </span>
                      <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {preview.modeBadge}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={replayPreview}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        : 'bg-stone-50 border-stone-200 text-zinc-700 hover:bg-stone-100'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3 text-amber-500" />
                    <span>Replay</span>
                  </button>
                </div>

                {/* Live ZOPA Corridor Bar */}
                <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-stone-50 border-stone-200'}`}>
                  <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                    <span className="text-emerald-500 font-bold">Vendor Floor: ₹35,000</span>
                    <span className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                      Active Bid: <strong className={isDark ? 'text-white' : 'text-zinc-900'}>₹{activeStepData.price.toLocaleString()}</strong>
                    </span>
                    <span className="text-amber-500 font-bold">Buyer Max: ₹40,000</span>
                  </div>

                  <div className={`relative h-3 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`}>
                    {/* Feasible Deal Zone Fill */}
                    <div className="absolute inset-y-0 left-[15%] right-[15%] bg-emerald-500/20 border-x border-emerald-500/40" />
                    {/* Live Active Marker */}
                    <div
                      className="absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)] transition-all duration-500"
                      style={{ left: `${pct(activeStepData.price, 33500, 41500)}%` }}
                    />
                  </div>
                </div>

                {/* Turn-by-Turn Realistic Ledger */}
                <div className="space-y-2.5 min-h-[250px]">
                  {preview.steps.slice(0, visibleSteps).map((step, idx) => (
                    <div
                      key={`${previewKey}-${idx}`}
                      className={`p-3 rounded-xl border transition-all animate-fade-in ${
                        step.tone === 'rose'
                          ? isDark
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : 'bg-rose-50 border-rose-200'
                          : step.tone === 'emerald'
                          ? isDark
                            ? 'bg-emerald-950/15 border-emerald-500/25'
                            : 'bg-emerald-50/60 border-emerald-200'
                          : isDark
                          ? 'bg-zinc-950/60 border-zinc-800'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-stone-200 text-zinc-700'
                            }`}
                          >
                            {typeof step.turn === 'number' ? `T${step.turn}` : step.turn}
                          </span>
                          <span className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                            {step.side}
                          </span>
                          <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            · {step.role}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              step.tone === 'rose'
                                ? 'bg-rose-500/15 text-rose-500'
                                : step.tone === 'emerald'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-amber-500/15 text-amber-500'
                            }`}
                          >
                            {step.action}
                          </span>
                          <span className={`text-xs font-mono font-extrabold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            ₹{step.price.toLocaleString()}
                            {step.secondaryPrice ? ` ↔ ₹${step.secondaryPrice.toLocaleString()}` : ''}
                          </span>
                        </div>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {step.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            SCENARIO ARENA CARDS (COMPACT EXECUTIVE TICKETS)
           ════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-500">
                Economic Scenarios
              </span>
              <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight mt-1 ${isDark ? 'text-zinc-50' : 'text-zinc-900'}`}>
                Configured Bargaining Arenas
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onStart && onStart()}
              className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>Step 1 · Select Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SCENARIOS.map((sc) => {
              const IconComp = sc.icon;
              return (
                <div
                  key={sc.id}
                  onClick={() => onStart && onStart(sc)}
                  className={`group rounded-2xl border p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isDark
                      ? 'bg-zinc-900/60 border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900'
                      : 'bg-white border-stone-200 hover:border-amber-500 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-500 flex items-center justify-center">
                        <IconComp className="w-4.5 h-4.5" />
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isDark ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : 'bg-stone-100 text-zinc-600 border-stone-200'
                        }`}
                      >
                        {sc.badge}
                      </span>
                    </div>

                    <h3 className={`text-base font-bold mb-0.5 group-hover:text-amber-500 transition-colors ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                      {sc.title}
                    </h3>
                    <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{sc.subtitle}</p>
                    <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{sc.desc}</p>
                  </div>

                  <div className="space-y-3">
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isDark ? 'bg-zinc-950/70 border-zinc-800/80' : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <AgentAvatar role={sc.agent1Role} size="xs" />
                        <span className="font-semibold text-[11px]">{sc.agent1Name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">vs</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[11px]">{sc.agent2Name}</span>
                        <AgentAvatar role={sc.agent2Role} size="xs" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <span className="text-emerald-500 font-bold">{sc.metric}</span>
                      <span className="inline-flex items-center gap-1 font-sans font-semibold text-amber-500 group-hover:translate-x-0.5 transition-transform">
                        Configure <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════
            TASKS 1–4 SYSTEM ARCHITECTURE & ARCHETYPES
           ════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div
              className={`rounded-2xl border p-6 h-full ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-stone-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-500">
                    End-to-End Platform
                  </span>
                  <h2 className={`text-lg font-extrabold mt-0.5 ${isDark ? 'text-zinc-50' : 'text-zinc-900'}`}>
                    Core Simulator Pipeline (Tasks 1 – 4)
                  </h2>
                </div>
                <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-emerald-400' : 'bg-stone-50 border-stone-200 text-emerald-700'
                }`}>
                  <Lock className="w-3 h-3" /> Invariant Checked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PIPELINE_MODULES.map((mod) => {
                  const IconComp = mod.icon;
                  return (
                    <div
                      key={mod.step}
                      className={`p-4 rounded-xl border ${
                        isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-mono font-bold text-amber-500">{mod.step}</span>
                        <IconComp className="w-4 h-4 text-zinc-400" />
                      </div>
                      <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{mod.title}</h3>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{mod.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Behavioral Archetypes Calibration Card */}
          <div className="lg:col-span-4">
            <div
              className={`rounded-2xl border p-6 h-full flex flex-col justify-between ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-stone-200 shadow-sm'
              }`}
            >
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-500">
                  Behavioral Calibration
                </span>
                <h2 className={`text-lg font-extrabold mt-0.5 mb-4 ${isDark ? 'text-zinc-50' : 'text-zinc-900'}`}>
                  Agent Personalities
                </h2>

                <div className="space-y-3.5">
                  {[
                    { Icon: Flame, name: 'Aggressive', tag: 'Anchor 95% · Flex 15%', color: 'text-rose-500', bar: 'bg-rose-500', pct: 95 },
                    { Icon: Users, name: 'Collaborative', tag: 'Anchor 60% · Flex 80%', color: 'text-amber-500', bar: 'bg-amber-500', pct: 60 },
                    { Icon: Shield, name: 'Risk-Averse', tag: 'Anchor 40% · Flex 90%', color: 'text-emerald-500', bar: 'bg-emerald-500', pct: 40 },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className={`p-3 rounded-xl border ${
                        isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <p.Icon className={`w-4 h-4 ${p.color}`} />
                          <span className={`text-xs font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{p.name}</span>
                        </div>
                        <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.tag}</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`}>
                        <div className={`h-full rounded-full ${p.bar}`} style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onStart && onStart(selectedScenarioObj)}
                className="mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enter Simulation Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
