import React, { useState } from 'react';
import { CheckCircle2, XCircle, Copy, Check, Layers, Fuel } from 'lucide-react';
import type { WalletReceipt } from '../../context/WalletContext';

interface PostSignReceiptViewProps {
  receipt: WalletReceipt;
  from: string;
  to: string;
  friendlyAction?: string;
  onDismiss: () => void;
}

export const PostSignReceiptView: React.FC<PostSignReceiptViewProps> = ({
  receipt,
  from,
  to,
  friendlyAction,
  onDismiss
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(receipt.transactionHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="p-6 rounded-2xl bg-shield-900 border-2 border-emerald-500/40 shadow-2xl space-y-5 animate-fade-in">
      {/* Top Banner Clearly Distinguishing PRE-SIGN from POST-SIGN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-shield-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            {receipt.status ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6 text-rose-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                POST-SIGN ON-CHAIN EXECUTION RESULT
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Chain ID: 31337</span>
            </div>
            <h3 className="text-base font-bold text-slate-100 tracking-tight mt-0.5">
              {receipt.status ? 'Transaction Successfully Mined on Local Hardhat' : 'Transaction Mined with Execution Revert'}
            </h3>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-xs text-slate-400 hover:text-slate-200 bg-shield-800 hover:bg-shield-750 px-3 py-1.5 rounded-lg border border-shield-700 transition-colors"
        >
          Dismiss Receipt
        </button>
      </div>

      {/* Critical Educational Distinction Banner */}
      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200/90 leading-relaxed">
        <span className="font-bold text-emerald-400">STATE MUTATION CONFIRMED: </span>
        Unlike the read-only pre-execution simulation, this transaction was signed via your browser wallet and mined on the local Hardhat node. Blockchain state has officially been altered.
      </div>

      {/* Receipt Data Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        {/* Transaction Hash */}
        <div className="md:col-span-2 p-3 rounded-xl bg-shield-950 border border-shield-800 space-y-1">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans">
            <span>Transaction Hash</span>
            <button
              onClick={copyHash}
              className="text-slate-400 hover:text-shield-cyan flex items-center gap-1 font-mono"
            >
              {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedHash ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="text-slate-200 font-semibold break-all text-[11px]">
            {receipt.transactionHash}
          </div>
        </div>

        {/* Block Number */}
        <div className="p-3 rounded-xl bg-shield-950 border border-shield-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" /> Block Number
          </span>
          <div className="text-emerald-400 font-bold text-sm">
            #{receipt.blockNumber}
          </div>
        </div>

        {/* Gas Used */}
        <div className="p-3 rounded-xl bg-shield-950 border border-shield-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
            <Fuel className="w-3 h-3 text-slate-500" /> Gas Consumed
          </span>
          <div className="text-slate-200 font-bold text-sm">
            {parseInt(receipt.gasUsed).toLocaleString()} units
          </div>
        </div>

        {/* From Address */}
        <div className="p-3 rounded-xl bg-shield-950 border border-shield-800 space-y-1 truncate">
          <span className="text-[10px] text-slate-400 font-sans">Sender (From)</span>
          <div className="text-slate-300 text-[11px] truncate">{from}</div>
        </div>

        {/* To Address */}
        <div className="p-3 rounded-xl bg-shield-950 border border-shield-800 space-y-1 truncate">
          <span className="text-[10px] text-slate-400 font-sans">Recipient / Target (To)</span>
          <div className="text-slate-300 text-[11px] truncate">{to}</div>
        </div>
      </div>

      {/* Emitted Events & Friendly summary */}
      {friendlyAction && (
        <div className="p-3 rounded-xl bg-shield-950 border border-shield-800 flex items-center justify-between text-xs font-sans">
          <span className="text-slate-400">Action Committed:</span>
          <span className="text-slate-200 font-semibold">{friendlyAction}</span>
        </div>
      )}
    </div>
  );
};
