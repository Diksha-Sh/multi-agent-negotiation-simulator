import {
  ArrowRight,
  Handshake,
  Mic,
  Scale,
  Sparkles,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { VendorBanner, JobOfferBanner, BudgetBanner } from './ScenarioBanners';
import { useTheme } from '../context/ThemeContext';

const SCENARIOS = [
  {
    id: 'vendor_pricing',
    Banner: VendorBanner,
    title: 'Vendor Pricing',
    subtitle: 'Procurement Buyer vs Wholesale Vendor',
    metric: '₹35,000 – ₹40,000',
    desc: 'Negotiate bulk unit pricing while protecting supplier margins.',
    agent1Role: 'buyer',
    agent1Name: 'Buyer',
    agent2Role: 'vendor',
    agent2Name: 'Vendor',
  },
  {
    id: 'job_offer',
    Banner: JobOfferBanner,
    title: 'Job Offer',
    subtitle: 'Software Developer vs Hiring Manager',
    metric: '12 – 15 LPA · 2–3 Remote',
    desc: 'Balance base salary and weekly remote flexibility.',
    agent1Role: 'candidate',
    agent1Name: 'Candidate',
    agent2Role: 'hiring',
    agent2Name: 'Manager',
  },
  {
    id: 'project_budget_allocation',
    Banner: BudgetBanner,
    title: 'Project Budget',
    subtitle: 'Project Lead vs Finance Director',
    metric: '₹60L – ₹80L (Cap ₹100L)',
    desc: 'Allocate sprint capital without breaching the ₹100L cap.',
    agent1Role: 'pm',
    agent1Name: 'Lead',
    agent2Role: 'finance',
    agent2Name: 'Finance',
  },
];

export default function LandingPage({ onStart }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-[calc(100vh-64px)] w-full py-10 sm:py-14 px-4 sm:px-6 lg:px-8 text-left relative overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#0A102E] text-white' : 'bg-[#F4F7FC] text-[#0E153A]'
      }`}
    >
      {/* Signature Diagonal Crimson Accent (inspired by editorial SaaS layout) */}
      <div
        className="hidden lg:block absolute top-0 right-0 w-[34%] h-[520px] pointer-events-none opacity-90"
        style={{
          background: 'linear-gradient(135deg, rgba(238,42,84,0.12) 0%, #EE2A54 100%)',
          clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 0% 100%)',
        }}
      />

      <div className="max-w-6xl mx-auto space-y-14 relative z-10">
        {/* ═════════ SPLIT HERO: EDITORIAL LEFT + ANIMATED DEAL MATCH CARD RIGHT ═════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-2">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${
                isDark
                  ? 'bg-[#131B4B] border-white/15 text-[#1CD4A3]'
                  : 'bg-white border-[#0E153A]/15 text-[#0E153A] shadow-sm'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#EE2A54]" />
              <span>Multi-Agent &amp; Voice Negotiation Studio</span>
            </div>

            <h1
              className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.06] uppercase ${
                isDark ? 'text-white' : 'text-[#0E153A]'
              }`}
            >
              Find Your Perfect{' '}
              <span className="text-[#EE2A54]">Deal Match.</span>
            </h1>

            <p
              className={`text-base sm:text-lg leading-relaxed max-w-xl ${
                isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'
              }`}
            >
              Watch autonomous AI agents bargain in real time or step in with your voice, AI tactical hints, and live ZOPA scoring.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <button
                type="button"
                onClick={() => onStart && onStart()}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-base text-white bg-[#EE2A54] hover:bg-[#d62249] transition-all shadow-[0_8px_28px_rgba(238,42,84,0.45)] cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>Launch Arena</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div
                className={`liquid-glass p-3.5 rounded-xl border flex items-center gap-3 ${
                  isDark ? 'bg-[#131B4B]/80 border-white/10' : 'bg-white border-[#0E153A]/10 shadow-sm'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-[#EE2A54]/15 text-[#EE2A54] flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold block">AI vs AI Mode</span>
                  <span className={`text-xs ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>Autonomous</span>
                </div>
              </div>

              <div
                className={`liquid-glass p-3.5 rounded-xl border flex items-center gap-3 ${
                  isDark ? 'bg-[#131B4B]/80 border-white/10' : 'bg-white border-[#0E153A]/10 shadow-sm'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-[#1CD4A3]/15 text-[#1CD4A3] flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold block">Voice Offers</span>
                  <span className={`text-xs ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>Speak live</span>
                </div>
              </div>

              <div
                className={`liquid-glass p-3.5 rounded-xl border flex items-center gap-3 ${
                  isDark ? 'bg-[#131B4B]/80 border-white/10' : 'bg-white border-[#0E153A]/10 shadow-sm'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold block">Quality Score</span>
                  <span className={`text-xs ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>AI coaching</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Moving Liquid Glass Deal Match Showcase */}
          <div className="lg:col-span-5">
            <div
              className={`liquid-glass rounded-3xl border p-6 sm:p-7 shadow-2xl ${
                isDark
                  ? 'bg-[#131B4B]/90 border-white/15'
                  : 'bg-white border-[#0E153A]/15'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1CD4A3]/15 border border-[#1CD4A3]/40 text-[#1CD4A3] text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Deal Matched</span>
                </div>
                <span className={`text-xs font-mono font-bold ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>
                  Round 3 · Converged
                </span>
              </div>

              {/* Stylized Handshake Visual */}
              <div className={`rounded-2xl p-6 mb-5 border flex flex-col items-center justify-center text-center ${
                isDark ? 'bg-[#0A102E]/80 border-white/10' : 'bg-[#F4F7FC] border-[#0E153A]/10'
              }`}>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <AgentAvatar role="buyer" size="md" />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EE2A54] to-[#1CD4A3] p-[2px] shadow-lg">
                    <div className="w-full h-full rounded-[14px] bg-[#0E153A] flex items-center justify-center">
                      <Handshake className="w-7 h-7 text-[#1CD4A3]" />
                    </div>
                  </div>
                  <AgentAvatar role="vendor" size="md" />
                </div>
                <span className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                  Mutual Agreement Zone Reached
                </span>
                <span className={`text-xs mt-1 ${isDark ? 'text-[#A3B3D9]' : 'text-slate-600'}`}>
                  Real-time sentiment tracking &amp; AI strategy hints included
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#0A102E]/60 border-white/10' : 'bg-[#F4F7FC] border-slate-200'}`}>
                  <span className="block text-xl font-black text-[#1CD4A3]">92 / 100</span>
                  <span className={`text-xs font-semibold ${isDark ? 'text-[#A3B3D9]' : 'text-slate-600'}`}>Deal Quality Score</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#0A102E]/60 border-white/10' : 'bg-[#F4F7FC] border-slate-200'}`}>
                  <span className="block text-xl font-black text-[#EE2A54]">Voice Ready</span>
                  <span className={`text-xs font-semibold ${isDark ? 'text-[#A3B3D9]' : 'text-slate-600'}`}>Hands-Free Offers</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════ 3 ARENAS WITH MINIATURE ILLUSTRATIONS ═════════ */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                Choose an Arena to Begin
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
                Every arena comes with tailored bounds, agent personalities, and live voice practice
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SCENARIOS.map((sc) => {
              const BannerComp = sc.Banner;
              return (
                <div
                  key={sc.id}
                  onClick={() => onStart && onStart(sc)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onStart && onStart(sc);
                    }
                  }}
                  className={`group rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-1 ${
                    isDark
                      ? 'bg-[#131B4B]/85 border-white/10 hover:border-[#EE2A54] shadow-xl'
                      : 'bg-white border-[#0E153A]/15 hover:border-[#EE2A54] shadow-md'
                  }`}
                >
                  <div>
                    <BannerComp className="w-full h-32" />

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className={`text-lg font-extrabold group-hover:text-[#EE2A54] transition-colors ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                          {sc.title}
                        </h3>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isDark ? 'bg-[#0A102E] text-[#1CD4A3] border border-[#1CD4A3]/30' : 'bg-[#F4F7FC] text-[#0E153A]'
                          }`}
                        >
                          {sc.metric}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-[#1CD4A3]' : 'text-[#EE2A54]'}`}>
                        {sc.subtitle}
                      </p>
                      <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
                        {sc.desc}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs mb-3.5 ${
                        isDark ? 'bg-[#0A102E]/70 border-white/10' : 'bg-[#F4F7FC] border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AgentAvatar role={sc.agent1Role} size="xs" />
                        <span className="font-bold">{sc.agent1Name}</span>
                      </div>
                      <span className="font-black text-[#EE2A54]">VS</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{sc.agent2Name}</span>
                        <AgentAvatar role={sc.agent2Role} size="xs" />
                      </div>
                    </div>

                    <div
                      className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${
                        isDark
                          ? 'bg-[#1D2B78] group-hover:bg-[#EE2A54] text-white'
                          : 'bg-[#0E153A] group-hover:bg-[#EE2A54] text-white'
                      }`}
                    >
                      <span>Configure Arena</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
