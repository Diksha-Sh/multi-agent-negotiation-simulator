import { useState } from 'react';
import vendorPricing from '../data/vendor_pricing.json';
import personalityList from '../data/personalities.json';

export default function AgentConfigScreen({
  selectedScenario = vendorPricing,
  onBack,
  onStartNegotiation,
}) {
  const scenario = selectedScenario || vendorPricing;

  const [maxRounds, setMaxRounds] = useState(() => scenario?.max_rounds ?? 10);
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

  const handleStartNegotiation = () => {
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
            value: Number(limit.value) || 0,
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

    if (typeof onStartNegotiation === 'function') {
      onStartNegotiation(customScenarioConfig);
    }
  };

  const agents = scenario.agents || [];

  return (
    <div
      className="agent-config-screen-container"
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        width: '100%',
        color: '#334155',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '36px 24px',
        boxSizing: 'border-box',
        textAlign: 'left',
      }}
    >
      <style>{`
        .agent-config-screen-container * {
          box-sizing: border-box;
        }
        .agent-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }
        @media (max-width: 860px) {
          .agent-grid {
            grid-template-columns: 1fr;
          }
        }
        .config-input:focus,
        .config-textarea:focus,
        .personality-select:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
        }
        .personality-select {
          width: 100%;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          cursor: pointer;
          outline: none;
        }
        .btn-start-negotiation {
          background-color: #2563eb;
          border: none;
          color: #ffffff;
          padding: 11px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 2px 0 rgba(37, 99, 235, 0.2);
          transition: background-color 0.15s ease-in-out;
        }
        .btn-start-negotiation:hover {
          background-color: #1d4ed8;
        }
        .btn-back-action {
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
        }
        .btn-back-action:hover {
          background-color: #f1f5f9;
          border-color: #94a3b8;
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px 28px',
            marginBottom: '28px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Negotiation Scenario
            </span>
            {typeof onBack === 'function' && (
              <button
                type="button"
                onClick={onBack}
                className="btn-back-action"
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                Back
              </button>
            )}
          </div>

          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 8px 0',
              lineHeight: 1.3,
            }}
          >
            {scenario.title}
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#334155',
              lineHeight: 1.6,
              margin: '0 0 16px 0',
              maxWidth: '850px',
            }}
          >
            {scenario.description}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px 4px 12px',
                borderRadius: '9999px',
                cursor: 'pointer',
              }}
            >
              <span>Max Rounds:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={maxRounds}
                onChange={(e) => setMaxRounds(e.target.value)}
                className="config-input"
                style={{
                  width: '54px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #93c5fd',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1d4ed8',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
            </label>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '9999px',
              }}
            >
              Active Agents: {agents.length}
            </span>
          </div>
        </header>

        <main className="agent-grid">
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
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '6px',
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#0f172a',
                        margin: 0,
                      }}
                    >
                      {agent.name}
                    </h2>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                      }}
                    >
                      {agent.role}
                    </span>
                  </div>

                  {agent.role_description && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#64748b',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {agent.role_description}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                  }}
                >
                  <label
                    htmlFor={`agent-objective-${agent.id}`}
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '6px',
                    }}
                  >
                    Objective
                  </label>
                  <textarea
                    id={`agent-objective-${agent.id}`}
                    rows={2}
                    value={agentState.objective}
                    onChange={(e) => handleObjectiveChange(agent.id, e.target.value)}
                    className="config-textarea"
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#0f172a',
                      lineHeight: 1.5,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {Array.isArray(agentState.constraints) && agentState.constraints.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                      }}
                    >
                      Constraints
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {agentState.constraints.map((constraint, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={constraint}
                          onChange={(e) => handleConstraintChange(agent.id, idx, e.target.value)}
                          className="config-input"
                          style={{
                            width: '100%',
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: '#334155',
                            lineHeight: 1.4,
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(agentState.limits) && agentState.limits.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                      }}
                    >
                      Negotiation Limits
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {agentState.limits.map((limit, idx) => {
                        const isMin = String(limit.type).toLowerCase() === 'min';
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #f1f5f9',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                color: '#334155',
                                fontWeight: 500,
                                textTransform: 'capitalize',
                              }}
                            >
                              {limit.item ? limit.item.replace(/_/g, ' ') : 'Limit'}
                            </span>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  backgroundColor: isMin ? '#dcfce7' : '#fee2e2',
                                  border: isMin ? '1px solid #bbf7d0' : '1px solid #fecaca',
                                  color: isMin ? '#15803d' : '#b91c1c',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                }}
                              >
                                {isMin ? 'MIN' : 'MAX'}
                              </span>
                              <input
                                type="number"
                                value={limit.value}
                                onChange={(e) =>
                                  handleLimitValueChange(agent.id, idx, e.target.value)
                                }
                                className="config-input"
                                style={{
                                  width: '90px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  textAlign: 'right',
                                  outline: 'none',
                                }}
                              />
                              {limit.unit && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: '#64748b',
                                    fontWeight: 500,
                                  }}
                                >
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

                <div>
                  <label
                    htmlFor={`personality-select-${agent.id}`}
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '6px',
                    }}
                  >
                    Personality Profile
                  </label>
                  <select
                    id={`personality-select-${agent.id}`}
                    value={currentPersonalityName}
                    onChange={(e) => handlePersonalityChange(agent.id, e.target.value)}
                    className="personality-select"
                  >
                    {personalityList.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activePersonality && (
                  <div
                    style={{
                      borderLeft: '3px solid #2563eb',
                      borderTop: '1px solid #e2e8f0',
                      borderRight: '1px solid #e2e8f0',
                      borderBottom: '1px solid #e2e8f0',
                      borderRadius: '0 8px 8px 0',
                      backgroundColor: '#f8faff',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#334155',
                        lineHeight: 1.5,
                      }}
                    >
                      {activePersonality.description}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: 1.4,
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0f172a' }}>Opening stance: </strong>
                        {activePersonality.opening_stance}
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Concession style: </strong>
                        {activePersonality.concession_style}
                      </div>
                      <div>
                        <strong style={{ color: '#0f172a' }}>Risk attitude: </strong>
                        {activePersonality.risk_attitude}
                      </div>
                    </div>

                    {activePersonality.example_phrase && (
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontStyle: 'italic',
                          color: '#1d4ed8',
                          lineHeight: 1.4,
                        }}
                      >
                        "{activePersonality.example_phrase}"
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </main>

        <footer
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px 28px',
            marginTop: '28px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              Ready to begin simulation
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              Agents will negotiate according to configured limits and personality traits.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {typeof onBack === 'function' && (
              <button
                type="button"
                onClick={onBack}
                className="btn-back-action"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleStartNegotiation}
              className="btn-start-negotiation"
            >
              Start Negotiation
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
