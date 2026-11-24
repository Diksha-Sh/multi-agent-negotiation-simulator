import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Award,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  HeartHandshake,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getPostInteractionSummary } from '../services/api';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function PostInteractionSummaryModal({
  isOpen,
  onClose,
  config,
  history = [],
  status = 'accepted',
  winner = null,
  deadlockEvent = null,
  variant = 'modal',
}) {
  const { isDark } = useTheme();
  // The summary is stored with the request it belongs to, so a reopened dossier for a
  // different run never shows the previous run's report while the new one loads.
  const [loaded, setLoaded] = useState({ key: null, data: null });
  const configKey = JSON.stringify(config || {});
  const historyKey = JSON.stringify(history || []);
  const deadlockKey = JSON.stringify(deadlockEvent || null);
  const stableConfig = useMemo(() => JSON.parse(configKey), [configKey]);
  const stableHistory = useMemo(() => JSON.parse(historyKey), [historyKey]);
  const stableDeadlockEvent = useMemo(() => JSON.parse(deadlockKey), [deadlockKey]);
  const requestKey = isOpen ? JSON.stringify([status, winner, history.length, history[history.length - 1]?.offer, configKey]) : null;
  const isLoading = isOpen && loaded.key !== requestKey;
  const summaryData = isLoading ? null : loaded.data;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const payload = {
      config: stableConfig,
      history: stableHistory,
      status,
      winner,
      deadlock_event: stableDeadlockEvent,
    };

    getPostInteractionSummary(payload)
      .then((res) => {
        if (isMounted) {
          setLoaded({ key: requestKey, data: res });
        }
      })
      .catch((err) => {
        console.warn('Backend summary request failed:', err);
        if (isMounted) {
          // Local fallback in case backend is offline
          setLoaded({
            key: requestKey,
            data: {
              scenario_title: config?.title || 'Negotiation Session',
              status,
              rounds_completed: Math.ceil(history.length / 2),
              total_turns: history.length,
              executive_summary:
                status === 'accepted'
                  ? 'Negotiation concluded with a mutually accepted agreement inside the feasible agreement corridor.'
                  : 'Negotiation reached an impasse without mutual consensus.',
              final_agreement: null,
              resolution_quality: null,
              sentiment_journey: null,
              personalized_recommendations: {},
            },
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, requestKey, configKey, historyKey, status, winner, deadlockKey, stableConfig, stableHistory, stableDeadlockEvent, config?.title, history.length]);

  if (!isOpen) return null;

  const quality = summaryData?.resolution_quality;
  const sentimentJourney = summaryData?.sentiment_journey || [];
  const recommendations = summaryData?.personalized_recommendations || {};
  const isPage = variant === 'page';
  const finalAgreement =
    status === 'accepted' && summaryData?.final_agreement
      ? summaryData.final_agreement
      : null;
  const lastTurn = history.length > 0 ? history[history.length - 1] : null;
  const outcomeTitle =
    status === 'accepted'
      ? 'Agreement Reached'
      : status === 'deadlock'
      ? 'Negotiation Deadlock'
      : 'Negotiation Breakdown';
  const outcomeReason =
    summaryData?.executive_summary ||
    (status === 'deadlock'
      ? deadlockEvent?.message || deadlockEvent?.details || 'The parties could not converge on mutually acceptable terms.'
      : 'The negotiation was rejected or ended without a settlement.');

  const content = (
    <div className={isPage
      ? 'w-full min-h-[70vh] flex justify-center p-4 sm:p-6 animate-fade-in'
      : 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in'}>
      <div
        className={cn(
          'w-full max-w-4xl flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all my-auto',
          isPage ? 'max-h-none' : 'max-h-[90vh]',
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-700/20 bg-gradient-to-r from-indigo-500/10 via-transparent to-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  Milestone 4 Delivery
                </span>
                <span className="text-xs text-slate-400">Post-Interaction Summary Agent</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-0.5">
                {summaryData?.scenario_title || 'Negotiation Performance Dossier'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              'p-2 rounded-xl border transition-colors cursor-pointer',
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            )}
            title="Close Dossier"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-400">Analyzing negotiation dynamics & computing quality metrics...</p>
            </div>
          ) : (
            <>
              <section
                className={cn(
                  'p-5 rounded-2xl border',
                  status === 'accepted'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : status === 'deadlock'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-rose-500/30 bg-rose-500/10',
                )}
                role="status"
              >
                <div className="flex items-start gap-3">
                  {status === 'accepted'
                    ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    : status === 'deadlock'
                    ? <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                    : <X className="w-6 h-6 text-rose-400 shrink-0" />}
                  <div>
                    <h3 className="text-base font-extrabold">{outcomeTitle}</h3>
                    <p className="text-xs text-slate-400 mt-1">{outcomeReason}</p>
                    {deadlockEvent?.resolution_outcome && (
                      <p className="text-xs mt-2 text-amber-300">
                        Resolution outcome: {deadlockEvent.resolution_outcome}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {(status === 'accepted' || status === 'deadlock' || status === 'rejected') && (
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Negotiation rounds</span>
                    <p className="mt-1 text-lg font-bold">{summaryData?.rounds_completed ?? 0}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Last exchanged offer</span>
                    {lastTurn?.offer ? (
                      <p className="mt-1 text-sm font-mono">
                        {Object.entries(lastTurn.offer).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`).join(' · ')}
                      </p>
                    ) : <p className="mt-1 text-sm text-slate-400">No offer was recorded.</p>}
                  </div>
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Participants</span>
                    <p className="mt-1 text-sm">
                      {(config?.agents || []).map((agent) => agent.name || agent.id).join(' · ') || 'Not available'}
                    </p>
                  </div>
                </section>
              )}

              {/* 1. Resolution Quality Score Banner */}
              <div
                className={cn(
                  'p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-lg',
                  status === 'accepted'
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-amber-500/30 bg-amber-500/10'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className={cn('w-4 h-4', status === 'accepted' ? 'text-emerald-400' : 'text-amber-400')} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolution Quality Score</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    {quality?.tier || 'Resolution score is not available yet.'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    {summaryData?.executive_summary}
                  </p>
                </div>

                <div className="flex items-baseline gap-2 shrink-0 bg-slate-950/60 px-5 py-3 rounded-xl border border-slate-800">
                  <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">
                    {quality?.overall_score ?? '—'}
                  </span>
                  {quality?.overall_score != null && <span className="text-xs text-slate-400 font-bold">/ 100</span>}
                </div>
              </div>

              {/* Quality Breakdown Metrics */}
              {quality?.breakdown && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Outcome</span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{quality.breakdown.agreement_outcome} / 40</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Efficiency</span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{quality.breakdown.pacing_efficiency} / 20</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Reciprocity</span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{quality.breakdown.concession_reciprocity} / 20</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 text-center">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">ZOPA Safety</span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{quality.breakdown.boundary_safety} / 20</span>
                  </div>
                </div>
              )}

              {status === 'accepted' && (
                <section className="p-5 sm:p-6 rounded-2xl border border-slate-700 bg-white text-slate-900">
                  <div className="text-center border-b border-slate-300 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600">Simulated Agreement Preview</p>
                    <h3 className="text-xl font-extrabold mt-1">{summaryData?.scenario_title || config?.title || 'Negotiation Session'}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 text-xs">
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Participants</span>
                      <p className="mt-1">{(config?.agents || []).map((agent) => agent.name || agent.id).join(' · ') || 'Not available'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Agreement Status</span>
                      <p className="mt-1 font-bold text-emerald-700">Accepted</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Final Agreed Terms</span>
                      {finalAgreement ? (
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(finalAgreement).map(([key, value]) => (
                            <div key={key} className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                              <span className="block capitalize text-slate-500">{key.replace(/_/g, ' ')}</span>
                              <strong className="font-mono">{String(value)}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-slate-500">Final agreed terms are not available.</p>
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Preview Generated On</span>
                      <p className="mt-1">
                        {summaryData?.completed_at
                          ? new Date(summaryData.completed_at).toLocaleString()
                          : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px]">Rounds</span>
                      <p className="mt-1">{summaryData?.rounds_completed ?? 'Not available'}</p>
                    </div>
                  </div>
                  <p className="text-center text-[10px] font-bold uppercase tracking-wide border-t border-slate-300 pt-4 text-slate-600">
                    SIMULATED AGREEMENT – This is an automatically generated negotiation summary for demonstration purposes only. It is not a legally binding contract.
                  </p>
                </section>
              )}

              {/* 2. Sentiment Journey Timeline */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Sentiment Journey Timeline (Emotional & Tactical Stance Evolution)</span>
                </div>

                <div className="space-y-2.5">
                  {!summaryData?.sentiment_journey ? (
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-400">
                      Actual sentiment analysis is not available.
                    </div>
                  ) : sentimentJourney.map((item, idx) => {
                    const isAccept = item.action === 'accept';
                    const isReject = item.action === 'reject';

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all',
                          isAccept
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : isReject
                            ? 'border-rose-500/40 bg-rose-500/10'
                            : isDark
                            ? 'border-slate-800 bg-slate-950/60'
                            : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-[10px] text-slate-300 shrink-0">
                            R{item.round}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200 capitalize">{item.agent_id}</span>
                              <span
                                className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                                  isAccept
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                )}
                              >
                                {item.sentiment}
                              </span>
                              <span className="text-[10px] uppercase font-mono text-slate-500">Stance: {item.stance}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                          </div>
                        </div>

                        {item.offer && (
                          <div className="font-mono text-xs font-semibold text-slate-300 self-end sm:self-auto shrink-0 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                            {Object.entries(item.offer)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Personalized Coaching & Recommendations */}
              {Object.keys(recommendations).length > 0 && (
                <div className="space-y-3 pt-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Personalized Negotiation Coaching & Feedback</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(recommendations).map(([aid, rec]) => (
                      <div
                        key={aid}
                        className={cn(
                          'p-4 rounded-xl border space-y-3',
                          rec.is_human
                            ? 'border-indigo-500/40 bg-indigo-500/5'
                            : isDark
                            ? 'border-slate-800 bg-slate-950/40'
                            : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-200">{rec.name}</span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            {rec.role_label}
                          </span>
                        </div>

                        {/* Strengths */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Strengths
                          </span>
                          <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc marker:text-emerald-500">
                            {rec.strengths.map((str, sIdx) => (
                              <li key={sIdx}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Coaching Tips */}
                        <div className="space-y-1 pt-1 border-t border-slate-800/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Strategic Advice
                          </span>
                          <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc marker:text-amber-500">
                            {rec.coaching_tips.map((tip, tIdx) => (
                              <li key={tIdx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Rounds: {summaryData?.rounds_completed || 0} · Turns: {summaryData?.total_turns || 0}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );

  return isPage ? content : createPortal(content, document.body);
}
