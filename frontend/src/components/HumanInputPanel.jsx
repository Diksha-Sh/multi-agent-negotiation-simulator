import { useState, useMemo } from 'react';
import {
  User,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

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
}) {
  const { isDark } = useTheme();

  // Find human agent configuration from scenario
  const humanAgent = useMemo(() => {
    return (config?.agents || []).find((a) => a.id === humanAgentId) || config?.agents?.[0] || {};
  }, [config, humanAgentId]);

  // Find AI opponent agent configuration
  const opponentAgent = useMemo(() => {
    return (config?.agents || []).find((a) => a.id !== humanAgent?.id) || {};
  }, [config, humanAgent]);

  // Reservation limits for human agent
  const limits = useMemo(() => humanAgent.limits || [], [humanAgent]);

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
      const itemKey = lim.item || 'price';
      // If there's an incoming opponent offer, default close to it or halfway
      if (latestTurn?.offer?.[itemKey] !== undefined) {
        initial[itemKey] = latestTurn.offer[itemKey];
      } else {
        initial[itemKey] = lim.value ?? 0;
      }
    }
    return initial;
  });

  // Re-sync offer defaults if latestTurn changes
  const [prevTurnKey, setPrevTurnKey] = useState(latestTurn?.turn_number ?? null);
  if ((latestTurn?.turn_number ?? null) !== prevTurnKey) {
    setPrevTurnKey(latestTurn?.turn_number ?? null);
    if (latestTurn?.offer) {
      const next = {};
      for (const lim of limits) {
        const itemKey = lim.item || 'price';
        if (latestTurn.offer[itemKey] !== undefined) {
          next[itemKey] = latestTurn.offer[itemKey];
        } else {
          next[itemKey] = lim.value ?? 0;
        }
      }
      setOfferValues(next);
    }
  }

  // Check if an offer value violates the human's reservation boundary
  const getBoundaryViolation = (item, val) => {
    const lim = limits.find((l) => (l.item || 'price') === item);
    if (!lim) return null;
    const num = Number(val);
    if (Number.isNaN(num)) return 'Value must be a valid number.';
    const lType = String(lim.type || 'min').toLowerCase();
    const boundVal = Number(lim.value);

    if (lType === 'min' && num < boundVal) {
      return `Breaches floor: Minimum acceptable is ${boundVal} ${lim.unit || ''}.`;
    }
    if (lType === 'max' && num > boundVal) {
      return `Breaches ceiling: Maximum budget limit is ${boundVal} ${lim.unit || ''}.`;
    }
    return null;
  };

  const handleValueChange = (item, newVal) => {
    setOfferValues((prev) => ({
      ...prev,
      [item]: newVal,
    }));
  };

  const handleQuickReason = (text) => {
    setReasoning(text);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

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

  return (
    <div
      className={`rounded-2xl border p-6 sm:p-7 shadow-2xl transition-all relative overflow-hidden backdrop-blur-xl animate-fade-in ${
        isDark
          ? 'border-indigo-500/40 bg-gradient-to-br from-slate-900/90 via-indigo-950/20 to-slate-900/90 shadow-[0_0_40px_rgba(99,102,241,0.12)]'
          : 'border-indigo-400 bg-gradient-to-br from-white via-indigo-50/40 to-white shadow-indigo-100 shadow-xl'
      }`}
    >
      {/* ── Top Header: Active Seat & Turn Indicator ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-indigo-500/20 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <AgentAvatar role={humanAgent.role || humanAgent.id} size="md" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <User className="w-3 h-3" />
                <span>Your Move · Round #{currentRound}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                Seat: {humanAgent.name}
              </span>
            </div>
            <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Interactive Human Input Console
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Playing live as <strong className="text-indigo-400 font-semibold">{humanAgent.name}</strong> ({humanAgent.role}) against <span className="font-semibold">{opponentAgent.name || 'AI Opponent'}</span>.
            </p>
          </div>
        </div>

        {/* Status Callout */}
        <div className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 self-start sm:self-center shrink-0 ${
          isDark ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Awaiting Human Decision</span>
        </div>
      </div>

      {/* ── Latest Opponent Move Spotlight (if any) ── */}
      {latestTurn && (
        <div className={`p-4 rounded-xl border mb-6 transition-all ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Latest AI Proposal on the Table:
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {latestTurn.agent_name || opponentAgent.name} · Action: {latestTurn.action.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-2">
            {Object.entries(latestTurn.offer || {}).map(([key, val]) => (
              <div key={key} className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold ${
                isDark ? 'bg-slate-900 border-slate-700 text-indigo-300' : 'bg-white border-slate-300 text-indigo-600'
              }`}>
                <span className="opacity-70 capitalize">{key.replace(/_/g, ' ')}:</span> {Number(val).toLocaleString()}
              </div>
            ))}
          </div>

          {latestTurn.reasoning && (
            <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              "{latestTurn.reasoning}"
            </p>
          )}
        </div>
      )}

      {/* ── Main Turn Submission Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Action Choice (Tabs) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2.5">
            Select Your Negotiation Action
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setAction('counter')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3',
                action === 'counter'
                  ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500'
                  : isDark
                  ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Counteroffer</span>
                <span className="text-[10px] opacity-75">Adjust terms & continue bargaining</span>
              </div>
            </button>

            <button
              type="button"
              disabled={!canAccept}
              onClick={() => setAction('accept')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed',
                action === 'accept'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500'
                  : isDark
                  ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
              title={!canAccept ? 'No proposal on the table to accept yet' : 'Accept current terms'}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Accept Deal</span>
                <span className="text-[10px] opacity-75">Conclude with mutual agreement</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAction('reject')}
              className={cn(
                'p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3',
                action === 'reject'
                  ? 'border-rose-500 bg-rose-500/15 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500'
                  : isDark
                  ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">Reject & Walk Away</span>
                <span className="text-[10px] opacity-75">Terminate without accord</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Numerical Term Inputs (If Action == 'counter') */}
        {action === 'counter' && (
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-500">
              Formulate Counteroffer Terms
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {limits.map((lim, idx) => {
                const itemKey = lim.item || 'price';
                const isMin = String(lim.type).toLowerCase() === 'min';
                const val = offerValues[itemKey] ?? '';
                const violation = getBoundaryViolation(itemKey, val);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      violation
                        ? 'border-rose-500/60 bg-rose-500/5'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/60'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold capitalize ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {itemKey.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          isMin
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        )}
                      >
                        {isMin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isMin ? 'Your Floor' : 'Your Ceiling'}: {lim.value} {lim.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={val}
                        onChange={(e) => handleValueChange(itemKey, e.target.value)}
                        className={`w-full font-mono font-bold text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
                          violation
                            ? 'border-rose-500 text-rose-300 bg-rose-950/20'
                            : isDark
                            ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-slate-100'
                            : 'bg-slate-50 border-slate-300 focus:border-indigo-500 text-slate-900'
                        }`}
                        placeholder={`Enter ${itemKey}...`}
                        required
                      />
                      <span className={`text-xs font-medium shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lim.unit}
                      </span>
                    </div>

                    {violation && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{violation}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action == 'accept' confirmation prompt */}
        {action === 'accept' && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1">Confirm Deal Agreement</span>
              <p className="opacity-90 leading-relaxed text-xs">
                You are agreeing to the opponent's latest proposal. Both parties will bind to these terms, ending the negotiation with an accepted outcome.
              </p>
            </div>
          </div>
        )}

        {/* Action == 'reject' warning prompt */}
        {action === 'reject' && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-1">Declare Walkaway Rejection</span>
              <p className="opacity-90 leading-relaxed text-xs">
                You are breaking off negotiations. This move is final and will conclude the session as a walkaway failure without settlement.
              </p>
            </div>
          </div>
        )}

        {/* 3. Reasoning & Stance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Reasoning Input (Span 2) */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Move Rationale / Reasoning</span>
              </label>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Optional Explanation</span>
            </div>

            <textarea
              rows={2}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              className={`w-full rounded-xl p-3 text-xs sm:text-sm font-medium border outline-none transition-all resize-none ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500'
                  : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-900 placeholder-slate-400'
              }`}
              placeholder="State the strategic reasoning behind your move..."
            />

            {/* Quick Reason Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className={`text-[10px] uppercase font-bold mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Quick:</span>
              {[
                'Offering balanced compromise',
                'Holding firm on core limits',
                'Exploring flexible trade-offs',
              ].map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => handleQuickReason(chip)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-indigo-600 hover:border-indigo-300'
                  }`}
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Stance Selector (Span 1) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Psychological Stance</span>
            </label>

            <div className="space-y-2">
              {[
                { id: 'flexible', label: 'Flexible', desc: 'Open & cooperative' },
                { id: 'firm', label: 'Firm', desc: 'Resolute & assertive' },
                { id: 'urgent', label: 'Urgent', desc: 'Seeking swift accord' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStance(s.id)}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs',
                    stance === s.id
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 font-bold'
                      : isDark
                      ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  )}
                >
                  <span>{s.label}</span>
                  <span className="text-[10px] opacity-75 font-normal">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Submit Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-indigo-500/20">
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Move will be submitted into the turn-based referee loop and AI will formulate its counter-response.
          </span>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0',
              action === 'accept'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : action === 'reject'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            )}
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Submitting Move...'
                : action === 'accept'
                ? 'Accept & Finalize Agreement'
                : action === 'reject'
                ? 'Confirm Walk Away'
                : 'Submit Counteroffer to AI'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
