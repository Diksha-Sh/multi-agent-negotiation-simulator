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
  const currentScenario = selectedScenario || scenarios[0];
  const currentId = currentScenario?.id || 'vendor_pricing';
  const roles = SCENARIO_ROLES[currentId] || SCENARIO_ROLES.vendor_pricing;

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* ── Page Header ── */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider mb-4 bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
          <Layers className="w-3.5 h-3.5" />
          <span>Step 1 of 3 · Select Negotiation Arena</span>
        </div>
        <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Choose Your Arena
        </h1>
        <p className={`text-xs sm:text-sm max-w-lg mx-auto font-normal leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Selecting a scenario dynamically loads agent parameters, reservation boundaries, and objective constraints.
        </p>
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
            ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700/80'
            : 'bg-white border-slate-200/90 shadow-slate-200/50 hover:border-slate-300'
        }`}>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex -space-x-3 shrink-0">
              <AgentAvatar role={roles.agent1Role} size="md" className={isDark ? "ring-2 ring-slate-900" : "ring-2 ring-white"} />
              <AgentAvatar role={roles.agent2Role} size="md" className={isDark ? "ring-2 ring-slate-900" : "ring-2 ring-white"} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                  Ready to Configure
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {currentScenario.title}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {roles.agent1Title} vs {roles.agent2Title} · {roles.targetSpread}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onContinue && onContinue(currentScenario)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Proceed to Agent Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
