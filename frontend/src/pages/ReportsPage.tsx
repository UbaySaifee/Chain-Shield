import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { RiskBadge } from '../components/common/RiskBadge';
import { AddressDisplay } from '../components/common/AddressDisplay';
import { StateFeedback } from '../components/common/StateFeedback';
import { apiClient } from '../api/client';
import type { AnalysisSummaryItem, TransactionHistoryItem } from '../api/client';
import type { PageRoute } from '../components/layout/Sidebar';
import {
  FileText,
  ArrowRightLeft,
  Printer,
  Download,
  Filter,
  ChevronRight,
  Database
} from 'lucide-react';

interface ReportsPageProps {
  onNavigate?: (page: PageRoute, params?: Record<string, any>) => void;
  initialTab?: 'analyses' | 'transactions';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  onNavigate,
  initialTab = 'analyses'
}) => {
  const [activeTab, setActiveTab] = useState<'analyses' | 'transactions'>(initialTab);
  const [analyses, setAnalyses] = useState<AnalysisSummaryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = async (type = 'ALL') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAnalysisHistory(type);
      setAnalyses(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load analysis history from database.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async (type = 'ALL') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getTransactionHistory(type, 100, 0);
      setTransactions(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load transaction history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analyses') {
      fetchAnalyses(analysisTypeFilter);
    } else {
      fetchTransactions(txTypeFilter);
    }
  }, [activeTab]);

  const handleExportJson = () => {
    const payload = activeTab === 'analyses' ? analyses : transactions;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainshield-${activeTab}-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-shield-cyan/20 text-shield-cyan border border-shield-cyan/40 font-semibold uppercase">
              Audit & Forensic History
            </span>
            <span className="text-xs text-slate-400 font-mono">LOCAL DEMO NETWORK (31337)</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Security Assessment & Transaction History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified persistent audit trail of risk evaluations, on-chain local transactions, and pre-execution simulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            title="Export JSON audit trail"
          >
            <Download className="w-3.5 h-3.5 text-shield-cyan" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            title="Print formal report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-shield-800 space-x-1">
        <button
          onClick={() => {
            setActiveTab('analyses');
            fetchAnalyses(analysisTypeFilter);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'analyses'
              ? 'border-shield-cyan text-shield-cyan bg-shield-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Analysis History ({analyses.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('transactions');
            fetchTransactions(txTypeFilter);
          }}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-shield-cyan text-shield-cyan bg-shield-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Transactions & Simulations ({transactions.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {isLoading && (
        <StateFeedback
          state="loading"
          title="Querying Historical Database"
          message={`Retrieving persistent records for ${activeTab}...`}
        />
      )}

      {error && !isLoading && (
        <StateFeedback
          state="error"
          title="History Query Failed"
          message={error}
          actionLabel="Retry"
          onAction={() => (activeTab === 'analyses' ? fetchAnalyses(analysisTypeFilter) : fetchTransactions(txTypeFilter))}
        />
      )}

      {!isLoading && !error && (
        <>
          {/* TAB 1: Analysis History */}
          {activeTab === 'analyses' && (
            <Card
              title="Persistent Risk Assessments"
              subtitle="All evaluated wallets, smart contracts, and transactions"
              action={
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={analysisTypeFilter}
                    onChange={(e) => {
                      setAnalysisTypeFilter(e.target.value);
                      fetchAnalyses(e.target.value);
                    }}
                    className="bg-shield-950 border border-shield-750 text-slate-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:border-shield-cyan outline-none"
                  >
                    <option value="ALL">All Types</option>
                    <option value="WALLET">Wallets (EOA)</option>
                    <option value="CONTRACT">Smart Contracts</option>
                    <option value="TRANSACTION">Transactions</option>
                  </select>
                </div>
              }
            >
              {analyses.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <Database className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="font-semibold text-slate-300">No analyses found in database.</p>
                  <p className="text-[11px] text-slate-500">
                    Use Global Search or the analyzers to evaluate an address and record findings here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-shield-950 text-slate-400 border-b border-shield-800 text-[11px] font-mono uppercase">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Target Address</th>
                        <th className="p-3">Risk Assessment</th>
                        <th className="p-3">Key Indicators</th>
                        <th className="p-3">Summary</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-shield-800 font-mono">
                      {analyses.map((item) => (
                        <tr key={item.id} className="hover:bg-shield-850/50 transition-colors">
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                item.targetType === 'CONTRACT'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : item.targetType === 'WALLET'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {item.targetType}
                            </span>
                          </td>
                          <td className="p-3 select-all">
                            <AddressDisplay
                              address={item.targetAddress}
                              truncate={true}
                              onNavigateInvestigation={
                                onNavigate
                                  ? (addr) => onNavigate('investigation', { address: addr })
                                  : undefined
                              }
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <RiskBadge level={item.severity} score={item.score} />
                            </div>
                          </td>
                          <td className="p-3 font-sans text-[11px] text-slate-300 max-w-xs">
                            {item.keyIndicators && item.keyIndicators.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.keyIndicators.slice(0, 2).map((k, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded bg-shield-950 border border-shield-800 text-[10px] text-slate-300"
                                  >
                                    {k.split(' - ')[0]}
                                  </span>
                                ))}
                                {item.keyIndicators.length > 2 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    +{item.keyIndicators.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">None</span>
                            )}
                          </td>
                          <td className="p-3 font-sans text-slate-300 max-w-xs truncate text-[11px]">
                            {item.summary}
                          </td>
                          <td className="p-3 text-[11px] text-slate-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                if (onNavigate) {
                                  if (item.targetType === 'CONTRACT') {
                                    onNavigate('contract-analyzer', { address: item.targetAddress });
                                  } else if (item.targetType === 'WALLET') {
                                    onNavigate('wallet-analyzer', { address: item.targetAddress });
                                  } else {
                                    onNavigate('investigation', { address: item.targetAddress });
                                  }
                                }
                              }}
                              className="px-2.5 py-1 rounded bg-shield-800 hover:bg-shield-750 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Open</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: Transaction History */}
          {activeTab === 'transactions' && (
            <Card
              title="Recorded On-Chain Transactions & Simulations"
              subtitle="Audited local transactions from Hardhat node and pre-execution dry-runs"
              action={
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={txTypeFilter}
                    onChange={(e) => {
                      setTxTypeFilter(e.target.value);
                      fetchTransactions(e.target.value);
                    }}
                    className="bg-shield-950 border border-shield-750 text-slate-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:border-shield-cyan outline-none"
                  >
                    <option value="ALL">All Operations</option>
                    <option value="ON_CHAIN">On-Chain Mined</option>
                    <option value="SIMULATION">Pre-Execution Simulations</option>
                  </select>
                </div>
              }
            >
              {transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <Database className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="font-semibold text-slate-300">No transactions recorded yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Run the demo transaction seeding script or prepare a simulation to view records.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-shield-950 text-slate-400 border-b border-shield-800 text-[11px] uppercase">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Sender</th>
                        <th className="p-3">Receiver</th>
                        <th className="p-3">Function / Call</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Value / Token</th>
                        <th className="p-3">Tx Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-shield-800">
                      {transactions.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-shield-850/50 transition-colors">
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono ${
                                tx.type === 'ON_CHAIN'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-shield-cyan/20 text-shield-cyan border border-shield-cyan/30'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-400">
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-3">
                            <AddressDisplay
                              address={tx.fromAddress}
                              truncate={true}
                              onNavigateInvestigation={
                                onNavigate ? (addr) => onNavigate('investigation', { address: addr }) : undefined
                              }
                            />
                          </td>
                          <td className="p-3">
                            <AddressDisplay
                              address={tx.toAddress}
                              truncate={true}
                              onNavigateInvestigation={
                                onNavigate ? (addr) => onNavigate('investigation', { address: addr }) : undefined
                              }
                            />
                          </td>
                          <td className="p-3 font-sans text-slate-200 font-medium">
                            {tx.functionName}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                tx.status === 'CONFIRMED' || tx.status === 'SUCCESS'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-white">
                            {tx.value}
                          </td>
                          <td className="p-3 select-all text-slate-400 text-[11px]">
                            {tx.txHash ? `${tx.txHash.substring(0, 10)}...` : 'Pre-sign Dry-run'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};
