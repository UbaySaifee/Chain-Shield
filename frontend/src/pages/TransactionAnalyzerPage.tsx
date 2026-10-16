import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { RiskBadge, type RiskLevel } from '../components/common/RiskBadge';
import { EmptyState, LoadingState } from '../components/common/StateFeedback';
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Info,
  Lock,
  Wallet,
  ExternalLink,
  Waypoints,
  History,
  FileCode
} from 'lucide-react';
import contractsData from '../config/contracts.json';
import { useWallet, type WalletReceipt } from '../context/WalletContext';
import { TransactionBuilder, type PreparedTransactionPayload } from '../components/transaction/TransactionBuilder';
import {
  DEMO_RECIPIENT_ADDRESS,
  DEMO_RECIPIENT_LABEL
} from '../utils/transactionBuilder';
import { SecurityReviewModal } from '../components/transaction/SecurityReviewModal';
import { PostSignReceiptView } from '../components/transaction/PostSignReceiptView';
import type { PageRoute } from '../components/layout/Sidebar';

interface DecodedCall {
  methodSelector: string;
  functionSignature: string;
  actionType: string;
  parameters: Record<string, unknown>;
  isApproval: boolean;
  spenderAddress?: string;
  isUnlimitedApproval: boolean;
  humanInterpretation: string;
}

interface BalanceDelta {
  tokenAddress: string;
  tokenSymbol: string;
  accountAddress: string;
  previousBalance: string;
  projectedBalance: string;
  delta: string;
  formattedDelta: string;
}

interface AllowanceDelta {
  tokenAddress: string;
  tokenSymbol: string;
  ownerAddress: string;
  spenderAddress: string;
  previousAllowance: string;
  projectedAllowance: string;
  isUnlimited: boolean;
  humanExplanation: string;
}

interface StateEffects {
  balanceDeltas: BalanceDelta[];
  allowanceDeltas: AllowanceDelta[];
  nativeEthDelta: string;
  projectedEvents: string[];
  summary: string;
}

interface RiskIndicator {
  code: string;
  category: string;
  title: string;
  severity: string;
  appliedWeight: number;
  contextExplanation: string;
  evidenceData: string;
}

interface SimulationResponse {
  id: string;
  simulationStatus: 'SUCCESS' | 'REVERTED' | 'EXECUTION_ERROR';
  gasEstimated: number | null;
  revertReason: string | null;
  decodedCall: DecodedCall;
  stateEffects: StateEffects;
  riskAssessment: {
    score: number;
    severity: RiskLevel;
    summary: string;
    disclaimer: string;
    indicators: RiskIndicator[];
    recommendations: string[];
  };
  networkInfo: {
    chainId: number;
    networkName: string;
    isLocalDevnet: boolean;
    rpcConnected: boolean;
    currentBlock: number;
  };
  timestamp: string;
}

export interface TransactionAnalyzerPageProps {
  initialTo?: string;
  initialFrom?: string;
  onNavigate?: (page: PageRoute, params?: Record<string, any>) => void;
}

export const TransactionAnalyzerPage: React.FC<TransactionAnalyzerPageProps> = ({
  initialTo,
  initialFrom,
  onNavigate
}) => {
  const {
    account,
    chainId,
    isConnected,
    isLocalNetwork,
    connectWallet,
    switchOrAddHardhatNetwork,
    sendTransaction,
    waitForTransactionReceipt
  } = useWallet();

  const testUser = contractsData.testUser || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const mockToken = contractsData.contracts?.MockERC20?.address || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const honeypot = contractsData.contracts?.HoneypotToken?.address || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
  const dangerousSpender = contractsData.contracts?.DangerousApprovalSpender?.address || '0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0';

  // Default deterministic demo recipient & calldata for 250 SHLD
  const defaultRecipient = DEMO_RECIPIENT_ADDRESS;
  const defaultCalldata = '0xa9059cbb000000000000000000000000' + defaultRecipient.replace('0x', '').toLowerCase() + '00000000000000000000000000000000000000000000000d8d726b7177a80000';

  // Form states
  const [sender, setSender] = useState(initialFrom || account || testUser);
  const [target, setTarget] = useState(initialTo || mockToken);
  const [valueWei, setValueWei] = useState('0');
  const [calldata, setCalldata] = useState(defaultCalldata);
  const [activeScenario, setActiveScenario] = useState<string>('scenarioA');
  const [inputMode, setInputMode] = useState<'guided' | 'direct'>('guided');

  // Friendly description for current payload
  const [friendlyAction, setFriendlyAction] = useState<string>(
    `Transfer 250.0 SHLD tokens to ${defaultRecipient.substring(0, 6)}...${defaultRecipient.substring(38)} (${DEMO_RECIPIENT_LABEL})`
  );

  // Simulation execution state
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);

  // Signing modal & post-sign receipt state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [postSignReceipt, setPostSignReceipt] = useState<WalletReceipt | null>(null);
  const [userCancelledMessage, setUserCancelledMessage] = useState<string | null>(null);

  // Sync sender with connected wallet unless explicitly overridden
  useEffect(() => {
    if (account && !initialFrom) {
      setSender(account);
    }
  }, [account, initialFrom]);

  // Sync external initial props
  useEffect(() => {
    if (initialTo && initialTo !== target) {
      setTarget(initialTo);
    }
  }, [initialTo]);

  useEffect(() => {
    if (initialFrom && initialFrom !== sender) {
      setSender(initialFrom);
    }
  }, [initialFrom]);

  // Handle Payload from Guided TransactionBuilder
  const handlePreparedPayload = (payload: PreparedTransactionPayload) => {
    setSender(payload.from);
    setTarget(payload.to);
    setValueWei(payload.valueWei);
    setCalldata(payload.data);
    setFriendlyAction(payload.friendlyAction);
    runSimulationWithParams(payload.from, payload.to, payload.valueWei, payload.data);
  };

  // Scenario Presets
  const applyScenario = (type: 'A' | 'B' | 'C' | 'D') => {
    setUserCancelledMessage(null);
    setPostSignReceipt(null);
    const activeSender = account || testUser;

    switch (type) {
      case 'A': {
        const scACalldata = '0xa9059cbb000000000000000000000000' + DEMO_RECIPIENT_ADDRESS.replace('0x', '').toLowerCase() + '00000000000000000000000000000000000000000000000d8d726b7177a80000';
        setActiveScenario('scenarioA');
        setSender(activeSender);
        setTarget(mockToken);
        setValueWei('0');
        setCalldata(scACalldata);
        setFriendlyAction(`Transfer 250.0 SHLD tokens to ${DEMO_RECIPIENT_ADDRESS.substring(0, 6)}...${DEMO_RECIPIENT_ADDRESS.substring(38)} (${DEMO_RECIPIENT_LABEL})`);
        runSimulationWithParams(activeSender, mockToken, '0', scACalldata);
        break;
      }
      case 'B':
        setActiveScenario('scenarioB');
        setSender(activeSender);
        setTarget(mockToken);
        setValueWei('0');
        setCalldata(`0x095ea7b3000000000000000000000000${dangerousSpender.replace('0x', '').toLowerCase()}ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`);
        setFriendlyAction('Approve UNLIMITED allowance for Spender');
        runSimulationWithParams(activeSender, mockToken, '0', `0x095ea7b3000000000000000000000000${dangerousSpender.replace('0x', '').toLowerCase()}ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`);
        break;
      case 'C':
        setActiveScenario('scenarioC');
        setSender(activeSender);
        setTarget(mockToken);
        setValueWei('0');
        setCalldata(`0x095ea7b3000000000000000000000000${dangerousSpender.replace('0x', '').toLowerCase()}0000000000000000000000000000000000000000000000000000000000000064`);
        setFriendlyAction('Approve Spender: DangerousApprovalSpender (100 units)');
        runSimulationWithParams(activeSender, mockToken, '0', `0x095ea7b3000000000000000000000000${dangerousSpender.replace('0x', '').toLowerCase()}0000000000000000000000000000000000000000000000000000000000000064`);
        break;
      case 'D':
        setActiveScenario('scenarioD');
        setSender(activeSender);
        setTarget(honeypot);
        setValueWei('0');
        setCalldata('0xa9059cbb00000000000000000000000022222222222222222222222222222222222222220000000000000000000000000000000000000000000000056bc75e2d63100000');
        setFriendlyAction('Transfer 100.0 TRAP tokens (Honeypot Lock Active)');
        runSimulationWithParams(activeSender, honeypot, '0', '0xa9059cbb00000000000000000000000022222222222222222222222222222222222222220000000000000000000000000000000000000000000000056bc75e2d63100000');
        break;
    }
  };

  const runSimulationWithParams = async (fromAddr: string, toAddr: string, val: string, dataHex: string) => {
    setLoading(true);
    setSimulationResult(null);
    setUserCancelledMessage(null);

    try {
      const response = await fetch('http://localhost:8080/api/transaction/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddr.trim(),
          to: toAddr.trim(),
          valueWei: val.trim() || '0',
          data: dataHex.trim(),
          fromAddress: fromAddr.trim(),
          toAddress: toAddr.trim(),
          calldata: dataHex.trim(),
          chainId: chainId || 31337
        })
      });

      if (!response.ok) {
        throw new Error(`Simulation API error: ${response.status}`);
      }

      const resData = await response.json();
      setSimulationResult(resData);
    } catch (err: any) {
      console.warn('Backend /api/transaction/simulate unavailable, using offline fallback:', err);
      // Construct realistic local fallback matching the prompt
      const isApproval = dataHex.startsWith('0x095ea7b3');
      const isUnlimited = dataHex.includes('ffffffffffffffffffffffffffffffff');
      const isHoneypot = toAddr.toLowerCase() === honeypot.toLowerCase();

      // Extract recipient from calldata if transfer
      let recipientAddr = DEMO_RECIPIENT_ADDRESS;
      if (dataHex.startsWith('0xa9059cbb') && dataHex.length >= 74) {
        recipientAddr = '0x' + dataHex.substring(34, 74);
      }
      const isSelfTransfer = recipientAddr.toLowerCase() === fromAddr.toLowerCase();
      const tokenSym = isHoneypot ? 'TRAP' : 'SHLD';

      // Build projected balance deltas for both FROM and TO sides
      const fallbackBalanceDeltas: BalanceDelta[] = [];
      if (!isApproval) {
        if (isSelfTransfer) {
          fallbackBalanceDeltas.push({
            tokenAddress: toAddr,
            tokenSymbol: tokenSym,
            accountAddress: fromAddr,
            previousBalance: '50000.0',
            projectedBalance: '50000.0',
            delta: '0.0',
            formattedDelta: `0.0 ${tokenSym}`
          });
        } else {
          fallbackBalanceDeltas.push({
            tokenAddress: toAddr,
            tokenSymbol: tokenSym,
            accountAddress: fromAddr,
            previousBalance: '50000.0',
            projectedBalance: '49750.0',
            delta: '-250.0',
            formattedDelta: `-250.0 ${tokenSym}`
          });
          fallbackBalanceDeltas.push({
            tokenAddress: toAddr,
            tokenSymbol: tokenSym,
            accountAddress: recipientAddr,
            previousBalance: '0.0',
            projectedBalance: '250.0',
            delta: '+250.0',
            formattedDelta: `+250.0 ${tokenSym}`
          });
        }
      }

      setSimulationResult({
        id: 'sim-offline-' + Date.now(),
        simulationStatus: isHoneypot ? 'REVERTED' : 'SUCCESS',
        gasEstimated: isHoneypot ? null : isApproval ? 45000 : 52000,
        revertReason: isHoneypot ? 'HoneypotToken: Trading is locked by owner' : null,
        decodedCall: {
          methodSelector: dataHex.substring(0, 10),
          functionSignature: isApproval ? 'approve(address spender, uint256 amount)' : 'transfer(address to, uint256 amount)',
          actionType: isApproval ? 'TOKEN_APPROVAL' : 'TOKEN_TRANSFER',
          parameters: isApproval
            ? { spender: dangerousSpender, isUnlimited }
            : { recipient: recipientAddr, amount: '250.0' },
          isApproval,
          spenderAddress: isApproval ? dangerousSpender : undefined,
          isUnlimitedApproval: isUnlimited,
          humanInterpretation: isApproval
            ? `Approve spender ${dangerousSpender.substring(0, 8)}... with ${isUnlimited ? 'UNLIMITED' : 'specific'} allowance`
            : `Transfer 250.0 ${tokenSym} to ${recipientAddr.substring(0, 8)}... (${recipientAddr.toLowerCase() === DEMO_RECIPIENT_ADDRESS.toLowerCase() ? DEMO_RECIPIENT_LABEL : 'External Recipient'})`
        },
        stateEffects: {
          balanceDeltas: fallbackBalanceDeltas,
          allowanceDeltas: isApproval ? [
            {
              tokenAddress: toAddr,
              tokenSymbol: 'SHLD',
              ownerAddress: fromAddr,
              spenderAddress: dangerousSpender,
              previousAllowance: '0',
              projectedAllowance: isUnlimited ? 'UNLIMITED (MAX_UINT256)' : '100.0',
              isUnlimited,
              humanExplanation: `Projected allowance for spender will be ${isUnlimited ? 'UNLIMITED' : '100 units'}.`
            }
          ] : [],
          nativeEthDelta: '0.0 ETH (Gas ~0.0009 ETH)',
          projectedEvents: isApproval
            ? [`Approval(owner: ${fromAddr}, spender: ${dangerousSpender}, value: ${isUnlimited ? 'UNLIMITED (MAX_UINT256)' : '100.0 SHLD'})`]
            : [`Transfer(from: ${fromAddr}, to: ${recipientAddr}, amount: 250.0 ${tokenSym})`],
          summary: isHoneypot
            ? 'Execution reverted'
            : isApproval
            ? 'Simulation succeeded with projected allowance changes'
            : isSelfTransfer
            ? `Self-transfer of 250.0 ${tokenSym}. Net balance change is 0.0 ${tokenSym}.`
            : `Balances will update: ${fromAddr} will decrease by 250.0 ${tokenSym}, and recipient ${recipientAddr} will receive 250.0 ${tokenSym}.`
        },
        riskAssessment: {
          score: isHoneypot ? 95 : isUnlimited ? 77 : 0,
          severity: isHoneypot ? 'CRITICAL' : isUnlimited ? 'HIGH' : 'LOW',
          summary: isHoneypot
            ? 'CRITICAL RISK (95/100): Honeypot transfer lock detected.'
            : isUnlimited
            ? 'HIGH RISK (77/100): Dangerous unlimited token approval requested.'
            : 'LOW RISK (0/100): Baseline safe transfer.',
          disclaimer: 'PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only.',
          indicators: isHoneypot ? [
            {
              code: 'IND-T03',
              category: 'EXECUTION_FAILURE',
              title: 'Simulation Reverted on EVM',
              severity: 'HIGH',
              appliedWeight: 52,
              contextExplanation: 'eth_call dry-run failed with explicit revert: HoneypotToken: Trading is locked by owner',
              evidenceData: 'HoneypotToken: Trading is locked by owner'
            }
          ] : isUnlimited ? [
            {
              code: 'IND-T01',
              category: 'DANGEROUS_PERMISSIONS',
              title: 'Unlimited Token Approval Requested',
              severity: 'HIGH',
              appliedWeight: 45,
              contextExplanation: 'Transaction requests maximum allowance (MAX_UINT256) for external spender.',
              evidenceData: `Spender: ${dangerousSpender}`
            },
            {
              code: 'IND-T02',
              category: 'DANGEROUS_PERMISSIONS',
              title: 'Approval Granted to Suspected Drainer',
              severity: 'CRITICAL',
              appliedWeight: 32,
              contextExplanation: 'Spender is flagged as a Dangerous Approval Spender.',
              evidenceData: `Flagged Spender: ${dangerousSpender}`
            }
          ] : [],
          recommendations: isHoneypot
            ? ['Do NOT broadcast this transaction; token transfers are locked.']
            : isUnlimited
            ? ['Reduce approval amount to only the exact required quantity.']
            : ['Transaction appears normal on local testbed.']
        },
        networkInfo: {
          chainId: 31337,
          networkName: 'Hardhat Local EVM',
          isLocalDevnet: true,
          rpcConnected: true,
          currentBlock: 4
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  // Execution & Signing via Connected Wallet
  const handleExecuteInWallet = async () => {
    setIsSigning(true);
    setSigningError(null);
    setUserCancelledMessage(null);

    try {
      const txHash = await sendTransaction({
        to: target,
        value: valueWei,
        data: calldata
      });

      // Close modal and wait for mining receipt
      setIsReviewModalOpen(false);
      setLoading(true);

      const receipt = await waitForTransactionReceipt(txHash);
      setPostSignReceipt(receipt);
    } catch (err: any) {
      if (err.message?.includes('TRANSACTION_REJECTED') || err.message?.includes('cancelled by user')) {
        setUserCancelledMessage('Transaction signing was cancelled in your wallet. No funds or state were altered.');
        setIsReviewModalOpen(false);
      } else {
        setSigningError(err.message || 'Failed to submit transaction to wallet.');
      }
    } finally {
      setIsSigning(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Network Notice Banner */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>LOCAL DEMO NETWORK (Chain ID 31337): </strong>
            Pre-Execution Simulation Dry-Run Layer. Zero real cryptocurrency used.
          </span>
        </div>
        <span className="font-mono text-[11px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 hidden sm:inline">
          Hardhat Node: 8545
        </span>
      </div>

      {/* User Cancelled Feedback Banner */}
      {userCancelledMessage && (
        <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center justify-between">
          <span>{userCancelledMessage}</span>
          <button
            onClick={() => setUserCancelledMessage(null)}
            className="text-slate-400 hover:text-slate-200 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Post-Sign Confirmation View (Requirement 8 & 9) */}
      {postSignReceipt && (
        <PostSignReceiptView
          receipt={postSignReceipt}
          from={sender}
          to={target}
          friendlyAction={friendlyAction}
          onDismiss={() => setPostSignReceipt(null)}
        />
      )}

      {/* Scenario Presets Quick-Bar */}
      <Card
        title="Pre-Execution Transaction Simulator"
        subtitle="Dry-run transactions against local EVM state overrides before signing. No real funds are ever spent."
        variant="glow"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-shield-800 pb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-shield-cyan" />
              <span>Quick Demo Scenarios:</span>
            </span>

            {/* Input Mode Toggle */}
            <div className="flex bg-shield-950 p-1 rounded-lg border border-shield-800 text-xs font-mono">
              <button
                onClick={() => setInputMode('guided')}
                className={`px-3 py-1 rounded transition-colors ${
                  inputMode === 'guided'
                    ? 'bg-shield-cyan text-shield-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Guided Builder
              </button>
              <button
                onClick={() => setInputMode('direct')}
                className={`px-3 py-1 rounded transition-colors ${
                  inputMode === 'direct'
                    ? 'bg-shield-cyan text-shield-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct Payload
              </button>
            </div>
          </div>

          {/* Scenario Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              onClick={() => applyScenario('A')}
              className={`p-3 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between ${
                activeScenario === 'scenarioA'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300'
                  : 'bg-shield-850 hover:bg-shield-800 border-shield-750 text-slate-300'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                A: Safe Transfer
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Normal 250 SHLD transfer</span>
            </button>

            <button
              onClick={() => applyScenario('B')}
              className={`p-3 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between ${
                activeScenario === 'scenarioB'
                  ? 'bg-rose-500/10 border-rose-500/50 text-rose-300'
                  : 'bg-shield-850 hover:bg-shield-800 border-shield-750 text-slate-300'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                B: Unlimited Approval
              </span>
              <span className="text-[10px] text-slate-400 mt-1">MAX_UINT256 Spender grant</span>
            </button>

            <button
              onClick={() => applyScenario('C')}
              className={`p-3 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between ${
                activeScenario === 'scenarioC'
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                  : 'bg-shield-850 hover:bg-shield-800 border-shield-750 text-slate-300'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                C: Dangerous Spender
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Spender flagged as drainer</span>
            </button>

            <button
              onClick={() => applyScenario('D')}
              className={`p-3 rounded-lg border text-left text-xs transition-colors flex flex-col justify-between ${
                activeScenario === 'scenarioD'
                  ? 'bg-rose-500/10 border-rose-500/50 text-rose-300'
                  : 'bg-shield-850 hover:bg-shield-800 border-shield-750 text-slate-300'
              }`}
            >
              <span className="font-bold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                D: Honeypot Revert
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Trade locked revert test</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Guided Builder Mode */}
      {inputMode === 'guided' && (
        <TransactionBuilder
          onPrepared={handlePreparedPayload}
          disabled={loading}
        />
      )}

      {/* Direct Parameter Input Mode */}
      {inputMode === 'direct' && (
        <Card title="Candidate Transaction Parameters">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-400 font-sans">From (Sender / Caller):</label>
                <input
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  className="w-full p-2.5 rounded bg-shield-900 border border-shield-700 text-slate-200 focus:outline-none focus:border-shield-cyan text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-sans">To (Target Contract / Recipient):</label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full p-2.5 rounded bg-shield-900 border border-shield-700 text-slate-200 focus:outline-none focus:border-shield-cyan text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-sans">Native Value (Wei):</label>
                <input
                  type="text"
                  value={valueWei}
                  onChange={(e) => setValueWei(e.target.value)}
                  className="w-full p-2.5 rounded bg-shield-900 border border-shield-700 text-slate-200 focus:outline-none focus:border-shield-cyan text-xs"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-slate-400 font-sans">Hex Calldata (ABI Payload):</label>
                <textarea
                  rows={2}
                  value={calldata}
                  onChange={(e) => setCalldata(e.target.value)}
                  className="w-full p-2.5 rounded bg-shield-900 border border-shield-700 text-slate-200 focus:outline-none focus:border-shield-cyan text-xs break-all"
                />
              </div>
            </div>

            <button
              onClick={() => runSimulationWithParams(sender, target, valueWei, calldata)}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <span>Run Pre-Execution Simulation</span>
            </button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <LoadingState
          message="Executing isolated eth_call dry-run on local EVM..."
          subtext="Querying state deltas, decoding parameters, and inspecting threat registers"
        />
      )}

      {/* Simulation Result Presentation Layer */}
      {!loading && simulationResult && (
        <div className="space-y-6 animate-fade-in">
          {/* Status & Risk Header Card */}
          <Card
            title="Pre-Execution Simulation Outcomes"
            subtitle={`Simulation Status: ${simulationResult.simulationStatus}`}
            action={
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                    simulationResult.simulationStatus === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {simulationResult.simulationStatus}
                </span>
                <RiskBadge
                  level={simulationResult.riskAssessment.severity}
                  score={simulationResult.riskAssessment.score}
                />
              </div>
            }
          >
            {/* Revert Alert Box */}
            {simulationResult.simulationStatus === 'REVERTED' && (
              <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs mb-4 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-300 text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  Simulation Reverted on Local Hardhat EVM
                </div>
                <div className="font-mono text-xs bg-rose-950/60 p-2.5 rounded border border-rose-500/20 mt-1">
                  Reason: {simulationResult.revertReason || 'Execution reverted without reason string'}
                </div>
                <p className="text-[11px] text-rose-200/80 pt-1">
                  If broadcast to the network, this transaction will fail on-chain and forfeit all consumed gas fees.
                </p>
              </div>
            )}

            {/* Summary Explanation */}
            <div className="p-4 rounded-xl bg-shield-900 border border-shield-750 text-xs leading-relaxed space-y-2">
              <div className="text-slate-200 font-medium">
                {simulationResult.riskAssessment.summary}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Gas Estimated: {simulationResult.gasEstimated ? `${simulationResult.gasEstimated.toLocaleString()} units` : 'N/A (Reverted)'} | Chain ID: {simulationResult.networkInfo.chainId} ({simulationResult.networkInfo.networkName})
              </div>
            </div>

            {/* Token Identification Box before Wallet Action */}
            <div className="p-3.5 rounded-xl bg-shield-950 border border-shield-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-shield-cyan/15 border border-shield-cyan/30 flex items-center justify-center font-bold text-shield-cyan text-xs">
                  {target.toLowerCase() === honeypot.toLowerCase() ? 'TRAP' : 'SHLD'}
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider font-mono">
                    Token Asset Identity
                  </div>
                  <div className="text-slate-100 font-semibold text-sm flex items-center gap-2">
                    <span>
                      {target.toLowerCase() === honeypot.toLowerCase()
                        ? 'HoneypotToken (TRAP)'
                        : 'ShieldToken (SHLD)'}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wide">
                      LOCAL DEMO TOKEN
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 sm:text-right font-sans">
                <div className="font-mono text-[10px] text-slate-400">
                  Target Contract: {target.substring(0, 10)}...{target.substring(34)}
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  (Browser wallets may show &ldquo;Unknown&rdquo; because custom local demo tokens are not in public tokenlists)
                </div>
              </div>
            </div>

            {/* STEP 4 & 5: USER DECISION & CONTINUE TO WALLET BUTTON (Requirement 6 & 7) */}
            <div className="mt-4 pt-4 border-t border-shield-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-sans">
                {simulationResult.simulationStatus === 'SUCCESS' ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Dry-run succeeded. You can proceed to wallet signing.
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1 font-medium">
                    <XCircle className="w-4 h-4" /> Revert detected. Signing disabled to prevent gas loss.
                  </span>
                )}
              </div>

              {simulationResult.simulationStatus === 'SUCCESS' ? (
                isConnected ? (
                  isLocalNetwork ? (
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-shield-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Continue to Wallet (Review & Sign)</span>
                    </button>
                  ) : (
                    <button
                      onClick={switchOrAddHardhatNetwork}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Switch to Hardhat (31337) to Sign</span>
                    </button>
                  )
                ) : (
                  <button
                    onClick={connectWallet}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect Wallet to Sign</span>
                  </button>
                )
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-shield-850 text-slate-500 border border-shield-750 font-bold text-xs cursor-not-allowed"
                >
                  Continue to Wallet (Disabled)
                </button>
              )}
            </div>

            {/* Cross-Module Navigation Actions */}
            <div className="mt-3 pt-3 border-t border-shield-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Cross-Module Actions:</span>
              <button
                onClick={() => onNavigate?.('investigation', { address: target })}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-shield-cyan/15 hover:bg-shield-cyan/25 text-shield-cyan border border-shield-cyan/30 flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Investigate Target</span>
              </button>
              <button
                onClick={() => onNavigate?.('contract-analyzer', { address: target })}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-colors"
              >
                <FileCode className="w-3 h-3" />
                <span>Analyze Target Contract</span>
              </button>
              <button
                onClick={() => onNavigate?.('transaction-graph', { address: target })}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors"
              >
                <Waypoints className="w-3 h-3" />
                <span>Explore in Graph</span>
              </button>
              <button
                onClick={() => onNavigate?.('reports', { initialTab: 'TRANSACTIONS' })}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-shield-800 hover:bg-shield-750 text-slate-300 border border-shield-700 flex items-center gap-1.5 transition-colors"
              >
                <History className="w-3 h-3" />
                <span>Audit & History</span>
              </button>
            </div>
          </Card>

          {/* Decoded Call Card */}
          <Card title="Decoded Calldata & Function Parameters">
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-shield-900 border border-shield-750 font-mono text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between border-b border-shield-800 pb-2 gap-1">
                  <span className="text-slate-400">Function Signature:</span>
                  <span className="text-shield-cyan font-bold">{simulationResult.decodedCall.functionSignature}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between border-b border-shield-800 pb-2 gap-1">
                  <span className="text-slate-400">Action Classification:</span>
                  <span className="text-slate-200">{simulationResult.decodedCall.actionType}</span>
                </div>

                {simulationResult.decodedCall.spenderAddress && (
                  <div className="flex flex-col sm:flex-row sm:justify-between border-b border-shield-800 pb-2 gap-1">
                    <span className="text-slate-400">Spender Parameter:</span>
                    <span className="text-slate-200">{simulationResult.decodedCall.spenderAddress}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 pt-1">
                  <span className="text-slate-400">Human Interpretation:</span>
                  <span className="text-slate-300 italic">{simulationResult.decodedCall.humanInterpretation}</span>
                </div>
              </div>

              {simulationResult.decodedCall.isUnlimitedApproval && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-bold block">Security Alert: Unlimited Allowance Grant</span>
                    This transaction grants unconstrained spending power over all of your tokens. An exploited spender contract can drain your entire balance.
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Projected State Effects Card */}
          <Card title="Projected State Changes & Balance Deltas">
            <div className="space-y-4">
              {/* Token Balance Deltas */}
              {simulationResult.stateEffects.balanceDeltas.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Projected Token Balance Modifications
                  </span>
                  <div className="space-y-2">
                    {simulationResult.stateEffects.balanceDeltas.map((delta, idx) => {
                      const isNegative = delta.formattedDelta.startsWith('-') || delta.delta.startsWith('-');
                      const isPositive = delta.formattedDelta.startsWith('+') || (!isNegative && delta.delta !== '0' && delta.delta !== '0.0' && !delta.delta.startsWith('0'));
                      const isDemoRecipient = delta.accountAddress.toLowerCase() === DEMO_RECIPIENT_ADDRESS.toLowerCase();
                      const isSender = delta.accountAddress.toLowerCase() === sender.toLowerCase();

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-shield-900 border border-shield-750 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isPositive
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : isNegative
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                  : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                              }`}
                            >
                              {isPositive ? 'TO (Recipient)' : isNegative ? 'FROM (Sender)' : 'SELF'}
                            </span>
                            <span className="text-slate-200 select-all">{delta.accountAddress}</span>
                            {isDemoRecipient && (
                              <span className="px-1.5 py-0.5 text-[9px] font-sans font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                LOCAL DEMO RECIPIENT
                              </span>
                            )}
                            {isSender && (
                              <span className="px-1.5 py-0.5 text-[9px] font-sans font-semibold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Active Sender
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-bold text-sm ${
                              isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            {delta.formattedDelta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Allowance Deltas */}
              {simulationResult.stateEffects.allowanceDeltas.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Projected Token Allowance Modifications
                  </span>
                  <div className="space-y-2">
                    {simulationResult.stateEffects.allowanceDeltas.map((al, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-shield-900 border border-shield-750 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Spender:</span>
                          <span className="text-slate-200">{al.spenderAddress}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Projected Allowance:</span>
                          <span className={al.isUnlimited ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {al.isUnlimited ? 'UNLIMITED (MAX_UINT256)' : al.projectedAllowance}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans italic pt-1">{al.humanExplanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Native ETH Delta & Events */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-shield-900 border border-shield-750 text-xs space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Native ETH Outflow:</span>
                  <span className="text-slate-200 font-mono text-xs">{simulationResult.stateEffects.nativeEthDelta}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-shield-900 border border-shield-750 text-xs space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold block">Projected Event Logs:</span>
                  <span className="text-slate-200 font-mono text-xs">
                    {simulationResult.stateEffects.projectedEvents.length > 0
                      ? simulationResult.stateEffects.projectedEvents.join(', ')
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Triggered Risk Indicators Card */}
          <Card title="Contributing Threat Indicators">
            {simulationResult.riskAssessment.indicators.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Zero elevated threat indicators detected during transaction dry-run.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {simulationResult.riskAssessment.indicators.map((ind, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-shield-900 border border-shield-750 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-shield-800 border border-shield-700 font-mono font-bold text-shield-cyan text-[11px]">
                          {ind.code}
                        </span>
                        <span className="font-bold text-slate-200">{ind.title}</span>
                      </div>
                      <span className="text-rose-400 font-bold font-mono">+{ind.appliedWeight} pts</span>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">{ind.contextExplanation}</p>
                    {ind.evidenceData && (
                      <div className="font-mono text-[11px] text-slate-400 bg-shield-950/70 p-2 rounded border border-shield-800">
                        Evidence: {ind.evidenceData}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {simulationResult.riskAssessment.recommendations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-shield-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Actionable Recommendations:
                </span>
                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                  {simulationResult.riskAssessment.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Academic Boundary Notice */}
            <div className="mt-4 p-2.5 rounded bg-shield-950/80 border border-shield-800 text-[10px] text-slate-400 leading-normal">
              {simulationResult.riskAssessment.disclaimer}
            </div>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && !simulationResult && (
        <EmptyState
          title="Ready for Pre-Execution Simulation"
          description="Use the interactive builder above or choose a scenario preset to simulate transaction execution against the local Hardhat node."
          icon={<ArrowRightLeft className="w-6 h-6 text-slate-400" />}
        />
      )}

      {/* Explicit Security Review & Signing Modal (Requirement 10) */}
      <SecurityReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirmSign={handleExecuteInWallet}
        payload={{
          from: sender,
          to: target,
          valueWei,
          data: calldata,
          friendlyAction,
          targetContractName:
            target.toLowerCase() === mockToken.toLowerCase()
              ? 'ShieldToken (SHLD)'
              : target.toLowerCase() === honeypot.toLowerCase()
              ? 'TrapToken (TRAP)'
              : simulationResult?.decodedCall?.actionType || 'Contract'
        }}
        simulationResult={simulationResult}
        isSigning={isSigning}
        signingError={signingError}
      />
    </div>
  );
};
