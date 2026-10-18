import ScenarioCard from './ScenarioCard';

export default function ScenarioSelectionScreen({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onContinue,
}) {
  const isContinueDisabled = !selectedScenario;

  const handleContinueClick = () => {
    if (selectedScenario && onContinue) {
      onContinue(selectedScenario);
    }
  };

  return (
    <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left" aria-labelledby="screen-title">
      <section className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          Step 1 of 3: Scenario Selection
        </div>
        <h1 id="screen-title" className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight mb-3">
          Select Negotiation Arena
        </h1>
        <p className="text-base text-slate-400 max-w-3xl leading-relaxed">
          Choose a multi-agent scenario to initialize stakeholder profiles, objective boundaries, and negotiation limits for the automated bargaining simulation.
        </p>
      </section>

      <section
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        role="radiogroup"
        aria-label="Available Negotiation Scenarios"
      >
        {scenarios.map((scenario) => {
          const isSelected = selectedScenario?.id === scenario.id;
          return (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isSelected={isSelected}
              onSelect={onSelectScenario}
            />
          );
        })}
      </section>

      <footer className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto" aria-live="polite">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-3 h-3 rounded-full transition-colors ${
                selectedScenario ? 'bg-emerald-400' : 'bg-slate-600'
              }`}
            />
            {selectedScenario && (
              <span className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
            )}
          </div>
          <div>
            {selectedScenario ? (
              <div className="text-sm font-medium text-slate-200">
                Selected: <span className="font-bold text-white text-indigo-300">{selectedScenario.title}</span>
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                Please select a scenario card above to proceed
              </div>
            )}
            <div className="text-xs text-slate-500 mt-0.5">
              {selectedScenario
                ? `${(selectedScenario.agents || []).length} autonomous stakeholders configured`
                : 'Choose between Vendor Pricing, Job Offer, or Project Budget'}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isContinueDisabled}
          aria-disabled={isContinueDisabled}
          onClick={handleContinueClick}
          id="continue-btn"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-40 disabled:hover:bg-indigo-600 disabled:shadow-none"
        >
          <span>Continue to Agent Setup</span>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </footer>
    </main>
  );
}
