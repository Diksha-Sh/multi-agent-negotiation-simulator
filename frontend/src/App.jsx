import { useState } from 'react';
import vendorPricing from './data/vendor_pricing.json';
import jobOffer from './data/job_offer.json';
import projectBudgetAllocation from './data/project_budget_allocation.json';
import ScenarioSelectionScreen from './components/ScenarioSelectionScreen';
import AgentConfigScreen from './components/AgentConfigScreen';
import LandingPage from './components/LandingPage';
import NegotiationArena from './components/NegotiationArena';
import LoginPage from './components/LoginPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const scenarios = [vendorPricing, jobOffer, projectBudgetAllocation];

const STEPS = [
  { key: 'select',    number: 1, label: 'Select Arena' },
  { key: 'config',    number: 2, label: 'Configure Agents' },
  { key: 'negotiate', number: 3, label: 'Simulation' },
];

function CheckIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
    </svg>
  );
}

function AppNav({ currentStep, currentUser, onGoHome, onLogout, onNavigateStep, selectedScenario, negotiationConfig }) {
  const { isDark, toggleTheme } = useTheme();

  const getStepStatus = (stepKey) => {
    if (currentStep === stepKey) return 'active';
    if (currentStep === 'config' && stepKey === 'select') return 'completed';
    if (currentStep === 'negotiate' && (stepKey === 'select' || stepKey === 'config')) return 'completed';
    return 'pending';
  };

  return (
    <nav
      className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-md transition-colors duration-200 ${
        isDark ? 'bg-[#0b0f17]/95 border-slate-800' : 'bg-white/95 border-slate-200'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand Logo */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <button
            type="button"
            onClick={onGoHome}
            className="flex items-center gap-3 cursor-pointer group bg-transparent border-0 p-0 text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-600/30">
              ⚖️
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight leading-tight">
                Negotiation<span className="text-blue-500">AI</span>
              </span>
              <span className={`text-[9px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Autonomous Simulator
              </span>
            </div>
          </button>

          {/* Mobile Theme Toggle & Home */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border text-xs font-bold ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                isDark ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}
            >
              Hub
            </button>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {/* Home Tab */}
          <button
            type="button"
            onClick={onGoHome}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentStep === 'home'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark
                ? 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏠</span>
            <span className="hidden sm:inline">Hub</span>
          </button>

          <div className={`w-2 h-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {STEPS.map((step, index) => {
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
                  onClick={() => isClickable && onNavigateStep(step.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    status === 'active'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : status === 'completed'
                      ? isDark
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white cursor-pointer'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 cursor-pointer'
                      : isDark
                      ? 'bg-slate-950/40 border border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    status === 'active'
                      ? 'bg-blue-500 text-white'
                      : status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                      : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {status === 'completed' ? <CheckIcon /> : step.number}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>

                {index < STEPS.length - 1 && (
                  <div className={`w-4 sm:w-6 h-0.5 ${status === 'completed' ? 'bg-blue-500/50' : isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* User Pill & Theme Switcher (Desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-200 shadow-sm'
            }`}
            title="Toggle Bright/Dark Mode"
          >
            <span>{isDark ? '☀️ Bright' : '🌙 Dark'}</span>
          </button>

          {currentUser && (
            <div
              className={`flex items-center gap-2 rounded-full py-1 pl-2 pr-3 border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-500 font-bold text-[11px] flex items-center justify-center border border-blue-500/30">
                {(currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {currentUser.name}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="text-[11px] text-slate-400 hover:text-rose-500 ml-1.5 transition-colors cursor-pointer font-bold"
                title="Sign out or switch persona"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function MainApp() {
  const { isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentStep, setCurrentStep] = useState('home');
  const [negotiationConfig, setNegotiationConfig] = useState(null);

  const handleLogin = (userData) => {
    setCurrentUser(userData);
    setCurrentStep('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentStep('home');
  };

  const handleStartNegotiation = (config) => {
    setNegotiationConfig(config);
    setCurrentStep('negotiate');
  };

  const handleReset = () => {
    setSelectedScenario(null);
    setNegotiationConfig(null);
    setCurrentStep('select');
  };

  const activeConfig = negotiationConfig || selectedScenario;

  // Entry: Modern Login Page with Google SSO and Theme Toggle
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 relative ${
        isDark ? 'bg-[#080b11] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Global Nav */}
      <AppNav
        currentStep={currentStep}
        currentUser={currentUser}
        onGoHome={() => setCurrentStep('home')}
        onLogout={handleLogout}
        onNavigateStep={setCurrentStep}
        selectedScenario={selectedScenario}
        negotiationConfig={negotiationConfig}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 w-full">
        {currentStep === 'home' && (
          <LandingPage
            currentUser={currentUser}
            onLogout={handleLogout}
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
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            onSelectScenario={(s) => setSelectedScenario(s)}
            onBack={() => setCurrentStep('select')}
            onStartNegotiation={handleStartNegotiation}
          />
        )}

        {currentStep === 'negotiate' && (
          <NegotiationArena
            config={activeConfig}
            onReset={handleReset}
            currentUser={currentUser}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
