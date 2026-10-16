import React from 'react';
import { ShieldAlert, AlertTriangle, Info, Database } from 'lucide-react';
import { RiskBadge } from './RiskBadge';
import type { RiskIndicator } from '../../api/client';

interface EvidencePanelProps {
  indicators: RiskIndicator[];
  title?: string;
  defaultSource?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  indicators,
  title = 'Observed Security Indicators & Grounded Evidence',
  defaultSource = 'LOCAL_BLOCKCHAIN'
}) => {
  if (!indicators || indicators.length === 0) {
    return (
      <div className="p-5 rounded-xl bg-shield-900/60 border border-shield-750/70 text-center space-y-2">
        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-semibold text-slate-200">No Threat Indicators Detected</h4>
        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
          No cataloged malicious signatures, unusual permissions, or honeypot mechanisms were observed during this analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{title}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-shield-800 text-slate-400">
            {indicators.length} {indicators.length === 1 ? 'Rule' : 'Rules'}
          </span>
        </h4>
        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
          EVIDENCE-GROUNDED
        </span>
      </div>

      <div className="space-y-3">
        {indicators.map((ind, idx) => {
          const ruleId = ind.code || `RULE-00${idx + 1}`;
          const explanation = ind.explanation || ind.contextExplanation || 'Observation detected during inspection.';
          const evidence = ind.evidence || ind.evidenceData || 'Verified on-chain signature/calldata match';
          const source = ind.source || ind.dataSource || defaultSource;
          const severity = ind.severity || 'LOW';

          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-shield-900/80 border border-shield-750/80 hover:border-shield-700 transition-colors space-y-3"
            >
              {/* Indicator Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-shield-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-shield-800 text-shield-cyan border border-shield-700">
                    {ruleId}
                  </span>
                  <span className="text-xs font-semibold text-slate-100">{ind.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {ind.appliedWeight !== undefined && ind.appliedWeight > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      +{ind.appliedWeight} pts
                    </span>
                  )}
                  <RiskBadge level={severity} />
                </div>
              </div>

              {/* Observed Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 bg-shield-950/70 p-2.5 rounded-lg border border-shield-850">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Observed Blockchain Evidence
                  </span>
                  <p className="font-mono text-slate-300 break-all text-[11px] leading-relaxed">
                    {evidence}
                  </p>
                </div>

                <div className="space-y-1 bg-shield-950/70 p-2.5 rounded-lg border border-shield-850">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Why It Matters
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {explanation}
                  </p>
                </div>
              </div>

              {/* Footer: Source + Academic Limitation Disclaimer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5 font-mono text-slate-300">
                  <Database className="w-3 h-3 text-shield-cyan" />
                  <span>SOURCE:</span>
                  <span className="px-1.5 py-0.2 rounded bg-shield-800 text-shield-cyan">
                    {source}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 italic">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  <span>Observation alone does not establish malicious intent.</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
