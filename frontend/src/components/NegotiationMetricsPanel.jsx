import { useMemo } from 'react';
import {
  Activity,
  Layers,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Tag,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

/**
 * Format key string to readable title
 */
function formatKey(key) {
  return String(key).replace(/_/g, ' ');
}

function formatValue(val) {
  if (typeof val === 'number') {
    return val.toLocaleString();
  }
  return String(val);
}

/**
 * Calculate ZOPA overlap strictly adhering to issue limits compatibility:
 * For an issue to have a viable ZOPA, buyers/sellers or competing parties must
 * define compatible limits (at least one 'min' floor and one 'max' ceiling).
 * The spread is computed as lowest ceiling - highest floor.
 * An issue is overlapping if ceiling >= floor.
 * The overall negotiation is only allOverlapping if ALL calculable issues are feasible.
 */
function calculateZopaOverlap(agents = []) {
  if (!Array.isArray(agents) || agents.length < 2) {
    return { isCalculable: false, allOverlapping: false, items: [], unitsByItem: {} };
  }

  // Aggregate limits and extract precise units per issue
  const issueMap = {};
  const unitsByItem = {};

  for (const agent of agents) {
    const limits = Array.isArray(agent.limits) ? agent.limits : [];
    for (const lim of limits) {
      if (!lim || typeof lim !== 'object') continue;
      const itemKey = String(lim.item || '').trim();
      if (!itemKey) continue;

      const numVal = Number(lim.value);
      if (Number.isNaN(numVal)) continue;

      const limType = String(lim.type || 'min').toLowerCase();
      const unit = String(lim.unit || '').trim();

      if (unit && !unitsByItem[itemKey]) {
        unitsByItem[itemKey] = unit;
      }

      if (!issueMap[itemKey]) {
        issueMap[itemKey] = {
          item: itemKey,
          unit,
          floors: [],   // min limits
          ceilings: [], // max limits
        };
      }

      if (unit && !issueMap[itemKey].unit) {
        issueMap[itemKey].unit = unit;
      }

      if (limType === 'min') {
        issueMap[itemKey].floors.push({ agentId: agent.id, agentName: agent.name, value: numVal });
      } else if (limType === 'max') {
        issueMap[itemKey].ceilings.push({ agentId: agent.id, agentName: agent.name, value: numVal });
      }
    }
  }

  const items = [];

  for (const [key, data] of Object.entries(issueMap)) {
    // If we have at least one floor and one ceiling, we can compare them for ZOPA
    if (data.floors.length > 0 && data.ceilings.length > 0) {
      // The highest minimum requirement among agents
      const floorEntry = data.floors.reduce((prev, curr) => (curr.value > prev.value ? curr : prev));
      // The lowest maximum ceiling among agents
      const ceilingEntry = data.ceilings.reduce((prev, curr) => (curr.value < prev.value ? curr : prev));

      const floor = floorEntry.value;
      const ceiling = ceilingEntry.value;
      const isOverlapping = ceiling >= floor;
      const spread = ceiling - floor;

      items.push({
        item: key,
        unit: data.unit,
        floor,
        ceiling,
        floorAgent: floorEntry.agentName,
        ceilingAgent: ceilingEntry.agentName,
        isOverlapping,
        spread,
        isCalculable: true,
      });
    } else {
      // Missing either floor or ceiling for this issue (e.g. unilateral limit)
      const isOnlyCeiling = data.floors.length === 0;
      items.push({
        item: key,
        unit: data.unit,
        isCalculable: false,
        isOverlapping: true, // Not constrained by conflicting reservation points
        reason: isOnlyCeiling
          ? `Cap only (≤ ${data.ceilings[0]?.value} ${data.unit})`
          : `Floor only (≥ ${data.floors[0]?.value} ${data.unit})`,
      });
    }
  }

  // ZOPA is calculable if at least one issue has overlapping/conflicting reservation bounds
  const calculableItems = items.filter((it) => it.isCalculable);
  const isCalculable = calculableItems.length > 0;

  // Crucial multi-issue rule: ALL calculable issues must overlap for the negotiation to be feasible.
  // If even ONE issue has an impasse (ceiling < floor), allOverlapping is FALSE.
  const allOverlapping = isCalculable && calculableItems.every((it) => it.isOverlapping);

  return { isCalculable, allOverlapping, items, unitsByItem };
}

export default function NegotiationMetricsPanel({
  turns = [],
  agents = [],
  maxRounds = 10,
}) {
  const { isDark } = useTheme();

  // 1. Precise Round Progress Calculation:
  // Supports incomplete rounds, irregular turn sequences, and human turns in Practice Mode.
  // If the latest turn explicitly provides a turn.round, use it; otherwise compute from turn count.
  const agentCount = Math.max(1, agents.length || 2);
  const latestTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  const currentRound = useMemo(() => {
    if (!latestTurn) return 0;
    if (typeof latestTurn.round === 'number' && latestTurn.round > 0) {
      return Math.min(maxRounds, latestTurn.round);
    }
    return Math.min(maxRounds, Math.floor((turns.length - 1) / agentCount) + 1);
  }, [latestTurn, turns.length, agentCount, maxRounds]);

  const progressPercent = Math.min(100, Math.round((currentRound / Math.max(1, maxRounds)) * 100));

  // 2. Latest Turns & Stances per Agent
  const latestByAgent = useMemo(() => {
    const map = {};
    for (const agent of agents) {
      map[agent.id] = {
        agent,
        lastTurn: null,
        lastOffer: null,
        stance: agent.personality || agent.default_personality || 'Collaborative',
      };
    }

    // Traverse turns in chronological order to capture each agent's latest proposals and stance
    for (const turn of turns) {
      if (!turn || !turn.agent_id) continue;
      if (!map[turn.agent_id]) {
        map[turn.agent_id] = {
          agent: { id: turn.agent_id, name: turn.agent_name || turn.agent_id },
          lastTurn: turn,
          lastOffer: turn.offer || null,
          stance: turn.stance || 'flexible',
        };
      } else {
        map[turn.agent_id].lastTurn = turn;
        if (turn.offer && typeof turn.offer === 'object' && Object.keys(turn.offer).length > 0) {
          map[turn.agent_id].lastOffer = turn.offer;
        }
        if (turn.stance) {
          map[turn.agent_id].stance = turn.stance;
        }
      }
    }
    return map;
  }, [agents, turns]);

  // 3. Mathematical ZOPA Overlap Calculation
  const zopa = useMemo(() => calculateZopaOverlap(agents), [agents]);

  // 4. Stance Visual Metadata Helper
  const getStanceMeta = (stance) => {
    const s = String(stance || '').toLowerCase();
    if (s === 'urgent' || s === 'aggressive') {
      return {
        badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-500',
        text: 'Urgent',
      };
    }
    if (s === 'firm') {
      return {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-500',
        text: 'Firm',
      };
    }
    return {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-500',
      text: 'Flexible',
    };
  };

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 mb-8 shadow-xl transition-all backdrop-blur-xl ${
        isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-slate-200/50'
      }`}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-slate-700/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Live Negotiation Telemetry
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Real-time offer convergence, round exhaustion telemetry, and mathematical ZOPA bounds
            </p>
          </div>
        </div>

        {/* Global ZOPA Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {zopa.isCalculable ? (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                zopa.allOverlapping
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {zopa.allOverlapping ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>{zopa.allOverlapping ? 'ZOPA Feasible' : 'ZOPA Impasse'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>ZOPA N/A</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 4-Quadrant Telemetry Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Round Progress */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Round Progress
            </span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          <div className="my-1">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {currentRound}
              </span>
              <span className={`text-xs font-mono font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                / {maxRounds} max
              </span>
            </div>
            <span className={`text-[10px] block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {turns.length} total {turns.length === 1 ? 'turn' : 'turns'} executed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-mono mb-1 text-slate-400">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  progressPercent >= 80
                    ? 'bg-rose-500'
                    : progressPercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2 & 3: Latest Offers & Stances for Participating Agents */}
        {agents.slice(0, 2).map((agent, aIdx) => {
          const telemetry = latestByAgent[agent.id] || {};
          const lastOffer = telemetry.lastOffer;
          const stanceMeta = getStanceMeta(telemetry.stance);
          const hasOffer = lastOffer && Object.keys(lastOffer).length > 0;

          return (
            <div
              key={agent.id}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-700/20">
                  <div className="flex items-center gap-2">
                    <AgentAvatar role={agent.role || agent.id} size="sm" className="w-6 h-6 rounded-lg" />
                    <div>
                      <span className={`text-xs font-bold block leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {agent.name}
                      </span>
                      <span className={`text-[9px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Agent {aIdx + 1}
                      </span>
                    </div>
                  </div>

                  {/* Stance Pill */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${stanceMeta.badge}`}
                    title={`Latest stance: ${stanceMeta.text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${stanceMeta.dot} animate-pulse`} />
                    {stanceMeta.text}
                  </span>
                </div>

                {/* Latest Proposed Offer */}
                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Latest Position
                </span>

                {hasOffer ? (
                  <div className="space-y-1.5">
                    {Object.entries(lastOffer).map(([key, val]) => {
                      const itemUnit = zopa.unitsByItem[key] || '';
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-xs font-mono ${
                            isDark
                              ? 'bg-slate-900/80 border-slate-800 text-slate-200'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <span className="text-[10px] uppercase opacity-75 font-sans">
                            {formatKey(key)}:
                          </span>
                          <span className="font-bold text-indigo-400">
                            {formatValue(val)} {itemUnit && <span className="text-[10px] opacity-75 font-normal">{itemUnit}</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`py-3 text-center text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    No active proposals yet
                  </div>
                )}
              </div>

              {telemetry.lastTurn && (
                <div className={`mt-2 pt-2 border-t text-[10px] flex items-center justify-between ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <span>Last Action:</span>
                  <span className="font-bold uppercase text-indigo-400">
                    {telemetry.lastTurn.action || 'Counter'}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Metric 4: ZOPA Status & Overlap Telemetry */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ZOPA Spread Analysis
              </span>
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
            </div>

            {zopa.isCalculable ? (
              <div className="space-y-2 mt-1">
                {zopa.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs ${
                      item.isCalculable
                        ? item.isOverlapping
                          ? isDark
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-emerald-50/60 border-emerald-200'
                          : isDark
                          ? 'bg-rose-950/20 border-rose-500/30'
                          : 'bg-rose-50/60 border-rose-200'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className="capitalize text-[11px] font-sans flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5 text-indigo-400" />
                        {formatKey(item.item)}
                      </span>
                      {item.isCalculable ? (
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            item.isOverlapping ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.isOverlapping ? `+${formatValue(item.spread)} ${item.unit}` : `Impasse (${formatValue(item.spread)} ${item.unit})`}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">N/A</span>
                      )}
                    </div>

                    {item.isCalculable ? (
                      <div className={`text-[10px] font-mono leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Range: {formatValue(item.floor)} &rarr; {formatValue(item.ceiling)} {item.unit}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic">
                        {item.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-4 text-center text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Reservation limits not defined in scenario
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-700/20 flex items-center gap-1 text-[10px] text-slate-400">
            <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">Zone of Possible Agreement calculated from agent bounds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
