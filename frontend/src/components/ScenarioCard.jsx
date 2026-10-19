/**
 * ScenarioCard is now inlined inside ScenarioSelectionScreen.jsx for better encapsulation.
 * This file is kept as a shim for backward compatibility in case it is imported elsewhere.
 */

function cn(...classes) { return classes.filter(Boolean).join(' '); }

const SCENARIO_META = {
  vendor_pricing: { emoji: '🛍️', ring: 'ring-indigo-500', tag: 'Beginner', tagColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  job_offer:      { emoji: '💼', ring: 'ring-violet-500', tag: 'Intermediate', tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  project_budget_allocation: { emoji: '💰', ring: 'ring-cyan-500', tag: 'Advanced', tagColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
};

export default function ScenarioCard({ scenario, isSelected, onSelect }) {
  if (!scenario) return null;
  const meta = SCENARIO_META[scenario.id] || SCENARIO_META.vendor_pricing;

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(scenario)}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onSelect(scenario); } }}
      className={cn(
        'group relative flex flex-col rounded-2xl text-left transition-all duration-300 cursor-pointer outline-none overflow-hidden bg-slate-900/70 border',
        isSelected
          ? `ring-2 ${meta.ring} shadow-2xl border-transparent`
          : 'border-slate-800/80 hover:border-slate-700/60 hover:-translate-y-1 hover:shadow-xl'
      )}
    >
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{meta.emoji}</span>
          <div>
            <h3 className="text-base font-bold text-slate-100">{scenario.title}</h3>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', meta.tagColor)}>{meta.tag}</span>
          </div>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{scenario.description}</p>
      </div>
    </div>
  );
}
