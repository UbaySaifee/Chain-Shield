import React, { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { RiskBadge } from '../components/common/RiskBadge';
import { EnvironmentStatus } from '../components/common/EnvironmentStatus';
import { GlobalSearch } from '../components/common/GlobalSearch';
import { StateFeedback } from '../components/common/StateFeedback';
import { apiClient } from '../api/client';
import type { DashboardStats } from '../api/client';
import {
  Wallet,
  FileCode,
  ArrowRightLeft,
  Network,
  PlayCircle,
  ChevronRight,
  Database
} from 'lucide-react';
import type { PageRoute } from '../components/layout/Sidebar';
import { useWallet } from '../context/WalletContext';

interface DashboardPageProps {
  onNavigate: (page: PageRoute, params?: Record<string, any>) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { connectWallet, isConnected } = useWallet();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<'analyses' | 'transactions' | 'simulations'>('analyses');

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to ChainShield backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalAssessments =
    (stats?.riskDistribution?.LOW ?? 0) +
    (stats?.riskDistribution?.MEDIUM ?? 0) +
    (stats?.riskDistribution?.HIGH ?? 0) +
    (stats?.riskDistribution?.CRITICAL ?? 0);

  const getPercent = (count: number) => {
    if (!totalAssessments || totalAssessments === 0) return 0;
    return Math.round((count / totalAssessments) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-shield-900 via-shield-850 to-shield-900 border border-shield-750/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              CHAINSHIELD COMMAND CENTER
            </span>
            <span className="text-xs text-slate-400 font-mono">LOCAL DEMO NETWORK (31337)</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Explainable Blockchain Security & Risk Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Proactive pre-execution transaction simulation, smart contract bytecode verification, and address relationship topology on local Hardhat development environment.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('contract-analyzer')}
            className="px-3.5 py-2 rounded-xl bg-shield-indigo hover:bg-shield-indigo/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-shield-indigo/20"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Analyze Contract</span>
          </button>
          <button
            onClick={() => onNavigate('simulation')}
            className="px-3.5 py-2 rounded-xl bg-shield-850 hover:bg-shield-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-shield-700"
          >
            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulate Tx</span>
          </button>
        </div>
      </div>

      {/* SECTION A: Environment Status */}
      <EnvironmentStatus />

      {/* SECTION E (Top Placement): Global Search & Quick Classification */}
      <Card
        title="Global Address Investigation & Entity Classifier"
        subtitle="Input an EVM address to classify as Wallet (EOA), Smart Contract, or Unknown and trigger forensic modules"
      >
        <GlobalSearch onNavigate={onNavigate} />
      </Card>

      {/* Loading & Error States */}
      {isLoading && (
        <StateFeedback
          state="loading"
          title="Loading Security Dashboard Telemetry"
          message="Querying local database for stored risk evaluations, simulation deltas, and threat metrics..."
        />
      )}

      {error && !isLoading && (
        <StateFeedback
          state="error"
          title="Dashboard Telemetry Unavailable"
          message={error}
          actionLabel="Retry Connection"
          onAction={loadDashboard}
        />
      )}

      {!isLoading && !error && stats && (
        <>
          {/* SECTION B: Security Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Total Entities</span>
                <span className="text-2xl font-bold font-mono text-white">{stats.totalScannedEntities}</span>
                <span className="text-[10px] text-slate-500 block font-mono">Wallets & Contracts</span>
              </div>
            </Card>

            <Card>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Wallet Analyses</span>
                <span className="text-2xl font-bold font-mono text-shield-cyan">{stats.walletAnalysesCount}</span>
                <span className="text-[10px] text-slate-500 block font-mono">EOA evaluated</span>
              </div>
            </Card>

            <Card>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Contract Analyses</span>
                <span className="text-2xl font-bold font-mono text-purple-400">{stats.contractAnalysesCount}</span>
                <span className="text-[10px] text-slate-500 block font-mono">Bytecode scans</span>
              </div>
            </Card>

            <Card>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Tx Simulations</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">{stats.simulationsExecuted}</span>
                <span className="text-[10px] text-slate-500 block font-mono">Dry-runs completed</span>
              </div>
            </Card>

            <Card>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">High / Critical</span>
                <span className="text-2xl font-bold font-mono text-rose-400">{stats.highRiskDetectedCount}</span>
                <span className="text-[10px] text-slate-500 block font-mono">Flagged assessments</span>
              </div>
            </Card>

            <Card>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-medium block">Active Threat Rules</span>
                <span className="text-2xl font-bold font-mono text-amber-400">{stats.activeThreatIndicatorsCount}</span>
                <span className="text-[10px] text-slate-500 block font-mono">Configured indicators</span>
              </div>
            </Card>
          </div>

          {/* SECTION D & C: Risk Distribution & Recent Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Distribution Breakdown */}
            <Card
              title="Risk Tier Distribution"
              subtitle={`Actual stored breakdown across ${totalAssessments} evaluations`}
            >
              {totalAssessments === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <Database className="w-6 h-6 text-slate-500 mx-auto" />
                  <p>No risk assessments stored yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Analyze a wallet or contract to populate actual risk metrics.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-medium">Low Risk (0-29)</span>
                      <span className="text-slate-300 font-mono">
                        {stats.riskDistribution.LOW} ({getPercent(stats.riskDistribution.LOW)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-shield-950 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${getPercent(stats.riskDistribution.LOW)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-amber-400 font-medium">Medium Risk (30-59)</span>
                      <span className="text-slate-300 font-mono">
                        {stats.riskDistribution.MEDIUM} ({getPercent(stats.riskDistribution.MEDIUM)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-shield-950 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${getPercent(stats.riskDistribution.MEDIUM)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-orange-400 font-medium">High Risk (60-84)</span>
                      <span className="text-slate-300 font-mono">
                        {stats.riskDistribution.HIGH} ({getPercent(stats.riskDistribution.HIGH)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-shield-950 overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${getPercent(stats.riskDistribution.HIGH)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-rose-400 font-medium">Critical Risk (85-100)</span>
                      <span className="text-slate-300 font-mono">
                        {stats.riskDistribution.CRITICAL} ({getPercent(stats.riskDistribution.CRITICAL)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-shield-950 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${getPercent(stats.riskDistribution.CRITICAL)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-shield-750/70 text-[10px] text-slate-500 leading-relaxed">
                    Evaluated via explainable deterministic rules specified in <code className="text-shield-cyan font-mono">RISK_ENGINE.md</code>.
                  </div>
                </div>
              )}
            </Card>

            {/* SECTION C: Recent Activity Tabs */}
            <div className="lg:col-span-2">
              <Card
                title="Recent Activity Feed"
                subtitle="Live records from local database and Hardhat execution logs"
                action={
                  <div className="flex items-center gap-1 bg-shield-950 p-1 rounded-lg border border-shield-800 text-[10px] font-mono">
                    <button
                      onClick={() => setActivityTab('analyses')}
                      className={`px-2 py-1 rounded transition-colors ${
                        activityTab === 'analyses'
                          ? 'bg-shield-800 text-shield-cyan font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Analyses ({stats.recentAssessments.length})
                    </button>
                    <button
                      onClick={() => setActivityTab('transactions')}
                      className={`px-2 py-1 rounded transition-colors ${
                        activityTab === 'transactions'
                          ? 'bg-shield-800 text-shield-cyan font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Tx ({stats.recentTransactions?.length ?? 0})
                    </button>
                    <button
                      onClick={() => setActivityTab('simulations')}
                      className={`px-2 py-1 rounded transition-colors ${
                        activityTab === 'simulations'
                          ? 'bg-shield-800 text-shield-cyan font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Sims ({stats.recentSimulations?.length ?? 0})
                    </button>
                  </div>
                }
              >
                {/* Tab: Recent Analyses */}
                {activityTab === 'analyses' && (
                  <div className="space-y-2.5">
                    {stats.recentAssessments.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No analyses recorded in database yet. Use the search bar above to run your first evaluation.
                      </div>
                    ) : (
                      stats.recentAssessments.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onNavigate('investigation', { address: item.targetAddress })}
                          className="p-3 rounded-xl bg-shield-950/70 border border-shield-800/80 hover:border-shield-700 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold ${
                                  item.targetType === 'CONTRACT'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}
                              >
                                {item.targetType}
                              </span>
                              <span className="text-xs font-mono text-slate-200 select-all group-hover:text-shield-cyan transition-colors">
                                {item.targetAddress}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 truncate">{item.primaryWarning}</p>
                          </div>

                          <div className="flex items-center gap-3 flex-shrink-0">
                            <RiskBadge level={item.riskCategory} score={item.overallScore} />
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Recent Transactions */}
                {activityTab === 'transactions' && (
                  <div className="space-y-2">
                    {(!stats.recentTransactions || stats.recentTransactions.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No transactions recorded. Execute demo transactions via scripts/seed-demo-transactions.ps1 to populate.
                      </div>
                    ) : (
                      stats.recentTransactions.map((tx, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-shield-950/70 border border-shield-800/80 flex items-center justify-between gap-3 text-xs font-mono"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-shield-cyan font-bold">
                                {tx.functionName || tx.relationshipType}
                              </span>
                              <span className="text-slate-400 text-[11px] truncate">
                                {tx.fromAddress.substring(0, 6)}... → {tx.toAddress.substring(0, 6)}...
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">Hash: {tx.txHash.substring(0, 14)}...</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-white block">{tx.valueEth} ETH</span>
                            <span className="text-[10px] text-emerald-400">Block #{tx.blockNumber}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Recent Simulations */}
                {activityTab === 'simulations' && (
                  <div className="space-y-2">
                    {(!stats.recentSimulations || stats.recentSimulations.length === 0) ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No pre-execution simulations recorded yet. Go to Transaction Analyzer to simulate candidates.
                      </div>
                    ) : (
                      stats.recentSimulations.map((sim) => (
                        <div
                          key={sim.id}
                          className="p-3 rounded-xl bg-shield-950/70 border border-shield-800/80 flex items-center justify-between gap-3 text-xs font-mono"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  sim.simulationStatus === 'SUCCESS'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {sim.simulationStatus}
                              </span>
                              <span className="text-slate-300 text-[11px] truncate">
                                To: {sim.toAddress}
                              </span>
                            </div>
                            {sim.revertReason && (
                              <p className="text-[11px] text-rose-300 font-sans mt-0.5">{sim.revertReason}</p>
                            )}
                          </div>
                          <div className="text-right text-[10px] text-slate-400">
                            <span>Gas ~{sim.gasUsed ?? 0}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <button
              onClick={() => onNavigate('wallet-analyzer')}
              className="p-3 rounded-xl bg-shield-900 hover:bg-shield-850 border border-shield-750 flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-shield-800 group-hover:bg-shield-750 text-shield-cyan">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Analyze Wallet</span>
            </button>

            <button
              onClick={() => onNavigate('contract-analyzer')}
              className="p-3 rounded-xl bg-shield-900 hover:bg-shield-850 border border-shield-750 flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-shield-800 group-hover:bg-shield-750 text-purple-400">
                <FileCode className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Analyze Contract</span>
            </button>

            <button
              onClick={() => onNavigate('transaction-analyzer')}
              className="p-3 rounded-xl bg-shield-900 hover:bg-shield-850 border border-shield-750 flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-shield-800 group-hover:bg-shield-750 text-emerald-400">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Prepare Tx</span>
            </button>

            <button
              onClick={() => onNavigate('transaction-graph')}
              className="p-3 rounded-xl bg-shield-900 hover:bg-shield-850 border border-shield-750 flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-shield-800 group-hover:bg-shield-750 text-purple-400">
                <Network className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Explore Graph</span>
            </button>

            <button
              onClick={connectWallet}
              className="p-3 rounded-xl bg-shield-900 hover:bg-shield-850 border border-shield-750 flex flex-col items-center justify-center text-center gap-1.5 transition-colors group"
            >
              <div className="p-2 rounded-lg bg-shield-800 group-hover:bg-shield-750 text-amber-400">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">
                {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
