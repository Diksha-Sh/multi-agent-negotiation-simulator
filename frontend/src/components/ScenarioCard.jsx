export default function ScenarioCard({ scenario, isSelected, onSelect }) {
  if (!scenario) return null;

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSelect(scenario);
    }
  };

  const negotiationItems = Array.from(
    new Set(
      (scenario.agents || []).flatMap((agent) =>
        (agent.limits || []).map((l) => l.item).filter(Boolean)
      )
    )
  );

  const getComplexity = (id) => {
    if (id?.includes('budget')) return { label: 'Advanced', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' };
    if (id?.includes('job')) return { label: 'Intermediate', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' };
    return { label: 'Core', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' };
  };

  const complexity = getComplexity(scenario.id);

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(scenario)}
      onKeyDown={handleKeyDown}
      className={`group relative flex flex-col justify-between rounded-xl p-6 text-left transition-all duration-300 cursor-pointer outline-none ${
        isSelected
          ? 'bg-slate-800/90 ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/10 border-transparent'
          : 'bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-850/60 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5'
      }`}
      data-scenario-id={scenario.id}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-700/80 bg-slate-950/60 text-slate-300 font-mono">
              {scenario.id}
            </span>
            <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md border ${complexity.color}`}>
              {complexity.label}
            </span>
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
              {scenario.max_rounds || 10} Rounds
            </span>
          </div>

          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
              isSelected
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'border-slate-700 bg-slate-950/60 group-hover:border-slate-500'
            }`}
            aria-hidden="true"
          >
            {isSelected && (
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-100 group-hover:text-white transition-colors mb-2">
          {scenario.title}
        </h3>

        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          {scenario.description}
        </p>

        <div className="border-t border-slate-800/80 pt-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Participants ({(scenario.agents || []).length})
            </span>
            <span className="text-xs text-slate-500">Autonomous Agents</span>
          </div>

          <div className="flex flex-col gap-2">
            {(scenario.agents || []).map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60 group-hover:border-slate-700/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {agent.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {agent.name}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {agent.role}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-slate-700/60 bg-slate-900/60 text-slate-400 shrink-0">
                  {agent.default_personality || 'Collaborative'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {negotiationItems.length > 0 && (
          <div className="border-t border-slate-800/80 pt-4 mb-5">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Negotiation Dimensions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {negotiationItems.map((item) => (
                <span
                  key={item}
                  className="text-xs font-medium px-2.5 py-1 rounded-md bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 capitalize"
                >
                  {item.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800/80 pt-3.5 flex items-center justify-between text-xs font-semibold">
        <span className={isSelected ? 'text-indigo-400 flex items-center gap-1.5' : 'text-slate-500 group-hover:text-slate-400'}>
          {isSelected ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                  clipRule="evenodd"
                />
              </svg>
              Selected Scenario
            </>
          ) : (
            'Click to select'
          )}
        </span>
        <span className="text-slate-500 font-mono text-[11px]">
          ID: {scenario.id}
        </span>
      </div>
    </div>
  );
}
