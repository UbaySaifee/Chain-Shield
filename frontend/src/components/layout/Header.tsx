import React, { useState } from 'react';
import { Wallet, LogOut, Copy, Check, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

interface HeaderProps {
  activePageTitle: string;
  onNavigate?: (page: any, params?: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ activePageTitle, onNavigate }) => {
  const {
    account,
    chainId,
    balance,
    isConnecting,
    isConnected,
    isLocalNetwork,
    isSimulatorMode,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    switchOrAddHardhatNetwork,
    refreshBalance,
    enableSimulatorMode,
    error
  } = useWallet();

  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCopy = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="h-16 border-b border-shield-750/70 bg-shield-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-100 tracking-tight">{activePageTitle}</h1>

        {/* Dynamic Network Status Badge */}
        {isConnected ? (
          isLocalNetwork ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              LOCAL DEMO NETWORK (31337)
            </span>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-rose-500/15 text-rose-400 border border-rose-500/40">
                <AlertTriangle className="w-3.5 h-3.5" />
                WRONG NETWORK ({chainId ? `Chain ${chainId}` : 'Unknown'})
              </span>
              <button
                onClick={switchOrAddHardhatNetwork}
                className="px-2 py-0.5 text-[11px] bg-rose-600 hover:bg-rose-500 text-white font-medium rounded transition-colors"
                title="Switch MetaMask to local Hardhat node (31337)"
              >
                Switch to Hardhat
              </button>
            </div>
          )
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-shield-cyan/10 text-shield-cyan border border-shield-cyan/30">
            <span className="w-1.5 h-1.5 rounded-full bg-shield-cyan"></span>
            Hardhat EVM: 31337
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Wallet Connection Component */}
        {isConnected ? (
          <div className="relative">
            <div className="flex items-center gap-1 bg-shield-850 border border-shield-700/80 rounded-lg p-1 text-xs">
              {/* Balance display */}
              <div className="hidden md:flex items-center gap-1 px-2.5 py-1 text-slate-300 font-mono text-[11px] border-r border-shield-750">
                <span>{balance !== null ? `${parseFloat(balance).toFixed(4)} ETH` : '... ETH'}</span>
                <button
                  onClick={refreshBalance}
                  className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
                  title="Refresh Balance"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {/* Account Pill */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-2.5 py-1 rounded bg-shield-800 hover:bg-shield-750 text-slate-200 font-mono text-xs transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{account ? truncateAddress(account) : ''}</span>
                {isSimulatorMode && (
                  <span className="text-[10px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-sans">
                    SIM
                  </span>
                )}
              </button>
            </div>

            {/* Account Dropdown */}
            {showDropdown && (
              <div
                className="absolute right-0 mt-2 w-64 rounded-xl bg-shield-900 border border-shield-700 shadow-2xl p-3 z-30 space-y-2 text-xs"
                onMouseLeave={() => setShowDropdown(false)}
              >
                <div className="pb-2 border-b border-shield-800">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                    Connected Account
                  </span>
                  <div className="flex items-center justify-between bg-shield-950 px-2 py-1.5 rounded font-mono text-[11px] text-slate-200">
                    <span className="truncate">{account}</span>
                    <button
                      onClick={handleCopy}
                      className="ml-2 text-slate-400 hover:text-shield-cyan"
                      title="Copy Address"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="py-1 space-y-1">
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span className="text-slate-400">Network:</span>
                    <span className="font-mono text-emerald-400">Hardhat (31337)</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-[11px]">
                    <span className="text-slate-400">Native Balance:</span>
                    <span className="font-mono text-slate-200">{balance} ETH</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-shield-800 space-y-1.5">
                  {onNavigate && account && (
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onNavigate('investigation', { address: account });
                      }}
                      className="w-full py-1.5 px-2 rounded-lg bg-shield-800 hover:bg-shield-750 text-shield-cyan text-[11px] font-semibold text-center transition-colors"
                    >
                      Investigate Connected Wallet →
                    </button>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    {!isLocalNetwork && (
                      <button
                        onClick={switchOrAddHardhatNetwork}
                        className="text-amber-400 hover:text-amber-300 text-[11px] font-medium"
                      >
                        Switch Network
                      </button>
                    )}
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setShowDropdown(false);
                      }}
                      className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-[11px] font-medium ml-auto"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 font-semibold text-xs transition-colors disabled:opacity-50 shadow-sm shadow-shield-cyan/20"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>

            {/* Demo Simulator Account fallback for environments without MetaMask */}
            {!isMetaMaskInstalled && (
              <button
                onClick={enableSimulatorMode}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 text-slate-300 border border-shield-750 text-[11px] font-mono transition-colors"
                title="Connect deterministic local Hardhat test account without browser extension"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Demo Account</span>
              </button>
            )}
          </div>
        )}

        {/* Global Error Banner if wallet error */}
        {error && !isConnected && (
          <div className="hidden xl:block max-w-xs truncate text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>
    </header>
  );
};

