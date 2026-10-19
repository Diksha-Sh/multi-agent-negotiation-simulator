import { useState } from 'react';
import vendorPricing from '../data/vendor_pricing.json';
import personalityList from '../data/personalities.json';
import { validateConfig } from '../services/api';

export default function AgentConfigScreen({
  selectedScenario = vendorPricing,
  onBack,
  onStartNegotiation,
}) {
  const scenario = selectedScenario || vendorPricing;

  const [maxRounds, setMaxRounds] = useState(() => scenario?.max_rounds ?? 10);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [prevScenarioId, setPrevScenarioId] = useState(() => scenario?.id);

  const [agentConfigs, setAgentConfigs] = useState(() => {
    const initial = {};
    const agents = (selectedScenario || vendorPricing)?.agents || [];
    for (let i = 0; i < agents.length; i += 1) {
      const agent = agents[i];
      initial[agent.id] = {
        objective: agent.goal || agent.objective || '',
        constraints: Array.isArray(agent.constraints) ? [...agent.constraints] : [],
        limits: Array.isArray(agent.limits)
          ? agent.limits.map((limit) => ({
              item: limit.item || '',
              type: limit.type || 'min',
              value: limit.value ?? '',
              unit: limit.unit || '',
            }))
          : [],
        personality:
          agent.default_personality ||
          (personalityList[0] && personalityList[0].name) ||
          'Collaborative',
      };
    }
    return initial;
  });

  if (prevScenarioId !== scenario?.id) {
    setPrevScenarioId(scenario?.id);
    setMaxRounds(scenario?.max_rounds ?? 10);
    setValidationErrors([]);
    const updated = {};
    const currentAgents = scenario?.agents || [];
    for (let i = 0; i < currentAgents.length; i += 1) {
      const agent = currentAgents[i];
      updated[agent.id] = {
        objective: agent.goal || agent.objective || '',
        constraints: Array.isArray(agent.constraints) ? [...agent.constraints] : [],
        limits: Array.isArray(agent.limits)
          ? agent.limits.map((limit) => ({
              item: limit.item || '',
              type: limit.type || 'min',
              value: limit.value ?? '',
              unit: limit.unit || '',
            }))
          : [],
        personality:
          agent.default_personality ||
          (personalityList[0] && personalityList[0].name) ||
          'Collaborative',
      };
    }
    setAgentConfigs(updated);
  }

  const handleObjectiveChange = (agentId, value) => {
    setAgentConfigs((prev) => {
      const current = prev[agentId] || {};
      return {
        ...prev,
        [agentId]: {
          ...current,
          objective: value,
        },
      };
    });
  };

  const handleConstraintChange = (agentId, index, value) => {
    setAgentConfigs((prev) => {
      const current = prev[agentId] || {};
      const updatedConstraints = Array.isArray(current.constraints)
        ? [...current.constraints]
        : [];
      updatedConstraints[index] = value;
      return {
        ...prev,
        [agentId]: {
          ...current,
          constraints: updatedConstraints,
        },
      };
    });
  };

  const handleLimitValueChange = (agentId, index, value) => {
    setAgentConfigs((prev) => {
      const current = prev[agentId] || {};
      const updatedLimits = Array.isArray(current.limits)
        ? current.limits.map((l, idx) => (idx === index ? { ...l, value } : l))
        : [];
      return {
        ...prev,
        [agentId]: {
          ...current,
          limits: updatedLimits,
        },
      };
    });
  };

  const handlePersonalityChange = (agentId, value) => {
    setAgentConfigs((prev) => {
      const current = prev[agentId] || {};
      return {
        ...prev,
        [agentId]: {
          ...current,
          personality: value,
        },
      };
    });
  };

  const handleStartNegotiation = async () => {
    const customScenarioConfig = {
      scenario_id: scenario.id || scenario.scenario_id,
      id: scenario.id || scenario.scenario_id,
      title: scenario.title,
      description: scenario.description,
      max_rounds: Number(maxRounds) || 10,
      agents: (scenario.agents || []).map((agent) => {
        const cfg = agentConfigs[agent.id] || {};
        const goalValue =
          cfg.objective !== undefined ? cfg.objective : agent.goal || agent.objective || '';
        return {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          role_description: agent.role_description || '',
          goal: goalValue,
          objective: goalValue,
          constraints: cfg.constraints || agent.constraints || [],
          limits: (cfg.limits || agent.limits || []).map((limit) => ({
            item: limit.item,
            type: limit.type,
            // Empty or non-numeric input is sent as null so validation reports
            // "value must be a number" instead of treating it as 0.
            value:
              limit.value === '' || limit.value === null || Number.isNaN(Number(limit.value))
                ? null
                : Number(limit.value),
            unit: limit.unit || '',
          })),
          personality:
            cfg.personality ||
            agent.default_personality ||
            (personalityList[0] && personalityList[0].name) ||
            'Collaborative',
        };
      }),
    };

    // Check the config with the backend before starting (validate_config).
    setIsValidating(true);
    setValidationErrors([]);
    try {
      const result = await validateConfig(customScenarioConfig);
      if (!result.valid) {
        setValidationErrors(result.errors || ['The configuration is not valid.']);
        return;
      }
    } catch (error) {
      setValidationErrors([error.message]);
      return;
    } finally {
      setIsValidating(false);
    }

    if (typeof onStartNegotiation === 'function') {
      onStartNegotiation(customScenarioConfig);
    }
  };

  const agents = scenario.agents || [];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left">
      <header className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold uppercase tracking-wider w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            Step 2 of 3: Agent Configuration
          </div>

          {typeof onBack === 'function' && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer w-fit"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M17 10a.75.75 0 0 1-.75.75H5.56l4.22 4.22a.75.75 0 1 1-1.06 1.06l-5.5-5.5a.75.75 0 0 1 0-1.06l5.5-5.5a.75.75 0 0 1 1.06 1.06L5.56 9.25h10.69A.75.75 0 0 1 17 10Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Back to Scenarios</span>
            </button>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
          {scenario.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed mb-6">
          {scenario.description}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
          <label className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-slate-950/70 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <span>Simulation Rounds:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={maxRounds}
              onChange={(e) => setMaxRounds(e.target.value)}
              className="w-16 bg-slate-900 border border-indigo-500/40 rounded px-2 py-0.5 text-center text-xs font-bold text-indigo-200 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </label>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700/80 text-slate-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Active Stakeholders: {agents.length}
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700/80 text-slate-300 text-xs font-medium font-mono">
            ID: {scenario.id}
          </span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {agents.map((agent) => {
          const agentState = agentConfigs[agent.id] || {
            objective: agent.goal || agent.objective || '',
            constraints: Array.isArray(agent.constraints) ? agent.constraints : [],
            limits: Array.isArray(agent.limits) ? agent.limits : [],
            personality:
              agent.default_personality ||
              (personalityList[0] && personalityList[0].name) ||
              'Collaborative',
          };

          const currentPersonalityName =
            agentState.personality ||
            agent.default_personality ||
            (personalityList[0] && personalityList[0].name) ||
            'Collaborative';

          const activePersonality =
            personalityList.find((p) => p.name === currentPersonalityName) ||
            personalityList[0];

          return (
            <section
              key={agent.id}
              className="flex flex-col gap-5 rounded-2xl p-6 sm:p-7 bg-slate-900/70 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-extrabold text-base flex items-center justify-center shrink-0">
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">
                      {agent.name}
                    </h2>
                    <span className="text-xs font-medium text-slate-400">
                      {agent.role}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-700/80 bg-slate-950/60 text-slate-300 shrink-0">
                  {currentPersonalityName}
                </span>
              </div>

              {agent.role_description && (
                <p className="text-xs text-slate-400 leading-relaxed -mt-1">
                  {agent.role_description}
                </p>
              )}

              <div className="space-y-2">
                <label
                  htmlFor={`agent-objective-${agent.id}`}
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Primary Objective
                </label>
                <textarea
                  id={`agent-objective-${agent.id}`}
                  rows={3}
                  value={agentState.objective}
                  onChange={(e) => handleObjectiveChange(agent.id, e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-y leading-relaxed"
                />
              </div>

              {Array.isArray(agentState.constraints) && agentState.constraints.length > 0 && (
                <div className="space-y-2.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Behavioral Constraints
                  </span>
                  <div className="space-y-2">
                    {agentState.constraints.map((constraint, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={constraint}
                        onChange={(e) => handleConstraintChange(agent.id, idx, e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(agentState.limits) && agentState.limits.length > 0 && (
                <div className="space-y-2.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Negotiation Limits & Bounds
                  </span>
                  <div className="space-y-2">
                    {agentState.limits.map((limit, idx) => {
                      const isMin = String(limit.type).toLowerCase() === 'min';
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                                isMin
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {isMin ? 'MIN' : 'MAX'}
                            </span>
                            <span className="text-xs font-medium text-slate-300 truncate capitalize">
                              {limit.item ? limit.item.replace(/_/g, ' ') : 'Parameter'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              value={limit.value}
                              onChange={(e) =>
                                handleLimitValueChange(agent.id, idx, e.target.value)
                              }
                              className="w-24 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-right text-xs font-bold text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            {limit.unit && (
                              <span className="text-xs font-medium text-slate-400 w-10 text-left">
                                {limit.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <label
                  htmlFor={`personality-select-${agent.id}`}
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300"
                >
                  Personality Profile
                </label>
                <select
                  id={`personality-select-${agent.id}`}
                  value={currentPersonalityName}
                  onChange={(e) => handlePersonalityChange(agent.id, e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  {personalityList.map((p) => (
                    <option key={p.name} value={p.name} className="bg-slate-900 text-slate-100">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {activePersonality && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activePersonality.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-indigo-500/20 text-slate-400">
                    <div>
                      <span className="block font-semibold text-slate-300">Stance:</span>
                      <span>{activePersonality.opening_stance}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-300">Concession:</span>
                      <span>{activePersonality.concession_style}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-300">Risk:</span>
                      <span>{activePersonality.risk_attitude}</span>
                    </div>
                  </div>

                  {activePersonality.example_phrase && (
                    <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2.5 text-xs italic text-cyan-300">
                      "{activePersonality.example_phrase}"
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </main>

      {validationErrors.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 sm:p-5 text-sm text-rose-200"
        >
          <div className="font-semibold text-rose-300 mb-2">
            Fix these before launching the simulation:
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <footer className="bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-100">
            Ready to Initialize Multi-Agent Simulation
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Agents will communicate turn-by-turn adhering strictly to reservation boundaries.
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {typeof onBack === 'function' && (
            <button
              type="button"
              onClick={onBack}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-center"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleStartNegotiation}
            disabled={isValidating}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 text-center disabled:opacity-60 disabled:cursor-wait"
          >
            <span>{isValidating ? 'Validating…' : 'Launch Simulation'}</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
