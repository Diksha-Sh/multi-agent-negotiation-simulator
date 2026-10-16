import React from 'react'
import ScenarioCard from './ScenarioCard'

/**
 * ScenarioSelectionScreen Component
 * Renders the three scenario cards loaded from existing scenario JSON data.
 * Manages selection state and provides a Continue button that remains disabled
 * until a scenario is picked.
 */
export function ScenarioSelectionScreen({
  scenarios = [],
  selectedScenario = null,
  onSelectScenario,
  onContinue
}) {
  const isContinueDisabled = !selectedScenario

  const handleContinueClick = () => {
    if (selectedScenario && onContinue) {
      onContinue(selectedScenario)
    }
  }

  return (
    <main className="selection-screen" aria-labelledby="screen-title">
      {/* Top Banner & Header */}
      <section className="selection-screen__header">
        <div className="selection-screen__step-badge">
          Step 1 of 3: Setup
        </div>
        <h1 id="screen-title" className="selection-screen__title">
          Select a Negotiation Scenario
        </h1>
        <p className="selection-screen__subtitle">
          Choose a scenario below to set up stakeholder roles, limits, and personalities for the simulation.
        </p>
      </section>

      {/* Scenarios Grid */}
      <section
        className="selection-screen__grid"
        role="radiogroup"
        aria-label="Available Negotiation Scenarios"
      >
        {scenarios.map((scenario) => {
          const isSelected = selectedScenario?.id === scenario.id
          return (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isSelected={isSelected}
              onSelect={onSelectScenario}
            />
          )
        })}
      </section>

      {/* Action Bar / Controls */}
      <footer className="selection-screen__action-bar">
        <div className="selection-screen__status" aria-live="polite">
          {selectedScenario ? (
            <div className="selection-screen__selected-info">
              <span className="status-dot status-dot--active" />
              <span>
                Selected: <strong>{selectedScenario.title}</strong>
              </span>
            </div>
          ) : (
            <div className="selection-screen__unselected-info">
              <span className="status-dot status-dot--idle" />
              <span>Please select a scenario above to proceed</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary"
          disabled={isContinueDisabled}
          aria-disabled={isContinueDisabled}
          onClick={handleContinueClick}
          id="continue-btn"
        >
          <span>Continue</span>
          <svg
            className="btn__icon"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </footer>
    </main>
  )
}

export default ScenarioSelectionScreen
