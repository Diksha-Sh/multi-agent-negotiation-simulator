/* eslint-disable react-refresh/only-export-components */
import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

// Quantitative behavioral traits (0-100)
export const PERSONALITY_TRAITS = {
  Aggressive: {
    traits: [
      { key: 'drive', label: 'Goal Drive', value: 95 },
      { key: 'risk', label: 'Risk Tolerance', value: 90 },
      { key: 'speed', label: 'Concession Speed', value: 20 },
      { key: 'flex', label: 'Flexibility', value: 25 },
      { key: 'empathy', label: 'Win-Win Empathy', value: 15 },
    ],
    color: '#f43f5e',
    fillColor: 'rgba(244, 63, 94, 0.25)',
    glow: 'rgba(244, 63, 94, 0.6)',
    badge: 'Aggressive Profile',
    styleTag: 'High Anchor • Slow Concessions',
  },
  Collaborative: {
    traits: [
      { key: 'drive', label: 'Goal Drive', value: 70 },
      { key: 'risk', label: 'Risk Tolerance', value: 50 },
      { key: 'speed', label: 'Concession Speed', value: 65 },
      { key: 'flex', label: 'Flexibility', value: 85 },
      { key: 'empathy', label: 'Win-Win Empathy', value: 90 },
    ],
    color: '#10b981',
    fillColor: 'rgba(16, 185, 129, 0.25)',
    glow: 'rgba(16, 185, 129, 0.6)',
    badge: 'Collaborative Profile',
    styleTag: 'Reciprocal Trades • Value Expansion',
  },
  'Risk-Averse': {
    traits: [
      { key: 'drive', label: 'Goal Drive', value: 40 },
      { key: 'risk', label: 'Risk Tolerance', value: 15 },
      { key: 'speed', label: 'Concession Speed', value: 90 },
      { key: 'flex', label: 'Flexibility', value: 75 },
      { key: 'empathy', label: 'Win-Win Empathy', value: 60 },
    ],
    color: '#38bdf8',
    fillColor: 'rgba(56, 189, 248, 0.25)',
    glow: 'rgba(56, 189, 248, 0.6)',
    badge: 'Risk-Averse Profile',
    styleTag: 'Impasse Avoidance • High Certainty',
  },
};

export function PersonalityRadar({ personality = 'Collaborative', size = 240 }) {
  const { isDark } = useTheme();
  const profile = PERSONALITY_TRAITS[personality] || PERSONALITY_TRAITS.Collaborative;
  const traits = profile.traits;
  const total = traits.length;

  const center = size / 2;
  const radius = size * 0.36;

  // Compute pentagon coordinates for background rings and data polygon
  const { rings, axisLines, polygonPoints, vertexCoords } = useMemo(() => {
    const ringFractions = [0.25, 0.5, 0.75, 1.0];
    const ringPolygons = ringFractions.map((fraction) => {
      const pts = [];
      for (let i = 0; i < total; i++) {
        const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
        const r = radius * fraction;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      return pts.join(' ');
    });

    const axes = [];
    const vCoords = [];
    const dataPts = [];

    for (let i = 0; i < total; i++) {
      const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
      const xOuter = center + radius * Math.cos(angle);
      const yOuter = center + radius * Math.sin(angle);
      axes.push({ x1: center, y1: center, x2: xOuter, y2: yOuter });

      // Label anchor offset
      const labelDistance = radius * 1.25;
      const xLabel = center + labelDistance * Math.cos(angle);
      const yLabel = center + labelDistance * Math.sin(angle);

      // Trait value point
      const traitVal = traits[i].value / 100;
      const xVal = center + radius * traitVal * Math.cos(angle);
      const yVal = center + radius * traitVal * Math.sin(angle);

      dataPts.push(`${xVal.toFixed(1)},${yVal.toFixed(1)}`);
      vCoords.push({
        x: xVal,
        y: yVal,
        xLabel,
        yLabel,
        trait: traits[i],
        angle,
      });
    }

    return {
      rings: ringPolygons,
      axisLines: axes,
      polygonPoints: dataPts.join(' '),
      vertexCoords: vCoords,
    };
  }, [center, radius, total, traits]);

  return (
    <div className={`flex flex-col items-center rounded-2xl p-4 shadow-inner border ${
      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center justify-between w-full mb-1">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Cognitive Radar
        </span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm"
          style={{
            borderColor: `${profile.color}60`,
            color: profile.color,
            backgroundColor: `${profile.color}15`,
          }}
        >
          {profile.badge}
        </span>
      </div>

      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <defs>
            <filter id={`radar-glow-${personality}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={profile.glow} />
            </filter>
          </defs>

          {/* Concentric Guide Pentagon Rings */}
          {rings.map((points, idx) => (
            <polygon
              key={idx}
              points={points}
              fill="none"
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth={idx === rings.length - 1 ? '1.2' : '0.8'}
              strokeDasharray={idx < rings.length - 1 ? '2 2' : 'none'}
              opacity={0.7}
            />
          ))}

          {/* Radial Axes */}
          {axisLines.map((axis, idx) => (
            <line
              key={idx}
              x1={axis.x1}
              y1={axis.y1}
              x2={axis.x2}
              y2={axis.y2}
              stroke={isDark ? '#334155' : '#cbd5e1'}
              strokeWidth="0.8"
              opacity={0.6}
            />
          ))}

          {/* Filled Data Polygon */}
          <polygon
            points={polygonPoints}
            fill={profile.fillColor}
            stroke={profile.color}
            strokeWidth="2.2"
            filter={`url(#radar-glow-${personality})`}
            className="transition-all duration-500 ease-out"
          />

          {/* Glowing Vertex Dots & Labels */}
          {vertexCoords.map((v, idx) => (
            <g key={idx}>
              <circle
                cx={v.x}
                cy={v.y}
                r="3.5"
                fill={profile.color}
                stroke={isDark ? '#0f172a' : '#ffffff'}
                strokeWidth="1.5"
                className="transition-all duration-500 ease-out"
              />
              {/* Trait Label */}
              <text
                x={v.xLabel}
                y={v.yLabel + 3}
                textAnchor="middle"
                className={`text-[9px] font-semibold select-none pointer-events-none ${
                  isDark ? 'fill-slate-400' : 'fill-slate-600'
                }`}
              >
                {v.trait.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Trait Metric Grid */}
      <div className={`grid grid-cols-5 gap-1 w-full mt-3 pt-2.5 border-t text-center ${
        isDark ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        {traits.map((t) => (
          <div key={t.key} className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 truncate w-full">{t.label.split(' ')[0]}</span>
            <span
              className="text-xs font-black tracking-tight"
              style={{ color: profile.color }}
            >
              {t.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

