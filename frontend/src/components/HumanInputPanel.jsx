import { useState, useMemo, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';
import VoiceInputController from './VoiceInputController';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function HumanInputPanel({
  config,
  humanAgentId,
  currentRound = 1,
  latestTurn = null,
  onSubmitTurn,
  isSubmitting = false,
  isInitializing = false,
  submissionError = '',
}) {
  const { isDark } = useTheme();
  const controlsDisabled = isSubmitting || isInitializing;

  // Find human agent configuration from scenario
  const humanAgent = useMemo(() => {
    return (config?.agents || []).find((a) => a.id === humanAgentId) || {};
  }, [config, humanAgentId]);

  // Find AI opponent agent configuration
  const opponentAgent = useMemo(() => {
    return (config?.agents || []).find((a) => a.id !== humanAgent?.id) || {};
  }, [config, humanAgent]);

  // Reservation limits for human agent
  const limits = useMemo(() => humanAgent.limits || [], [humanAgent]);
  const offerFields = useMemo(
    () => limits.map((limit) => limit.item).filter(Boolean),
    [limits],
  );

  // Action: 'counter' | 'accept' | 'reject'
  const [action, setAction] = useState('counter');
  // Stance: 'flexible' | 'firm' | 'urgent'
  const [stance, setStance] = useState('flexible');
  // Reasoning text
  const [reasoning, setReasoning] = useState('');
  // Values for each negotiable item
  const [offerValues, setOfferValues] = useState(() => {
    const initial = {};
    for (const lim of limits) {
      const itemKey = lim.item;
      if (!itemKey) continue;
      if (latestTurn?.offer?.[itemKey] !== undefined) {
        initial[itemKey] = latestTurn.offer[itemKey];
      } else {
        initial[itemKey] = lim.value ?? '';
      }
    }
    return initial;
  });

  useEffect(() => {
    const next = {};
    for (const lim of limits) {
      const itemKey = lim.item;
      if (!itemKey) continue;
      next[itemKey] = latestTurn?.offer?.[itemKey] !== undefined
        ? latestTurn.offer[itemKey]
        : lim.value ?? '';
    }
    // Keep editable form state aligned only when the scenario, seat, or proposal changes.
    setOfferValues(next);
  }, [
    config?.id,
    config?.scenario_id,
    humanAgentId,
    latestTurn?.turn_number,
    latestTurn?.round,
    latestTurn?.agent_id,
    latestTurn?.action,
    latestTurn?.offer,
    limits,
  ]);

  // Check if an offer value violates the human's reservation boundary
  const getBoundaryViolation = (item, val) => {
    const itemLimits = limits.filter((lim) => lim.item === item);
    if (itemLimits.length === 0) return `No reservation limit is configured for ${item}.`;
    if (val === '' || val === null || val === undefined) return 'A value is required.';
    const num = Number(val);
    if (!Number.isFinite(num)) return 'Value must be a valid finite number.';

    for (const lim of itemLimits) {
      const lType = String(lim.type || '').toLowerCase();
      let boundVal = Number(lim.value);
      // Hard reservation floor guard: Vendor floor cannot be lower than 35000 INR
      if (item === 'price' && lType === 'min') {
        boundVal = Math.max(boundVal, 35000);
      }
      if (item === 'price' && lType === 'max') {
        boundVal = Math.min(boundVal, 40000);
      }
      if (lType === 'min' && num < boundVal) {
        return `Below minimum reservation limit: ${boundVal} ${lim.unit || 'INR'}.`;
      }
      if (lType === 'max' && num > boundVal) {
        return `Above maximum reservation limit: ${boundVal} ${lim.unit || 'INR'}.`;
      }
    }
    return null;
  };
  const counterofferErrors = limits
    .map((lim) => {
      const itemKey = lim.item;
      if (!itemKey) return null;
      const violation = getBoundaryViolation(itemKey, offerValues[itemKey] ?? '');
      return violation ? { item: itemKey, message: violation } : null;
    })
    .filter(Boolean);

  const handleValueChange = (item, newVal) => {
    setOfferValues((prev) => ({
      ...prev,
      [item]: newVal,
    }));
  };

  const handleQuickReason = (text) => {
    setReasoning(text);
  };

  const handleVoiceResult = ({ field, offer, reasoning: spokenReasoning }) => {
    const isProjectBudgetAllocation =
      config?.id === 'project_budget_allocation' ||
      config?.scenario_id === 'project_budget_allocation';
    const voiceValue = isProjectBudgetAllocation ? offer / 100000 : offer;

    setOfferValues((previous) => ({ ...previous, [field]: voiceValue }));
    if (spokenReasoning) {
      setReasoning((previous) =>
        previous ? `${previous} ${spokenReasoning}` : spokenReasoning,
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (controlsDisabled) return;
    if (action === 'counter' && counterofferErrors.length > 0) return;

    let finalOffer = {};
    if (action === 'accept') {
      finalOffer = latestTurn?.offer ? { ...latestTurn.offer } : { ...offerValues };
    } else if (action === 'reject') {
      finalOffer = {};
    } else {
      for (const [k, v] of Object.entries(offerValues)) {
        finalOffer[k] = Number(v);
      }
    }

    const turnPayload = {
      agent_id: humanAgent.id,
      action,
      offer: finalOffer,
      reasoning:
        reasoning.trim() ||
        (action === 'accept'
          ? `Human participant (${humanAgent.name}) accepts the current proposed terms.`
          : action === 'reject'
          ? `Human participant (${humanAgent.name}) walks away from the negotiation.`
          : `Human participant (${humanAgent.name}) submits counteroffer.`),
      stance,
    };

    if (typeof onSubmitTurn === 'function') {
      onSubmitTurn(turnPayload);
    }
  };

  const canAccept = Boolean(latestTurn && latestTurn.action !== 'reject');

  // Compute AI Strategy Coach suggested counteroffer inside ZOPA bounds
  const coachHint = useMemo(() => {
    if (!Array.isArray(limits) || limits.length === 0) return null;
    const suggested = {};
    const parts = [];
    for (const lim of limits) {
      const key = lim.item;
      if (!key) continue;
      const myType = String(lim.type || 'min').toLowerCase();
      const myBound = Number(lim.value);
      const oppLim = (opponentAgent?.limits || []).find((ol) => ol.item === key);
      const oppBound = oppLim ? Number(oppLim.value) : null;
      const latestVal = latestTurn?.offer?.[key] !== undefined ? Number(latestTurn.offer[key]) : null;

      let targetVal = myBound;
      if (oppBound !== null && Number.isFinite(oppBound) && Number.isFinite(myBound)) {
        const low = Math.min(myBound, oppBound);
        const high = Math.max(myBound, oppBound);
        if (latestVal !== null && Number.isFinite(latestVal)) {
          const clampedLatest = Math.min(high, Math.max(low, latestVal));
          const midpoint = (myBound + clampedLatest) / 2;
          targetVal = Number.isInteger(myBound) && Number.isInteger(oppBound)
            ? Math.round(midpoint)
            : Number(midpoint.toFixed(1));
        } else {
          const anchorRatio = myType === 'min' ? 0.65 : 0.35;
          const raw = low + (high - low) * anchorRatio;
          targetVal = Number.isInteger(myBound) && Number.isInteger(oppBound)
            ? Math.round(raw)
            : Number(raw.toFixed(1));
        }
      }
      if (key === 'price' && myType === 'min') targetVal = Math.max(targetVal, 35000);
      if (key === 'price' && myType === 'max') targetVal = Math.min(targetVal, 40000);
      suggested[key] = targetVal;
      parts.push(`${key.replace(/_/g, ' ')}: ${targetVal} ${lim.unit || ''}`.trim());
    }
    return {
      suggested,
      summary: parts.join(' · '),
    };
  }, [limits, opponentAgent, latestTurn]);

  const handleApplyCoachHint = () => {
    if (!coachHint) return;
    setAction('counter');
    setOfferValues((prev) => ({ ...prev, ...coachHint.suggested }));
    if (!reasoning.trim()) {
      setReasoning('Proposing a balanced compromise within our shared agreement zone.');
    }
  };

  return (
    <div
      className={`liquid-glass rounded-2xl border p-6 shadow-2xl transition-all relative overflow-hidden animate-fade-in ${
        isDark
          ? 'border-[#EE2A54]/60 bg-[#131B4B]/90 shadow-[0_0_32px_rgba(238,42,84,0.16)]'
          : 'border-[#EE2A54]/40 bg-white shadow-xl'
      }`}
    >
      {/* ── Clean Header ── */}
      <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b mb-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <AgentAvatar role={humanAgent.role || humanAgent.id} size="md" />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className={`text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                Your Turn · Round #{currentRound}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EE2A54] text-white">
                {humanAgent.name || humanAgentId || 'You'}
              </span>
            </div>
            <p className={`text-sm ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/70'}`}>
              Negotiating against {opponentAgent.name || 'AI Opponent'}
            </p>
          </div>
        </div>

        {/* Action Segmented Tabs */}
        <div className={`inline-flex p-1 rounded-xl border gap-1 ${
          isDark ? 'bg-[#0A102E] border-white/15' : 'bg-[#F4F7FC] border-[#0E153A]/15'
        }`}>
          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => setAction('counter')}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer',
              action === 'counter'
                ? 'bg-[#EE2A54] text-white shadow-sm'
                : isDark ? 'text-[#A3B3D9] hover:text-white' : 'text-[#0E153A]/75 hover:text-[#0E153A]'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>Counteroffer</span>
          </button>

          <button
            type="button"
            disabled={!canAccept || controlsDisabled}
            onClick={() => setAction('accept')}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              action === 'accept'
                ? 'bg-[#1CD4A3] text-[#0A102E] shadow-sm'
                : isDark ? 'text-[#A3B3D9] hover:text-white' : 'text-[#0E153A]/75 hover:text-[#0E153A]'
            )}
            title={!canAccept ? 'No proposal on the table to accept yet' : 'Accept current terms'}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Accept</span>
          </button>

          <button
            type="button"
            disabled={controlsDisabled}
            onClick={() => setAction('reject')}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer',
              action === 'reject'
                ? 'bg-rose-600 text-white shadow-sm'
                : isDark ? 'text-[#A3B3D9] hover:text-white' : 'text-[#0E153A]/75 hover:text-[#0E153A]'
            )}
          >
            <XCircle className="w-4 h-4" />
            <span>Walk Away</span>
          </button>
        </div>
      </div>

      {/* ── Latest Opponent Move ── */}
      {latestTurn && (
        <div className={`px-4 py-3.5 rounded-xl border mb-5 flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-[#0A102E]/85 border-white/10' : 'bg-[#F4F7FC] border-[#0E153A]/15'
        }`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`text-sm font-semibold ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
              {latestTurn.agent_name || opponentAgent.name} offered:
            </span>
            {Object.entries(latestTurn.offer || {}).map(([key, val]) => (
              <span key={key} className={`px-3 py-1 rounded-lg border font-mono text-sm font-bold ${
                isDark ? 'bg-[#131B4B] border-[#1CD4A3]/40 text-[#1CD4A3]' : 'bg-white border-[#0E153A]/20 text-[#0E153A]'
              }`}>
                {key.replace(/_/g, ' ')}: {Number(val).toLocaleString()}
              </span>
            ))}
          </div>
          {latestTurn.reasoning && (
            <span className={`text-xs italic max-w-md ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/75'}`}>
              &ldquo;{latestTurn.reasoning}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* ── Main Turn Submission Form ── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {action === 'counter' && (
          <div className="space-y-4">
            {/* Voice Input + AI Strategy Coach Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`lg:col-span-7 p-4 rounded-xl border ${
                isDark ? 'bg-[#0A102E]/85 border-[#EE2A54]/50' : 'bg-[#F4F7FC] border-[#EE2A54]/40'
              }`}>
                <VoiceInputController
                  isDark={isDark}
                  disabled={controlsDisabled}
                  offerFields={offerFields}
                  onOfferResult={handleVoiceResult}
                />
              </div>

              {coachHint && (
                <div className={`lg:col-span-5 p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isDark ? 'bg-[#0A102E]/85 border-[#1CD4A3]/40' : 'bg-[#F4F7FC] border-[#1CD4A3]/50'
                }`}>
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#1CD4A3] mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Coach Suggestion
                    </span>
                    <p className={`text-xs font-mono font-bold truncate ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                      {coachHint.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={controlsDisabled}
                    onClick={handleApplyCoachHint}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1CD4A3] hover:bg-[#16b88d] text-[#0A102E] transition-all cursor-pointer shrink-0"
                  >
                    Apply Hint
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {limits.map((lim, idx) => {
                const itemKey = lim.item;
                if (!itemKey) return null;
                const isMin = String(lim.type).toLowerCase() === 'min';
                const val = offerValues[itemKey] ?? '';
                const violation = getBoundaryViolation(itemKey, val);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      violation
                        ? 'border-rose-500/70 bg-rose-500/10'
                        : isDark
                        ? 'border-white/15 bg-[#0A102E]/85'
                        : 'border-[#0E153A]/15 bg-[#F4F7FC]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`text-sm font-bold capitalize ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                        {itemKey.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border',
                          isMin
                            ? 'bg-[#1CD4A3]/15 text-[#1CD4A3] border-[#1CD4A3]/40'
                            : 'bg-[#EE2A54]/15 text-[#EE2A54] border-[#EE2A54]/40'
                        )}
                      >
                        {isMin ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isMin ? 'Min' : 'Max'}: {itemKey === 'price' && isMin ? Math.max(Number(lim.value), 35000) : itemKey === 'price' && !isMin ? Math.min(Number(lim.value), 40000) : lim.value} {lim.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        type="number"
                        step="any"
                        disabled={controlsDisabled}
                        value={val}
                        onChange={(e) => handleValueChange(itemKey, e.target.value)}
                        className={`w-full font-mono font-bold text-base px-4 py-2.5 rounded-xl border outline-none transition-colors ${
                          violation
                            ? 'border-rose-500 text-rose-300 bg-rose-950/20'
                            : isDark
                            ? 'bg-[#131B4B] border-white/15 focus:border-[#EE2A54] text-white'
                            : 'bg-white border-[#0E153A]/20 focus:border-[#EE2A54] text-[#0E153A]'
                        }`}
                        placeholder={`Enter ${itemKey}...`}
                        required
                      />
                      <span className={`text-sm font-bold shrink-0 ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]'}`}>
                        {lim.unit}
                      </span>
                    </div>

                    {violation && (
                      <p className="text-xs text-rose-400 font-semibold mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{violation}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {action === 'counter' && counterofferErrors.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm" role="alert">
            <p className="font-bold mb-1">Review your counteroffer values:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {counterofferErrors.map((error, index) => (
                <li key={`${error.item}-${index}`}>{error.item.replace(/_/g, ' ')}: {error.message}</li>
              ))}
            </ul>
          </div>
        )}

        {submissionError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm" role="alert">
            <p className="font-bold mb-1">The backend rejected the turn</p>
            <p className="text-xs">{submissionError}</p>
          </div>
        )}

        {action === 'accept' && (
          <div className="p-4 rounded-xl bg-[#1CD4A3]/10 border border-[#1CD4A3]/40 text-[#1CD4A3] text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Accepting the opponent&apos;s latest terms will finalize the deal.</span>
          </div>
        )}

        {action === 'reject' && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Walking away will immediately end the negotiation without a deal.</span>
          </div>
        )}

        {/* 2. Reasoning + Tone Pills */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-[#1CD4A3] flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>Reason (Optional)</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold mr-1 ${isDark ? 'text-[#A3B3D9]' : 'text-[#0E153A]/70'}`}>Tone:</span>
              {[
                { id: 'flexible', label: 'Flexible' },
                { id: 'firm', label: 'Firm' },
                { id: 'urgent', label: 'Urgent' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => setStance(s.id)}
                  className={cn(
                    'px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer',
                    stance === s.id
                      ? 'border-[#EE2A54] bg-[#EE2A54]/20 text-white'
                      : isDark
                      ? 'border-white/15 bg-[#0A102E] text-[#A3B3D9] hover:text-white'
                      : 'border-[#0E153A]/15 bg-white text-[#0E153A]'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            value={reasoning}
            disabled={controlsDisabled}
            onChange={(e) => setReasoning(e.target.value)}
            className={`w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all ${
              isDark
                ? 'bg-[#0A102E]/90 border-white/15 focus:border-[#EE2A54] text-white placeholder-[#A3B3D9]/60'
                : 'bg-[#F4F7FC] border-[#0E153A]/15 focus:border-[#EE2A54] text-[#0E153A] placeholder-slate-400'
            }`}
            placeholder="Briefly explain your offer (or pick a quick reason below)..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                'Balanced compromise',
                'Holding firm on limits',
                'Open to trade-offs',
              ].map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  disabled={controlsDisabled}
                  onClick={() => handleQuickReason(chip)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-white/15 bg-[#0A102E] text-[#A3B3D9] hover:text-white hover:border-[#1CD4A3]'
                      : 'border-[#0E153A]/15 bg-[#F4F7FC] text-[#0E153A] hover:border-[#EE2A54]'
                  }`}
                >
                  + {chip}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={controlsDisabled || (action === 'counter' && counterofferErrors.length > 0)}
              className={cn(
                'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                action === 'accept'
                  ? 'bg-[#1CD4A3] text-[#0A102E] hover:bg-[#16b88d]'
                  : action === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-[#EE2A54] hover:bg-[#d62249] shadow-[0_6px_22px_rgba(238,42,84,0.45)]'
              )}
            >
              <Send className="w-4 h-4" />
              <span>
                {isInitializing
                  ? 'Preparing...'
                  : isSubmitting
                  ? 'Sending...'
                  : action === 'accept'
                  ? 'Accept Deal'
                  : action === 'reject'
                  ? 'Confirm Walk Away'
                  : 'Send Offer'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
