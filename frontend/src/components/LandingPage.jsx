import { useState } from 'react';

export default function LandingPage({
  onTrySimulator,
  onStart,
  currentUser = null,
  onLogin,
  onLogout,
}) {
  const [authModal, setAuthModal] = useState(null);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  const handleStart = () => {
    if (typeof onTrySimulator === 'function') {
      onTrySimulator();
    } else if (typeof onStart === 'function') {
      onStart();
    }
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authEmail && authPassword) {
      const displayName =
        authModal === 'signup' && authName.trim()
          ? authName.trim()
          : authEmail.split('@')[0] || 'User';

      const userData = {
        name: displayName,
        username: displayName,
        email: authEmail,
      };

      if (typeof onLogin === 'function') {
        onLogin(userData);
      }
      closeAuthModal();
    }
  };

  const closeAuthModal = () => {
    setAuthModal(null);
    setAuthEmail('');
    setAuthPassword('');
    setAuthName('');
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const userInitial = (
    currentUser?.name ||
    currentUser?.username ||
    'U'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        width: '100%',
        color: '#334155',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        textAlign: 'left',
      }}
    >
      <style>{`
        .landing-container * {
          box-sizing: border-box;
        }
        .landing-nav-link {
          background: none;
          border: none;
          color: #475569;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: color 0.15s ease, background-color 0.15s ease;
        }
        .landing-nav-link:hover {
          color: #0f172a;
          background-color: #f1f5f9;
        }
        .landing-btn-primary {
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .landing-btn-primary:hover {
          background-color: #1d4ed8;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        .landing-btn-secondary {
          background-color: #ffffff;
          color: #334155;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .landing-btn-secondary:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
          color: #0f172a;
        }
        .landing-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .landing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }
        .scenarios-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }
        @media (max-width: 900px) {
          .feature-grid,
          .steps-grid,
          .scenarios-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="landing-container">
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img
                src="/favicon.svg"
                alt="NegotiationAI Logo"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  flexShrink: 0,
                  display: 'block',
                }}
              />
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#0f172a',
                }}
              >
                Negotiation<span style={{ color: '#2563eb' }}>AI</span>
              </span>
            </div>

            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <button
                type="button"
                className="landing-nav-link"
                onClick={() => scrollToSection('features')}
              >
                Features
              </button>
              <button
                type="button"
                className="landing-nav-link"
                onClick={() => scrollToSection('scenarios')}
              >
                Scenarios
              </button>
              <button
                type="button"
                className="landing-nav-link"
                onClick={() => scrollToSection('how-it-works')}
              >
                How It Works
              </button>
            </nav>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {currentUser ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '4px 6px 4px 10px',
                    borderRadius: '9999px',
                  }}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#eff6ff',
                      border: '1.5px solid #bfdbfe',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    {userInitial}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {currentUser.name || currentUser.username}
                  </span>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="landing-btn-secondary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      borderRadius: '9999px',
                    }}
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAuthModal('login')}
                    className="landing-btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                    }}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthModal('signup')}
                    className="landing-btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                    }}
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <section
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '80px 24px 60px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '6px 14px',
              borderRadius: '9999px',
              marginBottom: '24px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1d4ed8',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Autonomous Agent Negotiation Platform
            </span>
          </div>

          <h1
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              margin: '0 auto 20px',
              maxWidth: '900px',
            }}
          >
            Simulate & Optimize Complex Multi-Agent Negotiations
          </h1>

          <p
            style={{
              fontSize: '18px',
              color: '#475569',
              lineHeight: 1.6,
              maxWidth: '780px',
              margin: '0 auto 36px',
            }}
          >
            An intelligent simulation environment for evaluating automated multi-party
            bargaining, strategic concession curves, and stakeholder alignment under
            strict boundary constraints.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              marginBottom: '64px',
            }}
          >
            <button
              type="button"
              onClick={handleStart}
              className="landing-btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '16px',
              }}
            >
              Try Simulator
            </button>
            <button
              type="button"
              onClick={() => setShowDocsModal(true)}
              className="landing-btn-secondary"
              style={{
                padding: '14px 28px',
                fontSize: '16px',
              }}
            >
              View Documentation
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px 32px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                3 Scenarios
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 500,
                  marginTop: '4px',
                }}
              >
                Vendor Pricing, Job Offer & Budget Allocation
              </div>
            </div>
            <div
              style={{
                borderLeft: '1px solid #e2e8f0',
                borderRight: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#2563eb',
                }}
              >
                3 Personas
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 500,
                  marginTop: '4px',
                }}
              >
                Aggressive, Collaborative & Risk-Averse
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                100% Verified
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: 500,
                  marginTop: '4px',
                }}
              >
                Strict Reservation Bounds & Validation Engine
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '40px 24px 80px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Core Capabilities
            </span>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '8px 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              Engineered for Strategic Autonomous Agents
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#64748b',
                maxWidth: '680px',
                margin: '0 auto',
              }}
            >
              A robust simulation framework that allows researchers and engineers to test
              agent bargaining protocols with precision.
            </p>
          </div>

          <div className="feature-grid">
            <div className="landing-card">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '16px',
                  marginBottom: '16px',
                }}
              >
                P
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Multi-Agent Personas
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Assign behavioral profiles such as Aggressive anchorers, Collaborative
                value-creators, or Risk-Averse deal-closers to observe varied concession
                velocities and strategic opening stances.
              </p>
            </div>

            <div className="landing-card">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '16px',
                  marginBottom: '16px',
                }}
              >
                L
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Custom Limits & Constraints
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Configure fine-grained numerical reservation limits, ceiling budgets,
                floors, and categorical business rules. The simulator rigorously checks
                that no agreement crosses defined boundaries.
              </p>
            </div>

            <div className="landing-card">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '16px',
                  marginBottom: '16px',
                }}
              >
                S
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Real-Time Negotiation Strategy
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Inspect turn-by-turn counter-offers, trade-offs between multiple items,
                and reciprocal concessions as agents communicate across structured
                negotiation rounds.
              </p>
            </div>

            <div className="landing-card">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '16px',
                  marginBottom: '16px',
                }}
              >
                I
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Interactive Scenarios
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Switch between pre-built real-world templates including vendor contract
                discussions, executive salary offers, and capital budget allocation
                with instant parameter editing.
              </p>
            </div>
          </div>
        </section>

        <section
          id="scenarios"
          style={{
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            borderBottom: '1px solid #e2e8f0',
            padding: '72px 24px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Negotiation Arenas
              </span>
              <h2
                style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '8px 0 12px',
                  letterSpacing: '-0.02em',
                }}
              >
                Pre-Loaded Negotiation Scenarios
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  color: '#64748b',
                  maxWidth: '680px',
                  margin: '0 auto',
                }}
              >
                Ready-to-use business scenarios modeled with realistic stakeholder goals and constraints.
              </p>
            </div>

            <div className="scenarios-grid">
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    vendor_pricing
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: 500,
                    }}
                  >
                    10 Rounds
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Vendor Pricing Negotiation
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: 1.5,
                    margin: 0,
                    flexGrow: 1,
                  }}
                >
                  Procurement Manager negotiates bulk order pricing with an enterprise Sales
                  Representative to reach mutual commercial profitability.
                </p>
                <div
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Stakeholders: Buyer, Vendor
                  </span>
                  <button
                    type="button"
                    onClick={handleStart}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Select Scenario
                  </button>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    job_offer
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: 500,
                    }}
                  >
                    10 Rounds
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Job Offer Negotiation
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: 1.5,
                    margin: 0,
                    flexGrow: 1,
                  }}
                >
                  Software Developer Candidate bargains compensation and remote work policy
                  with an Engineering Hiring Manager.
                </p>
                <div
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Stakeholders: Candidate, Employer
                  </span>
                  <button
                    type="button"
                    onClick={handleStart}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Select Scenario
                  </button>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    project_budget
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      fontWeight: 500,
                    }}
                  >
                    10 Rounds
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Project Budget Allocation
                </h3>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#475569',
                    lineHeight: 1.5,
                    margin: 0,
                    flexGrow: 1,
                  }}
                >
                  Engineering Lead and Product Manager debate capital expenditure and headcount
                  split across quarterly development sprints.
                </p>
                <div
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Stakeholders: Engineering, Product
                  </span>
                  <button
                    type="button"
                    onClick={handleStart}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Select Scenario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '72px 24px 80px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Step-by-Step Workflow
            </span>
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#0f172a',
                margin: '8px 0 12px',
                letterSpacing: '-0.02em',
              }}
            >
              How NegotiationAI Operates
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#64748b',
                maxWidth: '680px',
                margin: '0 auto',
              }}
            >
              Seamless progression from domain selection to multi-agent simulation and outcome evaluation.
            </p>
          </div>

          <div className="steps-grid">
            <div className="landing-card" style={{ position: 'relative' }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#e2e8f0',
                  lineHeight: 1,
                  marginBottom: '12px',
                }}
              >
                01
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Select Scenario
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Browse through real-world business scenarios. Choose the context, review
                default agents, and verify baseline limits before configuration.
              </p>
            </div>

            <div className="landing-card" style={{ position: 'relative' }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#e2e8f0',
                  lineHeight: 1,
                  marginBottom: '12px',
                }}
              >
                02
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Configure Limits & Personalities
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Fine-tune stakeholder goals, edit numeric bounds (such as price or salary),
                update constraints, and set psychological profiles like Collaborative or Aggressive.
              </p>
            </div>

            <div className="landing-card" style={{ position: 'relative' }}>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#e2e8f0',
                  lineHeight: 1,
                  marginBottom: '12px',
                }}
              >
                03
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 8px',
                }}
              >
                Run Simulation Arena
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Initialize the multi-turn conversational loop. Watch agents exchange offers,
                make strategic concessions, and reach verified mutual agreements.
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '16px',
              padding: '36px',
              marginTop: '48px',
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#1e3a8a',
                margin: '0 0 8px',
              }}
            >
              Ready to Launch Your Negotiation Experiment?
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#1e40af',
                maxWidth: '600px',
                margin: '0 auto 20px',
              }}
            >
              Start the interactive simulator now and explore how different personalities
              and reservation limits shape final settlement deals.
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="landing-btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '15px',
              }}
            >
              Launch Simulator
            </button>
          </div>
        </section>

        <footer
          style={{
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '32px 24px',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/favicon.svg"
                alt="NegotiationAI Logo"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  flexShrink: 0,
                  display: 'block',
                }}
              />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>NegotiationAI</span>
              <span style={{ color: '#94a3b8' }}>|</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Multi-Agent Negotiation Simulator Platform
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>
              All validation checks enforced via boundary constraints.
            </div>
          </div>
        </footer>
      </div>

      {authModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              boxSizing: 'border-box',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
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
                {authModal === 'login' ? 'Log In to NegotiationAI' : 'Create Your Account'}
              </h2>
              <button
                type="button"
                onClick={closeAuthModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                X
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authModal === 'signup' && (
                <div style={{ marginBottom: '14px' }}>
                  <label
                    htmlFor="auth-name-input"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Enter your name"
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '9px 12px',
                      fontSize: '14px',
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label
                  htmlFor="auth-email-input"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Email Address
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="auth-password-input"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Password
                </label>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    fontSize: '14px',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                className="landing-btn-primary"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: '14px',
                  marginBottom: '14px',
                }}
              >
                {authModal === 'login' ? 'Log In' : 'Create Account'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                {authModal === 'login' ? (
                  <span>
                    Do not have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthModal('signup')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Sign Up
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthModal('login')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Log In
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showDocsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px',
              boxSizing: 'border-box',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2563eb',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Documentation
                </span>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '4px 0 0',
                  }}
                >
                  NegotiationAI Architecture
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                X
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                fontSize: '14px',
                color: '#334155',
                lineHeight: 1.6,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 6px',
                  }}
                >
                  1. Scenario Execution Framework
                </h3>
                <p style={{ margin: 0 }}>
                  Each scenario JSON provides defined stakeholders, role descriptions,
                  specific goals, qualitative constraints, and quantitative limits. Scenarios
                  run over a configurable maximum number of rounds (default: 10).
                </p>
              </div>

              <div>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 6px',
                  }}
                >
                  2. Behavioral Archetypes
                </h3>
                <p style={{ margin: 0 }}>
                  Agents are assigned behavioral profiles: Aggressive (high anchor, small concessions),
                  Collaborative (reciprocal trades, mutual gains), and Risk-Averse (early agreement,
                  loss avoidance). These govern opening positions and willingness to compromise.
                </p>
              </div>

              <div>
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 6px',
                  }}
                >
                  3. Boundary Validation Engine
                </h3>
                <p style={{ margin: 0 }}>
                  Before any negotiation starts, configurations are strictly validated by the
                  backend. The validator ensures compatible reservation limits (e.g., buyer maximum
                  cannot be strictly lower than vendor minimum) to confirm a feasible bargaining zone.
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setShowDocsModal(false)}
                className="landing-btn-secondary"
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
