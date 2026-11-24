import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Database,
  Flame,
  Loader2,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { fetchUserSimulations } from '../services/supabase';
import { getDemoSessions, getPerformanceAnalytics, getPostInteractionSummary } from '../services/api';

/*
 * Performance Dashboard (Milestone 4): multi-session analytics.
 *
 *  - Concession Trajectory Curve: both agents' offers turn by turn, converging inside the ZOPA.
 *  - Sentiment Wave Chart: the Post-Interaction Summary Agent's sentiment journey per turn.
 *  - Scenario Win-Rate: who captured more of the deal zone, per scenario.
 *  - Deadlock Heatmap: scenario x deadlock trigger / outcome, and personality pairings.
 *
 * Data: the user's saved History (Supabase or local) or a demo dataset of 30 negotiations
 * really played by the backend engine (GET /api/analytics/demo-sessions).
 */

const FINAL = new Set(['accepted', 'deadlock', 'rejected']);
const AGENT_COLORS = ['#1D6FD1', '#0EA5E9', '#7C3AED'];
const ZOPA_COLOR = '#10b981';
const HEAT_COLUMNS = [
  { key: 'accepted', label: 'Agreement', tone: 'good' },
  { key: 'same_position', label: 'Same position', tone: 'warn' },
  { key: 'stall', label: 'Stall', tone: 'warn' },
  { key: 'repeated_rejection', label: 'Repeated rejection', tone: 'warn' },
  { key: 'max_rounds', label: 'Max rounds', tone: 'bad' },
  { key: 'breakdown', label: 'Breakdown', tone: 'bad' },
  { key: 'rejected', label: 'Walk-away', tone: 'bad' },
];
const PERSONALITIES = ['Aggressive', 'Collaborative', 'Risk-Averse'];

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function formatValue(value, unit) {
  if (!isNum(value)) return '–';
  const text = Number.isInteger(value)
    ? value.toLocaleString('en-IN')
    : value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return unit ? `${text} ${unit}` : text;
}

const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/* ---------------------------------------------------------------------------------------------
 * Data helpers
 * ------------------------------------------------------------------------------------------- */

function sessionDeadlock(s) {
  return s?.deadlock_event || s?.config?.deadlock_event || null;
}

function sessionTitle(s) {
  return s?.scenario_title || s?.config?.title || titleCase(s?.scenario_id) || 'Negotiation';
}

/** Items the two sides pull in opposite directions, with the deal zone and unit. */
function negotiableItems(config) {
  const byItem = {};
  for (const agent of config?.agents || []) {
    for (const lim of agent.limits || []) {
      if (!lim || !isNum(Number(lim.value))) continue;
      (byItem[lim.item] = byItem[lim.item] || []).push({ ...lim, agent });
    }
  }
  return Object.entries(byItem)
    .map(([item, limits]) => {
      const mins = limits.filter((l) => l.type === 'min');
      const maxs = limits.filter((l) => l.type === 'max');
      if (!mins.length || !maxs.length) return null;
      const lowLimit = mins.reduce((a, b) => (Number(b.value) > Number(a.value) ? b : a));
      const highLimit = maxs.reduce((a, b) => (Number(b.value) < Number(a.value) ? b : a));
      return {
        item,
        low: Number(lowLimit.value),
        high: Number(highLimit.value),
        lowOwner: lowLimit.agent?.name || lowLimit.agent?.id,
        highOwner: highLimit.agent?.name || highLimit.agent?.id,
        unit: lowLimit.unit || highLimit.unit || '',
      };
    })
    .filter(Boolean);
}

/** Per-agent offer series for one item. */
function trajectorySeries(session, item) {
  const agents = session?.config?.agents || [];
  const turns = session?.turns || session?.history || [];
  return agents.map((agent, idx) => ({
    id: agent.id,
    name: agent.name || agent.id,
    color: AGENT_COLORS[idx % AGENT_COLORS.length],
    points: turns
      .map((t, i) => ({ turn: i + 1, value: Number(t?.offer?.[item]), action: t?.action, stance: t?.stance, agentId: t?.agent_id }))
      .filter((p) => p.agentId === agent.id && isNum(p.value)),
  }));
}

/** Same sentiment rules as backend/summary_agent.py, used when the backend is offline. */
function localSentiment(session) {
  const turns = session?.turns || session?.history || [];
  return turns.map((t, i) => {
    const action = (t.action || 'counter').toLowerCase();
    const stance = (t.stance || 'flexible').toLowerCase();
    let sentiment = 'Collaborative';
    let score = 0.6;
    if (action === 'accept') { sentiment = 'Satisfied & Resolute'; score = 0.95; }
    else if (action === 'reject') { sentiment = 'Frustrated / Stalled'; score = -0.85; }
    else if (stance === 'firm') { sentiment = 'Confident & Assertive'; score = 0.25; }
    else if (stance === 'urgent') { sentiment = 'Anxious / Pressured'; score = -0.35; }
    return { turn_index: i + 1, agent_id: t.agent_id, action, stance, sentiment, sentiment_score: score };
  });
}

/** Basic KPIs computed in the browser if the analytics API cannot be reached. */
function localAnalytics(sessions) {
  const total = sessions.length;
  const count = (st) => sessions.filter((s) => s.status === st).length;
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const rounds = sessions.map((s) => Number(s.total_rounds) || 0).filter(Boolean);
  return {
    total_sessions: total,
    agreement_rate: pct(count('accepted')),
    deadlock_rate: pct(count('deadlock')),
    no_deal_rate: pct(count('deadlock') + count('rejected')),
    deadlock_events: sessions.filter((s) => sessionDeadlock(s) || s.status === 'deadlock').length,
    deadlock_event_rate: pct(sessions.filter((s) => sessionDeadlock(s) || s.status === 'deadlock').length),
    avg_rounds: rounds.length ? Math.round((rounds.reduce((a, b) => a + b, 0) / rounds.length) * 10) / 10 : 0,
    resolved_by_ladder: sessions.filter((s) => sessionDeadlock(s) && s.status === 'accepted').length,
    win_rates: [],
    deadlock_heatmap: { columns: [], rows: [] },
    personality_matrix: [],
    key_insights: ['Analytics service unreachable: showing basic metrics computed in the browser.'],
    offline: true,
  };
}

/* ---------------------------------------------------------------------------------------------
 * Small UI pieces
 * ------------------------------------------------------------------------------------------- */

function Card({ isDark, className, children }) {
  return (
    <section
      className={cn(
        'rounded-2xl border p-5 sm:p-6 min-w-0',
        isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/90',
        className,
      )}
    >
      {children}
    </section>
  );
}

function CardHeader({ icon, title, subtitle, right, isDark }) {
  const IconEl = icon;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
          <IconEl className={cn('w-4 h-4 shrink-0', isDark ? 'text-indigo-300' : 'text-indigo-600')} aria-hidden="true" />
          {title}
        </h3>
        {subtitle && <p className={cn('text-xs mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Legend({ items, isDark }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      {items.map((it) => (
        <span key={it.label} className={cn('inline-flex items-center gap-1.5', isDark ? 'text-slate-300' : 'text-slate-600')}>
          <span
            className={cn('inline-block', it.band ? 'w-3.5 h-2.5 rounded-sm' : it.dashed ? 'w-4 border-t-2 border-dashed' : 'w-3.5 h-1 rounded-full')}
            style={it.dashed ? { borderColor: it.color } : { background: it.color, opacity: it.band ? 0.35 : 1 }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function EmptyNote({ isDark, children }) {
  return (
    <div className={cn('rounded-xl border border-dashed px-4 py-8 text-center text-sm', isDark ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500')}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Concession Trajectory Curve
 * ------------------------------------------------------------------------------------------- */

const W = 760;
const H = 320;
const PAD = { l: 70, r: 18, t: 18, b: 38 };

function niceTicks(min, max, count = 5) {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

function TrajectoryChart({ session, item, zone, isDark }) {
  const [hover, setHover] = useState(null);
  const series = useMemo(() => trajectorySeries(session, item), [session, item]);
  const turns = session?.turns || session?.history || [];
  const n = Math.max(turns.length, 2);
  const values = series.flatMap((s) => s.points.map((p) => p.value));
  if (!values.length) return <EmptyNote isDark={isDark}>No numeric offers for this item in the selected session.</EmptyNote>;

  let lo = Math.min(...values, zone ? zone.low : Infinity);
  let hi = Math.max(...values, zone ? zone.high : -Infinity);
  const padY = (hi - lo || Math.abs(hi) || 1) * 0.12;
  lo -= padY;
  hi += padY;
  const x = (turn) => PAD.l + ((turn - 1) / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const grid = isDark ? '#1e293b' : '#e2e8f0';
  const axis = isDark ? '#94a3b8' : '#64748b';
  const event = sessionDeadlock(session);
  const markers = [
    ...((event?.attempts || []).map((a) => ({ ...a, past: true }))),
    ...(event ? [event] : []),
  ].filter((m) => isNum(Number(m.round_triggered)) && Number(m.round_triggered) >= 1 && Number(m.round_triggered) <= n);
  const unit = zone?.unit || '';
  const lastTurn = turns[turns.length - 1];
  const accepted = session?.status === 'accepted' && isNum(Number(lastTurn?.offer?.[item]));
  const bg = isDark ? '#0b1222' : '#ffffff';

  // The gap between the two sides: the area between both drawn lines, from the turn both
  // have an offer to the end. Values between an agent's own offers follow its line.
  const gap = (() => {
    if (series.length < 2) return null;
    const [a, b] = series;
    if (!a.points.length || !b.points.length) return null;
    const at = (pts, t) => {
      if (t <= pts[0].turn) return pts[0].value;
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i].turn) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          return p0.value + ((p1.value - p0.value) * (t - p0.turn)) / (p1.turn - p0.turn);
        }
      }
      return pts[pts.length - 1].value;
    };
    const start = Math.max(a.points[0].turn, b.points[0].turn);
    const end = turns.length;
    if (end - start < 1) return null;
    const ts = [];
    for (let t = start; t <= end; t += 0.25) ts.push(t);
    const top = ts.map((t) => `${x(t)},${y(at(a.points, t))}`);
    const bottom = ts.slice().reverse().map((t) => `${x(t)},${y(at(b.points, t))}`);
    return `M${top.join(' L')} L${bottom.join(' L')} Z`;
  })();

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={`Concession trajectory for ${titleCase(item)} across ${turns.length} turns`}>
        <defs>
          <linearGradient id="gap-fill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={AGENT_COLORS[0]} stopOpacity={isDark ? 0.3 : 0.2} />
            <stop offset="100%" stopColor={AGENT_COLORS[1]} stopOpacity={isDark ? 0.3 : 0.22} />
          </linearGradient>
        </defs>
        {zone && (
          <g>
            <rect x={PAD.l} width={W - PAD.l - PAD.r} y={y(zone.high)} height={Math.max(0, y(zone.low) - y(zone.high))} fill={ZOPA_COLOR} opacity={isDark ? 0.07 : 0.07} />
            <line x1={PAD.l} x2={W - PAD.r} y1={y(zone.high)} y2={y(zone.high)} stroke={ZOPA_COLOR} strokeDasharray="5 4" strokeWidth="1.2" />
            <line x1={PAD.l} x2={W - PAD.r} y1={y(zone.low)} y2={y(zone.low)} stroke={ZOPA_COLOR} strokeDasharray="5 4" strokeWidth="1.2" />
            <text x={PAD.l + 6} y={y(zone.high) + 13} fontSize="10.5" fill={ZOPA_COLOR} fontWeight="600" stroke={bg} strokeWidth="4" paintOrder="stroke">
              {zone.highOwner} ceiling {formatValue(zone.high)}
            </text>
            <text x={PAD.l + 6} y={y(zone.low) - 6} fontSize="10.5" fill={ZOPA_COLOR} fontWeight="600" stroke={bg} strokeWidth="4" paintOrder="stroke">
              {zone.lowOwner} floor {formatValue(zone.low)}
            </text>
          </g>
        )}
        {niceTicks(lo, hi).map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth="1" strokeDasharray="2 4" />
            <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill={axis}>{formatValue(t)}</text>
          </g>
        ))}
        {Array.from({ length: n }, (_, i) => i + 1).map((t) => (
          <text key={t} x={x(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10.5" fill={axis}>{t}</text>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill={axis}>Turn</text>
        <text x={14} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" fontSize="10.5" fill={axis} transform={`rotate(-90 14 ${(PAD.t + H - PAD.b) / 2})`}>
          {titleCase(item)}{unit ? ` (${unit})` : ''}
        </text>

        {markers.map((m, i) => (
          <g key={`${m.round_triggered}-${i}`}>
            <line x1={x(Number(m.round_triggered))} x2={x(Number(m.round_triggered))} y1={PAD.t} y2={H - PAD.b} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth="1.2" opacity={m.past ? 0.45 : 0.85} />
            <circle cx={x(Number(m.round_triggered))} cy={PAD.t + 4} r="3" fill="#f43f5e" />
            <text x={x(Number(m.round_triggered)) + (Number(m.round_triggered) > n * 0.75 ? -7 : 7)} y={PAD.t + 8 + (i % 3) * 13}
              textAnchor={Number(m.round_triggered) > n * 0.75 ? 'end' : 'start'} fontSize="10" fill="#f43f5e" fontWeight="600"
              stroke={bg} strokeWidth="4" paintOrder="stroke">
              {titleCase(m.resolution_attempt || m.type)}
            </text>
          </g>
        ))}

        {gap && <path d={gap} fill="url(#gap-fill)" />}

        {series.map((s) => (
          <g key={s.id}>
            {s.points.length > 1 && (
              <path d={s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.turn)},${y(p.value)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            )}
            {s.points.filter((p) => p.action !== 'accept').map((p) => (
              <circle key={p.turn} cx={x(p.turn)} cy={y(p.value)} r="4" fill={s.color} stroke={bg} strokeWidth="2" />
            ))}
          </g>
        ))}
        {accepted && (
          <g>
            <circle cx={x(turns.length)} cy={y(Number(lastTurn.offer[item]))} r="14" fill={ZOPA_COLOR} opacity="0.18" />
            <circle cx={x(turns.length)} cy={y(Number(lastTurn.offer[item]))} r="7" fill={ZOPA_COLOR} stroke={bg} strokeWidth="2.5" />
          </g>
        )}

        {Array.from({ length: n }, (_, i) => i + 1).map((t) => (
          <rect key={`h${t}`} x={x(t) - (W - PAD.l - PAD.r) / (2 * (n - 1))} y={PAD.t} width={(W - PAD.l - PAD.r) / (n - 1)} height={H - PAD.t - PAD.b}
            fill="transparent" onMouseEnter={() => setHover(t)} onMouseLeave={() => setHover(null)} />
        ))}
        {hover && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke={axis} strokeWidth="1" opacity="0.5" pointerEvents="none" />}
      </svg>

      {hover && turns[hover - 1] && (
        <div className={cn('absolute top-2 left-20 rounded-lg border px-3 py-2 text-xs shadow-lg pointer-events-none', isDark ? 'bg-slate-950/95 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700')}>
          <div className="font-semibold mb-1">Turn {hover}</div>
          <div>
            {series.find((s) => s.id === turns[hover - 1].agent_id)?.name || turns[hover - 1].agent_id}{' '}
            <span className="uppercase font-semibold">{turns[hover - 1].action}</span>{' '}
            {formatValue(Number(turns[hover - 1].offer?.[item]), unit)}
          </div>
          {turns[hover - 1].stance && <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>Stance: {turns[hover - 1].stance}</div>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Legend isDark={isDark} items={[
          ...series.map((s) => ({ label: s.name, color: s.color })),
          ...(gap ? [{ label: 'Gap between offers', color: '#8b7cf6', band: true }] : []),
          ...(zone ? [{ label: 'Deal zone (ZOPA)', color: ZOPA_COLOR, band: true }] : []),
          ...(markers.length ? [{ label: 'Deadlock step', color: '#f43f5e', dashed: true }] : []),
        ]} />
        {accepted && (
          <span className={cn('text-xs font-semibold', isDark ? 'text-emerald-300' : 'text-emerald-700')}>
            Deal at {formatValue(Number(lastTurn.offer[item]), unit)} on turn {turns.length}
          </span>
        )}
      </div>
    </div>
  );
}

/** The selected run in one line: the deal, how long it took, who kept more of the zone. */
function DealStory({ session, zone, item, isDark }) {
  const turns = session?.turns || [];
  const agents = session?.config?.agents || [];
  const last = turns[turns.length - 1];
  const value = Number(last?.offer?.[item]);
  const accepted = session?.status === 'accepted' && isNum(value);
  const event = sessionDeadlock(session);
  const steps = event ? (event.attempts || []).length + 1 : 0;
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  let split = null;
  if (accepted && zone && zone.high > zone.low) {
    const pos = Math.max(0, Math.min(1, (value - zone.low) / (zone.high - zone.low)));
    split = agents.slice(0, 2).map((a, idx) => {
      const lim = (a.limits || []).find((l) => l.item === item);
      const share = lim?.type === 'max' ? 1 - pos : pos;
      return { name: a.name || a.id, share: Math.round(share * 100), color: AGENT_COLORS[idx] };
    });
  }

  return (
    <div className={cn('grid gap-5 sm:grid-cols-[auto_1fr] items-end pb-5 mb-4 border-b', isDark ? 'border-slate-800/80' : 'border-slate-200/90')}>
      <div>
        <div className={cn('text-xs font-medium', muted)}>{accepted ? 'Deal reached' : session?.status === 'rejected' ? 'Walked away' : 'No deal'}</div>
        <div className={cn('text-4xl font-extrabold tracking-tight tabular-nums mt-1', accepted ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-rose-300' : 'text-rose-600'))}>
          {accepted ? formatValue(value, zone?.unit) : `${turns.length} turns`}
        </div>
        <div className={cn('text-xs mt-1.5', muted)}>
          {accepted ? `Agreed on turn ${turns.length}` : 'Negotiation ended without agreement'}
          {steps ? `, after ${steps} mediator step${steps === 1 ? '' : 's'}` : ', no mediator needed'}
        </div>
      </div>
      {split ? (
        <div className="sm:pl-6 min-w-0">
          <div className={cn('flex justify-between text-xs mb-1.5', muted)}>
            <span>Share of the deal zone each side kept</span>
          </div>
          <div className={cn('flex h-3 rounded-full overflow-hidden', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
            {split.map((sp) => <div key={sp.name} style={{ width: `${sp.share}%`, background: sp.color }} />)}
          </div>
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm font-semibold mt-2">
            {split.map((sp) => (
              <span key={sp.name} className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: sp.color }} />
                {sp.name} <span className="tabular-nums">{sp.share}%</span>
              </span>
            ))}
          </div>
        </div>
      ) : <div />}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Sentiment Wave Chart
 * ------------------------------------------------------------------------------------------- */

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function SentimentWave({ journey, agents, isDark }) {
  const [hover, setHover] = useState(null);
  if (!journey?.length) return <EmptyNote isDark={isDark}>No turns to analyse yet.</EmptyNote>;
  const n = Math.max(journey.length, 2);
  const h = 250;
  const W = 1140; // full-width card: wider canvas keeps text the same size as the other charts
  const x = (t) => PAD.l + ((t - 1) / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => PAD.t + (1 - (v + 1) / 2) * (h - PAD.t - PAD.b);
  const axis = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? '#1e293b' : '#e2e8f0';
  const lines = agents.map((a, idx) => {
    const pts = journey.filter((j) => j.agent_id === a.id).map((j) => ({ ...j, cx: x(j.turn_index), cy: y(Number(j.sentiment_score) || 0) }));
    return { ...a, color: AGENT_COLORS[idx % AGENT_COLORS.length], pts };
  });
  const hovered = hover ? journey.find((j) => j.turn_index === hover) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${h}`} className="w-full h-auto" role="img" aria-label="Sentiment wave across turns">
        <defs>
          {lines.map((l) => (
            <linearGradient key={l.id} id={`wave-${l.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={l.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={l.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        <rect x={PAD.l} width={W - PAD.l - PAD.r} y={y(1)} height={y(0) - y(1)} fill={ZOPA_COLOR} opacity={isDark ? 0.05 : 0.05} />
        <rect x={PAD.l} width={W - PAD.l - PAD.r} y={y(0)} height={y(-1) - y(0)} fill="#f43f5e" opacity={isDark ? 0.05 : 0.04} />
        {[-1, -0.5, 0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? axis : grid} strokeWidth={v === 0 ? 1.2 : 1} strokeDasharray={v === 0 ? '4 4' : undefined} />
            <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10.5" fill={axis}>
              {v === 1 ? 'Positive' : v === 0 ? 'Neutral' : v === -1 ? 'Negative' : v}
            </text>
          </g>
        ))}
        {Array.from({ length: n }, (_, i) => i + 1).map((t) => (
          <text key={t} x={x(t)} y={h - PAD.b + 16} textAnchor="middle" fontSize="10.5" fill={axis}>{t}</text>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={h - 4} textAnchor="middle" fontSize="10.5" fill={axis}>Turn</text>
        {lines.map((l) => {
          const pts = l.pts.map((p) => [p.cx, p.cy]);
          const path = smoothPath(pts);
          return (
            <g key={l.id}>
              {pts.length > 1 && (
                <path d={`${path} L${pts[pts.length - 1][0]},${y(-1)} L${pts[0][0]},${y(-1)} Z`} fill={`url(#wave-${l.id})`} />
              )}
              {pts.length > 1 && <path d={path} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" />}
              {l.pts.map((p) => (
                <circle key={p.turn_index} cx={p.cx} cy={p.cy} r="4.5" fill={l.color} stroke={isDark ? '#0f172a' : '#fff'} strokeWidth="2"
                  onMouseEnter={() => setHover(p.turn_index)} onMouseLeave={() => setHover(null)} />
              ))}
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div className={cn('absolute top-2 left-20 rounded-lg border px-3 py-2 text-xs shadow-lg pointer-events-none', isDark ? 'bg-slate-950/95 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700')}>
          <div className="font-semibold">Turn {hovered.turn_index}: {hovered.sentiment}</div>
          <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {agents.find((a) => a.id === hovered.agent_id)?.name || hovered.agent_id} · {hovered.action} · {hovered.stance}
          </div>
        </div>
      )}
      <div className="mt-3">
        <Legend isDark={isDark} items={lines.map((l) => ({ label: l.name, color: l.color }))} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Win-rate bars, deadlock heatmap, personality matrix
 * ------------------------------------------------------------------------------------------- */

function WinRateBars({ rows, isDark }) {
  if (!rows?.length) return <EmptyNote isDark={isDark}>No agreements yet to compare.</EmptyNote>;
  return (
    <div className="space-y-5">
      {rows.map((row) => {
        const [a, b] = row.agents;
        const deals = row.deals || 0;
        const aPct = deals && a ? (a.value_wins / deals) * 100 : 0;
        const bPct = deals && b ? (b.value_wins / deals) * 100 : 0;
        const evenPct = deals ? (row.even_deals / deals) * 100 : 0;
        return (
          <div key={row.scenario_id}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-semibold truncate">{row.title}</span>
              <span className={cn('text-xs shrink-0', isDark ? 'text-slate-400' : 'text-slate-500')}>{deals} deal{deals === 1 ? '' : 's'}</span>
            </div>
            {deals ? (
              <>
                <div className={cn('flex h-7 rounded-lg overflow-hidden text-[11px] font-bold text-white', isDark ? 'bg-slate-800' : 'bg-slate-100')}>
                  {aPct > 0 && <div style={{ width: `${aPct}%`, background: AGENT_COLORS[0] }} className="flex items-center justify-center">{Math.round(aPct)}%</div>}
                  {evenPct > 0 && <div style={{ width: `${evenPct}%` }} className={cn('flex items-center justify-center', isDark ? 'bg-slate-600' : 'bg-slate-400')}>{Math.round(evenPct)}%</div>}
                  {bPct > 0 && <div style={{ width: `${bPct}%`, background: AGENT_COLORS[1] }} className="flex items-center justify-center">{Math.round(bPct)}%</div>}
                </div>
                <div className={cn('flex justify-between text-[11px] mt-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  <span>{a?.name}: avg {a?.avg_value_share ?? 0}% of zone</span>
                  <span>{b?.name}: avg {b?.avg_value_share ?? 0}% of zone</span>
                </div>
              </>
            ) : (
              <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>No agreements in this scenario.</div>
            )}
          </div>
        );
      })}
      <Legend isDark={isDark} items={[
        { label: 'First agent captured more', color: AGENT_COLORS[0] },
        { label: 'Even split (±5%)', color: isDark ? '#475569' : '#94a3b8' },
        { label: 'Second agent captured more', color: AGENT_COLORS[1] },
      ]} />
    </div>
  );
}

const TONES = { good: '16,185,129', warn: '245,158,11', bad: '244,63,94' };

function heatColor(rate, tone, isDark) {
  const alpha = Math.min(0.85, 0.1 + (rate / 100) * (tone === 'warn' ? 0.55 : 0.75));
  return rate > 0 ? `rgba(${TONES[tone] || TONES.bad},${alpha})` : isDark ? 'rgba(30,41,59,0.45)' : 'rgba(241,245,249,1)';
}

/** Cell text colour that stays readable on its fill. */
function heatText(rate, tone, isDark) {
  if (rate < 45) return isDark ? 'text-slate-200' : 'text-slate-700';
  if (tone === 'warn' && !isDark) return 'text-amber-950';
  return 'text-white';
}

function DeadlockHeatmap({ heatmap, isDark }) {
  const rows = heatmap?.rows || [];
  if (!rows.length) return <EmptyNote isDark={isDark}>No sessions for the heatmap yet.</EmptyNote>;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[640px] border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr>
            <th className={cn('text-left text-[11px] font-semibold uppercase tracking-wider pb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>Scenario</th>
            {HEAT_COLUMNS.map((c) => (
              <th key={c.key} className={cn('text-[11px] font-semibold pb-1 text-center', isDark ? 'text-slate-400' : 'text-slate-500')}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.scenario_id}>
              <td className="text-sm font-semibold pr-2 whitespace-nowrap">
                {row.title}
                <div className={cn('text-[11px] font-normal', isDark ? 'text-slate-500' : 'text-slate-400')}>{row.total} run{row.total === 1 ? '' : 's'}</div>
              </td>
              {HEAT_COLUMNS.map((c) => {
                const rate = row.rates?.[c.key] || 0;
                return (
                  <td key={c.key} className="rounded-lg text-center py-2.5 px-1" style={{ background: heatColor(rate, c.tone, isDark) }}
                    title={`${row.title}: ${c.label} in ${row.counts?.[c.key] || 0} of ${row.total} runs`}>
                    <div className={cn('text-sm font-bold tabular-nums', heatText(rate, c.tone, isDark))}>{row.counts?.[c.key] || 0}</div>
                    <div className={cn('text-[10px] tabular-nums opacity-80', heatText(rate, c.tone, isDark))}>{rate}%</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3">
        <Legend isDark={isDark} items={[
          { label: 'Agreement', color: `rgb(${TONES.good})`, band: true },
          { label: 'Got stuck at least once (often rescued by the ladder)', color: `rgb(${TONES.warn})`, band: true },
          { label: 'Ended without a deal', color: `rgb(${TONES.bad})`, band: true },
        ]} />
      </div>
    </div>
  );
}

function PersonalityMatrix({ matrix, isDark }) {
  if (!matrix?.length) return <EmptyNote isDark={isDark}>Run negotiations with different personalities to fill the matrix.</EmptyNote>;
  const cell = (a, b) => matrix.find((m) => m.first === a && m.second === b);
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[420px] border-separate" style={{ borderSpacing: 4 }}>
        <thead>
          <tr>
            <th className={cn('text-left text-[11px] font-semibold pb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>First ↓ / Second →</th>
            {PERSONALITIES.map((p) => <th key={p} className={cn('text-[11px] font-semibold pb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>{p}</th>)}
          </tr>
        </thead>
        <tbody>
          {PERSONALITIES.map((a) => (
            <tr key={a}>
              <td className="text-xs font-semibold pr-2 whitespace-nowrap">{a}</td>
              {PERSONALITIES.map((b) => {
                const m = cell(a, b);
                if (!m) return <td key={b} className={cn('rounded-lg text-center py-3 text-xs', isDark ? 'bg-slate-800/60 text-slate-600' : 'bg-slate-100 text-slate-400')}>–</td>;
                const strong = m.deadlock_event_rate >= 45;
                const txt = heatText(m.deadlock_event_rate, 'warn', isDark);
                return (
                  <td key={b} className="rounded-lg text-center py-2 px-1" style={{ background: heatColor(m.deadlock_event_rate, 'warn', isDark) }}
                    title={`${a} vs ${b}: ${m.runs} runs, ${m.agreement_rate}% agreement, ${m.deadlock_event_rate}% hit a deadlock`}>
                    <div className={cn('text-sm font-bold tabular-nums', txt)}>{m.avg_rounds} rounds</div>
                    <div className={cn('text-[10px] tabular-nums', strong ? cn(txt, 'opacity-85') : isDark ? 'text-slate-400' : 'text-slate-500')}>
                      {m.deadlock_event_rate}% got stuck, {m.runs} run{m.runs === 1 ? '' : 's'}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={cn('text-[11px] mt-2', isDark ? 'text-slate-500' : 'text-slate-500')}>Colour shows how often the pairing got stuck; the number is the average rounds to settle.</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------------------------
 * Overview pieces: gradient KPI tiles, donut charts, filter controls
 * ------------------------------------------------------------------------------------------- */

// Purple, royal blue, ocean, teal: one hue per column, as in a CRM overview.
const TILE_GRADIENTS = [
  'linear-gradient(135deg, #6D28D9 0%, #4F46E5 100%)',
  'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 100%)',
  'linear-gradient(135deg, #075985 0%, #0284C7 100%)',
  'linear-gradient(135deg, #0F766E 0%, #15803D 100%)',
];

function GradientTile({ label, value, hint, index }) {
  return (
    <div className="rounded-2xl p-5 text-white min-w-0 shadow-lg shadow-slate-900/10" style={{ background: TILE_GRADIENTS[index % 4] }}>
      <div className="text-[15px] text-white/85">{label}</div>
      <div className="text-4xl font-bold tracking-tight mt-2 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-white/75 mt-1.5">{hint}</div>}
    </div>
  );
}

const DONUT_COLORS = {
  accepted: '#1D6FD1',
  deadlock: '#F87171',
  rejected: '#7C3AED',
  same_position: '#1D6FD1',
  stall: '#0EA5E9',
  repeated_rejection: '#6D28D9',
  max_rounds: '#F87171',
  none: '#94A3B8',
};

/** Ring chart with the total in the middle and a legend of shares. */
function Donut({ data, centerValue, centerLabel, isDark }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  const segments = data.filter((d) => d.value > 0).reduce((acc, d) => {
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
    return [...acc, { ...d, start, len: total ? (d.value / total) * c : 0 }];
  }, []);
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  if (!total) return <EmptyNote isDark={isDark}>No sessions match the filters.</EmptyNote>;
  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 200 200" className="w-40 h-40 shrink-0 -rotate-90" role="img"
        aria-label={data.map((d) => `${d.label} ${Math.round((d.value / total) * 100)}%`).join(', ')}>
        <circle cx="100" cy="100" r={r} fill="none" stroke={isDark ? '#1e293b' : '#eef2f7'} strokeWidth="34" />
        {segments.map((d) => (
          <circle key={d.label} cx="100" cy="100" r={r} fill="none" stroke={d.color} strokeWidth="34"
            strokeDasharray={`${Math.max(0, d.len - (segments.length > 1 ? 2 : 0))} ${c}`} strokeDashoffset={-d.start} />
        ))}
        <g transform="rotate(90 100 100)">
          <text x="100" y="98" textAnchor="middle" fontSize="30" fontWeight="700" fill={isDark ? '#f1f5f9' : '#0f172a'}>{centerValue}</text>
          <text x="100" y="120" textAnchor="middle" fontSize="12" fill={isDark ? '#94a3b8' : '#64748b'}>{centerLabel}</text>
        </g>
      </svg>
      <ul className="flex-1 min-w-0 w-full space-y-2.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="flex-1 min-w-0 truncate">{d.label}</span>
            <span className="font-semibold tabular-nums">{Math.round((d.value / total) * 1000) / 10}%</span>
            <span className={cn('text-xs tabular-nums w-6 text-right', muted)}>{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, isDark }) {
  const id = `f-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1.5">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        className={cn('w-full rounded-lg border px-3 py-2.5 text-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800')}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </div>
  );
}

const isPractice = (s) => s?.mode === 'practice' || s?.config?.mode === 'practice';
const pairingOf = (s) => (s?.config?.agents || []).map((a) => a.personality || 'Collaborative');

function dealValueOf(s) {
  const key = negotiableItems(s?.config)[0]?.item;
  const last = (s?.turns || [])[(s?.turns || []).length - 1]?.offer || {};
  return s?.status === 'accepted' && key && isNum(Number(last[key])) ? Number(last[key]) : null;
}

/* ---------------------------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------------------------- */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'scenarios', label: 'Scenarios' },
];

export default function PerformanceDashboard({ currentUser, onStartNegotiation }) {
  const { isDark } = useTheme();
  const [tab, setTab] = useState('overview');
  const [source, setSource] = useState('mine');
  const [reloadToken, setReloadToken] = useState(0);
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [personalityFilter, setPersonalityFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [itemChoice, setItemChoice] = useState(null);

  // 1. Sessions: the user's History or the engine-played demo dataset.
  const loadKey = `${source}:${currentUser?.id || 'local'}:${reloadToken}`;
  const [store, setStore] = useState({ key: null, sessions: [], origin: '', error: '' });
  useEffect(() => {
    let active = true;
    const request = source === 'demo'
      ? getDemoSessions().then((r) => ({ sessions: r.sessions || [], origin: 'demo' }))
      : fetchUserSimulations(currentUser?.id || null).then((r) => ({ sessions: r.data || [], origin: r.source }));
    request
      .then((res) => { if (active) setStore({ key: loadKey, ...res, error: '' }); })
      .catch((err) => { if (active) setStore({ key: loadKey, sessions: [], origin: source, error: err?.message || 'Could not load sessions.' }); });
    return () => { active = false; };
  }, [loadKey, source, currentUser?.id]);
  const loadingSessions = store.key !== loadKey;

  const finished = useMemo(() => store.sessions.filter((s) => FINAL.has(String(s.status || '').toLowerCase())), [store.sessions]);
  const scenarios = useMemo(() => {
    const seen = new Map();
    finished.forEach((s) => { if (!seen.has(s.scenario_id)) seen.set(s.scenario_id, sessionTitle(s)); });
    return [...seen.entries()];
  }, [finished]);
  const activeScenario = scenarios.some(([id]) => id === scenarioFilter) ? scenarioFilter : 'all';
  const filtered = useMemo(() => finished.filter((s) => (
    (activeScenario === 'all' || s.scenario_id === activeScenario)
    && (modeFilter === 'all' || (modeFilter === 'practice') === isPractice(s))
    && (outcomeFilter === 'all' || (outcomeFilter === 'deal' ? s.status === 'accepted' : s.status !== 'accepted'))
    && (personalityFilter === 'all' || pairingOf(s).includes(personalityFilter))
  )), [finished, activeScenario, modeFilter, outcomeFilter, personalityFilter]);
  const filterKey = `${activeScenario}|${modeFilter}|${outcomeFilter}|${personalityFilter}`;

  // 2. Aggregated analytics from the backend (POST /api/analytics).
  const analyticsKey = `${loadKey}:${filterKey}:${filtered.length}`;
  const [analyticsStore, setAnalyticsStore] = useState({ key: null, data: null });
  useEffect(() => {
    if (loadingSessions || !filtered.length) return undefined;
    let active = true;
    getPerformanceAnalytics(filtered)
      .then((data) => { if (active) setAnalyticsStore({ key: analyticsKey, data }); })
      .catch(() => { if (active) setAnalyticsStore({ key: analyticsKey, data: localAnalytics(filtered) }); });
    return () => { active = false; };
  }, [analyticsKey, loadingSessions, filtered]);
  const analytics = filtered.length && analyticsStore.key === analyticsKey ? analyticsStore.data : null;
  const loadingAnalytics = Boolean(filtered.length) && analyticsStore.key !== analyticsKey;

  // 3. Selected session for the trajectory and sentiment charts.
  const selected = filtered.find((s) => s.id === selectedId) || filtered[0] || null;
  const items = useMemo(() => negotiableItems(selected?.config), [selected]);
  const zone = items.find((z) => z.item === itemChoice) || items[0] || null;
  const fallbackItem = Object.keys((selected?.turns || []).find((t) => t?.offer)?.offer || {})[0];
  const item = zone?.item || fallbackItem;
  const agents = (selected?.config?.agents || []).map((a) => ({ id: a.id, name: a.name || a.id }));

  const sentimentKey = selected ? `${loadKey}:${selected.id}:${(selected.turns || []).length}` : null;
  const [sentimentStore, setSentimentStore] = useState({ key: null, journey: [], origin: '' });
  useEffect(() => {
    if (!selected) return undefined;
    let active = true;
    getPostInteractionSummary({
      config: selected.config,
      history: selected.turns || [],
      status: selected.status,
      winner: selected.winner,
      deadlock_event: sessionDeadlock(selected),
    })
      .then((res) => { if (active) setSentimentStore({ key: sentimentKey, journey: res.sentiment_journey || [], origin: 'agent' }); })
      .catch(() => { if (active) setSentimentStore({ key: sentimentKey, journey: localSentiment(selected), origin: 'local' }); });
    return () => { active = false; };
  }, [sentimentKey, selected]);
  const journey = sentimentStore.key === sentimentKey ? sentimentStore.journey : null;

  // Figures for the tiles and donuts.
  const stuck = filtered.filter((s) => sessionDeadlock(s) || s.status === 'deadlock').length;
  const rescued = analytics?.resolved_by_ladder ?? filtered.filter((s) => sessionDeadlock(s) && s.status === 'accepted').length;
  const practiceCount = filtered.filter(isPractice).length;
  const avgTurns = filtered.length ? Math.round((filtered.reduce((n, s) => n + (s.turns || []).length, 0) / filtered.length) * 10) / 10 : 0;
  const outcomeData = [
    { label: 'Agreement', value: filtered.filter((s) => s.status === 'accepted').length, color: DONUT_COLORS.accepted },
    { label: 'Ended in deadlock', value: filtered.filter((s) => s.status === 'deadlock').length, color: DONUT_COLORS.deadlock },
    { label: 'Walked away', value: filtered.filter((s) => s.status === 'rejected').length, color: DONUT_COLORS.rejected },
  ];
  const triggerCount = (t) => filtered.filter((s) => sessionDeadlock(s)?.type === t).length;
  const triggerData = [
    { label: 'Repeated rejection', value: triggerCount('repeated_rejection'), color: DONUT_COLORS.repeated_rejection },
    { label: 'Same position', value: triggerCount('same_position'), color: DONUT_COLORS.same_position },
    { label: 'Stall', value: triggerCount('stall'), color: DONUT_COLORS.stall },
    { label: 'Max rounds', value: triggerCount('max_rounds'), color: DONUT_COLORS.max_rounds },
    { label: 'Never got stuck', value: filtered.filter((s) => !sessionDeadlock(s) && s.status !== 'deadlock').length, color: DONUT_COLORS.none },
  ];

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const panel = isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/80';
  const sourceLabel = store.origin === 'demo' ? 'Demo dataset, played by the negotiation engine'
    : store.origin === 'supabase' ? 'Your saved history (account)' : 'Your saved history (this browser)';
  const loadingBlock = (
    <div className={cn('py-10 text-center text-sm flex items-center justify-center gap-2', muted)}>
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>
  );
  const selectSession = (id) => { setSelectedId(id); setItemChoice(null); };

  return (
    <div className={cn('w-full min-h-full', isDark ? 'bg-slate-950' : 'bg-gradient-to-b from-[#E6EFFA] to-[#F1F6FC]')}>
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header: brand + tab band */}
        <header className="flex flex-col lg:flex-row lg:items-stretch gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #1D6FD1)' }}>
              <BarChart3 className="w-7 h-7 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Performance dashboard</h1>
              <p className={cn('text-sm font-semibold mt-0.5', isDark ? 'text-sky-300' : 'text-sky-700')}>Negotiation analytics across every saved run</p>
            </div>
          </div>
          <nav aria-label="Dashboard views"
            className="flex items-center gap-1 sm:gap-2 rounded-2xl lg:rounded-l-[40px] lg:rounded-r-2xl px-3 sm:px-6 py-3 overflow-x-auto"
            style={{ background: 'linear-gradient(90deg, #1E3A8A, #1D4ED8)' }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                className={cn('px-5 py-2.5 rounded-xl text-[15px] font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white',
                  tab === t.id ? 'bg-white/20 text-white' : 'text-blue-100 hover:text-white')}>
                {t.label}
              </button>
            ))}
            {onStartNegotiation && (
              <button onClick={onStartNegotiation}
                className="ml-2 px-5 py-2.5 rounded-xl text-[15px] font-semibold bg-white text-blue-800 hover:bg-blue-50 cursor-pointer whitespace-nowrap inline-flex items-center gap-2">
                <PlayCircle className="w-4 h-4" aria-hidden="true" /> Start a negotiation
              </button>
            )}
          </nav>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
          {/* Filters (top on small screens, right rail on wide ones) */}
          <aside className="order-first xl:order-last space-y-5 xl:sticky xl:top-24">
            <div className={cn('rounded-2xl border p-5 space-y-5', panel)}>
              <div>
                <div className="text-sm font-semibold mb-1.5">Data source</div>
                <div className={cn('grid grid-cols-2 rounded-lg border p-1', isDark ? 'border-slate-700' : 'border-slate-300')} role="tablist" aria-label="Data source">
                  {[['mine', 'My sessions', Database], ['demo', 'Demo data', Sparkles]].map(([id, text, Icon]) => (
                    <button key={id} role="tab" aria-selected={source === id}
                      onClick={() => { setSource(id); setSelectedId(null); setScenarioFilter('all'); }}
                      className={cn('inline-flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-semibold cursor-pointer',
                        source === id ? 'bg-blue-700 text-white' : isDark ? 'text-slate-300' : 'text-slate-600')}>
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {text}
                    </button>
                  ))}
                </div>
                <div className={cn('flex items-center justify-between mt-2 text-xs', muted)}>
                  <span>{loadingSessions ? 'Loading…' : `${finished.length} completed runs`}</span>
                  <button onClick={() => setReloadToken((t) => t + 1)} className="inline-flex items-center gap-1 cursor-pointer hover:underline" aria-label="Reload sessions">
                    <RefreshCw className={cn('w-3 h-3', loadingSessions && 'animate-spin')} /> Reload
                  </button>
                </div>
              </div>
              <FilterSelect isDark={isDark} label="Scenario" value={activeScenario} onChange={(v) => { setScenarioFilter(v); setSelectedId(null); }}
                options={[['all', 'All'], ...scenarios]} />
              <FilterSelect isDark={isDark} label="Mode" value={modeFilter} onChange={(v) => { setModeFilter(v); setSelectedId(null); }}
                options={[['all', 'All'], ['simulation', 'Simulation (AI vs AI)'], ['practice', 'Practice (human vs AI)']]} />
              <FilterSelect isDark={isDark} label="Outcome" value={outcomeFilter} onChange={(v) => { setOutcomeFilter(v); setSelectedId(null); }}
                options={[['all', 'All'], ['deal', 'Agreement'], ['nodeal', 'No deal']]} />
              <FilterSelect isDark={isDark} label="Personality" value={personalityFilter} onChange={(v) => { setPersonalityFilter(v); setSelectedId(null); }}
                options={[['all', 'All'], ...PERSONALITIES.map((p) => [p, p])]} />
            </div>

            {analytics?.key_insights?.length > 0 && (
              <div className={cn('rounded-2xl border p-5', panel)}>
                <h2 className="text-lg font-bold">What the data says</h2>
                <p className={cn('mt-2 text-[15px] font-semibold leading-snug', isDark ? 'text-sky-300' : 'text-blue-800')}>{analytics.key_insights[0]}</p>
                <ul className="mt-3 space-y-2.5">
                  {analytics.key_insights.slice(1).map((line) => (
                    <li key={line} className={cn('text-sm leading-relaxed flex gap-2', isDark ? 'text-slate-300' : 'text-slate-600')}>
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />{line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          {/* Main area */}
          <div className="min-w-0 space-y-5">
            {store.error && <div className="text-sm text-rose-500">{store.error}</div>}
            {loadingSessions ? (
              <div className={cn('rounded-2xl border py-24', panel)}>{loadingBlock}</div>
            ) : !finished.length ? (
              <div className={cn('rounded-2xl border text-center py-16 px-6', panel)}>
                <BarChart3 className="w-10 h-10 mx-auto text-sky-500" aria-hidden="true" />
                <h2 className="text-xl font-bold mt-3">No completed negotiations yet</h2>
                <p className={cn('text-sm mt-1.5 max-w-md mx-auto', muted)}>
                  Finished simulations and practice sessions are saved to your History and appear here. Load the demo data to explore the dashboard now.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                  <button onClick={() => setSource('demo')} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-700 text-white hover:bg-blue-600 cursor-pointer">
                    <Sparkles className="w-4 h-4" aria-hidden="true" /> Load demo data
                  </button>
                  {onStartNegotiation && (
                    <button onClick={onStartNegotiation} className={cn('inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border cursor-pointer', isDark ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-700')}>
                      <PlayCircle className="w-4 h-4" aria-hidden="true" /> Start a negotiation
                    </button>
                  )}
                </div>
              </div>
            ) : !filtered.length ? (
              <div className={cn('rounded-2xl border text-center py-16 px-6', panel)}>
                <h2 className="text-lg font-bold">No runs match these filters</h2>
                <p className={cn('text-sm mt-1', muted)}>Set a filter back to All to see more sessions.</p>
              </div>
            ) : (
              <>
                <p className={cn('text-xs', muted)}>{sourceLabel}: showing {filtered.length} of {finished.length} completed runs.</p>

                {tab === 'overview' && (
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] items-start">
                    <div className="min-w-0 space-y-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <GradientTile index={0} label="Completed runs" value={filtered.length} hint={`${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} available`} />
                        <GradientTile index={1} label="Agreement rate" value={analytics ? `${analytics.agreement_rate}%` : '…'} hint="ended in a deal" />
                        <GradientTile index={2} label="Deadlock rate" value={analytics ? `${analytics.deadlock_event_rate ?? 0}%` : '…'} hint={`${stuck} of ${filtered.length} runs got stuck`} />
                        <GradientTile index={3} label="Mediator success" value={stuck ? `${Math.round((rescued / stuck) * 100)}%` : '–'} hint={`${rescued} of ${stuck} stuck runs still closed`} />
                        <GradientTile index={0} label="No-deal rate" value={analytics ? `${analytics.no_deal_rate ?? analytics.deadlock_rate}%` : '…'} hint="ended without an agreement" />
                        <GradientTile index={1} label="Average rounds" value={analytics ? analytics.avg_rounds : '…'} hint="to reach an outcome" />
                        <GradientTile index={2} label="Practice sessions" value={practiceCount} hint="human vs AI" />
                        <GradientTile index={3} label="Average turns" value={avgTurns} hint="offers per negotiation" />
                      </div>

                      <Card isDark={isDark}>
                        <CardHeader isDark={isDark} icon={TrendingUp} title="Concession trajectory"
                          subtitle="Both offers turn by turn, closing in on a deal inside the deal zone"
                          right={(
                            <div className="flex flex-wrap items-center gap-2">
                              <select value={selected?.id || ''} onChange={(e) => selectSession(e.target.value)} aria-label="Session to chart"
                                className={cn('max-w-[260px] rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer outline-none',
                                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700')}>
                                {filtered.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {sessionTitle(s).replace(/ Negotiation$/, '')}: {pairingOf(s).join(' vs ')}{isPractice(s) ? ' (practice)' : ''}
                                  </option>
                                ))}
                              </select>
                              {items.length > 1 && items.map((z) => (
                                <button key={z.item} onClick={() => setItemChoice(z.item)}
                                  className={cn('px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border',
                                    z.item === item ? 'bg-blue-700 border-blue-700 text-white' : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-600')}>
                                  {titleCase(z.item)}
                                </button>
                              ))}
                            </div>
                          )} />
                        {selected && item && <DealStory session={selected} zone={zone} item={item} isDark={isDark} />}
                        {selected && item ? <TrajectoryChart session={selected} item={item} zone={zone} isDark={isDark} />
                          : <EmptyNote isDark={isDark}>Select a session.</EmptyNote>}
                      </Card>

                    </div>

                    <div className="min-w-0 grid gap-5 md:grid-cols-2 2xl:grid-cols-1">
                      <Card isDark={isDark}>
                        <CardHeader isDark={isDark} icon={Trophy} title="Negotiation outcomes" subtitle="How the filtered runs ended" />
                        <Donut isDark={isDark} data={outcomeData} centerValue={filtered.length} centerLabel="runs" />
                      </Card>
                      <Card isDark={isDark}>
                        <CardHeader isDark={isDark} icon={Flame} title="What made it stuck" subtitle="First deadlock each run hit, if any" />
                        <Donut isDark={isDark} data={triggerData} centerValue={stuck} centerLabel="got stuck" />
                      </Card>
                      <Card isDark={isDark} className="md:col-span-2 2xl:col-span-1">
                        <CardHeader isDark={isDark} icon={Trophy} title="Who keeps more of the deal zone" subtitle="Share of agreements where each side captured more value" />
                        {loadingAnalytics ? loadingBlock : analytics?.offline ? <EmptyNote isDark={isDark}>Needs the analytics service.</EmptyNote>
                          : <WinRateBars rows={analytics?.win_rates} isDark={isDark} />}
                      </Card>
                    </div>
                    <Card isDark={isDark} className="2xl:col-span-2">
                      <CardHeader isDark={isDark} icon={Activity} title="Sentiment wave"
                        subtitle={`Mood of each side per turn, from the Post-Interaction Summary Agent${sentimentStore.origin === 'local' && journey ? ' (offline estimate)' : ''}`} />
                      {journey ? <SentimentWave journey={journey} agents={agents} isDark={isDark} /> : loadingBlock}
                    </Card>
                  </div>
                )}

                {tab === 'sessions' && (
                  <Card isDark={isDark}>
                    <CardHeader isDark={isDark} icon={Users} title="Sessions" subtitle="Select a run to chart it on the Overview tab" />
                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead>
                          <tr className={cn('text-left text-xs', muted)}>
                            {['Scenario', 'Personalities', 'Mode', 'Turns', 'Outcome', 'Deal', 'Got stuck'].map((h) => (
                              <th key={h} className={cn('font-semibold px-3 py-2.5 border-b', isDark ? 'border-slate-800' : 'border-slate-200', ['Turns', 'Deal'].includes(h) && 'text-right')}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((s) => {
                            const ev = sessionDeadlock(s);
                            const deal = dealValueOf(s);
                            const active = selected?.id === s.id;
                            return (
                              <tr key={s.id} onClick={() => { selectSession(s.id); setTab('overview'); }}
                                className={cn('cursor-pointer border-b', isDark ? 'border-slate-800/70 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-blue-50/60',
                                  active && (isDark ? 'bg-blue-500/10' : 'bg-blue-50'))}>
                                <td className="px-3 py-2.5 font-semibold">
                                  <button className="text-left hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); selectSession(s.id); setTab('overview'); }}>
                                    {sessionTitle(s).replace(/ Negotiation$/, '')}
                                  </button>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="inline-flex flex-wrap gap-x-3">
                                    {pairingOf(s).slice(0, 2).map((p, idx) => (
                                      <span key={`${p}-${idx}`} className="inline-flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ background: AGENT_COLORS[idx] }} />{p}
                                      </span>
                                    ))}
                                  </span>
                                </td>
                                <td className={cn('px-3 py-2.5', muted)}>{isPractice(s) ? 'Practice' : 'Simulation'}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{(s.turns || []).length}</td>
                                <td className="px-3 py-2.5">
                                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                                    s.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-600 dark:text-rose-300')}>
                                    {s.status === 'accepted' ? 'Agreement' : s.status === 'rejected' ? 'Walked away' : 'Deadlock'}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{deal !== null ? formatValue(deal) : '–'}</td>
                                <td className={cn('px-3 py-2.5', muted)}>{ev ? titleCase(ev.type) : 'No'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {tab === 'scenarios' && (
                  <div className="grid gap-5 lg:grid-cols-5 items-start">
                    <Card isDark={isDark} className="lg:col-span-2">
                      <CardHeader isDark={isDark} icon={Trophy} title="Who keeps more of the deal zone" subtitle="Share of agreements where each side captured more value" />
                      {loadingAnalytics ? loadingBlock : analytics?.offline ? <EmptyNote isDark={isDark}>Needs the analytics service.</EmptyNote>
                        : <WinRateBars rows={analytics?.win_rates} isDark={isDark} />}
                    </Card>
                    <Card isDark={isDark} className="lg:col-span-3">
                      <CardHeader isDark={isDark} icon={Flame} title="Deadlock heatmap" subtitle="How each scenario ended, and what made it stuck" />
                      {loadingAnalytics ? loadingBlock : analytics?.offline ? <EmptyNote isDark={isDark}>Needs the analytics service.</EmptyNote>
                        : <DeadlockHeatmap heatmap={analytics?.deadlock_heatmap} isDark={isDark} />}
                    </Card>
                    <Card isDark={isDark} className="lg:col-span-5">
                      <CardHeader isDark={isDark} icon={Swords} title="Personality pairings" subtitle="Rounds to settle and how often each pairing got stuck" />
                      {loadingAnalytics ? loadingBlock : <PersonalityMatrix matrix={analytics?.personality_matrix} isDark={isDark} />}
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
