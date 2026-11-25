import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChange, signOutUser } from './services/supabase';
import SimulationHistoryModal from './components/SimulationHistoryModal';
import PerformanceDashboard from './components/PerformanceDashboard';
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
  History,
  BarChart3,
  Handshake,
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
import PostInteractionSummaryModal from './components/PostInteractionSummaryModal';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const scenarios = [vendorPricing, jobOffer, projectBudgetAllocation];

const STEPS = [
  { number: 1, key: 'select', label: 'Arena', icon: Layers },
  { number: 2, key: 'config', label: 'Setup', icon: Sliders },
  { number: 3, key: 'negotiate', label: 'Negotiate', icon: Play },
  { number: 4, key: 'outcome', label: 'Outcome', icon: Check },
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
  if (step === 4 || step === '4' || step === 'outcome') return 4;
  if (step === 'login') return 'login';
  if (step === 'dashboard') return 'dashboard';
  return 0; // Default active screen fallback: step = 0 (Landing Page)
}

function AppNav({
  currentStep,
  currentUser,
  onGoHome,
  onLogout,
  onNavigateStep,
  onOpenHistory,
  onOpenDashboard,
  selectedScenario,
  negotiationConfig,
  terminalOutcome,
}) {
  const { isDark, toggleTheme } = useTheme();
  const currentStepNum = normalizeStep(currentStep);
  const isHomeActive = currentStepNum === 0;
  const isDashboardActive = currentStepNum === 'dashboard';

  const getStepStatus = (stepNumber) => {
    if (currentStepNum === stepNumber) return 'active';
    if (typeof currentStepNum === 'number' && currentStepNum > stepNumber) return 'completed';
    return 'pending';
  };

  return (
    <nav
      className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors duration-200 ${
        isDark
          ? 'bg-[#0E153A]/90 border-white/10 shadow-[0_8px_32px_rgba(10,16,46,0.65)]'
          : 'bg-white/95 border-[#0E153A]/10 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo / Home Navigation */}
        <button
          type="button"
          onClick={onGoHome}
          aria-label="Return to Home Page"
          className="flex items-center gap-2.5 cursor-pointer group bg-transparent border-0 p-0 text-left outline-none shrink-0"
          title="Return to Home Page"
        >
          <BrandLogo className="w-9 h-9" />
          <div className="flex flex-col leading-none">
            <span
              className={`text-base font-black tracking-tight whitespace-nowrap group-hover:text-[#EE2A54] transition-colors ${
                isDark ? 'text-white' : 'text-[#0E153A]'
              }`}
            >
              Negotiation<span className="text-[#EE2A54]">AI</span>
            </span>
            <span
              className={`text-[10px] font-bold tracking-wider uppercase whitespace-nowrap mt-0.5 ${
                isDark ? 'text-[#1CD4A3]' : 'text-[#0E153A]/70'
              }`}
            >
              Deal Studio
            </span>
          </div>
        </button>

        {/* Single-Line Stepper Navigation */}
        <div className="hidden md:flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={onGoHome}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              isHomeActive
                ? 'bg-[#EE2A54] text-white shadow-[0_2px_14px_rgba(238,42,84,0.45)]'
                : isDark
                ? 'bg-[#131B4B]/80 border border-white/10 text-[#A3B3D9] hover:text-white hover:border-[#EE2A54]/60'
                : 'bg-[#F4F7FC] border border-[#0E153A]/15 text-[#0E153A]/75 hover:text-[#0E153A]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          {STEPS.map((step) => {
            const status = getStepStatus(step.number);
            const isClickable =
              step.number === 1 ||
              (step.number === 2 && (selectedScenario || scenarios[0])) ||
              (step.number === 3 && (negotiationConfig || selectedScenario)) ||
              (step.number === 4 && terminalOutcome);

            return (
              <div key={step.key} className="flex items-center gap-1.5 shrink-0">
                <div
                  className={`w-3 h-0.5 shrink-0 ${
                    status === 'completed'
                      ? 'bg-[#1CD4A3]'
                      : isDark
                      ? 'bg-white/15'
                      : 'bg-[#0E153A]/15'
                  }`}
                />
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onNavigateStep(step.number)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    status === 'active'
                      ? 'bg-[#EE2A54] text-white shadow-[0_2px_14px_rgba(238,42,84,0.45)]'
                      : status === 'completed'
                      ? isDark
                        ? 'bg-[#131B4B] border border-[#1CD4A3]/50 text-white hover:border-[#1CD4A3] cursor-pointer'
                        : 'bg-[#1CD4A3]/10 border border-[#1CD4A3]/40 text-[#0E153A] cursor-pointer'
                      : isDark
                      ? 'bg-[#0A102E]/60 border border-white/10 text-[#A3B3D9]/45 cursor-not-allowed'
                      : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      status === 'active'
                        ? 'bg-white text-[#EE2A54]'
                        : status === 'completed'
                        ? 'bg-[#1CD4A3] text-[#0A102E]'
                        : isDark
                        ? 'bg-[#1C2663] text-[#A3B3D9]'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {status === 'completed' ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.number}
                  </span>
                  <span>
                    {step.number === 3 && negotiationConfig?.mode === 'practice' ? 'Practice' : step.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenDashboard}
            aria-current={isDashboardActive ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              isDashboardActive
                ? 'bg-[#EE2A54] border-transparent text-white'
                : isDark
                ? 'border-white/15 bg-[#131B4B] text-white hover:border-[#1CD4A3]'
                : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A] hover:border-[#EE2A54]'
            }`}
            title="Performance Dashboard"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${isDashboardActive ? 'text-white' : 'text-[#1CD4A3]'}`} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              isDark
                ? 'border-white/15 bg-[#131B4B] text-white hover:border-[#EE2A54]'
                : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A] hover:border-[#EE2A54]'
            }`}
            title="Simulation History"
          >
            <History className="w-3.5 h-3.5 text-[#EE2A54]" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`p-2 rounded-xl border shrink-0 transition-all cursor-pointer ${
              isDark
                ? 'border-white/15 bg-[#131B4B] text-[#1CD4A3] hover:border-[#EE2A54]'
                : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A] hover:border-[#EE2A54]'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser ? (
            <div
              className={`flex items-center gap-2 rounded-xl py-1 pl-2 pr-2.5 border whitespace-nowrap shrink-0 ${
                isDark ? 'border-white/15 bg-[#131B4B]' : 'border-[#0E153A]/15 bg-white'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-[#EE2A54]/20 text-[#EE2A54] font-bold text-xs flex items-center justify-center">
                {(currentUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className={`hidden sm:inline text-xs font-bold ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                {currentUser.name}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="text-[#A3B3D9] hover:text-[#EE2A54] transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateStep('login')}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-[#EE2A54] hover:bg-[#d62249] text-white whitespace-nowrap shrink-0 shadow-[0_2px_12px_rgba(238,42,84,0.35)] transition-all cursor-pointer"
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    try {
      if (sessionStorage.getItem('negotiation_splash_seen')) return false;
      sessionStorage.setItem('negotiation_splash_seen', '1');
      return true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!showSplash) return undefined;
    const timer = setTimeout(() => setShowSplash(false), 1700);
    return () => clearTimeout(timer);
  }, [showSplash]);

  // 1. Authenticated session safely restored from localStorage / Supabase
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
        return scenarios.find((s) => s.id === parsed?.id) || scenarios[0];
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
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.agents) {
          parsed.agents = parsed.agents.map((a) => {
            if (a.id === 'vendor' && Array.isArray(a.limits)) {
              a.limits = a.limits.map((l) =>
                l.item === 'price' && String(l.type).toLowerCase() === 'min' && Number(l.value) < 35000
                  ? { ...l, value: 35000 }
                  : l
              );
            }
            return a;
          });
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [terminalOutcome, setTerminalOutcome] = useState(null);

  // Supabase Auth State Synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, user) => {
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem('negotiation_user', JSON.stringify(user));
        } catch {
          // ignore
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        try {
          localStorage.removeItem('negotiation_user');
        } catch {
          // ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 4. Default active screen state: step = 0 (Landing Page) as requested
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = localStorage.getItem('negotiation_step');
      if (saved !== null && saved !== undefined && saved !== '') {
        const normalized = normalizeStep(saved);
        if (normalized === 4) {
          try {
            localStorage.setItem('negotiation_step', '3');
          } catch {
            // ignore
          }
          return 3;
        }
        return normalized;
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
    setNegotiationConfig(null);
    try {
      localStorage.removeItem('negotiation_config');
    } catch (err) {
      console.debug('Failed to clear negotiation config:', err);
    }
    handleSetStep(1); // Proceed to Step 1: Select Arena
  };

  // Scenario selection
  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    setNegotiationConfig(null);
    try {
      localStorage.removeItem('negotiation_config');
    } catch (err) {
      console.debug('Failed to clear negotiation config:', err);
    }
    try {
      localStorage.setItem('negotiation_scenario', JSON.stringify(scenario));
    } catch (err) {
      console.debug('Failed to cache selected scenario:', err);
    }
  };

  // Login handler -> reveals the Home page through the Tug-of-War split curtain
  const handleLogin = (userData) => {
    try {
      localStorage.setItem('negotiation_user', JSON.stringify(userData));
    } catch (err) {
      console.debug('Failed to cache user session:', err);
    }
    setCurrentUser(userData);
    setShowSplash(true);
    handleSetStep(0);
  };

  // Logout handler with Supabase signout
  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch {
      // ignore
    }
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
    setTerminalOutcome(null);
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
    setTerminalOutcome(null);
    try {
      localStorage.removeItem('negotiation_config');
    } catch (err) {
      console.debug('Failed to clear negotiation config:', err);
    }
    handleSetStep(1); // Return to Step 1: Select Arena
  };

  const handleTerminalOutcome = useCallback((outcome) => {
    setTerminalOutcome(outcome);
    if (!outcome) {
      setCurrentStep(3);
      try {
        localStorage.setItem('negotiation_step', '3');
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSwitchToPractice = useCallback(() => {
    setTerminalOutcome(null);
    setNegotiationConfig((prev) => {
      const base = prev || selectedScenario || scenarios[0];
      const firstAgentId = base?.agents?.[0]?.id || 'buyer';
      const next = {
        ...base,
        mode: 'practice',
        human_agent_id: base.human_agent_id || base.human_seat || firstAgentId,
        human_seat: base.human_seat || base.human_agent_id || firstAgentId,
      };
      try {
        localStorage.setItem('negotiation_config', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [selectedScenario]);

  const activeConfig = negotiationConfig || selectedScenario || scenarios[0];
  const activeStep = normalizeStep(currentStep);

  // If in 'login' mode, render LoginPage with full-screen container and onGoHome
  if (activeStep === 'login') {
    return <LoginPage onLogin={handleLogin} onGoHome={handleGoHome} />;
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-200 relative selection:bg-[#EE2A54] selection:text-white ${
        isDark ? 'bg-[#0A102E] text-white' : 'bg-[#F4F7FC] text-[#0E153A]'
      }`}
    >
      {/* Ambient Moving Liquid Glass Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-[120px] animate-orb-a opacity-30"
          style={{ background: 'radial-gradient(circle, #EE2A54 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 -right-24 w-[460px] h-[460px] rounded-full blur-[140px] animate-orb-b opacity-25"
          style={{ background: 'radial-gradient(circle, #1CD4A3 0%, transparent 70%)' }}
        />
      </div>

      {/* Tug-of-War Split Curtain Reveal (Initial Load & Post Sign-In) */}
      {showSplash && (
        <div
          onClick={() => setShowSplash(false)}
          className="fixed inset-0 z-50 overflow-hidden cursor-pointer animate-tug-fade"
          title="Click anywhere to enter"
        >
          {/* Left Half Pulling Left */}
          <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden animate-tug-left border-r border-[#EE2A54]/60 shadow-[10px_0_40px_rgba(0,0,0,0.6)]">
            <img
              src="/tug-of-war.jpg"
              alt="Negotiation Tug of War Left"
              className="w-[200%] max-w-none h-full object-cover object-left"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A102E]/40 via-transparent to-[#0A102E]/60" />
          </div>

          {/* Right Half Pulling Right */}
          <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden animate-tug-right border-l border-[#1CD4A3]/60 shadow-[-10px_0_40px_rgba(0,0,0,0.6)]">
            <img
              src="/tug-of-war.jpg"
              alt="Negotiation Tug of War Right"
              className="w-[200%] max-w-none h-full object-cover object-right -ml-[100%]"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-[#0A102E]/40 via-transparent to-[#0A102E]/60" />
          </div>

          {/* Center Tension Emblem */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="px-6 py-3 rounded-2xl bg-[#0A102E]/90 border border-white/20 backdrop-blur-xl shadow-2xl flex items-center gap-3">
              <Handshake className="w-6 h-6 text-[#1CD4A3]" />
              <span className="text-lg font-black tracking-tight text-white">
                Negotiation<span className="text-[#EE2A54]">AI</span>
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Global Nav */}
      <AppNav
        currentStep={activeStep}
        currentUser={currentUser}
        onGoHome={handleGoHome}
        onLogout={handleLogout}
        onNavigateStep={handleSetStep}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenDashboard={() => handleSetStep('dashboard')}
        selectedScenario={selectedScenario}
        negotiationConfig={negotiationConfig}
        terminalOutcome={terminalOutcome}
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
            onOpenDashboard={() => handleSetStep('dashboard')}
            onTerminalOutcome={handleTerminalOutcome}
            onSwitchToPractice={handleSwitchToPractice}
          />
        )}

        {activeStep === 'dashboard' && (
          <PerformanceDashboard
            currentUser={currentUser}
            onStartNegotiation={() => handleSetStep(1)}
          />
        )}

        {activeStep === 4 && terminalOutcome && (
          <PostInteractionSummaryModal
            isOpen
            variant="page"
            onClose={() => handleSetStep(3)}
            config={activeConfig}
            history={terminalOutcome.history || []}
            status={terminalOutcome.status}
            winner={terminalOutcome.winner}
            deadlockEvent={terminalOutcome.deadlockEvent}
          />
        )}
      </main>

      {/* Simulation History Modal */}
      <SimulationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentUser={currentUser}
      />
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
