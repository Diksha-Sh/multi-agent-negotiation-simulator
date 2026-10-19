import { useState } from 'react';
import { VendorBanner, JobOfferBanner, BudgetBanner } from './ScenarioBanners';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/* ────────────────────────── Scenario Visual Themes ────────────────────────── */
const SCENARIO_THEMES = {
  vendor_pricing: {
    banner: <VendorBanner className="w-full h-44" />,
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    borderActive: 'border-blue-600 ring-2 ring-blue-500/30 shadow-lg',
    tag: 'Procurement · Bulk Price',
    pitch: 'Bargain wholesale order prices in ₹ INR while testing vendor profit margin resistance.',
    agent1Role: 'buyer',
    agent1Title: 'Procurement Buyer',
    agent2Role: 'vendor',
    agent2Title: 'Sales Vendor',
    metric: 'Purchase Price in ₹ INR',
    targetSpread: '₹220 – ₹300 per unit',
  },
  job_offer: {
    banner: <JobOfferBanner className="w-full h-44" />,
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    borderActive: 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-lg',
    tag: 'Career · Salary & Remote',
    pitch: 'Negotiate senior developer compensation package in LPA and weekly remote workdays.',
    agent1Role: 'candidate',
    agent1Title: 'Software Developer',
    agent2Role: 'hiring',
    agent2Title: 'Engineering Manager',
    metric: 'Annual LPA + Remote Days',
    targetSpread: '12 – 15 LPA · 2-3 Days/Wk',
  },
  project_budget_allocation: {
    banner: <BudgetBanner className="w-full h-44" />,
    badge: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    borderActive: 'border-purple-600 ring-2 ring-purple-500/30 shadow-lg',
    tag: 'Corporate · Capital Reserve',
    pitch: 'Distribute critical team sprint funding without exceeding the corporate 100 Lakh cap.',
    agent1Role: 'pm',
    agent1Title: 'Project Lead',
    agent2Role: 'finance',
    agent2Title: 'Finance Director',
    metric: 'Sprint Allocation under 100L Cap',
    targetSpread: '60L - 80L Activity Allocation',
  },
};

export default function ScenarioSelectionScreen({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onContinue,
}) {
  const { isDark } = useTheme();
  const currentId = selectedScenario?.id || scenarios[0]?.id || 'vendor_pricing';
  const activeTheme = SCENARIO_THEMES[currentId] || SCENARIO_THEMES.vendor_pricing;

  return (
    <div
      className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-left transition-colors duration-200 ${
        isDark ? 'text-slate-100' : 'text-slate-900'
      }`}
    >
      {/* ── Page Header ── */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-4 bg-blue-500/10 text-blue-500 border-blue-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Step 1 of 3 · Select Negotiation Arena
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
          Choose Your Arena
        </h1>
        <p className={`text-xs sm:text-sm max-w-xl mx-auto font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Selecting a scenario dynamically configures agents, reservation boundaries, and objective constraints.
        </p>
      </div>

      {/* ── 3 Visual Scenario Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {scenarios.map((scenario) => {
          const theme = SCENARIO_THEMES[scenario.id] || SCENARIO_THEMES.vendor_pricing;
          const isSelected = (selectedScenario?.id || currentId) === scenario.id;

          return (
            <div
              key={scenario.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectScenario(scenario)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectScenario(scenario);
                }
              }}
              className={cn(
                'group relative flex flex-col justify-between rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden border',
                isSelected
                  ? cn(
                      theme.borderActive,
                      isDark ? 'bg-[#0f1420] scale-[1.01]' : 'bg-white scale-[1.01] shadow-md'
                    )
                  : isDark
                  ? 'bg-[#0f1420]/80 border-slate-800 hover:border-slate-700 hover:bg-[#121826] hover:-translate-y-1 shadow-lg'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 hover:-translate-y-1 shadow-sm'
              )}
            >
              {/* Top Banner */}
              <div className="relative">
                {theme.banner}
                <div className="absolute top-3 right-3 z-10">
                  <span className={cn('text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm backdrop-blur-md', theme.badge)}>
                    {theme.tag}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-2 group-hover:text-blue-500 transition-colors">
                    {scenario.title}
                  </h2>
                  <p className={`text-xs leading-relaxed mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {theme.pitch}
                  </p>

                  {/* Stakeholders Face-off Avatars */}
                  <div
                    className={`rounded-xl p-3 mb-5 border ${
                      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Participating Agents
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <AgentAvatar role={theme.agent1Role} size="sm" />
                        <span className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {theme.agent1Title}
                        </span>
                      </div>
                      <span className={`text-xs font-black px-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        VS
                      </span>
                      <div className="flex items-center gap-2 min-w-0 justify-end">
                        <span className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {theme.agent2Title}
                        </span>
                        <AgentAvatar role={theme.agent2Role} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Status */}
                <div
                  className={`pt-3 border-t flex items-center justify-between ${
                    isDark ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {scenario.max_rounds || 10} Max Rounds
                  </span>

                  <span
                    className={cn(
                      'text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200 group-hover:text-slate-900'
                    )}
                  >
                    {isSelected ? '✓ Selected' : 'Select →'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Selected Arena Spotlight & Continue Bar ── */}
      {selectedScenario && (
        <div
          className={`rounded-2xl border p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 transition-all ${
            isDark
              ? 'bg-[#0f1420] border-blue-500/30'
              : 'bg-white border-blue-300 shadow-md'
          }`}
        >
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="flex -space-x-3 shrink-0">
              <AgentAvatar role={activeTheme.agent1Role} size="md" className={isDark ? 'ring-2 ring-slate-900' : 'ring-2 ring-white'} />
              <AgentAvatar role={activeTheme.agent2Role} size="md" className={isDark ? 'ring-2 ring-slate-900' : 'ring-2 ring-white'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                  Ready to Configure
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <h3 className="text-lg font-black">
                {selectedScenario.title}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {activeTheme.agent1Title} vs {activeTheme.agent2Title} · {activeTheme.targetSpread}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onContinue && onContinue(selectedScenario)}
            className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30 cursor-pointer shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Proceed to Agent Setup</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
