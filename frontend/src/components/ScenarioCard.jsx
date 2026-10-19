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
              'border-indigo-500 ring-1 ring-indigo-500/50',
              isDark
                ? 'bg-slate-900/90 shadow-[0_0_25px_rgba(99,102,241,0.2)]'
                : 'bg-white shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-indigo-500/30'
            )
          : isDark
          ? 'bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] hover:-translate-y-0.5'
          : 'bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg shadow-sm hover:-translate-y-0.5'
      )}
    >
      {/* Top Header: Lucide Icon Badge + Category Pill */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner',
              isSelected
                ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-500'
                : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 group-hover:bg-indigo-500/15 group-hover:border-indigo-500/30'
            )}
          >
            <IconComponent className="w-5 h-5" />
          </div>

          <span
            className={cn(
              'text-[11px] font-semibold tracking-wide px-2.5 py-0.5 rounded-full border backdrop-blur-md',
              isSelected
                ? 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30'
                : isDark
                ? 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            )}
          >
            {meta.tag}
          </span>
        </div>

        {/* Title and Short Description */}
        <h3
          className={`text-base font-bold group-hover:text-indigo-500 transition-colors mb-1.5 leading-snug ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}
        >
          {scenario.title}
        </h3>
        <p className={`text-xs leading-relaxed mb-4 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {scenario.description}
        </p>

        {/* Structured Feature Bullets */}
        <div className={`space-y-2 mb-5 pt-3 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
          <div className="flex items-start gap-2 text-xs">
            <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <span className={`font-medium leading-tight ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {meta.bulletMetric}
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <span className={`font-normal leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {meta.bulletPair}
            </span>
          </div>

          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <span className={`font-normal leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {scenario.max_rounds || 10} Negotiation Rounds · {meta.spread}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Selection Button Bar */}
      <div className={`pt-3 border-t flex items-center justify-between ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
        <span className="text-[11px] font-mono text-slate-500">
          {meta.spread}
        </span>

        <span
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-lg transition-all flex items-center gap-1.5',
            isSelected
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isDark
              ? 'bg-slate-800/80 text-slate-300 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 group-hover:border group-hover:border-indigo-500/30'
              : 'bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-300'
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
