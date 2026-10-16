import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Lock,
  Info,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import type { RiskLevel } from '../common/RiskBadge';

interface SecurityReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSign: () => void;
  payload: {
    from: string;
    to: string;
    valueWei: string;
    data: string;
    friendlyAction?: string;
    targetContractName?: string;
  };
  simulationResult: any;
  isSigning: boolean;
  signingError: string | null;
}

export const SecurityReviewModal: React.FC<SecurityReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmSign,
  payload,
  simulationResult,
  isSigning,
  signingError
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  const severity: RiskLevel = simulationResult?.riskAssessment?.severity || 'LOW';
  const score: number = simulationResult?.riskAssessment?.score ?? 0;
  const isHighRisk = severity === 'HIGH' || severity === 'CRITICAL';
  const isReverted = simulationResult?.simulationStatus === 'REVERTED';

  const decodedCall = simulationResult?.decodedCall;
  const indicators = simulationResult?.riskAssessment?.indicators || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-shield-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-shield-900 border border-shield-700 shadow-2xl p-6 space-y-4 overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-shield-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-shield-800 border border-shield-700 text-shield-cyan">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                TRANSACTION SECURITY REVIEW
              </h2>
              <p className="text-xs text-slate-400">
                Pre-Execution Explainable Audit & Risk Breakdown before Browser Wallet Signing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSigning}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Explicit Pre-Sign vs Post-Sign Distinction Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-0.5">
            <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PRE-SIGN SIMULATION
            </span>
            <p className="text-[11px] text-emerald-200/90 leading-relaxed font-sans">
              No blockchain state was changed. This dry-run was executed in an isolated local EVM sandbox via <code className="font-mono">eth_call</code>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-shield-950 border border-shield-800 text-slate-300 space-y-0.5">
            <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-200">
              <FileCheck2 className="w-3.5 h-3.5 text-shield-cyan" /> POST-SIGN TRANSACTION
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              If approved, your browser wallet will prompt you for explicit signature to commit permanent state changes on-chain.
            </p>
          </div>
        </div>

        {/* 2. Structured Parameters Grid */}
        <div className="space-y-1.5 text-xs font-mono bg-shield-950 p-4 rounded-xl border border-shield-800">
          <div className="flex justify-between items-center py-1 border-b border-shield-850">
            <span className="text-slate-400 font-sans">NETWORK:</span>
            <span className="text-emerald-400 font-semibold font-mono">LOCAL DEMO NETWORK (Chain ID: 31337)</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-shield-850">
            <span className="text-slate-400 font-sans">FROM (Sender):</span>
            <span className="text-slate-200 select-all truncate max-w-sm">{payload.from}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-shield-850">
            <span className="text-slate-400 font-sans">TO (Target):</span>
            <span className="text-slate-200 select-all truncate max-w-sm">{payload.to}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-shield-850">
            <span className="text-slate-400 font-sans">FUNCTION:</span>
            <span className="text-emerald-400 font-semibold">{decodedCall?.functionSignature || 'Contract Call'}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-shield-850">
            <span className="text-slate-400 font-sans">VALUE (ETH):</span>
            <span className="text-slate-200 font-semibold">{payload.valueWei === '0' ? '0 ETH' : `${payload.valueWei} Wei`}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-shield-850">
            <span className="text-slate-400 font-sans">TOKEN:</span>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-shield-cyan font-semibold">
                {payload.targetContractName || 'ShieldToken (SHLD)'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                LOCAL DEMO TOKEN
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-shield-850">
            <span className="text-slate-400 font-sans">SIMULATION STATUS:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                isReverted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {simulationResult?.simulationStatus || 'SUCCESS'}
            </span>
          </div>

          <div className="py-1">
            <span className="text-slate-400 font-sans block mb-1">EXPECTED STATE EFFECTS:</span>
            <div className="bg-shield-900/90 p-2.5 rounded text-[11px] text-slate-300 font-sans space-y-1.5">
              <div>• {decodedCall?.formattedExplanation || payload.friendlyAction || 'State execution dry-run'}</div>
              {simulationResult?.stateEffects?.balanceDeltas && simulationResult.stateEffects.balanceDeltas.length > 0 && (
                <div className="space-y-1 pt-1 font-mono text-xs">
                  {simulationResult.stateEffects.balanceDeltas.map((d: any, i: number) => {
                    const isPositive = d.formattedDelta?.startsWith('+') || (!d.formattedDelta?.startsWith('-') && d.delta !== '0');
                    const isNegative = d.formattedDelta?.startsWith('-');
                    return (
                      <div key={i} className={isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-300'}>
                        • {isPositive ? 'TO (Recipient)' : isNegative ? 'FROM (Sender)' : 'SELF'}: {d.formattedDelta} ({d.accountAddress.substring(0, 8)}...{d.accountAddress.substring(38)})
                      </div>
                    );
                  })}
                </div>
              )}
              {simulationResult?.stateEffects?.allowanceDeltas && simulationResult.stateEffects.allowanceDeltas.length > 0 && (
                <div className="text-amber-400">
                  • Allowance change: {simulationResult.stateEffects.allowanceDeltas[0].isUnlimited ? 'UNLIMITED (MAX_UINT256)' : simulationResult.stateEffects.allowanceDeltas[0].projectedAllowance}
                </div>
              )}
              {simulationResult?.stateEffects?.projectedEvents && simulationResult.stateEffects.projectedEvents.length > 0 && (
                <div className="text-slate-400 text-[10px] font-mono pt-0.5">
                  • Event Log: {simulationResult.stateEffects.projectedEvents.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Local Token UX Notice */}
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 leading-normal flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Token Asset Identity:</strong>{' '}
              <span className="font-semibold text-amber-100">
                {payload.targetContractName || 'ShieldToken (SHLD)'}
              </span>{' '}
              <span className="font-mono text-[9px] px-1 py-0.5 bg-amber-500/30 rounded text-amber-200 font-bold">
                LOCAL DEMO TOKEN
              </span>
              . MetaMask may display &ldquo;Unknown&rdquo; because custom local EVM tokens are not listed in public web registries. ChainShield pre-sign analysis confirms this asset is the verified local demo token.
            </div>
          </div>
        </div>

        {/* 3. Risk Assessment & Contributing Indicators */}
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            isHighRisk || isReverted
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
              : 'bg-shield-850 border-shield-750 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiskBadge level={severity} score={score} />
              <span className="text-xs font-bold uppercase tracking-wider font-mono">
                {isHighRisk ? 'Caution: Elevated Threat Level' : 'Low Threat Indicators'}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 font-bold">
              RISK SCORE: {score}/100
            </span>
          </div>

          {/* Indicators List */}
          {indicators.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400 block">
                Contributing Indicators ({indicators.length}):
              </span>
              {indicators.map((ind: any, i: number) => (
                <div key={i} className="p-2 rounded bg-shield-950/80 border border-shield-800 text-xs space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-shield-cyan font-bold">{ind.code}: {ind.title}</span>
                    <span className="text-[10px] font-mono text-rose-400">+{ind.appliedWeight ?? 0} pts</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">{ind.contextExplanation || ind.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {/* Explanation */}
          <div className="pt-1">
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-slate-400 block">
              EXPLANATION:
            </span>
            <p className="text-xs text-slate-200 font-sans leading-relaxed mt-0.5">
              {simulationResult?.humanExplanation ||
                'Simulation dry-run inspected the candidate transaction payload against local state and threat registers.'}
            </p>
          </div>
        </div>

        {/* 4. Limitations & Prototype Disclaimer */}
        <div className="p-2.5 rounded-lg bg-shield-950/90 border border-shield-800 text-[10px] text-slate-500 leading-relaxed space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-slate-400">
            <Info className="w-3 h-3 text-shield-cyan" />
            <span>LIMITATIONS:</span>
          </div>
          <p>
            ChainShield performs heuristic pre-execution simulation on local EVM state. A low risk score does not guarantee absolute safety or absence of zero-day exploits, nor does an elevated score prove malicious intent.
          </p>
        </div>

        {/* 5. Explicit Acknowledgment Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300 font-sans">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={isReverted}
              className="mt-0.5 w-4 h-4 rounded border-shield-700 bg-shield-950 text-shield-cyan focus:ring-shield-cyan"
            />
            <span className={isReverted ? 'opacity-50' : ''}>
              I have thoroughly reviewed the simulation facts and understand that proceeding will submit this transaction to my connected wallet for explicit on-chain signing.
            </span>
          </label>
        </div>

        {/* Error during signing */}
        {signingError && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{signingError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-shield-800">
          <button
            onClick={onClose}
            disabled={isSigning}
            className="px-4 py-2 rounded-xl bg-shield-800 hover:bg-shield-750 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={onConfirmSign}
            disabled={!acknowledged || isSigning || isReverted}
            className="px-5 py-2.5 rounded-xl bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-shield-cyan/20"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isSigning ? 'Opening Wallet Prompt...' : isReverted ? 'Signing Disabled (Tx Reverts)' : 'Approve & Open Wallet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
