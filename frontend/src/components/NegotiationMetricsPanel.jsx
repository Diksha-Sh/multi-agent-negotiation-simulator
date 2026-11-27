import { useMemo } from 'react';
import {
  Activity,
  Layers,
  Scale,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Tag,
} from 'lucide-react';
import { AgentAvatar } from './AgentAvatars';
import { useTheme } from '../context/ThemeContext';

function formatKey(key) {
  return String(key).replace(/_/g, ' ');
}

function formatValue(val) {
  if (typeof val === 'number') {
    return val.toLocaleString();
  }
  return String(val);
}

function calculateZopaOverlap(agents = []) {
  if (!Array.isArray(agents) || agents.length < 2) {
    return { isCalculable: false, allOverlapping: false, items: [], unitsByItem: {} };
  }

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
          floors: [],
          ceilings: [],
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
    if (data.floors.length > 0 && data.ceilings.length > 0) {
      const floorEntry = data.floors.reduce((prev, curr) => (curr.value > prev.value ? curr : prev));
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
      const isOnlyCeiling = data.floors.length === 0;
      items.push({
        item: key,
        unit: data.unit,
        isCalculable: false,
        isOverlapping: true,
        reason: isOnlyCeiling
          ? `Cap ≤ ${data.ceilings[0]?.value} ${data.unit}`
          : `Floor ≥ ${data.floors[0]?.value} ${data.unit}`,
      });
    }
  }

  const calculableItems = items.filter((it) => it.isCalculable);
  const isCalculable = calculableItems.length > 0;
  const allOverlapping = isCalculable && calculableItems.every((it) => it.isOverlapping);

  return { isCalculable, allOverlapping, items, unitsByItem };
}

export default function NegotiationMetricsPanel({
  turns = [],
  agents = [],
  maxRounds = 10,
  isPracticeMode = false,
}) {
  const { isDark } = useTheme();

  const agentCount = Math.max(1, agents.length || 2);
  const latestTurn = turns.length > 0 ? turns[turns.length - 1] : null;

  const currentRound = useMemo(() => {
    if (!latestTurn) return isPracticeMode ? 1 : 0;
    if (typeof latestTurn.round === 'number' && latestTurn.round > 0) {
      return Math.min(maxRounds, latestTurn.round);
    }
    return Math.min(maxRounds, Math.floor((turns.length - 1) / agentCount) + 1);
  }, [latestTurn, turns.length, agentCount, maxRounds, isPracticeMode]);

  const progressPercent = Math.min(100, Math.round((currentRound / Math.max(1, maxRounds)) * 100));

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

  const zopa = useMemo(() => calculateZopaOverlap(agents), [agents]);

  const getStanceMeta = (stance) => {
    const s = String(stance || '').toLowerCase();
    if (s === 'urgent' || s === 'aggressive') {
      return {
        badge: 'bg-[#EE2A54]/15 text-[#EE2A54] border-[#EE2A54]/40',
        dot: 'bg-[#EE2A54]',
        text: s === 'urgent' ? 'Urgent' : 'Firm',
      };
    }
    if (s === 'firm') {
      return {
        badge: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
        dot: 'bg-amber-400',
        text: 'Firm',
      };
    }
    return {
      badge: 'bg-[#1CD4A3]/15 text-[#1CD4A3] border-[#1CD4A3]/40',
      dot: 'bg-[#1CD4A3]',
      text: 'Flexible',
    };
  };

  return (
    <div
      className={`liquid-glass rounded-2xl border p-5 sm:p-6 mb-6 shadow-xl transition-all ${
        isDark ? 'border-white/10 bg-[#131B4B]/80' : 'border-[#0E153A]/15 bg-white shadow-sm'
      }`}
    >
      {/* ── Header ── */}
      <div className={`flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EE2A54]/15 text-[#EE2A54] border border-[#EE2A54]/30 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
              Live Negotiation Telemetry
            </h3>
            <p className={`text-xs ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>
              Real-time round progress, active offers, and agreement range
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {zopa.isCalculable ? (
            <span
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border ${
                zopa.allOverlapping
                  ? 'bg-[#1CD4A3]/15 text-[#1CD4A3] border-[#1CD4A3]/40'
                  : 'bg-[#EE2A54]/15 text-[#EE2A54] border-[#EE2A54]/40'
              }`}
            >
              {zopa.allOverlapping ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{zopa.allOverlapping ? 'Match Zone Open' : 'Bounds Conflict'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#A3B3D9] border border-white/10">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Bounds Open</span>
            </span>
          )}
        </div>
      </div>

      {/* ── 4-Column Telemetry Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Round Progress */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'border-white/10 bg-[#0A102E]/70' : 'border-slate-200 bg-[#F4F7FC]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>
              Round
            </span>
            <Layers className="w-4 h-4 text-[#1CD4A3]" />
          </div>

          <div className="my-1">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-black font-mono ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                {currentRound}
              </span>
              <span className={`text-sm font-mono font-bold ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>
                / {maxRounds}
              </span>
            </div>
            <span className={`text-xs block mt-1 ${isDark ? 'text-[#A3B3D9]' : 'text-slate-600'}`}>
              {turns.length} {turns.length === 1 ? 'move' : 'moves'} played
            </span>
          </div>

          <div className="mt-3">
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1C2663]' : 'bg-slate-200'}`}>
              <div
                className="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-[#1CD4A3] to-[#EE2A54]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2 & 3: Agent Positions */}
        {agents.slice(0, 2).map((agent) => {
          const telemetry = latestByAgent[agent.id] || {};
          const lastOffer = telemetry.lastOffer;
          const stanceMeta = getStanceMeta(telemetry.stance);
          const hasOffer = lastOffer && Object.keys(lastOffer).length > 0;

          return (
            <div
              key={agent.id}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? 'border-white/10 bg-[#0A102E]/70' : 'border-slate-200 bg-[#F4F7FC]'
              }`}
            >
              <div>
                <div className={`flex items-center justify-between gap-2 mb-3 pb-2.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <AgentAvatar role={agent.role || agent.id} size="sm" className="w-7 h-7 rounded-lg shrink-0" />
                    <span className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-[#0E153A]'}`}>
                      {agent.name}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${stanceMeta.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${stanceMeta.dot} animate-pulse`} />
                    {stanceMeta.text}
                  </span>
                </div>

                {hasOffer ? (
                  <div className="space-y-1.5">
                    {Object.entries(lastOffer).map(([key, val]) => {
                      const itemUnit = zopa.unitsByItem[key] || '';
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-mono ${
                            isDark ? 'bg-[#131B4B] border-white/10 text-white' : 'bg-white border-slate-200 text-[#0E153A]'
                          }`}
                        >
                          <span className="capitalize font-sans text-[#A3B3D9]">{formatKey(key)}</span>
                          <span className="font-bold text-[#1CD4A3]">
                            {formatValue(val)} {itemUnit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`py-2 text-xs font-medium ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>
                    Waiting for opening move
                  </div>
                )}
              </div>

              {telemetry.lastTurn && (
                <div className={`mt-2.5 pt-2 border-t text-xs flex items-center justify-between ${isDark ? 'border-white/10 text-[#A3B3D9]' : 'border-slate-200 text-slate-600'}`}>
                  <span>Action:</span>
                  <span className="font-bold uppercase text-[#EE2A54]">
                    {telemetry.lastTurn.action || 'Counter'}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Metric 4: Agreement Zone Spread */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            isDark ? 'border-white/10 bg-[#0A102E]/70' : 'border-slate-200 bg-[#F4F7FC]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>
                Agreement Range
              </span>
              <Scale className="w-4 h-4 text-[#EE2A54]" />
            </div>

            {zopa.isCalculable ? (
              <div className="space-y-2">
                {zopa.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs ${
                      item.isCalculable && item.isOverlapping
                        ? isDark
                          ? 'bg-[#1CD4A3]/10 border-[#1CD4A3]/30'
                          : 'bg-emerald-50 border-emerald-200'
                        : isDark
                        ? 'bg-[#EE2A54]/10 border-[#EE2A54]/30'
                        : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="capitalize flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-[#EE2A54]" />
                        {formatKey(item.item)}
                      </span>
                      {item.isCalculable ? (
                        <span className={`font-mono ${item.isOverlapping ? 'text-[#1CD4A3]' : 'text-[#EE2A54]'}`}>
                          {item.isOverlapping ? `${formatValue(item.floor)}–${formatValue(item.ceiling)}` : 'No overlap'}
                        </span>
                      ) : (
                        <span className="text-[#A3B3D9]">{item.reason}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`py-2 text-xs ${isDark ? 'text-[#A3B3D9]' : 'text-slate-500'}`}>
                Open negotiation range
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
