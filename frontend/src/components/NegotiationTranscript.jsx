import { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  MessageSquare,
  Sparkles,
  Tag,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

/**
 * Format key-value pairs of negotiation items into readable labels and values.
 */
function formatItemLabel(key) {
  return String(key).replace(/_/g, ' ');
}

function formatItemValue(val) {
  if (typeof val === 'number') {
    return val.toLocaleString();
  }
  return String(val);
}

export default function NegotiationTranscript({ turns = [], agents = [] }) {
  const { isDark } = useTheme();
  const transcriptBottomRef = useRef(null);

  // Auto-scroll to latest turn whenever turns array grows
  useEffect(() => {
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [turns.length]);

  // Identify agent 0 vs agent 1 for alternating left/right layout
  const firstAgentId = agents[0]?.id;

  if (!turns || turns.length === 0) {
    return (
      <div
        className={`text-center py-14 px-6 rounded-2xl border transition-all ${
          isDark
            ? 'border-slate-800/80 bg-slate-950/40'
            : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          Negotiation Transcript Empty
        </h4>
        <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          No dialogue has been exchanged yet. Use <span className="font-semibold text-indigo-500">Simulate Next Turn</span> or{' '}
          <span className="font-semibold text-emerald-500">Run Full Loop</span> to begin the agent discourse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1.5 scroll-smooth">
      {turns.map((turn, tIdx) => {
        // Find agent info from config if available
        const agentObj = agents.find((a) => a.id === turn.agent_id) || {};
        const agentName = turn.agent_name || agentObj.name || turn.agent_id || 'Agent';
        const agentRole = turn.role || agentObj.role || 'Negotiator';
        const action = String(turn.action || 'counter').toLowerCase();

        // Check if turn belongs to the first agent (left-aligned) or second agent (right-aligned)
        const isAgentOne = firstAgentId ? turn.agent_id === firstAgentId : tIdx % 2 === 0;

        // Visual styling per action type
        const actionStyles = {
          accept: {
            badge: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
            bubbleBorder: isDark ? 'border-emerald-500/40 shadow-emerald-500/5' : 'border-emerald-400 shadow-emerald-500/10',
            bubbleBg: isDark ? 'bg-gradient-to-b from-slate-900/90 to-emerald-950/20' : 'bg-gradient-to-b from-white to-emerald-50/30',
            icon: CheckCircle2,
            iconColor: 'text-emerald-500',
            chipBg: isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800',
          },
          reject: {
            badge: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
            bubbleBorder: isDark ? 'border-rose-500/40 shadow-rose-500/5' : 'border-rose-400 shadow-rose-500/10',
            bubbleBg: isDark ? 'bg-gradient-to-b from-slate-900/90 to-rose-950/20' : 'bg-gradient-to-b from-white to-rose-50/30',
            icon: XCircle,
            iconColor: 'text-rose-500',
            chipBg: isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800',
          },
          counter: {
            badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
            bubbleBorder: isDark ? 'border-slate-800/90 hover:border-slate-700' : 'border-slate-200/90 hover:border-slate-300 shadow-sm',
            bubbleBg: isDark ? 'bg-slate-900/70' : 'bg-white',
            icon: ArrowRightLeft,
            iconColor: 'text-amber-500',
            chipBg: isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-800',
          },
        };

        const currentStyle = actionStyles[action] || actionStyles.counter;
        const ActionIcon = currentStyle.icon;
        const offerEntries = turn.offer && typeof turn.offer === 'object' ? Object.entries(turn.offer) : [];

        return (
          <div
            key={tIdx}
            className={`flex items-start gap-3 w-full animate-fade-in ${
              isAgentOne ? 'justify-start pr-4 sm:pr-12' : 'justify-end flex-row-reverse pl-4 sm:pl-12'
            }`}
          >
            {/* Agent Avatar */}
            <div className="shrink-0 mt-1">
              <AgentAvatar role={agentRole || turn.agent_id} size="sm" />
            </div>

            {/* Chat Bubble Container */}
            <div
              className={`flex flex-col max-w-xl w-full rounded-2xl border p-4.5 sm:p-5 transition-all shadow-md ${
                currentStyle.bubbleBg
              } ${currentStyle.bubbleBorder} ${
                isAgentOne
                  ? 'rounded-tl-sm'
                  : 'rounded-tr-sm'
              }`}
            >
              {/* Header: Turn index, Agent identification, Action Badge, Stance */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-700/20">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Round {turn.round || Math.floor(tIdx / 2) + 1} · Turn #{turn.turn_number || tIdx + 1}
                  </span>
                  <div>
                    <span className={`text-xs font-bold block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {agentName}
                    </span>
                    <span className={`text-[10px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {agentRole}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Action Pill */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${currentStyle.badge}`}
                  >
                    <ActionIcon className={`w-3 h-3 ${currentStyle.iconColor}`} />
                    {action}
                  </span>

                  {/* Stance Pill */}
                  {turn.stance && (
                    <span
                      className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${
                        turn.stance === 'urgent'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : turn.stance === 'firm'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                      title={`Agent stance: ${turn.stance}`}
                    >
                      {turn.stance}
                    </span>
                  )}
                </div>
              </div>

              {/* Offer Terms (Multi-item support) */}
              {offerEntries.length > 0 && (
                <div className="mb-3.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span>Proposed Terms</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {offerEntries.map(([key, val]) => (
                      <div
                        key={key}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold ${currentStyle.chipBg}`}
                      >
                        <span className="opacity-75 uppercase text-[10px] tracking-wide">
                          {formatItemLabel(key)}:
                        </span>
                        <span className="font-bold text-xs">
                          {formatItemValue(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning Dialogue Bubble */}
              {turn.reasoning && (
                <div
                  className={`rounded-xl p-3 border text-xs leading-relaxed ${
                    isDark
                      ? 'border-slate-800/60 bg-slate-950/40 text-slate-300'
                      : 'border-slate-200/70 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400/80 mb-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Agent Reasoning</span>
                  </div>
                  <p className="italic">"{turn.reasoning}"</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={transcriptBottomRef} />
    </div>
  );
}
