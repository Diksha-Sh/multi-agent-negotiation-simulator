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
    targetSpread: '12 – 15 LPA · 2–3 Remote Days',
  },
  project_budget_allocation: {
    agent1Role: 'pm',
    agent1Title: 'Project Lead',
    agent2Role: 'finance',
    agent2Title: 'Finance Director',
    targetSpread: '₹60L – ₹80L (Cap ₹100L)',
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
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left relative z-10 ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mb-4 ${
            isDark
              ? 'bg-[#131B4B] text-[#1CD4A3] border-[#1CD4A3]/30'
              : 'bg-white text-[#0E153A] border-[#0E153A]/15'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#EE2A54]" />
          <span>Step 1 · Select Arena</span>
        </div>
        <h1 className={`text-3xl sm:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
          Choose Your Negotiation Arena
        </h1>
        <p className={`text-sm sm:text-base max-w-lg mx-auto leading-relaxed ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
          Pick any scenario below to customize personalities, reservation limits, or jump straight into Voice Practice Mode.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      {currentScenario && (
        <div
          className={`liquid-glass rounded-2xl border p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 transition-all ${
            isDark
              ? 'bg-[#131B4B]/90 border-white/15'
              : 'bg-white border-[#0E153A]/15'
          }`}
        >
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex -space-x-3 shrink-0">
              <AgentAvatar role={roles.agent1Role} size="md" className={isDark ? 'ring-2 ring-[#131B4B]' : 'ring-2 ring-white'} />
              <AgentAvatar role={roles.agent2Role} size="md" className={isDark ? 'ring-2 ring-[#131B4B]' : 'ring-2 ring-white'} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#1CD4A3]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#1CD4A3]">
                  Ready to Configure
                </span>
              </div>
              <h3 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                {currentScenario.title}
              </h3>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
                {roles.agent1Title} vs {roles.agent2Title} · {roles.targetSpread}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onContinue && onContinue(currentScenario)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-[#EE2A54] hover:bg-[#d62249] transition-all shadow-[0_6px_22px_rgba(238,42,84,0.45)] cursor-pointer shrink-0"
          >
            <span>Configure Agents</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
