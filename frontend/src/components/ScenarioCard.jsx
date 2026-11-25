import { Target, Users, Clock, Check, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { VendorBanner, JobOfferBanner, BudgetBanner } from './ScenarioBanners';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SCENARIO_META = {
  vendor_pricing: {
    Banner: VendorBanner,
    tag: 'Procurement',
    spread: '₹35,000 – ₹40,000',
    bulletMetric: 'Wholesale unit price (INR)',
    bulletPair: 'Buyer vs Vendor',
    shortDesc: 'Negotiate bulk unit pricing while keeping supplier margins healthy.',
  },
  job_offer: {
    icon: null,
    Banner: JobOfferBanner,
    tag: 'Multi-Issue',
    spread: '12 – 15 LPA · 2–3 Remote',
    bulletMetric: 'Base salary & remote days',
    bulletPair: 'Developer vs Hiring Manager',
    shortDesc: 'Balance annual compensation and weekly remote flexibility.',
  },
  project_budget_allocation: {
    Banner: BudgetBanner,
    tag: 'Budget Split',
    spread: '₹60L – ₹80L (Cap ₹100L)',
    bulletMetric: 'Sprint budget under ₹100L',
    bulletPair: 'Project Lead vs Finance',
    shortDesc: 'Allocate engineering sprint capital under the strict ₹100L cap.',
  },
};

export default function ScenarioCard({ scenario, isSelected, onSelect }) {
  const { isDark } = useTheme();

  if (!scenario) return null;

  const meta = SCENARIO_META[scenario.id] || SCENARIO_META.vendor_pricing;
  const BannerComp = meta.Banner;

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(scenario)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(scenario);
        }
      }}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl text-left transition-all duration-200 cursor-pointer outline-none border overflow-hidden',
        isSelected
          ? isDark
            ? 'bg-[#131B4B] border-[#EE2A54] ring-2 ring-[#EE2A54]/40 shadow-[0_0_30px_rgba(238,42,84,0.28)]'
            : 'bg-white border-[#EE2A54] ring-2 ring-[#EE2A54]/30 shadow-xl'
          : isDark
          ? 'bg-[#131B4B]/75 border-white/10 hover:border-[#1CD4A3]/60 hover:-translate-y-1'
          : 'bg-white border-[#0E153A]/15 hover:border-[#EE2A54] shadow-sm hover:-translate-y-1'
      )}
    >
      <div>
        {/* Miniature Scenario Artwork Header */}
        <BannerComp className="w-full h-32" />

        <div className="p-5 pb-3">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span
              className={cn(
                'text-xs font-bold px-2.5 py-0.5 rounded-full border',
                isSelected
                  ? 'bg-[#EE2A54]/20 text-[#EE2A54] border-[#EE2A54]/40'
                  : isDark
                  ? 'bg-[#0A102E] text-[#1CD4A3] border-[#1CD4A3]/30'
                  : 'bg-[#F4F7FC] text-[#0E153A] border-[#0E153A]/15'
              )}
            >
              {meta.tag}
            </span>

            <span className={`text-xs font-mono font-bold ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/70'}`}>
              {scenario.max_rounds || 10} Rounds
            </span>
          </div>

          <h3 className={`text-lg font-extrabold mb-1.5 ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
            {scenario.title}
          </h3>
          <p className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
            {meta.shortDesc}
          </p>

          <div className={`space-y-2 pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-[#EE2A54] shrink-0" />
              <span className="font-medium">{meta.bulletMetric}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-[#1CD4A3] shrink-0" />
              <span className={isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/80'}>{meta.bulletPair}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-[#A3B3D9] shrink-0" />
              <span className={`font-mono font-semibold ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                {meta.spread}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={`px-5 py-3.5 border-t flex items-center justify-end ${isDark ? 'border-white/10 bg-[#0A102E]/40' : 'border-slate-100 bg-slate-50/70'}`}>
        <span
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-bold transition-all inline-flex items-center justify-center gap-2',
            isSelected
              ? 'bg-[#EE2A54] text-white shadow-[0_4px_14px_rgba(238,42,84,0.4)]'
              : isDark
              ? 'bg-[#1D2B78] text-white group-hover:bg-[#EE2A54]'
              : 'bg-[#0E153A] text-white group-hover:bg-[#EE2A54]'
          )}
        >
          {isSelected ? (
            <>
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Selected Arena</span>
            </>
          ) : (
            <>
              <span>Select Arena</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </span>
      </div>
    </div>
  );
}
