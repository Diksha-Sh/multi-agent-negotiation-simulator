import { useState } from 'react';
import vendorPricing from './data/vendor_pricing.json';
import jobOffer from './data/job_offer.json';
import projectBudgetAllocation from './data/project_budget_allocation.json';
import ScenarioSelectionScreen from './components/ScenarioSelectionScreen';
import AgentConfigScreen from './components/AgentConfigScreen';
import LandingPage from './components/LandingPage';

const scenarios = [vendorPricing, jobOffer, projectBudgetAllocation];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentStep, setCurrentStep] = useState('home');
  const [negotiationConfig, setNegotiationConfig] = useState(null);

  const activeSetup = negotiationConfig || selectedScenario;

  const handleLogin = (userData) => {
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const steps = [
    { key: 'select', number: 1, label: 'Select Scenario' },
    { key: 'config', number: 2, label: 'Configure Agents' },
    { key: 'negotiate', number: 3, label: 'Simulation Arena' },
  ];

  const getStepStatus = (stepKey) => {
    if (currentStep === stepKey) return 'active';
    if (currentStep === 'config' && stepKey === 'select') return 'completed';
    if (currentStep === 'negotiate' && (stepKey === 'select' || stepKey === 'config')) return 'completed';
    return 'pending';
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-900/15 via-cyan-900/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      {currentStep !== 'home' && (
        <nav className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center justify-between w-full lg:w-auto gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep('home')}
                className="flex items-center gap-3 cursor-pointer group bg-transparent border-0 p-0"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <img
                      src="/favicon.svg"
                      alt="NegotiationAI Logo"
                      className="w-4.5 h-4.5 block"
                    />
                  </div>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-base font-extrabold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                    Negotiation<span className="text-indigo-400">AI</span>
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                    Simulation Console
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep('home')}
                className="lg:hidden text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 hover:text-white"
              >
                Exit
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              {steps.map((step, index) => {
                const status = getStepStatus(step.key);
                const isClickable =
                  step.key === 'select' ||
                  (step.key === 'config' && selectedScenario) ||
                  (step.key === 'negotiate' && negotiationConfig);

                return (
                  <div key={step.key} className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      disabled={!isClickable}
                      onClick={() => isClickable && setCurrentStep(step.key)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        status === 'active'
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 shadow-sm'
                          : status === 'completed'
                          ? 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white cursor-pointer'
                          : 'bg-slate-950/60 border border-slate-800/60 text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          status === 'active'
                            ? 'bg-indigo-600 text-white'
                            : status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {status === 'completed' ? (
                          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          step.number
                        )}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>

                    {index < steps.length - 1 && (
                      <div
                        className={`w-4 sm:w-6 h-0.5 ${
                          status === 'completed' ? 'bg-indigo-500/50' : 'bg-slate-800'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              {currentUser && (
                <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full py-1 pl-2 pr-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold text-[11px] flex items-center justify-center">
                    {(currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    {currentUser.name || currentUser.username}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-[11px] text-slate-400 hover:text-rose-400 ml-1 transition-colors cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setCurrentStep('home')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
              >
                Exit to Home
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1 relative z-10 w-full">
        {currentStep === 'home' && (
          <LandingPage
            currentUser={currentUser}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onTrySimulator={() => setCurrentStep('select')}
            onStart={() => setCurrentStep('select')}
          />
        )}

        {currentStep === 'select' && (
          <ScenarioSelectionScreen
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onSelectScenario={(s) => setSelectedScenario(s)}
            onContinue={() => setCurrentStep('config')}
          />
        )}

        {currentStep === 'config' && (
          <AgentConfigScreen
            selectedScenario={selectedScenario}
            onBack={() => setCurrentStep('select')}
            onStartNegotiation={(config) => {
              setNegotiationConfig(config);
              setCurrentStep('negotiate');
            }}
          />
        )}

        {currentStep === 'negotiate' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left">
            <header className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    Step 3 of 3: Simulation Active
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Simulation Running
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep('select')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer w-fit"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M17 10a.75.75 0 0 1-.75.75H5.56l4.22 4.22a.75.75 0 1 1-1.06 1.06l-5.5-5.5a.75.75 0 0 1 0-1.06l5.5-5.5a.75.75 0 0 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Reset to Scenarios</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
                {activeSetup?.title || 'Negotiation Simulation'}
              </h1>

              <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed mb-6">
                {activeSetup?.description || 'Active multi-agent negotiation arena in progress.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  Max Allowed Rounds: {activeSetup?.max_rounds ?? 10}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700/80 text-slate-300 text-xs font-medium">
                  Active Stakeholders: {(activeSetup?.agents || []).length}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700/80 text-slate-300 text-xs font-mono font-medium">
                  Scenario: {activeSetup?.id || activeSetup?.scenario_id}
                </span>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {(activeSetup?.agents || []).map((agent) => (
                <div
                  key={agent.id}
                  className="flex flex-col gap-5 rounded-2xl p-6 sm:p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-extrabold text-base flex items-center justify-center shrink-0">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-100">
                          {agent.name}
                        </h2>
                        <span className="text-xs font-medium text-slate-400">
                          {agent.role}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 shrink-0">
                      {agent.personality || agent.default_personality || 'Collaborative'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Configured Objective
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {agent.goal || agent.objective}
                    </p>
                  </div>

                  {Array.isArray(agent.limits) && agent.limits.length > 0 && (
                    <div className="space-y-2">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Active Bounds
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {agent.limits.map((limit, idx) => {
                          const isMin = String(limit.type).toLowerCase() === 'min';
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/70 text-xs"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                    isMin
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  }`}
                                >
                                  {isMin ? 'MIN' : 'MAX'}
                                </span>
                                <span className="text-slate-300 truncate capitalize">
                                  {limit.item ? limit.item.replace(/_/g, ' ') : 'Item'}
                                </span>
                              </div>
                              <span className="font-bold text-slate-100 shrink-0">
                                {limit.value} {limit.unit || ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <footer className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-slate-100">
                  Negotiation Session Initialized
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  You can return to scenario selection to test a different domain or persona profile.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('select')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer text-center"
              >
                Select New Scenario
              </button>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
