import React, { useEffect, useState } from 'react';
import { Server, Cpu, Wallet, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { apiClient } from '../../api/client';
import type { NetworkInfoDto } from '../../api/client';

interface EnvironmentStatusProps {
  compact?: boolean;
}

export const EnvironmentStatus: React.FC<EnvironmentStatusProps> = ({ compact = false }) => {
  const { isConnected, account, isLocalNetwork, chainId } = useWallet();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [blockchainInfo, setBlockchainInfo] = useState<NetworkInfoDto | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    setIsRefreshing(true);
    try {
      await apiClient.getHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }

    try {
      const bc = await apiClient.getBlockchainStatus();
      setBlockchainInfo(bc);
    } catch {
      setBlockchainInfo(null);
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const blockchainOnline = Boolean(blockchainInfo?.rpcConnected ?? blockchainInfo?.rpcAvailable ?? false);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono">
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded ${
            backendOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}
          title="ChainShield Spring Boot REST Backend (8080)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
          API: {backendOnline ? 'CONNECTED' : 'OFFLINE'}
        </span>

        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded ${
            blockchainOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
          }`}
          title="Hardhat Localhost JSON-RPC EVM (8545)"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${blockchainOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
          EVM: {blockchainOnline ? '31337' : 'OFFLINE'}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-shield-900 border border-shield-750/80 shadow-md">
      <div className="flex items-center justify-between mb-3 border-b border-shield-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-shield-cyan animate-pulse"></span>
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
            Environment Status & Connectivity
          </h3>
        </div>
        <button
          onClick={checkStatus}
          disabled={isRefreshing}
          className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors text-xs flex items-center gap-1"
          title="Refresh connectivity status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-shield-cyan' : ''}`} />
          <span className="hidden sm:inline text-[11px] font-mono">Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Backend Connectivity */}
        <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-sans text-[11px] flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-shield-cyan" /> Backend
            </span>
            {backendOnline ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className="font-mono font-bold text-xs">
            {backendOnline === null ? (
              <span className="text-slate-500">CHECKING...</span>
            ) : backendOnline ? (
              <span className="text-emerald-400">CONNECTED (8080)</span>
            ) : (
              <span className="text-rose-400">OFFLINE</span>
            )}
          </div>
        </div>

        {/* Blockchain Node */}
        <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-sans text-[11px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-shield-cyan" /> Blockchain Node
            </span>
            {blockchainOnline ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className="font-mono font-bold text-xs truncate">
            {blockchainOnline ? (
              <span className="text-emerald-400">
                CONNECTED ({blockchainInfo?.currentBlock != null || blockchainInfo?.blockNumber != null ? `Block #${blockchainInfo?.currentBlock ?? blockchainInfo?.blockNumber}` : '8545'})
              </span>
            ) : (
              <span className="text-rose-400">OFFLINE</span>
            )}
          </div>
        </div>

        {/* Network & Chain ID */}
        <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-sans text-[11px]">Network ID</span>
            <span className="text-[10px] font-mono px-1.5 rounded bg-shield-800 text-slate-300">DEMO</span>
          </div>
          <div className="font-mono font-bold text-xs text-white">
            LOCAL DEV ({blockchainInfo?.chainId ?? chainId ?? 31337})
          </div>
        </div>

        {/* Wallet Status */}
        <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-sans text-[11px] flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-shield-cyan" /> Web3 Wallet
            </span>
            {isConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            )}
          </div>
          <div className="font-mono font-bold text-xs truncate">
            {isConnected ? (
              <span className={isLocalNetwork ? 'text-emerald-400' : 'text-amber-400'}>
                {account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : 'CONNECTED'}
              </span>
            ) : (
              <span className="text-slate-400">DISCONNECTED</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
