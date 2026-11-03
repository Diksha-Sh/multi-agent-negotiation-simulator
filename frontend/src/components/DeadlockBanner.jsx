import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Human-readable deadlock type descriptions
 */
const DEADLOCK_TYPE_META = {
  stall: {
    title: 'Negotiation Stalled',
    desc: 'Progress ceased with neither party willing to make further concessions.',
    icon: AlertTriangle,
  },
  repeated_rejection: {
    title: 'Repeated Counter Rejection',
    desc: 'Multiple consecutive proposals were rejected without convergence.',
    icon: XCircle,
  },
  max_rounds: {
    title: 'Round Limit Exhausted',
    desc: 'Maximum allocated negotiation rounds were reached without mutual consensus.',
    icon: ShieldAlert,
  },
  same_position: {
    title: 'Unmoving Positions',
    desc: 'Both agents locked into rigid stances refusing terms outside reservation bounds.',
    icon: AlertTriangle,
  },
};

/**
 * Human-readable resolution outcome metadata
 */
const RESOLUTION_OUTCOME_META = {
  compromise: {
    label: 'Resolved via Compromise',
    status: 'resolved',
    desc: 'Agents found mutually viable middle ground under concession protocols.',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
  stance_change: {
    label: 'Resolved via Stance Shift',
    status: 'resolved',
    desc: 'One or more parties relaxed reservation limits or softened stance.',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
  },
  final_round: {
    label: 'Final Round Settlement',
    status: 'resolved',
    desc: 'Consensus finalized in overtime or sudden-death final exchange.',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    icon: Sparkles,
  },
  breakdown: {
    label: 'Negotiation Breakdown',
    status: 'breakdown',
    desc: 'Resolution attempts exhausted. Formal impasse declared; session halted.',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    icon: XCircle,
  },
};

export default function DeadlockBanner({ deadlockEvent = null, status = 'ongoing', currentRound = 0 }) {
  const { isDark } = useTheme();

  // If status is not deadlock and no deadlock event is present, do not render
  const isDeadlockState = status === 'deadlock';
  if (!deadlockEvent && !isDeadlockState) {
    return null;
  }

  // Extract fields gracefully with fallback to status-based metadata
  const typeKey = deadlockEvent?.type || 'max_rounds';
  const typeMeta = DEADLOCK_TYPE_META[typeKey] || {
    title: String(typeKey).replace(/_/g, ' ').toUpperCase(),
    desc: 'Deadlock encountered during agent exchange.',
    icon: AlertTriangle,
  };
  const TypeIcon = typeMeta.icon;

  const roundTriggered = deadlockEvent?.round_triggered !== undefined && deadlockEvent?.round_triggered !== null
    ? deadlockEvent.round_triggered
    : currentRound || 'Max';

  const outcomeKey = deadlockEvent?.resolution_outcome || null;
  const outcomeMeta = outcomeKey ? RESOLUTION_OUTCOME_META[outcomeKey] : null;
  const resolutionAttempt = deadlockEvent?.resolution_attempt || null;

  // Visual status classifier:
  // - "resolved": compromise | stance_change | final_round
  // - "breakdown": breakdown or terminal deadlock without resolution
  // - "pending": deadlock triggered but outcome is null/in-progress
  let stateMode = 'breakdown';
  if (outcomeMeta?.status === 'resolved') {
    stateMode = 'resolved';
  } else if (!outcomeKey && isDeadlockState && !deadlockEvent) {
    stateMode = 'breakdown';
  } else if (!outcomeKey) {
    stateMode = 'pending';
  }

  const containerStyles = {
    resolved: {
      border: isDark ? 'border-emerald-500/40 bg-slate-900/90' : 'border-emerald-400 bg-emerald-50/70',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      iconColor: 'text-emerald-400',
      headerText: isDark ? 'text-emerald-400' : 'text-emerald-800',
    },
    breakdown: {
      border: isDark ? 'border-rose-500/40 bg-slate-900/90' : 'border-rose-300 bg-rose-50/70',
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      iconColor: 'text-rose-400',
      headerText: isDark ? 'text-rose-400' : 'text-rose-800',
    },
    pending: {
      border: isDark ? 'border-amber-500/40 bg-slate-900/90' : 'border-amber-300 bg-amber-50/70',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      iconColor: 'text-amber-400',
      headerText: isDark ? 'text-amber-400' : 'text-amber-800',
    },
  }[stateMode];

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 mb-8 shadow-xl transition-all animate-fade-in ${containerStyles.border}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Type and description */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              stateMode === 'resolved'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : stateMode === 'breakdown'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            <TypeIcon className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${containerStyles.badge}`}>
                Deadlock Event · Round {roundTriggered}
              </span>
              <span className={`text-sm font-extrabold ${containerStyles.headerText}`}>
                {typeMeta.title}
              </span>
            </div>
            <p className={`text-xs leading-relaxed max-w-xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {typeMeta.desc}
            </p>
          </div>
        </div>

        {/* Right Side: Resolution status badge */}
        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
          {outcomeMeta ? (
            <div className="flex items-center gap-1.5">
              <outcomeMeta.icon className={`w-4 h-4 ${containerStyles.iconColor}`} />
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${outcomeMeta.badgeClass}`}>
                {outcomeMeta.label}
              </span>
            </div>
          ) : stateMode === 'pending' ? (
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/30">
                Resolution Pending
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-rose-500/15 text-rose-400 border-rose-500/30">
                Unresolved Impasse
              </span>
            </div>
          )}

          {outcomeMeta?.desc && (
            <span className={`text-[11px] max-w-xs text-left sm:text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {outcomeMeta.desc}
            </span>
          )}
        </div>
      </div>

      {/* Resolution Attempt Detail Callout (if supplied) */}
      {resolutionAttempt && (
        <div
          className={`mt-4 pt-3 border-t text-xs flex items-start gap-2 ${
            isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
          }`}
        >
          <ArrowRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
          <div className="leading-snug">
            <strong className="text-indigo-400 font-semibold mr-1">Resolution Protocol:</strong>
            <span>{resolutionAttempt}</span>
          </div>
        </div>
      )}
    </div>
  );
}
