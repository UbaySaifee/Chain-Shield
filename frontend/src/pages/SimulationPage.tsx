import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { RiskBadge } from '../components/common/RiskBadge';
import { EmptyState, LoadingState } from '../components/common/StateFeedback';
import { PlayCircle } from 'lucide-react';

export const SimulationPage: React.FC = () => {
  const [simulating, setSimulating] = useState(false);
  const [simulated, setSimulated] = useState(false);

  const handleSimulate = () => {
    setSimulating(true);
    setSimulated(false);
    setTimeout(() => {
      setSimulating(false);
      setSimulated(true);
    }, 900);
  };

  return (
    <div className="space-y-6">
      <Card
        title="Safe Transaction Simulator"
        subtitle="Dry-run transactions against local EVM state overrides before signing. No real funds are ever spent."
        variant="glow"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-shield-900 border border-shield-750 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-200">Candidate Transaction Payload:</span>
              <p className="text-xs text-slate-400 font-mono">
                From: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 &#8594; To: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
              </p>
              <p className="text-xs text-shield-cyan font-mono">
                Action: approve(DangerousApprovalSpender, MAX_UINT256)
              </p>
            </div>
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="px-5 py-2.5 rounded-lg bg-shield-indigo hover:bg-shield-indigo/90 text-white font-semibold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Simulate on EVM Sandbox</span>
            </button>
          </div>
        </div>
      </Card>

      {simulating && (
        <LoadingState
          message="Executing isolated eth_call state dry-run..."
          subtext="Calculating projected balance deltas and allowance mutations on local Hardhat node"
        />
      )}

      {!simulating && !simulated && (
        <EmptyState
          title="No Active Simulation"
          description="Click 'Simulate on EVM Sandbox' above to dry-run the candidate transaction and inspect projected state changes."
          icon={<PlayCircle className="w-6 h-6 text-slate-400" />}
        />
      )}

      {!simulating && simulated && (
        <div className="space-y-6">
          <Card
            title="EVM Dry-Run Simulation Outcomes"
            subtitle="Execution Status: SUCCESS (Simulated Gas: 44,120)"
            action={<RiskBadge level="HIGH" score={75} />}
          >
            <div className="space-y-5">
              {/* Projected State Changes Table */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Projected State Deltas
                </h4>
                <div className="border border-shield-750 rounded-lg overflow-hidden font-mono text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-shield-900 border-b border-shield-750 text-[11px] text-slate-400">
                      <tr>
                        <th className="p-3">Asset / Target</th>
                        <th className="p-3">Pre-State</th>
                        <th className="p-3">Post-State</th>
                        <th className="p-3">Projected Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-shield-800 bg-shield-950/60">
                      <tr>
                        <td className="p-3 text-slate-300">Native ETH (Gas)</td>
                        <td className="p-3 text-slate-400">1000.0 ETH</td>
                        <td className="p-3 text-slate-400">999.9991 ETH</td>
                        <td className="p-3 text-slate-400">-0.000882 ETH</td>
                      </tr>
                      <tr className="bg-rose-500/5">
                        <td className="p-3 text-slate-200 font-bold">SHLD Token Allowance</td>
                        <td className="p-3 text-slate-400">0 SHLD</td>
                        <td className="p-3 text-rose-400 font-bold">UNLIMITED (MAX_UINT)</td>
                        <td className="p-3 text-rose-400 font-bold">+1.1579e+77 (MAX)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Natural language summary */}
              <div className="p-4 rounded-lg bg-shield-900 border border-shield-750 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Plain-Language Simulation Explanation
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">
                  The simulation indicates that this transaction will successfully execute on the blockchain, but it will grant contract <span className="font-mono text-shield-cyan">0xe7f1...bb3F0512</span> complete, unrestricted access to your entire token balance.
                </p>
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                  <span className="font-semibold block mb-0.5">Recommended Pre-Execution Remedy:</span>
                  Reject this transaction in MetaMask or adjust the approval spending limit to only the exact number of tokens needed for this single swap.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
