import { useState } from 'react';
import vendorPricing from './data/vendor_pricing.json';
import jobOffer from './data/job_offer.json';
import projectBudgetAllocation from './data/project_budget_allocation.json';
import ScenarioSelectionScreen from './components/ScenarioSelectionScreen';
import AgentConfigScreen from './components/AgentConfigScreen';

const scenarios = [vendorPricing, jobOffer, projectBudgetAllocation];

function App() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentStep, setCurrentStep] = useState('select');
  const [negotiationConfig, setNegotiationConfig] = useState(null);

  const activeSetup = negotiationConfig || selectedScenario;

  return (
    <div
      className="app-container"
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        width: '100%',
        color: '#334155',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        .app-container * {
          box-sizing: border-box;
        }
        .selection-screen {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 24px;
          text-align: left;
        }
        .selection-screen__header {
          margin-bottom: 28px;
        }
        .selection-screen__step-badge {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 8px;
        }
        .selection-screen__title {
          font-size: 26px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }
        .selection-screen__subtitle {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          margin: 0;
          max-width: 800px;
        }
        .selection-screen__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 28px;
        }
        .scenario-card {
          background-color: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
          outline: none;
        }
        .scenario-card:hover {
          border-color: #93c5fd;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -2px rgba(0, 0, 0, 0.08);
        }
        .scenario-card--selected {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 2px #2563eb, 0 8px 20px -4px rgba(37, 99, 235, 0.15) !important;
          background-color: #fbfdff;
        }
        .scenario-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .scenario-card__badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 9999px;
        }
        .badge--neutral {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
        }
        .badge--outline {
          background-color: #ffffff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        }
        .scenario-card__radio {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .scenario-card__radio--checked {
          border-color: #2563eb;
          background-color: #2563eb;
          color: #ffffff;
        }
        .scenario-card__check-icon {
          width: 12px;
          height: 12px;
        }
        .scenario-card__title {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.3;
        }
        .scenario-card__description {
          font-size: 13px;
          color: #475569;
          line-height: 1.5;
          margin: 0;
          flex-grow: 1;
        }
        .scenario-card__stakeholders {
          border-top: 1px solid #f1f5f9;
          padding-top: 12px;
        }
        .scenario-card__section-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 8px 0;
          display: block;
        }
        .scenario-card__agent-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .scenario-card__agent-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: #f8fafc;
          padding: 6px 10px;
          border-radius: 6px;
        }
        .scenario-card__agent-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #e2e8f0;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scenario-card__agent-details {
          display: flex;
          flex-direction: column;
        }
        .scenario-card__agent-name {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
        }
        .scenario-card__agent-role {
          font-size: 11px;
          color: #64748b;
        }
        .scenario-card__items-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .scenario-card__item-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tag {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #dbeafe;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .scenario-card__footer {
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
        .scenario-card--selected .scenario-card__footer-status {
          color: #2563eb;
        }
        .selection-screen__action-bar {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .selection-screen__status {
          font-size: 14px;
          color: #475569;
        }
        .selection-screen__selected-info,
        .selection-screen__unselected-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-dot--active {
          background-color: #16a34a;
        }
        .status-dot--idle {
          background-color: #94a3b8;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 22px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .btn--primary {
          background-color: #2563eb;
          color: #ffffff;
        }
        .btn--primary:hover:not(:disabled) {
          background-color: #1d4ed8;
        }
        .btn--primary:disabled {
          background-color: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
        }
        .btn__icon {
          width: 16px;
          height: 16px;
        }
      `}</style>

      {currentStep === 'select' && (
        <ScenarioSelectionScreen
          scenarios={scenarios}
          selectedScenario={selectedScenario}
          onSelectScenario={(s) => setSelectedScenario(s)}
          onContinue={() => setCurrentStep('config')}
        />
      )}

      {currentStep === 'config' && (
        <AgentConfigScreen
          selectedScenario={selectedScenario}
          onBack={() => setCurrentStep('select')}
          onStartNegotiation={(config) => {
            setNegotiationConfig(config);
            setCurrentStep('negotiate');
          }}
        />
      )}

      {currentStep === 'negotiate' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 24px', textAlign: 'left' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2563eb',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Step 3 of 3: Simulation Active
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundColor: '#dcfce7',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  Running
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep('select')}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset to Scenario Selection
              </button>
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
              {activeSetup?.title || 'Negotiation Simulation'}
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
              {activeSetup?.description || 'Active multi-agent negotiation in progress.'}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                }}
              >
                Max Rounds: {activeSetup?.max_rounds ?? 10}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                }}
              >
                Active Agents: {(activeSetup?.agents || []).length}
              </span>
            </div>
          </header>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '28px',
            }}
          >
            {(activeSetup?.agents || []).map((agent) => (
              <div
                key={agent.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#0f172a',
                      margin: 0,
                    }}
                  >
                    {agent.name}
                  </h2>
                  <span
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                    }}
                  >
                    {agent.personality || agent.default_personality || 'Collaborative'}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    fontWeight: 500,
                  }}
                >
                  Role: {agent.role}
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                    }}
                  >
                    Objective
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#1e293b',
                      lineHeight: 1.5,
                    }}
                  >
                    {agent.goal}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <footer
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Negotiation session initialized
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                You can return to scenario selection to test a different setup at any time.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep('select')}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 22px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Select New Scenario
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}

export default App;
