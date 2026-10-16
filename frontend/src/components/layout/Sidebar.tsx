import React from 'react';
import {
  Shield,
  LayoutDashboard,
  Search,
  Wallet,
  FileCode,
  ArrowRightLeft,
  PlayCircle,
  Network,
  History,
  Settings,
  AlertTriangle
} from 'lucide-react';

export type PageRoute =
  | 'dashboard'
  | 'investigation'
  | 'wallet-analyzer'
  | 'contract-analyzer'
  | 'transaction-analyzer'
  | 'simulation'
  | 'transaction-graph'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute, params?: Record<string, any>) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navItems: { id: PageRoute; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
    { id: 'investigation', label: 'Address Investigation', icon: Search },
    { id: 'wallet-analyzer', label: 'Wallet Analyzer', icon: Wallet },
    { id: 'contract-analyzer', label: 'Contract Analyzer', icon: FileCode },
    { id: 'transaction-analyzer', label: 'Transaction Analyzer', icon: ArrowRightLeft },
    { id: 'simulation', label: 'Safe Simulation', icon: PlayCircle },
    { id: 'transaction-graph', label: 'Transaction Graph', icon: Network },
    { id: 'reports', label: 'Audit & History', icon: History },
    { id: 'settings', label: 'Settings & Config', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-shield-750/70 bg-shield-950 flex flex-col h-screen flex-shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-shield-750/70 bg-shield-900/50">
        <div className="w-9 h-9 rounded-lg bg-shield-cyan/10 border border-shield-cyan/40 flex items-center justify-center text-shield-cyan shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
            CHAINSHIELD
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-shield-cyan/20 text-shield-cyan font-normal">v1.0</span>
          </span>
          <p className="text-[10px] text-slate-400 font-mono">EVM Risk Analysis System</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Security Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 text-left ${
                isActive
                  ? 'bg-shield-indigo text-white shadow-md shadow-shield-indigo/20 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-shield-850/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Academic / Disclaimer Footer */}
      <div className="p-4 border-t border-shield-750/70 bg-shield-900/30">
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-[10px] leading-relaxed">
            <span className="font-semibold block text-amber-200">Academic Prototype</span>
            Safe local EVM simulation. Never imports real private keys.
          </div>
        </div>
      </div>
    </aside>
  );
};
