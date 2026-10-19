import { useState } from 'react';
import {
  Sun,
  Moon,
  Home,
  Check,
  LogOut,
  LogIn,
  Layers,
  Sliders,
  Play,
} from 'lucide-react';
import BrandLogo from './components/BrandLogo';
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
  { number: 1, key: 'select', label: 'Select Arena', icon: Layers },
  { number: 2, key: 'config', label: 'Configure Agents', icon: Sliders },
  { number: 3, key: 'negotiate', label: 'Simulation Arena', icon: Play },
];

/**
 * Normalizes any step identifier (number or string) to a reliable step index or route.
 * Guarantees that unhandled or corrupted values safely fall back to 0 (Landing Page).
 */
function normalizeStep(step) {
  if (step === 0 || step === '0' || step === 'landing' || step === 'home') return 0;
  if (step === 1 || step === '1' || step === 'select') return 1;
  if (step === 2 || step === '2' || step === 'config') return 2;
  if (step === 3 || step === '3' || step === 'negotiate') return 3;
  if (step === 'login') return 'login';
  return 0; // Default active screen fallback: step = 0 (Landing Page)
}

function AppNav({
  currentStep,
  currentUser,
  onGoHome,
  onLogout,
  onNavigateStep,
  selectedScenario,
  negotiationConfig,
}) {
  const { isDark, toggleTheme } = useTheme();
  const currentStepNum = normalizeStep(currentStep);
  const isHomeActive = currentStepNum === 0;

  const getStepStatus = (stepNumber) => {
    if (currentStepNum === stepNumber) return 'active';
    if (typeof currentStepNum === 'number' && currentStepNum > stepNumber) return 'completed';
    return 'pending';
  };

  return (
    <nav
      className={`sticky top-0 z-40 backdrop-blur-xl border-b shadow-md transition-colors duration-200 ${
        isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/95 border-slate-200 shadow-slate-200/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand Logo / Home Navigation */}
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <button
            type="button"
            onClick={onGoHome}
            aria-label="Return to Home Page"
            className="flex items-center gap-3 cursor-pointer group bg-transparent border-0 p-0 text-left outline-none"
            title="Return to Home Page"
          >
            <BrandLogo className="w-8 h-8" />
            <div className="flex flex-col">
              <span
                className={`text-sm font-extrabold tracking-tight leading-tight group-hover:text-indigo-400 transition-colors ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                Negotiation<span className="text-indigo-500">AI</span>
              </span>
              <span
                className={`text-[9px] uppercase tracking-widest font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Autonomous Simulator
              </span>
            </div>
          </button>

          {/* Mobile Actions: Theme Toggle, Home, & Auth */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                isHomeActive
                  ? 'bg-indigo-600 text-white border-transparent'
                  : isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-300'
                  : 'border-slate-200 bg-slate-100 text-slate-700'
              }`}
            >
              Home
            </button>
            {!currentUser ? (
              <button
                type="button"
                onClick={() => onNavigateStep('login')}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white shadow-sm"
              >
                Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-500"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {/* Home Tab */}
          <button
            type="button"
            onClick={onGoHome}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isHomeActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : isDark
                ? 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className={`w-2 h-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

          {STEPS.map((step, index) => {
            const status = getStepStatus(step.number);
            const isClickable =
              step.number === 1 ||
              (step.number === 2 && (selectedScenario || scenarios[0])) ||
              (step.number === 3 && (negotiationConfig || selectedScenario));

            return (
              <div key={step.key} className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onNavigateStep(step.number)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    status === 'active'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : status === 'completed'
                      ? isDark
                        ? 'bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/40 cursor-pointer'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 cursor-pointer'
                      : isDark
                      ? 'bg-slate-950/40 border border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                      : 'bg-slate-50 border border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      status === 'active'
                        ? 'bg-indigo-500 text-white'
                        : status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {status === 'completed' ? <Check className="w-3 h-3 stroke-[2.5]" /> : step.number}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </button>

                {index < STEPS.length - 1 && (
                  <div
                    className={`w-4 sm:w-6 h-0.5 ${
                      status === 'completed'
                        ? 'bg-indigo-500/50'
                        : isDark
                        ? 'bg-slate-800'
                        : 'bg-slate-200'
                    }`}
                  />
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-700'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Toggle Bright/Dark Mode"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          {currentUser ? (
            <div
              className={`flex items-center gap-2 rounded-full py-1 pl-2 pr-3 border ${
                isDark ? 'border-slate-800/90 bg-slate-900/80 shadow-sm' : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-500 font-bold text-[11px] flex items-center justify-center border border-indigo-500/30">
                {(currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {currentUser.name}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-500 ml-1.5 transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateStep('login')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function MainApp() {
  const { isDark } = useTheme();

  // 1. Authenticated session safely restored from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('negotiation_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Scenario state safely restored from localStorage
  const [selectedScenario, setSelectedScenario] = useState(() => {
    try {
      const saved = localStorage.getItem('negotiation_scenario');
      if (saved) {
        const parsed = JSON.parse(saved);
        return scenarios.find((s) => s.id === parsed?.id) || parsed || scenarios[0];
      }
    } catch {
      // fallback
    }
    return scenarios[0];
  });

  // 3. Negotiation config safely restored from localStorage
  const [negotiationConfig, setNegotiationConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('negotiation_config');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 4. Default active screen state: step = 0 (Landing Page) as requested
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = localStorage.getItem('negotiation_step');
      if (saved !== null && saved !== undefined && saved !== '') {
        return normalizeStep(saved);
      }
    } catch {
      // fallback
    }
    return 0; // Default active screen state: step = 0 (Landing Page)
  });

  // Safe unified step setter that updates state and persists safely
  const handleSetStep = (newStep) => {
    const normalized = normalizeStep(newStep);
    setCurrentStep(normalized);
    try {
      localStorage.setItem('negotiation_step', String(normalized));
    } catch {
      // ignore
    }
  };

  // Requirement 2: Brand Logo / Home navigation resets to step = 0
  const handleGoHome = () => {
    handleSetStep(0);
  };

  // Starting from Landing Page
  const handleStartFromLanding = (scenario) => {
    if (scenario) {
      const targetScenario = scenarios.find((s) => s.id === scenario?.id || s.id === scenario) || scenario;
      setSelectedScenario(targetScenario);
      try {
        localStorage.setItem('negotiation_scenario', JSON.stringify(targetScenario));
      } catch (err) {
        console.debug('Failed to cache scenario:', err);
      }
    }
    handleSetStep(1); // Proceed to Step 1: Select Arena
  };

  // Scenario selection
  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    try {
      localStorage.setItem('negotiation_scenario', JSON.stringify(scenario));
    } catch (err) {
      console.debug('Failed to cache selected scenario:', err);
    }
  };

  // Login handler
  const handleLogin = (userData) => {
    try {
      localStorage.setItem('negotiation_user', JSON.stringify(userData));
    } catch (err) {
      console.debug('Failed to cache user session:', err);
    }
    setCurrentUser(userData);
    handleSetStep(1); // Proceed to Step 1: Select Arena
  };

  // Logout handler
  const handleLogout = () => {
    try {
      localStorage.removeItem('negotiation_user');
    } catch (err) {
      console.debug('Failed to clear user session:', err);
    }
    setCurrentUser(null);
    handleSetStep(0); // Reset to Step 0: Home / Landing Page
  };

  // Start negotiation handler
  const handleStartNegotiation = (config) => {
    setNegotiationConfig(config);
    try {
      localStorage.setItem('negotiation_config', JSON.stringify(config));
    } catch (err) {
      console.debug('Failed to cache negotiation config:', err);
    }
    handleSetStep(3); // Proceed to Step 3: Simulation Arena
  };

  // Reset handler from Arena
  const handleReset = () => {
    setNegotiationConfig(null);
    try {
      localStorage.removeItem('negotiation_config');
    } catch (err) {
      console.debug('Failed to clear negotiation config:', err);
    }
    handleSetStep(1); // Return to Step 1: Select Arena
  };

  const activeConfig = negotiationConfig || selectedScenario || scenarios[0];
  const activeStep = normalizeStep(currentStep);

  // If in 'login' mode, render LoginPage with full-screen container and onGoHome
  if (activeStep === 'login') {
    return <LoginPage onLogin={handleLogin} onGoHome={handleGoHome} />;
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-200 relative selection:bg-indigo-500 selection:text-white ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Global Nav */}
      <AppNav
        currentStep={activeStep}
        currentUser={currentUser}
        onGoHome={handleGoHome}
        onLogout={handleLogout}
        onNavigateStep={handleSetStep}
        selectedScenario={selectedScenario}
        negotiationConfig={negotiationConfig}
      />

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 w-full">
        {activeStep === 0 && (
          <LandingPage onStart={handleStartFromLanding} />
        )}

        {activeStep === 1 && (
          <ScenarioSelectionScreen
            scenarios={scenarios}
            selectedScenario={selectedScenario || scenarios[0]}
            onSelectScenario={handleSelectScenario}
            onContinue={(scenario) => {
              if (scenario) handleSelectScenario(scenario);
              handleSetStep(2);
            }}
          />
        )}

        {activeStep === 2 && (
          <AgentConfigScreen
            selectedScenario={selectedScenario || scenarios[0]}
            onBack={() => handleSetStep(1)}
            onStartNegotiation={handleStartNegotiation}
          />
        )}

        {activeStep === 3 && (
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
