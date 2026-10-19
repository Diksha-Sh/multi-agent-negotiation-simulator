export function predictConflict(p1 = 'Collaborative', p2 = 'Collaborative') {
  const pair = [p1, p2].sort().join('+');

  switch (pair) {
    case 'Aggressive+Aggressive':
      return {
        severity: 'critical',
        deadlockProb: 86,
        dealProb: 14,
        badge: '⚠️ High Deadlock Hazard (86%)',
        status: 'Dual-Anchor Impasse',
        textColor: 'text-rose-400',
        borderColor: 'border-rose-500/40',
        bgColor: 'bg-rose-950/30',
        barColor: 'bg-rose-500',
        analysis:
          'Both agents deploy zero-sum initial anchors with low concession elasticity. High probability of multi-round impasse unless reservation overlap is broad.',
        advisory:
          'Consider shifting one agent to Collaborative or widening the reservation boundary.',
      };

    case 'Aggressive+Collaborative':
      return {
        severity: 'moderate',
        deadlockProb: 28,
        dealProb: 72,
        badge: '⚡ Hard Bargaining (72% Deal)',
        status: 'Asymmetric Value Capture',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/40',
        bgColor: 'bg-amber-950/30',
        barColor: 'bg-amber-500',
        analysis:
          'Collaborative agent absorbs early pressure to explore trade-offs while Aggressive agent anchors firmly. Settlement probable, but surplus skews to the anchor.',
        advisory:
          'Watch concession reciprocity in round-by-round logs to evaluate fairness.',
      };

    case 'Aggressive+Risk-Averse':
      return {
        severity: 'warning',
        deadlockProb: 22,
        dealProb: 78,
        badge: '🎯 Exploitative Asymmetry (78% Deal)',
        status: 'Early Anchor Concession',
        textColor: 'text-orange-400',
        borderColor: 'border-orange-500/40',
        bgColor: 'bg-orange-950/30',
        barColor: 'bg-orange-500',
        analysis:
          'The Risk-Averse agent concedes rapidly to eliminate walkaway risk, allowing the Aggressive agent to extract maximum surplus near the floor/ceiling.',
        advisory:
          'Verify that the Risk-Averse agent still strictly respects its absolute reservation limit.',
      };

    case 'Collaborative+Collaborative':
      return {
        severity: 'optimal',
        deadlockProb: 5,
        dealProb: 95,
        badge: '✨ Pareto-Optimal (95% Deal)',
        status: 'Win-Win Convergence',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/40',
        bgColor: 'bg-emerald-950/30',
        barColor: 'bg-emerald-500',
        analysis:
          'Maximum cooperative synergy. Both agents exchange concessions reciprocally, converging toward the Nash Bargaining solution within 3-5 rounds.',
        advisory:
          'Ideal benchmark for cooperative multi-issue integrative bargaining.',
      };

    case 'Collaborative+Risk-Averse':
      return {
        severity: 'harmonic',
        deadlockProb: 8,
        dealProb: 92,
        badge: '🌱 High Harmony (92% Deal)',
        status: 'Fast Constructive Consensus',
        textColor: 'text-teal-400',
        borderColor: 'border-teal-500/40',
        bgColor: 'bg-teal-950/30',
        barColor: 'bg-teal-500',
        analysis:
          'Safe and efficient convergence. Risk-Averse agent ensures rapid compromise, while Collaborative agent prevents unbalanced outcomes.',
        advisory:
          'Fast convergence anticipated with minimal round consumption.',
      };

    case 'Risk-Averse+Risk-Averse':
    default:
      return {
        severity: 'safe',
        deadlockProb: 12,
        dealProb: 88,
        badge: '🛡️ Conservative Closing (88% Deal)',
        status: 'Risk-Minimizing Agreement',
        textColor: 'text-sky-400',
        borderColor: 'border-sky-500/40',
        bgColor: 'bg-sky-950/30',
        barColor: 'bg-sky-500',
        analysis:
          'Both agents prioritize agreement certainty over surplus optimization. Settle quickly within interior margins to eliminate walkaway hazards.',
        advisory:
          'Reaches closure swiftly, though extra integrative surplus may remain unharvested.',
      };
  }
}

export function ConflictPredictorBanner({ agent1Name, agent1Personality, agent2Name, agent2Personality }) {
  const prediction = predictConflict(agent1Personality, agent2Personality);

  return (
    <div className={`rounded-xl border p-4 transition-all duration-300 ${prediction.bgColor} ${prediction.borderColor}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🔮</span>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pre-Flight Game-Theoretic Forecast
            </span>
            <span className={`text-xs font-extrabold ${prediction.textColor}`}>
              {prediction.status} ({agent1Name}: {agent1Personality} vs {agent2Name}: {agent2Personality})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${prediction.borderColor} ${prediction.textColor} bg-slate-950/60`}>
            {prediction.badge}
          </span>
        </div>
      </div>

      {/* Progress Bar of Deadlock vs Deal Probability */}
      <div className="space-y-1 mb-2.5">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
          <span>Deadlock Risk: <strong className={prediction.textColor}>{prediction.deadlockProb}%</strong></span>
          <span>Deal Probability: <strong className="text-emerald-400">{prediction.dealProb}%</strong></span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden flex">
          <div
            style={{ width: `${prediction.deadlockProb}%` }}
            className={`h-full ${prediction.barColor} transition-all duration-500`}
          />
          <div
            style={{ width: `${prediction.dealProb}%` }}
            className="h-full bg-emerald-500/80 transition-all duration-500"
          />
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        {prediction.analysis}
      </p>
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
        <span className="font-semibold text-indigo-400">💡 Advisory:</span>
        <span>{prediction.advisory}</span>
      </div>
    </div>
  );
}

