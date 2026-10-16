import React from 'react'

/**
 * ScenarioCard Component
 * Displays a single negotiation scenario with dynamic details loaded from the scenario JSON.
 * Provides accessible keyboard and mouse interaction with a distinct visual selected state.
 */
export function ScenarioCard({ scenario, isSelected, onSelect }) {
  if (!scenario) return null

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      onSelect(scenario)
    }
  }

  // Extract distinct negotiation items from agents' limits
  const negotiationItems = Array.from(
    new Set(
      (scenario.agents || []).flatMap((agent) =>
        (agent.limits || []).map((l) => l.item).filter(Boolean)
      )
    )
  )

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(scenario)}
      onKeyDown={handleKeyDown}
      className={`scenario-card ${isSelected ? 'scenario-card--selected' : ''}`}
      data-scenario-id={scenario.id}
    >
      {/* Top Header: ID badge, rounds, and radio selection indicator */}
      <div className="scenario-card__header">
        <div className="scenario-card__badges">
          <span className="badge badge--neutral">{scenario.id}</span>
          <span className="badge badge--outline">{scenario.max_rounds || 10} Rounds</span>
        </div>
        <div
          className={`scenario-card__radio ${isSelected ? 'scenario-card__radio--checked' : ''}`}
          aria-hidden="true"
        >
          {isSelected && (
            <svg
              className="scenario-card__check-icon"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Scenario Title and Description */}
      <h3 className="scenario-card__title">{scenario.title}</h3>
      <p className="scenario-card__description">{scenario.description}</p>

      {/* Stakeholders Section */}
      <div className="scenario-card__stakeholders">
        <h4 className="scenario-card__section-label">
          Stakeholders ({(scenario.agents || []).length})
        </h4>
        <div className="scenario-card__agent-list">
          {(scenario.agents || []).map((agent) => (
            <div key={agent.id} className="scenario-card__agent-item">
              <div className="scenario-card__agent-icon">
                {agent.name.charAt(0)}
              </div>
              <div className="scenario-card__agent-details">
                <span className="scenario-card__agent-name">{agent.name}</span>
                <span className="scenario-card__agent-role">{agent.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Negotiation Items */}
      {negotiationItems.length > 0 && (
        <div className="scenario-card__items-section">
          <span className="scenario-card__section-label">Negotiation Focus:</span>
          <div className="scenario-card__item-tags">
            {negotiationItems.map((item) => (
              <span key={item} className="tag">
                {item.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Selection Indicator */}
      <div className="scenario-card__footer">
        <span className="scenario-card__footer-status">
          {isSelected ? '✓ Selected Scenario' : 'Click to select'}
        </span>
      </div>
    </div>
  )
}

export default ScenarioCard
