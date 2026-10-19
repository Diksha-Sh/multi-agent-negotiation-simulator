import { VendorBanner, JobOfferBanner, BudgetBanner } from './ScenarioBanners';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SCENARIOS = [
  {
    id: 'vendor_pricing',
    number: '01',
    emoji: '🛍️',
    title: 'Vendor Pricing Negotiation',
    subtitle: 'Procurement Buyer vs Wholesale Supplier',
    banner: <VendorBanner className="w-full h-40" />,
    badge: 'Single-Issue · Price',
    metric: '₹220 – ₹300 per unit',
    desc: 'Bargain wholesale unit pricing in ₹ INR while preserving supplier profit margin thresholds.',
    agent1Role: 'buyer',
    agent1Name: 'Buyer (Procurement)',
    agent2Role: 'vendor',
    agent2Name: 'Vendor (Sales)',
  },
  {
    id: 'job_offer',
    number: '02',
    emoji: '💼',
    title: 'Job Offer Negotiation',
    subtitle: 'Software Engineer vs Engineering Manager',
    banner: <JobOfferBanner className="w-full h-40" />,
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
    number: '03',
    emoji: '💰',
    title: 'Project Budget Allocation',
    subtitle: 'Project Lead vs Finance Director',
    banner: <BudgetBanner className="w-full h-40" />,
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
    icon: '🦁',
    title: '3 Dynamic Personalities',
    desc: 'Configure Aggressive, Collaborative, or Risk-Averse archetypes with calibrated behavioral weights.',
  },
  {
    icon: '⚖️',
    title: 'Mathematical ZOPA Bounds',
    desc: 'Inviolable reservation floors and ceilings with real-time overlap validation before execution.',
  },
  {
    icon: '🔮',
    title: 'Pre-Flight Conflict Forecast',
    desc: 'Predict deal probability and impasse likelihood before agents exchange their opening proposal.',
  },
  {
    icon: '📡',
    title: 'Orchestrator Contract Ready',
    desc: 'Export structured JSON payloads seamlessly for downstream multi-agent simulation loops.',
  },
];

const WORKFLOW_STEPS = [
  { step: '01', icon: '🎯', title: 'Pick Arena', text: 'Select an economic bargaining scenario' },
  { step: '02', icon: '🤖', title: 'Tune Agents', text: 'Assign goals, limits & negotiation personalities' },
  { step: '03', icon: '⚖️', title: 'Verify ZOPA', text: 'Mathematical overlap confirmation' },
  { step: '04', icon: '🚀', title: 'Run & Export', text: 'Simulate rounds & export audit-ready JSON' },
];

export default function LandingPage({ currentUser, onStart }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-[calc(100vh-65px)] w-full py-10 px-4 sm:px-6 lg:px-8 text-left transition-colors duration-200 relative overflow-hidden ${
        isDark ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── Ambient Radial Glow ── */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[380px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-blue-600/[0.05]' : 'bg-blue-500/[0.07]'
        }`}
      />

      <div className="max-w-6xl mx-auto space-y-16 relative z-10">
        
        {/* ═══════════════════════ CLEAN HERO (NO WEIRD FLOATING LABELS) ═══════════════════════ */}
        <div className="pt-4 pb-2 text-center max-w-3xl mx-auto">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mb-5 bg-blue-500/10 text-blue-500 border-blue-500/25">
            <span>⚡</span>
            <span>Task 1 · Scenario & Agent Configuration Engine</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] mb-5">
            Multi-Agent Negotiation{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 bg-clip-text text-transparent">
              Simulator
            </span>
          </h1>

          {/* Crisp, Direct Description */}
          <p
            className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8 font-normal ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            Configure autonomous AI agents with calibrated behavioral personalities, verify mathematical ZOPA feasibility, and preview strategic convergence.
          </p>

          {/* Action Hub Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>Launch Arena Selection</span>
              <span>→</span>
            </button>
          </div>

          {/* Stats Ribbon */}
          <div
            className={`mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl border ${
              isDark
                ? 'bg-[#0f1420]/80 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="text-center p-2">
              <span className="block text-xl font-black text-blue-500">3</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Pre-built Scenarios
              </span>
            </div>
            <div className="text-center p-2">
              <span className="block text-xl font-black text-emerald-500">3</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Agent Personalities
              </span>
            </div>
            <div className="text-center p-2">
              <span className="block text-xl font-black text-indigo-500">100%</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Mathematical ZOPA
              </span>
            </div>
            <div className="text-center p-2">
              <span className="block text-xl font-black text-sky-500">28 / 28</span>
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Validation Rules
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════ STEP PIPELINE FLOW ═══════════════════════ */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-lg font-bold tracking-tight">How the Simulator Works</h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              End-to-end execution flow from scenario selection to downstream contract handover
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW_STEPS.map((s) => (
              <div
                key={s.step}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#0f1420] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold mb-1">{s.title}</h3>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════ 3 SCENARIO PREVIEW CARDS ═══════════════════════ */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-black tracking-tight">Pre-built Negotiation Scenarios</h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Tested economic models with defined goals, reservation limits, and agent pairs
              </p>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors cursor-pointer self-start sm:self-auto"
            >
              Configure in Arena →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-200 ${
                  isDark
                    ? 'bg-[#0f1420] border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div>
                  {/* Banner SVG */}
                  <div className="w-full overflow-hidden border-b border-slate-800/40">
                    {sc.banner}
                  </div>

                  <div className="p-5">
                    {/* Badge */}
                    <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2 bg-blue-500/10 text-blue-500 border border-blue-500/20">
                      {sc.badge}
                    </span>

                    <h3 className="text-base font-bold tracking-tight mb-1">
                      {sc.title}
                    </h3>
                    <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {sc.subtitle}
                    </p>

                    <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {sc.desc}
                    </p>

                    {/* Agent Pair */}
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <AgentAvatar role={sc.agent1Role} size="xs" />
                        <span className="font-semibold text-[11px]">{sc.agent1Name}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        VS
                      </span>
                      <div className="flex items-center gap-1.5">
                        <AgentAvatar role={sc.agent2Role} size="xs" />
                        <span className="font-semibold text-[11px]">{sc.agent2Name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    type="button"
                    onClick={onStart}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer bg-blue-600 text-white hover:bg-blue-500 border-transparent shadow-sm"
                  >
                    Select Scenario
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════ ARCHITECTURAL HIGHLIGHTS ═══════════════════════ */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 ${
            isDark ? 'bg-[#0f1420] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-lg font-bold tracking-tight">Core System Architecture</h2>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Engineered with clean separation of concerns and robust backend validation
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="text-left space-y-2">
                <span className="text-2xl block">{h.icon}</span>
                <h4 className="text-sm font-bold">{h.title}</h4>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {h.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}