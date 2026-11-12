import { Layers, ArrowRight, CheckCircle2 } from 'lucide-react';
import ScenarioCard from './ScenarioCard';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

const SCENARIO_ROLES = {
  vendor_pricing: {
    agent1Role: 'buyer',
    agent1Title: 'Procurement Buyer',
    agent2Role: 'vendor',
    agent2Title: 'Sales Vendor',
    targetSpread: '₹35,000 – ₹40,000 INR',
  },
  job_offer: {
    agent1Role: 'candidate',
    agent1Title: 'Software Developer',
    agent2Role: 'hiring',
    agent2Title: 'Engineering Manager',
    targetSpread: '12 – 15 LPA · 2-3 Remote Days',
  },
  project_budget_allocation: {
    agent1Role: 'pm',
    agent1Title: 'Project Lead',
    agent2Role: 'finance',
    agent2Title: 'Finance Director',
    targetSpread: '₹60L – ₹80L under 100L Cap',
  },
};

export default function ScenarioSelectionScreen({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onContinue,
}) {
  const { isDark } = useTheme();
  const currentScenario = scenarios.find((scenario) => scenario.id === selectedScenario?.id) || scenarios[0];
  const currentId = currentScenario?.id || 'vendor_pricing';
  const roles = SCENARIO_ROLES[currentId] || SCENARIO_ROLES.vendor_pricing;

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-zinc-800/30">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border text-[11px] font-mono font-semibold uppercase tracking-wider mb-3 bg-amber-500/10 text-amber-500 border-amber-500/25">
            <Layers className="w-3.5 h-3.5" />
            <span>Step 1 of 3 · Contract & Arena Selection</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDark ? 'text-zinc-50' : 'text-zinc-900'}`}>
            Choose Bargaining Arena
          </h1>
          <p className={`text-xs sm:text-sm mt-1.5 max-w-xl font-normal leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Each contract loads calibrated agent objectives, hard reservation bounds, and ZOPA overlap limits.
          </p>
        </div>
        <div className={`text-xs font-mono px-3 py-1.5 rounded-lg border self-start md:self-auto ${
          isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-stone-200 text-zinc-600'
        }`}>
          {scenarios.length} Verified Contracts Loaded
        </div>
      </div>

      {/* ── Compact Systematic 3-Column Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {scenarios.map((scenario) => {
          const isSelected = (selectedScenario?.id || currentId) === scenario.id;
          return (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isSelected={isSelected}
              onSelect={onSelectScenario}
            />
          );
        })}
      </div>

      {/* ── Bottom Selected Arena Spotlight & Continue Bar ── */}
      {currentScenario && (
        <div className={`rounded-2xl backdrop-blur-xl border p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${
          isDark
            ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
            : 'bg-white border-stone-200 shadow-stone-200/50 hover:border-stone-300'
        }`}>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex -space-x-3 shrink-0">
              <AgentAvatar role={roles.agent1Role} size="md" className={isDark ? "ring-2 ring-zinc-900" : "ring-2 ring-white"} />
              <AgentAvatar role={roles.agent2Role} size="md" className={isDark ? "ring-2 ring-zinc-900" : "ring-2 ring-white"} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                  Contract Ready to Configure
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {currentScenario.title}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {roles.agent1Title} vs {roles.agent2Title} · <span className="font-mono text-amber-500 font-semibold">{roles.targetSpread}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onContinue && onContinue(currentScenario)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all shadow-lg shadow-amber-500/20 cursor-pointer shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Proceed to Agent Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
