import { ShoppingCart, Briefcase, Coins, Target, Users, Clock, Check, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const SCENARIO_META = {
  vendor_pricing: {
    icon: ShoppingCart,
    tag: 'Procurement',
    spread: '₹35,000 – ₹40,000',
    bulletMetric: 'Target: Wholesale unit pricing in ₹ INR',
    bulletPair: 'Buyer (Procurement) vs Vendor (Sales)',
    bulletRule: 'Strict reservation floor & ceiling overlap',
  },
  job_offer: {
    icon: Briefcase,
    tag: 'Multi-Issue',
    spread: '12 – 15 LPA · 2-3 Days/Wk',
    bulletMetric: 'Target: Annual LPA & weekly remote days',
    bulletPair: 'Software Developer vs Hiring Manager',
    bulletRule: 'Two-dimensional concession trade-offs',
  },
  project_budget_allocation: {
    icon: Coins,
    tag: 'Resource Split',
    spread: '₹60L – ₹80L under 100L Cap',
    bulletMetric: 'Target: Sprint budget allocation under cap',
    bulletPair: 'Project Lead vs Finance Director',
    bulletRule: 'Inviolable 100L total pool expenditure cap',
  },
};

export default function ScenarioCard({ scenario, isSelected, onSelect }) {
  const { isDark } = useTheme();

  if (!scenario) return null;

  const meta = SCENARIO_META[scenario.id] || SCENARIO_META.vendor_pricing;
  const IconComponent = meta.icon;

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
        'group relative flex flex-col justify-between rounded-2xl p-5 text-left transition-all duration-300 cursor-pointer outline-none overflow-hidden backdrop-blur-xl',
        isSelected
          ? cn(
              'border border-amber-500 ring-1 ring-amber-500/40',
              isDark
                ? 'bg-zinc-900 shadow-[0_0_25px_rgba(245,158,11,0.12)]'
                : 'bg-white shadow-[0_0_25px_rgba(245,158,11,0.12)]'
            )
          : isDark
          ? 'bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:-translate-y-0.5'
          : 'bg-white border border-stone-200 hover:border-amber-500 hover:shadow-lg shadow-sm hover:-translate-y-0.5'
      )}
    >
      {/* Top Header: Lucide Icon Badge + Category Pill */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner',
              isSelected
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-500'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-500 group-hover:bg-amber-500/15 group-hover:border-amber-500/30'
            )}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <span
            className={cn(
              'text-[11px] font-mono font-semibold tracking-wide px-2.5 py-0.5 rounded-full border backdrop-blur-md',
              isSelected
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : isDark
                ? 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60'
                : 'bg-stone-100 text-zinc-600 border-stone-200'
            )}
          >
            {meta.tag}
          </span>
        </div>

        {/* Title and Short Description */}
        <h3
          className={`text-base font-bold group-hover:text-amber-500 transition-colors mb-1.5 leading-snug ${
            isDark ? 'text-zinc-100' : 'text-zinc-900'
          }`}
        >
          {scenario.title}
        </h3>
        <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {scenario.description}
        </p>

        {/* Structured Feature Bullets */}
        <div className={`space-y-2 mb-5 pt-3 border-t ${isDark ? 'border-zinc-800/70' : 'border-stone-100'}`}>
          <div className="flex items-start gap-2 text-xs">
            <Target className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className={`font-medium leading-tight ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {meta.bulletMetric}
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className={`font-normal leading-tight ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {meta.bulletPair}
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span className={`font-normal leading-tight ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {scenario.max_rounds || 10} Negotiation Rounds · {meta.spread}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Selection Button Bar */}
      <div className={`pt-3 border-t flex items-center justify-between ${isDark ? 'border-zinc-800/70' : 'border-stone-100'}`}>
        <span className="text-[11px] font-mono text-emerald-500 font-semibold">
          {meta.spread}
        </span>

        <span
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-lg transition-all flex items-center gap-1.5',
            isSelected
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
              : isDark
              ? 'bg-zinc-800/80 text-zinc-300 group-hover:bg-amber-500/20 group-hover:text-amber-400 group-hover:border group-hover:border-amber-500/30'
              : 'bg-stone-100 text-zinc-700 border border-stone-200 group-hover:bg-amber-50 group-hover:text-amber-700 group-hover:border-amber-300'
          )}
        >
          {isSelected ? (
            <>
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>Selected</span>
            </>
          ) : (
            <>
              <span>Select</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </span>
      </div>
    </div>
  );
}
