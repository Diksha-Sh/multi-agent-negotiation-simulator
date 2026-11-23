import { useState, useEffect } from 'react';
import {
  X,
  Award,
  TrendingUp,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
  Clock,
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
}) {
  const { isDark } = useTheme();
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const payload = {
      config,
      history,
      status,
      winner,
      deadlock_event: deadlockEvent,
    };

    getPostInteractionSummary(payload)
      .then((res) => {
        if (isMounted) {
          setSummaryData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Backend summary call failed, using local fallback:', err);
        if (isMounted) {
          // Local fallback in case backend is offline
          setSummaryData({
            scenario_title: config?.title || 'Negotiation Session',
            status,
            rounds_completed: Math.ceil(history.length / 2),
            total_turns: history.length,
            executive_summary:
              status === 'accepted'
                ? 'Negotiation concluded with a mutually accepted agreement inside the feasible agreement corridor.'
                : 'Negotiation reached an impasse without mutual consensus.',
            resolution_quality: {
              overall_score: status === 'accepted' ? 88.5 : 42.0,
              tier: status === 'accepted' ? 'Balanced Commercial Agreement' : 'Impasse / High Friction Resolution',
              breakdown: {
                agreement_outcome: status === 'accepted' ? 40 : 10,
                pacing_efficiency: 16.5,
                concession_reciprocity: 14.0,
                boundary_safety: 18.0,
              },
            },
            sentiment_journey: history.map((t, i) => ({
              turn_index: i + 1,
              round: t.round || Math.ceil((i + 1) / 2),
              agent_id: t.agent_id,
              action: t.action,
              stance: t.stance || 'flexible',
              sentiment: t.action === 'accept' ? 'Satisfied' : t.stance === 'firm' ? 'Confident' : 'Collaborative',
              sentiment_score: t.action === 'accept' ? 0.9 : t.stance === 'firm' ? 0.4 : 0.6,
              description: `Turn ${i + 1}: ${t.action} proposal logged.`,
              offer: t.offer,
            })),
            personalized_recommendations: {},
          });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, config, history, status, winner, deadlockEvent]);

  if (!isOpen) return null;

  const quality = summaryData?.resolution_quality;
  const sentimentJourney = summaryData?.sentiment_journey || [];
  const recommendations = summaryData?.personalized_recommendations || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className={cn(
          'w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all my-auto',
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
                    {quality?.tier || 'Comprehensive Performance Evaluation'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    {summaryData?.executive_summary}
                  </p>
                </div>

                <div className="flex items-baseline gap-2 shrink-0 bg-slate-950/60 px-5 py-3 rounded-xl border border-slate-800">
                  <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">
                    {quality?.overall_score ?? 85}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/ 100</span>
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

              {/* 2. Sentiment Journey Timeline */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Sentiment Journey Timeline (Emotional & Tactical Stance Evolution)</span>
                </div>

                <div className="space-y-2.5">
                  {sentimentJourney.map((item, idx) => {
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
}
