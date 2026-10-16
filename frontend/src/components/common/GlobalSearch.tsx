import React, { useState } from 'react';
import { Search, Wallet, FileCode, Network, ArrowRightLeft, ShieldAlert, X, AlertCircle, HelpCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { AddressSummaryResponse } from '../../api/client';
import { RiskBadge } from './RiskBadge';
import type { PageRoute } from '../layout/Sidebar';

interface GlobalSearchProps {
  onNavigate: (page: PageRoute, params?: Record<string, any>) => void;
  className?: string;
  placeholder?: string;
  showPresets?: boolean;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onNavigate,
  className = '',
  placeholder = 'Enter EVM address (0x...) to classify and analyze...',
  showPresets = true
}) => {
  const [addressInput, setAddressInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [classificationResult, setClassificationResult] = useState<AddressSummaryResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const demoPresets = [
    { label: 'Wallet A (EOA)', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
    { label: 'SafeVault (Contract)', address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0' },
    { label: 'DangerousSpender (Exploit)', address: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' },
    { label: 'HoneypotToken (TRAP)', address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' },
  ];

  const validateAddress = (addr: string): boolean => {
    const trimmed = addr.trim();
    if (!trimmed) {
      setValidationError('Please enter an EVM address.');
      return false;
    }
    if (!trimmed.startsWith('0x')) {
      setValidationError('Address must start with 0x.');
      return false;
    }
    if (trimmed.length !== 42) {
      setValidationError(`Address must be exactly 42 characters (currently ${trimmed.length}).`);
      return false;
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      setValidationError('Address contains invalid hexadecimal characters.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSearch = async (addressToSearch?: string) => {
    const target = addressToSearch || addressInput;
    if (!validateAddress(target)) return;

    setIsSearching(true);
    setSearchError(null);
    setClassificationResult(null);

    try {
      const summary = await apiClient.getAddressSummary(target.trim());
      setClassificationResult(summary);
    } catch (err: any) {
      setSearchError(err?.message || 'Failed to classify address on local network.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => {
              setAddressInput(e.target.value);
              if (validationError) validateAddress(e.target.value);
              if (classificationResult) setClassificationResult(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-shield-950 border border-shield-750 focus:border-shield-cyan focus:ring-1 focus:ring-shield-cyan rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-100 font-mono placeholder:text-slate-500 placeholder:font-sans transition-all outline-none"
            aria-label="Global Address Search"
          />

          {addressInput && (
            <button
              onClick={() => {
                setAddressInput('');
                setClassificationResult(null);
                setValidationError(null);
                setSearchError(null);
              }}
              className="absolute right-20 text-slate-500 hover:text-slate-300 p-1 rounded"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => handleSearch()}
            disabled={isSearching || !addressInput.trim()}
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isSearching ? 'Scanning...' : 'Inspect'}
          </button>
        </div>

        {validationError && (
          <div className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1.5 font-sans">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {searchError && (
          <div className="text-[11px] text-rose-400 mt-1.5 flex items-center gap-1.5 font-sans">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {/* Preset Pills */}
      {showPresets && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 text-[10px] uppercase font-mono mr-1">Demo Fixtures:</span>
          {demoPresets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setAddressInput(preset.address);
                handleSearch(preset.address);
              }}
              className="px-2 py-0.5 rounded bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-300 text-[10px] font-mono transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Classification Card */}
      {classificationResult && (
        <div className="p-4 rounded-xl bg-shield-900 border border-shield-700 shadow-xl space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-shield-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                  classificationResult.accountType === 'CONTRACT'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : classificationResult.accountType === 'EOA'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {classificationResult.accountType === 'CONTRACT' ? 'Smart Contract' : classificationResult.accountType === 'EOA' ? 'Wallet / EOA' : 'Unknown Entity'}
              </span>
              <span className="text-xs font-mono text-slate-200 select-all font-semibold">
                {classificationResult.address}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <RiskBadge level={classificationResult.riskSeverity} score={classificationResult.riskScore} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-shield-950/70 border border-shield-850">
              <span className="text-[10px] text-slate-400 block font-sans">Native Balance</span>
              <span className="font-mono text-slate-200 font-semibold">{classificationResult.nativeBalanceEth}</span>
            </div>
            <div className="p-2 rounded bg-shield-950/70 border border-shield-850">
              <span className="text-[10px] text-slate-400 block font-sans">Total Transactions</span>
              <span className="font-mono text-slate-200 font-semibold">{classificationResult.transactionCount}</span>
            </div>
            <div className="p-2 rounded bg-shield-950/70 border border-shield-850">
              <span className="text-[10px] text-slate-400 block font-sans">Contract Calls</span>
              <span className="font-mono text-slate-200 font-semibold">{classificationResult.contractInteractionCount}</span>
            </div>
            <div className="p-2 rounded bg-shield-950/70 border border-shield-850">
              <span className="text-[10px] text-slate-400 block font-sans">Counterparties</span>
              <span className="font-mono text-slate-200 font-semibold">{classificationResult.uniqueCounterpartiesCount}</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {classificationResult.summary}
          </p>

          {/* Contextual Action Buttons */}
          <div className="pt-2 border-t border-shield-800 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Available Actions:</span>

            {/* Unified Investigation View button */}
            <button
              onClick={() => onNavigate('investigation', { address: classificationResult.address })}
              className="px-3 py-1.5 rounded-lg bg-shield-indigo hover:bg-shield-indigo/90 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Full Investigation</span>
            </button>

            {classificationResult.accountType === 'EOA' && (
              <>
                <button
                  onClick={() => onNavigate('wallet-analyzer', { address: classificationResult.address })}
                  className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-shield-cyan" />
                  <span>Analyze Wallet</span>
                </button>
                <button
                  onClick={() => onNavigate('transaction-graph', { centerAddress: classificationResult.address })}
                  className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Network className="w-3.5 h-3.5 text-purple-400" />
                  <span>Explore Graph</span>
                </button>
              </>
            )}

            {classificationResult.accountType === 'CONTRACT' && (
              <>
                <button
                  onClick={() => onNavigate('contract-analyzer', { address: classificationResult.address })}
                  className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Analyze Bytecode</span>
                </button>
                <button
                  onClick={() => onNavigate('transaction-analyzer', { to: classificationResult.address })}
                  className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prepare Tx</span>
                </button>
                <button
                  onClick={() => onNavigate('transaction-graph', { centerAddress: classificationResult.address })}
                  className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Network className="w-3.5 h-3.5 text-purple-400" />
                  <span>Explore Graph</span>
                </button>
              </>
            )}

            {classificationResult.accountType === 'UNKNOWN' && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>No contract code deployed at this address. You may still analyze as wallet.</span>
                <button
                  onClick={() => onNavigate('wallet-analyzer', { address: classificationResult.address })}
                  className="text-shield-cyan hover:underline font-medium"
                >
                  Analyze as Wallet →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
