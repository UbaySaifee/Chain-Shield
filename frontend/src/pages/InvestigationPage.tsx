import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { RiskBadge } from '../components/common/RiskBadge';
import { RiskScoreCard } from '../components/common/RiskScoreCard';
import { EvidencePanel } from '../components/common/EvidencePanel';
import { AddressDisplay } from '../components/common/AddressDisplay';
import { StateFeedback } from '../components/common/StateFeedback';
import { apiClient } from '../api/client';
import type { AddressSummaryResponse, ContractAnalysisResponse } from '../api/client';
import type { PageRoute } from '../components/layout/Sidebar';
import {
  ShieldAlert,
  Wallet,
  FileCode,
  Network,
  ArrowRightLeft,
  Activity,
  History,
  ChevronRight,
  ExternalLink,
  Code
} from 'lucide-react';

interface InvestigationPageProps {
  initialAddress?: string;
  onNavigate: (page: PageRoute, params?: Record<string, any>) => void;
}

type TabType = 'overview' | 'security' | 'transactions' | 'graph' | 'contract-details';

export const InvestigationPage: React.FC<InvestigationPageProps> = ({
  initialAddress,
  onNavigate
}) => {
  const [address, setAddress] = useState(
    initialAddress || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  );
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [summary, setSummary] = useState<AddressSummaryResponse | null>(null);
  const [contractDetails, setContractDetails] = useState<ContractAnalysisResponse | null>(null);
  const [directTxs, setDirectTxs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestigationData = async (targetAddr: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const summaryData = await apiClient.getAddressSummary(targetAddr);
      setSummary(summaryData);

      // If contract, also fetch contract analysis details
      if (summaryData.isContract) {
        try {
          const cData = await apiClient.analyzeContract(targetAddr);
          setContractDetails(cData);
        } catch {
          setContractDetails(null);
        }
      } else {
        setContractDetails(null);
      }

      // Fetch direct transactions
      try {
        const txs = await apiClient.getAddressTransactions(targetAddr, 25);
        setDirectTxs(txs || []);
      } catch {
        setDirectTxs([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load investigation data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
      fetchInvestigationData(initialAddress);
    } else {
      fetchInvestigationData(address);
    }
  }, [initialAddress]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address) {
      fetchInvestigationData(address);
    }
  };

  const isContract = summary?.isContract ?? false;

  return (
    <div className="space-y-6">
      {/* Top Address Switcher / Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-shield-indigo/20 text-shield-indigo border border-shield-indigo/30 font-semibold uppercase">
              Investigation Center
            </span>
            <span className="text-xs text-slate-400 font-mono">LOCAL DEMO NETWORK (31337)</span>
          </div>
          <h2 className="text-xl font-bold text-white">Unified Address Security Investigation</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-module counterparty forensics, bytecode capabilities, relationship topology, and on-chain activity.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full md:w-80 bg-shield-900 border border-shield-750 focus:border-shield-cyan rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Investigate'}
          </button>
        </form>
      </div>

      {isLoading && (
        <StateFeedback
          state="loading"
          title="Aggregating Investigation Telemetry"
          message={`Querying Hardhat EVM state, bytecode records, and transaction graph for ${address}...`}
        />
      )}

      {error && !isLoading && (
        <StateFeedback
          state="error"
          title="Investigation Data Unavailable"
          message={error}
          actionLabel="Retry Analysis"
          onAction={() => fetchInvestigationData(address)}
        />
      )}

      {summary && !isLoading && !error && (
        <>
          {/* Summary Hero Card */}
          <div className="p-6 rounded-2xl bg-shield-900 border border-shield-750/90 shadow-xl space-y-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-shield-800 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isContract
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {summary.accountType === 'CONTRACT' ? 'Smart Contract' : 'Wallet / EOA'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    CHAIN 31337
                  </span>
                </div>
                <div className="text-base font-mono font-bold text-white flex items-center gap-2">
                  <AddressDisplay address={summary.address} truncate={false} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Risk Assessment</span>
                  <RiskBadge level={summary.riskSeverity} score={summary.riskScore} />
                </div>
              </div>
            </div>

            {/* Quick KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800">
                <span className="text-[10px] text-slate-400 font-sans block">Native Balance</span>
                <span className="font-mono text-slate-100 font-bold">{summary.nativeBalanceEth}</span>
              </div>
              <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800">
                <span className="text-[10px] text-slate-400 font-sans block">Transactions</span>
                <span className="font-mono text-slate-100 font-bold">{summary.transactionCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800">
                <span className="text-[10px] text-slate-400 font-sans block">Contract Calls</span>
                <span className="font-mono text-slate-100 font-bold">{summary.contractInteractionCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800">
                <span className="text-[10px] text-slate-400 font-sans block">Token Transfers</span>
                <span className="font-mono text-slate-100 font-bold">{summary.tokenTransferCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800">
                <span className="text-[10px] text-slate-400 font-sans block">Counterparties</span>
                <span className="font-mono text-slate-100 font-bold">{summary.uniqueCounterpartiesCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-shield-950/80 border border-shield-800">
                <span className="text-[10px] text-slate-400 font-sans block">Threat Indicators</span>
                <span className="font-mono text-rose-400 font-bold">{summary.indicators.length}</span>
              </div>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-shield-800/80">
              <span className="text-[10px] font-mono uppercase text-slate-500 mr-2">Cross-Module Actions:</span>

              {isContract ? (
                <>
                  <button
                    onClick={() => onNavigate('contract-analyzer', { address: summary.address })}
                    className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileCode className="w-3.5 h-3.5 text-purple-400" />
                    <span>Open in Contract Analyzer</span>
                  </button>
                  <button
                    onClick={() => onNavigate('transaction-analyzer', { to: summary.address })}
                    className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Prepare Transaction</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onNavigate('wallet-analyzer', { address: summary.address })}
                  className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Wallet className="w-3.5 h-3.5 text-shield-cyan" />
                  <span>Open in Wallet Analyzer</span>
                </button>
              )}

              <button
                onClick={() => onNavigate('transaction-graph', { centerAddress: summary.address })}
                className="px-3 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 border border-shield-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Network className="w-3.5 h-3.5 text-purple-400" />
                <span>Explore in Transaction Graph</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-shield-800 space-x-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-shield-cyan text-shield-cyan bg-shield-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'border-shield-cyan text-shield-cyan bg-shield-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Security & Evidence</span>
              {summary.indicators.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-300 text-[10px] flex items-center justify-center font-mono">
                  {summary.indicators.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'transactions'
                  ? 'border-shield-cyan text-shield-cyan bg-shield-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Transactions ({directTxs.length})</span>
            </button>

            {isContract && (
              <button
                onClick={() => setActiveTab('contract-details')}
                className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === 'contract-details'
                    ? 'border-shield-cyan text-shield-cyan bg-shield-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Contract Details</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('graph')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === 'graph'
                  ? 'border-shield-cyan text-shield-cyan bg-shield-900/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Relationship Graph</span>
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <RiskScoreCard
                  score={summary.riskScore}
                  severity={summary.riskSeverity}
                  summary={summary.summary}
                  disclaimer={summary.disclaimer}
                  indicatorsCount={summary.indicators.length}
                  recommendations={[
                    isContract
                      ? 'Review exposed privileged administrative capabilities and bytecode before interacting.'
                      : 'Always verify counterparty reputations before sending high-value native currency or token allowances.',
                    'Check recorded transaction topology to ensure funds are not routed to unverified drainers.'
                  ]}
                />

                {/* Counterparty Relationships Card */}
                <Card title="Observed Relationships & Counterparties" subtitle="Direct historical interactions on local network">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono block mb-2">
                        Related Contracts ({summary.relatedContracts.length})
                      </span>
                      {summary.relatedContracts.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No contract interactions recorded.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {summary.relatedContracts.map((cAddr, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setAddress(cAddr);
                                fetchInvestigationData(cAddr);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-shield-950 border border-shield-800 text-xs font-mono text-purple-300 hover:border-shield-cyan flex items-center gap-1.5 transition-colors"
                            >
                              <span>{cAddr.substring(0, 6)}...{cAddr.substring(cAddr.length - 4)}</span>
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-shield-800">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono block mb-2">
                        Related Addresses ({summary.relatedAddresses.length})
                      </span>
                      {summary.relatedAddresses.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No counterparty wallet interactions recorded.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {summary.relatedAddresses.map((wAddr, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setAddress(wAddr);
                                fetchInvestigationData(wAddr);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-shield-950 border border-shield-800 text-xs font-mono text-blue-300 hover:border-shield-cyan flex items-center gap-1.5 transition-colors"
                            >
                              <span>{wAddr.substring(0, 6)}...{wAddr.substring(wAddr.length - 4)}</span>
                              <ChevronRight className="w-3 h-3 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Side Column: Activity Timeline */}
              <div className="space-y-6">
                <Card title="Activity Timeline" subtitle="Historical on-chain lifecycle">
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-shield-950 border border-shield-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">First Activity</span>
                      <span className="font-mono text-slate-200 text-[11px]">{summary.firstSeenAt}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-shield-950 border border-shield-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Latest Recorded Action</span>
                      <span className="font-mono text-slate-200 text-[11px]">{summary.lastActiveAt}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-shield-950 border border-shield-800 space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Data Availability</span>
                      <span className="font-mono text-emerald-400 text-[11px]">{summary.dataAvailability}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Tab 2: Security & Evidence */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <EvidencePanel
                indicators={summary.indicators.map((ind) => ({
                  code: ind.code,
                  category: 'SECURITY_INDICATOR',
                  title: ind.title,
                  severity: ind.severity as any,
                  evidence: ind.evidence,
                  source: ind.source,
                  explanation: 'Flagged indicator observed during address inspection.'
                }))}
              />
            </div>
          )}

          {/* Tab 3: Transactions */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <Card title="Recorded On-Chain Transactions" subtitle="Historical activity from local demo network">
                {directTxs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No transactions recorded for this address in the local database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-shield-950 text-slate-400 border-b border-shield-800 text-[11px]">
                        <tr>
                          <th className="p-2.5">TX HASH</th>
                          <th className="p-2.5">RELATIONSHIP</th>
                          <th className="p-2.5">FROM</th>
                          <th className="p-2.5">TO</th>
                          <th className="p-2.5">VALUE / TOKEN</th>
                          <th className="p-2.5">BLOCK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-shield-800">
                        {directTxs.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-shield-850/50">
                            <td className="p-2.5 text-shield-cyan select-all">
                              {tx.txHash ? `${tx.txHash.substring(0, 8)}...` : 'N/A'}
                            </td>
                            <td className="p-2.5 text-slate-300 font-sans">{tx.relationshipType}</td>
                            <td className="p-2.5 text-slate-300">
                              <AddressDisplay address={tx.from} />
                            </td>
                            <td className="p-2.5 text-slate-300">
                              <AddressDisplay address={tx.to} />
                            </td>
                            <td className="p-2.5 font-bold text-white">
                              {tx.tokenAmount ? `${tx.tokenAmount} ${tx.tokenSymbol}` : `${tx.valueEth} ETH`}
                            </td>
                            <td className="p-2.5 text-slate-400">{tx.blockNumber ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Tab 4: Contract Details */}
          {activeTab === 'contract-details' && isContract && (
            <div className="space-y-6">
              {contractDetails ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card title="Contract Identity">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-shield-850">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-white font-semibold">{contractDetails.contractMetadata?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-shield-850">
                          <span className="text-slate-400">Bytecode Size:</span>
                          <span className="font-mono text-slate-200">{contractDetails.contractMetadata?.bytecodeSizeBytes || 0} bytes</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-shield-850">
                          <span className="text-slate-400">Source:</span>
                          <span className="text-emerald-400 font-mono">{contractDetails.contractMetadata?.sourceStatus || 'LOCAL_VERIFIED'}</span>
                        </div>
                      </div>
                    </Card>

                    <Card title="Ownership & Permissions">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-shield-850">
                          <span className="text-slate-400">Owner Present:</span>
                          <span className="font-mono text-slate-200">{contractDetails.ownershipInfo?.hasOwner ? 'YES' : 'NO'}</span>
                        </div>
                        {contractDetails.ownershipInfo?.ownerAddress && (
                          <div className="py-1 border-b border-shield-850">
                            <span className="text-slate-400 block mb-1">Owner Address:</span>
                            <AddressDisplay address={contractDetails.ownershipInfo.ownerAddress} />
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-2">
                          {contractDetails.ownershipInfo?.whyItMatters || 'Standard ownership controls.'}
                        </p>
                      </div>
                    </Card>

                    <Card title="Proxy / Upgradeability">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-shield-850">
                          <span className="text-slate-400">Proxy Detected:</span>
                          <span className="font-mono text-slate-200">{contractDetails.proxyInfo?.proxyDetected || 'NO'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">
                          Non-proxy contracts have immutable on-chain logic that cannot be altered dynamically.
                        </p>
                      </div>
                    </Card>
                  </div>

                  {/* Capabilities List */}
                  {contractDetails.detectedCapabilities && contractDetails.detectedCapabilities.length > 0 && (
                    <Card title="Detected Behavioral Capabilities">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {contractDetails.detectedCapabilities.map((cap, i) => (
                          <div key={i} className="p-3 rounded-xl bg-shield-950 border border-shield-850 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-white">{cap.name}</span>
                              <RiskBadge level={cap.severity as any} />
                            </div>
                            <p className="text-xs text-slate-300">{cap.description}</p>
                            {cap.detectedEvidence && (
                              <p className="text-[11px] font-mono text-slate-400 bg-shield-900 p-1.5 rounded mt-1">
                                {cap.detectedEvidence}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Loading detailed bytecode forensics...
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Relationship Graph */}
          {activeTab === 'graph' && (
            <div className="p-6 rounded-2xl bg-shield-900 border border-shield-750/90 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-shield-indigo/20 text-shield-indigo mx-auto flex items-center justify-center border border-shield-indigo/30">
                <Network className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Full Forensic Relationship Graph</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Explore multi-hop counterparties, token flows, and topological rings centered on{' '}
                <span className="font-mono text-shield-cyan">{summary.address}</span>.
              </p>
              <button
                onClick={() => onNavigate('transaction-graph', { centerAddress: summary.address })}
                className="px-5 py-2.5 rounded-xl bg-shield-indigo hover:bg-shield-indigo/90 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors shadow-lg shadow-shield-indigo/20"
              >
                <span>Launch Interactive Graph View</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
