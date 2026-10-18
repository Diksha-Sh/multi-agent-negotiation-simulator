import { useState } from 'react';

export default function LandingPage({
  onTrySimulator,
  onStart,
  currentUser = null,
  onLogin,
  onLogout,
}) {
  const [authModal, setAuthModal] = useState(null);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  const handleStart = () => {
    if (typeof onTrySimulator === 'function') {
      onTrySimulator();
    } else if (typeof onStart === 'function') {
      onStart();
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authEmail && authPassword) {
      const displayName =
        authModal === 'signup' && authName.trim()
          ? authName.trim()
          : authEmail.split('@')[0] || 'User';

      const userData = {
        name: displayName,
        username: displayName,
        email: authEmail,
      };

      if (typeof onLogin === 'function') {
        onLogin(userData);
      }
      closeAuthModal();
    }
  };

  const closeAuthModal = () => {
    setAuthModal(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const userInitial = (
    currentUser?.name ||
    currentUser?.username ||
    'U'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 text-left relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-900/20 via-cyan-900/10 to-transparent pointer-events-none blur-3xl" />
      <div className="absolute top-48 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-96 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <img
                  src="/favicon.svg"
                  alt="NegotiationAI Logo"
                  className="w-5 h-5 block"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                Negotiation<span className="text-indigo-400">AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
                Autonomous Simulator
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors cursor-pointer"
              onClick={() => scrollToSection('features')}
            >
              Features
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors cursor-pointer"
              onClick={() => scrollToSection('scenarios')}
            >
              Scenarios
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors cursor-pointer"
              onClick={() => scrollToSection('how-it-works')}
            >
              How It Works
            </button>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors cursor-pointer"
              onClick={() => setShowDocsModal(true)}
            >
              Docs
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-full py-1.5 pl-2 pr-3">
                <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                  {userInitial}
                </div>
                <span className="text-xs font-semibold text-slate-200">
                  {currentUser.name || currentUser.username}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs font-medium text-slate-400 hover:text-rose-400 ml-1 transition-colors cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAuthModal('login')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthModal('signup')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  Sign Up
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleStart}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <span>Launch Arena</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Autonomous Multi-Party Negotiation Environment
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300 tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
          Simulate & Optimize Complex Multi-Agent Negotiations
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10">
          An enterprise-grade simulation framework for evaluating automated bargaining strategies, strategic concession dynamics, and stakeholder alignment under strict reservation boundaries.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Try Simulator</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowDocsModal(true)}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Platform Overview</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto bg-slate-900/70 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center justify-center p-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-mono">
              3 Arenas
            </span>
            <span className="text-xs font-semibold text-slate-300 mt-2">
              Ready-to-Use Scenarios
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Procurement, Hiring & Budgets
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3 border-y sm:border-y-0 sm:border-x border-slate-800/80">
            <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono">
              3 Personas
            </span>
            <span className="text-xs font-semibold text-slate-300 mt-2">
              Behavioral Archetypes
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Aggressive, Collaborative, Risk-Averse
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-3">
            <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400 font-mono">
              100% Bound
            </span>
            <span className="text-xs font-semibold text-slate-300 mt-2">
              Strict Mathematical Guardrails
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Deterministic Reservation Bounds
            </span>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight mb-3">
            Engineered for High-Stakes Autonomous Systems
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A battle-tested simulation framework that lets teams evaluate multi-agent bargaining mechanics under granular reservation conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all duration-300 group shadow-xl">
            <div className="w-11 h-11 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-indigo-300 transition-colors">
              Adaptive Persona Profiles
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Equip stakeholders with defined tactical personalities including Aggressive anchors, Collaborative trade-off makers, and Risk-Averse closers to evaluate contrasting bargaining trajectories.
            </p>
          </div>

          <div className="rounded-2xl p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all duration-300 group shadow-xl">
            <div className="w-11 h-11 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-cyan-300 transition-colors">
              Granular Boundary Engine
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Define discrete minimums and maximums across each negotiation item. The platform mathematically confirms that zero final settlements violate stakeholder reservation frontiers.
            </p>
          </div>

          <div className="rounded-2xl p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all duration-300 group shadow-xl">
            <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-emerald-300 transition-colors">
              Multi-Round Concession Dynamics
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Trace round-by-round counter-proposals, cross-item concessions, and reciprocal value compromises across sequential turn intervals with real-time feedback.
            </p>
          </div>

          <div className="rounded-2xl p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all duration-300 group shadow-xl">
            <div className="w-11 h-11 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2 group-hover:text-indigo-300 transition-colors">
              Pluggable Business Domains
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Jump straight into realistic procurement negotiations, developer compensation offers, or capital expenditure roadmaps, or customize bounds instantly.
            </p>
          </div>
        </div>
      </section>

      <section id="scenarios" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Negotiation Arenas
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight mb-3">
            Pre-Loaded Negotiation Arenas
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Select one of the three pre-configured negotiation sandboxes to initiate stakeholder configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col justify-between rounded-2xl p-6 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 shadow-xl">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-slate-300">
                  vendor_pricing
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                  10 Rounds
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Vendor Pricing Negotiation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Enterprise procurement manager negotiates tier pricing, service commitments, and delivery timelines with a cloud software vendor.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Buyer vs Vendor</span>
              <button
                type="button"
                onClick={handleStart}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Launch Arena
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl p-6 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/50 hover:-translate-y-1 transition-all duration-300 shadow-xl">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-slate-300">
                  job_offer
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                  10 Rounds
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Job Offer Negotiation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Senior engineering candidate negotiates base salary, equity vesting, signing bonus, and remote schedule with an engineering hiring leader.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Candidate vs Manager</span>
              <button
                type="button"
                onClick={handleStart}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Launch Arena
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl p-6 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-emerald-500/50 hover:-translate-y-1 transition-all duration-300 shadow-xl">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-slate-300">
                  project_budget
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  10 Rounds
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Project Budget Allocation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Engineering Director and Product Lead bargain infrastructure headcount, tool licenses, and sprint allocations across limited quarterly reserves.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">Engineering vs Product</span>
              <button
                type="button"
                onClick={handleStart}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Launch Arena
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Workflow Process
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight mb-3">
            How The Simulator Operates
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Three simple phases from domain selection to multi-turn autonomous settlement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 relative shadow-xl">
            <span className="text-5xl font-black text-slate-800 block mb-4 font-mono">
              01
            </span>
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Select Scenario
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick from predefined enterprise negotiation domains. Inspect stakeholder objectives, baseline parameters, and maximum allowed rounds.
            </p>
          </div>

          <div className="rounded-2xl p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 relative shadow-xl">
            <span className="text-5xl font-black text-indigo-950 block mb-4 font-mono">
              02
            </span>
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Configure Bounds & Personas
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fine-tune reservation floors, ceiling limits, qualitative constraints, and behavioral archetypes (Aggressive, Collaborative, Risk-Averse).
            </p>
          </div>

          <div className="rounded-2xl p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 relative shadow-xl">
            <span className="text-5xl font-black text-cyan-950 block mb-4 font-mono">
              03
            </span>
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Execute Simulation
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Watch autonomous agents generate strategic proposals, trade concessions, and converge upon mathematically verified mutual deals.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-cyan-950/70 border border-indigo-500/30 p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Ready to Run Your First Multi-Agent Experiment?
          </h3>
          <p className="text-sm text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
            Configure agent limits, adjust negotiation personas, and analyze turn-by-turn strategic outcomes in real time.
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-xl shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <span>Launch Negotiation Arena</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </section>

      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="NegotiationAI Logo" className="w-6 h-6 block" />
            <span className="text-sm font-bold text-slate-200">NegotiationAI</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400">
              Multi-Agent Autonomous Simulator
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Engineered with strict reservation boundary enforcement
          </div>
        </div>
      </footer>

      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-7 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-100">
                {authModal === 'login' ? 'Log In to NegotiationAI' : 'Create Simulator Account'}
              </h2>
              <button
                type="button"
                onClick={closeAuthModal}
                className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authModal === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-semibold text-xs bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all cursor-pointer mt-2"
              >
                {authModal === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="text-center text-xs text-slate-400 pt-2">
                {authModal === 'login' ? (
                  <span>
                    Do not have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthModal('signup')}
                      className="text-indigo-400 font-semibold hover:underline ml-1 cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthModal('login')}
                      className="text-indigo-400 font-semibold hover:underline ml-1 cursor-pointer"
                    >
                      Log In
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-7 shadow-2xl relative">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                  Platform Architecture
                </span>
                <h2 className="text-xl font-bold text-slate-100 mt-1">
                  NegotiationAI Technical Architecture
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4">
                <h3 className="font-bold text-sm text-slate-100 mb-1.5">
                  1. Scenario Definition Model
                </h3>
                <p className="text-slate-400">
                  Negotiation scenarios define autonomous stakeholders, their specific commercial goals, qualitative behavioral constraints, and explicit numerical limit boundaries (minima and maxima).
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4">
                <h3 className="font-bold text-sm text-slate-100 mb-1.5">
                  2. Behavioral Persona Engine
                </h3>
                <p className="text-slate-400">
                  Agents adopt one of three psychological personas: Aggressive (high initial anchor, reluctant concessions), Collaborative (reciprocal trade-offs, value creation), and Risk-Averse (early agreement prioritization, conservative concessions).
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4">
                <h3 className="font-bold text-sm text-slate-100 mb-1.5">
                  3. Mathematical Guardrail Verification
                </h3>
                <p className="text-slate-400">
                  Every negotiation exchange is continuously evaluated against reservation frontiers. The simulator ensures that non-viable agreements are rejected and that concessions stay within allowable feasibility bounds.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              >
                Close Documentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
