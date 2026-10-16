import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import type { RiskLevel } from './RiskBadge';

interface RiskScoreCardProps {
  score: number;
  severity: RiskLevel;
  summary: string;
  disclaimer?: string;
  indicatorsCount?: number;
  recommendations?: string[];
  limitations?: string;
}

export const RiskScoreCard: React.FC<RiskScoreCardProps> = ({
  score,
  severity,
  summary,
  disclaimer = 'PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety.',
  indicatorsCount = 0,
  recommendations = [],
  limitations
}) => {
  const getScoreColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500';
      case 'LOW':
      default:
        return 'text-emerald-400 bg-emerald-500';
    }
  };

  const isHighRisk = severity === 'HIGH' || severity === 'CRITICAL';

  return (
    <div className="p-5 rounded-2xl bg-shield-900 border border-shield-750/90 shadow-xl space-y-4">
      {/* Top Header: Score & Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              isHighRisk
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isHighRisk ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-white">{score}</span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
              <RiskBadge level={severity} />
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {indicatorsCount} contributing security {indicatorsCount === 1 ? 'indicator' : 'indicators'}
            </p>
          </div>
        </div>

        {/* Visual Score Bar */}
        <div className="w-full sm:w-48 space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Score Gauge</span>
            <span className={getScoreColor().split(' ')[0]}>{score}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-shield-950 overflow-hidden border border-shield-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getScoreColor().split(' ')[1]}`}
              style={{ width: `${Math.min(100, Math.max(4, score))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Summary Explanation */}
      <div className="p-3.5 rounded-xl bg-shield-950/80 border border-shield-850 space-y-1">
        <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400 block">
          Assessment Explanation
        </span>
        <p className="text-xs text-slate-200 leading-relaxed font-sans">{summary}</p>
      </div>

      {/* Recommendations if present */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400 block">
            Recommended Actionable Guidance
          </span>
          <ul className="space-y-1">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-shield-cyan text-[10px] mt-0.5 font-mono">▸</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Limitations note */}
      {limitations && (
        <div className="p-2.5 rounded-lg bg-shield-850/60 border border-shield-750/50 text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300 block mb-0.5">Analysis Limitations:</span>
          {limitations}
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="pt-2 border-t border-shield-800/80 text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 flex-shrink-0 mt-0.5" />
        <span>{disclaimer}</span>
      </div>
    </div>
  );
};
