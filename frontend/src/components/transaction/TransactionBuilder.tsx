import React, { useState, useEffect, useMemo } from 'react';
import {
  DEPLOYED_CONTRACTS,
  DEMO_RECIPIENT_ADDRESS,
  DEMO_RECIPIENT_LABEL,
  encodeErc20Transfer,
  encodeErc20Approve,
  encodeErc20TransferFrom,
  encodeVaultDeposit,
  encodeVaultWithdraw,
  validateEvmAddress,
  validateAmount
} from '../../utils/transactionBuilder';
import { Layers, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export type ActionType =
  | 'erc20_transfer'
  | 'erc20_approve'
  | 'erc20_transferFrom'
  | 'vault_deposit'
  | 'vault_withdraw'
  | 'native_transfer'
  | 'raw_calldata';

export interface PreparedTransactionPayload {
  from: string;
  to: string;
  valueWei: string;
  data: string;
  friendlyAction: string;
  targetContractName: string;
}

interface TransactionBuilderProps {
  onPrepared: (payload: PreparedTransactionPayload) => void;
  disabled?: boolean;
}

export const TransactionBuilder: React.FC<TransactionBuilderProps> = ({ onPrepared, disabled = false }) => {
  const { account } = useWallet();

  const [fromAddress, setFromAddress] = useState(
    account || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  );

  useEffect(() => {
    if (account) {
      setFromAddress(account);
    }
  }, [account]);

  const [actionType, setActionType] = useState<ActionType>('erc20_transfer');
  const [selectedContractKey, setSelectedContractKey] = useState<string>('MockERC20');
  const [customToAddress, setCustomToAddress] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>(DEMO_RECIPIENT_ADDRESS);
  const [spenderAddress, setSpenderAddress] = useState<string>(
    DEPLOYED_CONTRACTS.DangerousApprovalSpender.address
  );
  const [transferFromOwner, setTransferFromOwner] = useState<string>('');
  const [amountTokens, setAmountTokens] = useState<string>('250');
  const [isUnlimitedApproval, setIsUnlimitedApproval] = useState<boolean>(false);
  const [nativeEthAmount, setNativeEthAmount] = useState<string>('0.05');
  const [rawCalldata, setRawCalldata] = useState<string>('0x');

  // Compute active target contract address
  const activeToAddress = useMemo(() => {
    if (actionType === 'native_transfer') {
      return recipientAddress;
    }
    if (selectedContractKey === 'custom') {
      return customToAddress;
    }
    const contract = DEPLOYED_CONTRACTS[selectedContractKey];
    return contract ? contract.address : '';
  }, [actionType, selectedContractKey, customToAddress, recipientAddress]);

  // Real-time generated calldata and validation
  const { generatedCalldata, validationError, friendlyDescription } = useMemo(() => {
    try {
      const fromVal = validateEvmAddress(fromAddress);
      if (!fromVal.isValid) return { generatedCalldata: '0x', validationError: fromVal.error, friendlyDescription: '' };

      const toVal = validateEvmAddress(activeToAddress);
      if (!toVal.isValid) return { generatedCalldata: '0x', validationError: 'Target ' + toVal.error, friendlyDescription: '' };

      switch (actionType) {
        case 'erc20_transfer': {
          const calldata = encodeErc20Transfer(recipientAddress, amountTokens);
          return {
            generatedCalldata: calldata,
            validationError: null,
            friendlyDescription: `Transfer ${amountTokens} ${DEPLOYED_CONTRACTS[selectedContractKey]?.symbol || 'tokens'} to ${recipientAddress.substring(0, 8)}...`
          };
        }
        case 'erc20_approve': {
          const calldata = encodeErc20Approve(spenderAddress, amountTokens, isUnlimitedApproval);
          return {
            generatedCalldata: calldata,
            validationError: null,
            friendlyDescription: isUnlimitedApproval
              ? `Approve UNLIMITED allowance for spender ${spenderAddress.substring(0, 8)}...`
              : `Approve ${amountTokens} tokens allowance for spender ${spenderAddress.substring(0, 8)}...`
          };
        }
        case 'erc20_transferFrom': {
          const calldata = encodeErc20TransferFrom(transferFromOwner, recipientAddress, amountTokens);
          return {
            generatedCalldata: calldata,
            validationError: null,
            friendlyDescription: `Transfer ${amountTokens} tokens from ${transferFromOwner.substring(0, 8)}... to ${recipientAddress.substring(0, 8)}...`
          };
        }
        case 'vault_deposit': {
          const calldata = encodeVaultDeposit(amountTokens);
          return {
            generatedCalldata: calldata,
            validationError: null,
            friendlyDescription: `Deposit ${amountTokens} tokens into SafeVault escrow`
          };
        }
        case 'vault_withdraw': {
          const calldata = encodeVaultWithdraw(amountTokens);
          return {
            generatedCalldata: calldata,
            validationError: null,
            friendlyDescription: `Withdraw ${amountTokens} tokens from SafeVault escrow`
          };
        }
        case 'native_transfer': {
          const amtVal = validateAmount(nativeEthAmount);
          if (!amtVal.isValid) return { generatedCalldata: '0x', validationError: amtVal.error, friendlyDescription: '' };
          return {
            generatedCalldata: '0x',
            validationError: null,
            friendlyDescription: `Send ${nativeEthAmount} ETH directly to ${recipientAddress.substring(0, 8)}...`
          };
        }
        case 'raw_calldata': {
          const clean = rawCalldata.trim();
          if (!clean.startsWith('0x')) return { generatedCalldata: '0x', validationError: 'Calldata must begin with 0x', friendlyDescription: '' };
          return {
            generatedCalldata: clean,
            validationError: null,
            friendlyDescription: `Raw calldata execution (${clean.substring(0, 10)}...)`
          };
        }
        default:
          return { generatedCalldata: '0x', validationError: 'Select a valid action', friendlyDescription: '' };
      }
    } catch (e: any) {
      return { generatedCalldata: '0x', validationError: e.message, friendlyDescription: '' };
    }
  }, [
    actionType,
    fromAddress,
    activeToAddress,
    recipientAddress,
    spenderAddress,
    transferFromOwner,
    amountTokens,
    isUnlimitedApproval,
    nativeEthAmount,
    rawCalldata,
    selectedContractKey
  ]);

  const handleApplyToSimulation = () => {
    if (validationError) return;

    let valueWei = '0';
    if (actionType === 'native_transfer') {
      try {
        const valBig = BigInt(Math.floor(parseFloat(nativeEthAmount) * 1e18));
        valueWei = valBig.toString();
      } catch {
        valueWei = '0';
      }
    }

    const targetName =
      actionType === 'native_transfer'
        ? 'Native Account'
        : selectedContractKey === 'custom'
        ? 'Custom Contract'
        : DEPLOYED_CONTRACTS[selectedContractKey]?.name || 'Contract';

    onPrepared({
      from: fromAddress.trim(),
      to: activeToAddress.trim(),
      valueWei,
      data: generatedCalldata,
      friendlyAction: friendlyDescription,
      targetContractName: targetName
    });
  };

  return (
    <div className="p-5 rounded-2xl bg-shield-900 border border-shield-750 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-shield-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-shield-cyan" />
            <span>Interactive Transaction Builder</span>
          </h3>
          <p className="text-xs text-slate-400">
            Select a friendly operation or contract; calldata is generated automatically.
          </p>
        </div>

        {/* Quick Action Selector Pills */}
        <div className="flex flex-wrap gap-1 bg-shield-950 p-1 rounded-lg border border-shield-800 text-[11px] font-mono">
          <button
            onClick={() => {
              setActionType('erc20_transfer');
              setSelectedContractKey('MockERC20');
              setAmountTokens('250');
            }}
            className={`px-2.5 py-1 rounded transition-colors ${
              actionType === 'erc20_transfer' ? 'bg-shield-cyan text-shield-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Transfer
          </button>
          <button
            onClick={() => {
              setActionType('erc20_approve');
              setSelectedContractKey('MockERC20');
              setIsUnlimitedApproval(true);
            }}
            className={`px-2.5 py-1 rounded transition-colors ${
              actionType === 'erc20_approve' ? 'bg-shield-cyan text-shield-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Approve
          </button>
          <button
            onClick={() => {
              setActionType('vault_deposit');
              setSelectedContractKey('SafeVault');
              setAmountTokens('100');
            }}
            className={`px-2.5 py-1 rounded transition-colors ${
              actionType === 'vault_deposit' ? 'bg-shield-cyan text-shield-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Vault
          </button>
          <button
            onClick={() => setActionType('raw_calldata')}
            className={`px-2.5 py-1 rounded transition-colors ${
              actionType === 'raw_calldata' ? 'bg-shield-cyan text-shield-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Hex
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* From Address */}
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex justify-between items-center text-[11px] font-sans">
            <label className="text-slate-300 font-medium">From Address (Caller / Wallet)</label>
            {account && (
              <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" /> Connected Wallet Active
              </span>
            )}
          </div>
          <input
            type="text"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
            placeholder="0x..."
          />
        </div>

        {/* Action Type & Contract Selection */}
        {actionType !== 'raw_calldata' && actionType !== 'native_transfer' && (
          <>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-sans">
                <label className="text-slate-300 font-medium">
                  Target Deployed Contract
                </label>
                {selectedContractKey === 'MockERC20' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    LOCAL DEMO TOKEN
                  </span>
                )}
              </div>
              <select
                value={selectedContractKey}
                onChange={(e) => setSelectedContractKey(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan font-sans"
              >
                <option value="MockERC20">ShieldToken (SHLD) — Benign ERC-20 Reference (LOCAL DEMO TOKEN)</option>
                <option value="SafeVault">SafeVault — Audited Escrow Vault</option>
                <option value="HoneypotToken">HoneypotToken (TRAP) — Trading Locked Scam</option>
                <option value="DangerousApprovalSpender">DangerousApprovalSpender — Drainer Target</option>
                <option value="custom">Custom Address Input...</option>
              </select>
            </div>

            {selectedContractKey === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-slate-300 font-sans font-medium text-[11px]">
                  Custom Contract Address
                </label>
                <input
                  type="text"
                  value={customToAddress}
                  onChange={(e) => setCustomToAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                  placeholder="0x..."
                />
              </div>
            )}
          </>
        )}

        {/* Dynamic Fields for ERC-20 Transfer */}
        {actionType === 'erc20_transfer' && (
          <>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-sans">
                <label className="text-slate-300 font-medium">Recipient Address</label>
                <button
                  type="button"
                  onClick={() => setRecipientAddress(DEMO_RECIPIENT_ADDRESS)}
                  className="text-shield-cyan hover:underline text-[10px] flex items-center gap-1 font-mono"
                  title="Use deterministic Hardhat counterparty account (Wallet B)"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {DEMO_RECIPIENT_LABEL}
                </button>
              </div>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan font-mono text-xs"
                placeholder="0x..."
              />
              {recipientAddress.toLowerCase() === DEMO_RECIPIENT_ADDRESS.toLowerCase() && (
                <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  LOCAL DEMO RECIPIENT: {DEMO_RECIPIENT_LABEL}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-sans">
                <label className="text-slate-300 font-medium">Token Quantity</label>
                <div className="flex gap-1">
                  {['50', '250', '1000'].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmountTokens(amt)}
                      className="px-1.5 py-0.5 rounded bg-shield-800 text-slate-300 text-[10px] hover:bg-shield-750"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                value={amountTokens}
                onChange={(e) => setAmountTokens(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="250"
              />
            </div>
          </>
        )}

        {/* Dynamic Fields for ERC-20 Approve */}
        {actionType === 'erc20_approve' && (
          <>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-sans">
                <label className="text-slate-300 font-medium">Spender Contract</label>
                <button
                  onClick={() => setSpenderAddress(DEPLOYED_CONTRACTS.DangerousApprovalSpender.address)}
                  className="text-amber-400 hover:text-amber-300 text-[10px]"
                >
                  Use Demo Drainer
                </button>
              </div>
              <input
                type="text"
                value={spenderAddress}
                onChange={(e) => setSpenderAddress(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-medium text-[11px]">Approval Scope</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUnlimitedApproval(false)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-center transition-colors ${
                    !isUnlimitedApproval
                      ? 'bg-shield-800 border-shield-cyan text-slate-100 font-bold'
                      : 'bg-shield-950 border-shield-750 text-slate-400'
                  }`}
                >
                  Exact ({amountTokens || '0'})
                </button>
                <button
                  type="button"
                  onClick={() => setIsUnlimitedApproval(true)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-center transition-colors ${
                    isUnlimitedApproval
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                      : 'bg-shield-950 border-shield-750 text-slate-400'
                  }`}
                >
                  MAX_UINT (Unlimited)
                </button>
              </div>
            </div>
          </>
        )}

        {/* Dynamic Fields for ERC-20 TransferFrom */}
        {actionType === 'erc20_transferFrom' && (
          <>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-medium text-[11px]">Token Owner (From)</label>
              <input
                type="text"
                value={transferFromOwner}
                onChange={(e) => setTransferFromOwner(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-medium text-[11px]">Recipient Address (To)</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-slate-300 font-sans font-medium text-[11px]">Token Quantity</label>
              <input
                type="number"
                value={amountTokens}
                onChange={(e) => setAmountTokens(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="100"
              />
            </div>
          </>
        )}

        {/* SafeVault deposit / withdraw amount */}
        {(actionType === 'vault_deposit' || actionType === 'vault_withdraw') && (
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-slate-300 font-sans font-medium text-[11px]">Escrow Token Quantity</label>
            <input
              type="number"
              value={amountTokens}
              onChange={(e) => setAmountTokens(e.target.value)}
              className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
              placeholder="100"
            />
          </div>
        )}

        {/* Native ETH transfer */}
        {actionType === 'native_transfer' && (
          <>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-medium text-[11px]">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-medium text-[11px]">ETH Value</label>
              <input
                type="number"
                step="0.01"
                value={nativeEthAmount}
                onChange={(e) => setNativeEthAmount(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="0.05"
              />
            </div>
          </>
        )}

        {/* Raw calldata input */}
        {actionType === 'raw_calldata' && (
          <>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-medium text-[11px]">Target Contract (To)</label>
              <input
                type="text"
                value={activeToAddress}
                onChange={(e) => setCustomToAddress(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-300 font-sans font-medium text-[11px]">Raw Hex Calldata</label>
              <input
                type="text"
                value={rawCalldata}
                onChange={(e) => setRawCalldata(e.target.value)}
                className="w-full px-3 py-2 bg-shield-950 border border-shield-750 rounded-lg text-slate-200 focus:outline-none focus:border-shield-cyan"
                placeholder="0xa9059cbb..."
              />
            </div>
          </>
        )}
      </div>

      {/* Generated Calldata Preview Box */}
      <div className="p-3.5 rounded-xl bg-shield-950 border border-shield-800 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 uppercase tracking-wider font-semibold font-sans flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-shield-cyan" />
            Generated Calldata & Action
          </span>
          <span className="font-mono text-emerald-400 font-semibold">{friendlyDescription || 'Ready'}</span>
        </div>
        <div className="p-2.5 bg-shield-900 rounded font-mono text-[11px] text-slate-300 break-all border border-shield-800/80">
          {generatedCalldata}
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Prepare & Load Action Button */}
      <button
        onClick={handleApplyToSimulation}
        disabled={Boolean(validationError) || disabled}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-shield-cyan to-shield-indigo hover:opacity-95 text-shield-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-shield-cyan/10"
      >
        <span>Prepare for Pre-Execution Simulation</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
