import React from 'react';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  className?: string;
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, className = '', showIcon = true }) => {
  const getBadgeStyle = () => {
    switch (level) {
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700/30 text-slate-400 border-slate-700';
    }
  };

  const getDotStyle = () => {
    switch (level) {
      case 'LOW':
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'MEDIUM':
        return 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      case 'HIGH':
        return 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]';
      case 'CRITICAL':
        return 'bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()} ${className}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full ${getDotStyle()}`} />}
      <span>{level}</span>
      {score !== undefined && (
        <span className="opacity-80 font-mono text-[11px]">({score}/100)</span>
      )}
    </span>
  );
};
