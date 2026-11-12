import {
  Zap,
  ArrowRight,
  Layers,
  Scale,
  Sliders,
  Play,
  ShoppingCart,
  Briefcase,
  Coins,
  Bot,
  Activity,
  Code2,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

const WORKFLOW_STEPS = [
  { step: '01', icon: Layers, title: 'Pick Arena', text: 'Select an economic bargaining scenario' },
  { step: '02', icon: Sliders, title: 'Tune Agents', text: 'Assign goals, limits & negotiation personalities' },
  { step: '03', icon: Scale, title: 'Verify ZOPA', text: 'Mathematical overlap confirmation' },
  { step: '04', icon: Play, title: 'Run & Export', text: 'Simulate rounds & export audit-ready JSON' },
];

const SCENARIOS = [
  {
    id: 'vendor_pricing',
    icon: ShoppingCart,
    title: 'Vendor Pricing Negotiation',
    subtitle: 'Procurement Buyer vs Wholesale Supplier',
    badge: 'Single-Issue · Price',
    metric: '₹35,000 – ₹40,000 INR',
    desc: 'Bargain wholesale unit pricing in ₹ INR while preserving supplier profit margin thresholds.',
    agent1Role: 'buyer',
    agent1Name: 'Buyer (Procurement)',
    agent2Role: 'vendor',
    agent2Name: 'Vendor (Sales)',
  },
  {
    id: 'job_offer',
    icon: Briefcase,
    title: 'Job Offer Negotiation',
    subtitle: 'Software Engineer vs Engineering Manager',
    badge: 'Multi-Issue · Salary & Remote',
    metric: '12 – 15 LPA · 2-3 Remote Days',
    desc: 'Balance base compensation against weekly remote flexibility within corporate compensation bands.',
    agent1Role: 'candidate',
    agent1Name: 'Candidate (Developer)',
    agent2Role: 'hiring',
    agent2Name: 'Manager (Engineering)',
  },
  {
    id: 'project_budget_allocation',
    icon: Coins,
    title: 'Project Budget Allocation',
    subtitle: 'Project Lead vs Finance Director',
    badge: 'Resource Split · Cap',
    metric: '₹100 Lakh Total Pool',
    desc: 'Distribute critical quarterly capital across engineering sprints under a strict cap.',
    agent1Role: 'pm',
    agent1Name: 'Project Lead',
    agent2Role: 'finance',
    agent2Name: 'Finance Director',
  },
];

const HIGHLIGHTS = [
  {
    icon: Bot,
    title: '3 Dynamic Personalities',
    desc: 'Configure Aggressive, Collaborative, or Risk-Averse archetypes with calibrated behavioral weights.',
  },
  {
    icon: Scale,
    title: 'Mathematical ZOPA Bounds',
    desc: 'Inviolable reservation floors and ceilings with real-time overlap validation before execution.',
  },
  {
    icon: Activity,
    title: 'Pre-Flight Conflict Forecast',
    desc: 'Predict deal probability and impasse likelihood before agents exchange their opening proposal.',
  },
  {
    icon: Code2,
    title: 'Orchestrator Contract Ready',
    desc: 'Export structured JSON payloads seamlessly for downstream multi-agent simulation loops.',
  },
];

export default function LandingPage({ onStart }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-[calc(100vh-65px)] w-full py-12 px-4 sm:px-6 lg:px-8 text-left relative overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── Ambient Radial Glow ── */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[140px] pointer-events-none ${
          isDark
            ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent'
            : 'bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent'
        }`}
      />

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        
        {/* ═══════════════════════ HERO BANNER ═══════════════════════ */}
        <div className="pt-4 pb-2 text-center max-w-3xl mx-auto">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider mb-5 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-Agent Scenario & Configuration Engine</span>
          </div>

          {/* Headline */}
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-5 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            Multi-Agent Negotiation{' '}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 bg-clip-text text-transparent">
              Simulator
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8 font-normal ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Configure autonomous AI agents with calibrated behavioral personalities, verify mathematical ZOPA feasibility, and preview strategic convergence.
          </p>

          {/* Action Button */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Launch Arena Selection</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Ribbon */}
          <div
            className={`mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border transition-colors ${
              isDark
                ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-xl'
                : 'bg-white/90 backdrop-blur-xl border-slate-200 shadow-md'
            }`}
          >
            <div className="text-center p-2">
              <span className="block text-2xl font-black text-indigo-500">3</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Pre-built Scenarios
              </span>
            </div>
            <div className="text-center p-2">
              <span className="block text-2xl font-black text-emerald-500">3</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Agent Personalities
              </span>
            </div>
            <div className="text-center p-2">
              <span className="block text-2xl font-black text-sky-500">100%</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Mathematical ZOPA
              </span>
            </div>
            <div className="text-center p-2">
              <span className="block text-2xl font-black text-purple-500">28 / 28</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Validation Rules
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ STEP PIPELINE FLOW ═══════════════════════ */}
        <div>
          <div className="text-center mb-8">
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              How the Simulator Works
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              End-to-end execution flow from scenario selection to downstream contract handover
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW_STEPS.map((s) => {
              const IconComponent = s.icon;
              return (
                <div
                  key={s.step}
                  className={`p-5 rounded-2xl border transition-all ${
                    isDark
                      ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-slate-100'
                      : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md text-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        isDark ? 'bg-slate-800/80 text-slate-400 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {s.step}
                    </span>
                  </div>
                  <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {s.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {s.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════ 3 SCENARIOS PREVIEW ═══════════════════════ */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                Pre-built Negotiation Arenas
              </h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Calibrated economic models with defined goals, reservation limits, and agent pairs
              </p>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
            >
              <span>Explore All Arenas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SCENARIOS.map((sc) => {
              const IconComponent = sc.icon;
              return (
                <div
                  key={sc.id}
                  className={`rounded-2xl border transition-all duration-300 p-5 flex flex-col justify-between ${
                    isDark
                      ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] text-slate-100'
                      : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg text-slate-900 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isDark ? 'bg-slate-800/60 text-slate-400 border-slate-700/60' : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {sc.badge}
                      </span>
                    </div>

                    <h3 className={`text-base font-bold mb-1 leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {sc.title}
                    </h3>
                    <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {sc.subtitle}
                    </p>
                    <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {sc.desc}
                    </p>

                    {/* Agent Pair Matchup */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-4 ${
                        isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AgentAvatar role={sc.agent1Role} size="xs" />
                        <span className={`font-medium truncate text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {sc.agent1Name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        VS
                      </span>
                      <div className="flex items-center gap-2 min-w-0 justify-end">
                        <span className={`font-medium truncate text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {sc.agent2Name}
                        </span>
                        <AgentAvatar role={sc.agent2Role} size="xs" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => onStart && onStart(sc)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                        isDark
                          ? 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border-slate-700/80 hover:border-transparent'
                          : 'bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white border-slate-300 hover:border-transparent'
                      }`}
                    >
                      <span>Configure Arena</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════ ARCHITECTURAL HIGHLIGHTS ═══════════════════════ */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 transition-colors ${
            isDark
              ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 shadow-xl'
              : 'bg-white border-slate-200 shadow-md'
          }`}
        >
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Core Platform Architecture
            </h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Engineered with clean separation of concerns and deterministic validation rules
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HIGHLIGHTS.map((h) => {
              const IconComponent = h.icon;
              return (
                <div key={h.title} className="text-left space-y-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{h.title}</h4>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {h.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}