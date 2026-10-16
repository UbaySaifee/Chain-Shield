import { ethers } from 'ethers';
import contractsData from '../config/contracts.json';

export interface DeployedContractInfo {
  name: string;
  address: string;
  symbol?: string;
  decimals?: number;
  type: string;
  description: string;
  expectedRisk?: string;
}

export const DEPLOYED_CONTRACTS: Record<string, DeployedContractInfo> = {
  MockERC20: {
    name: 'ShieldToken (SHLD)',
    address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    symbol: 'SHLD',
    decimals: 18,
    type: 'BENIGN_ERC20',
    description: 'Audited benign standard ERC-20 reference token.',
    expectedRisk: 'LOW'
  },
  SafeVault: {
    name: 'SafeVault (Escrow)',
    address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    type: 'BENIGN_VAULT',
    description: 'Reentrancy-guarded escrow contract with transparent accounting.',
    expectedRisk: 'LOW'
  },
  DangerousApprovalSpender: {
    name: 'DangerousApprovalSpender (Drainer Demo)',
    address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0',
    type: 'DANGEROUS_SPENDER',
    description: 'Contract designed to exploit unlimited token allowances and drain funds.',
    expectedRisk: 'HIGH'
  },
  HoneypotToken: {
    name: 'HoneypotToken (TRAP)',
    address: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
    symbol: 'TRAP',
    decimals: 18,
    type: 'HONEYPOT_TOKEN',
    description: 'Honeypot token with trading locked and unilateral owner controls.',
    expectedRisk: 'CRITICAL'
  }
};

// Also sync from contracts.json if available
if (contractsData && contractsData.contracts) {
  const c = contractsData.contracts as Record<string, any>;
  if (c.MockERC20?.address) DEPLOYED_CONTRACTS.MockERC20.address = c.MockERC20.address;
  if (c.SafeVault?.address) DEPLOYED_CONTRACTS.SafeVault.address = c.SafeVault.address;
  if (c.DangerousApprovalSpender?.address) DEPLOYED_CONTRACTS.DangerousApprovalSpender.address = c.DangerousApprovalSpender.address;
  if (c.HoneypotToken?.address) DEPLOYED_CONTRACTS.HoneypotToken.address = c.HoneypotToken.address;
}

// Centralized Deterministic Demo Fixture Accounts
export const DEMO_RECIPIENT_ADDRESS =
  (contractsData as any)?.demoRecipient || '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

export const DEMO_RECIPIENT_LABEL = 'Wallet B (Local Demo Recipient)';

// ABI Interfaces for Encoding
const ERC20_INTERFACE = new ethers.Interface([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
]);

const VAULT_INTERFACE = new ethers.Interface([
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)'
]);

const HONEYPOT_INTERFACE = new ethers.Interface([
  'function setTradingLocked(bool locked)'
]);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a hexadecimal EVM address.
 */
export function validateEvmAddress(address: string): ValidationResult {
  if (!address || !address.trim()) {
    return { isValid: false, error: 'Address is required.' };
  }
  const clean = address.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(clean)) {
    return { isValid: false, error: 'Must be a valid 42-character hexadecimal EVM address (0x...).' };
  }
  return { isValid: true };
}

/**
 * Validates a positive numeric amount.
 */
export function validateAmount(amount: string): ValidationResult {
  if (!amount || !amount.trim()) {
    return { isValid: false, error: 'Amount is required.' };
  }
  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) {
    return { isValid: false, error: 'Amount must be a positive number greater than 0.' };
  }
  return { isValid: true };
}

/**
 * Encodes an ERC-20 transfer(address to, uint256 amount) call.
 */
export function encodeErc20Transfer(to: string, amountTokens: string, decimals = 18): string {
  const addrCheck = validateEvmAddress(to);
  if (!addrCheck.isValid) throw new Error(addrCheck.error);
  const amtCheck = validateAmount(amountTokens);
  if (!amtCheck.isValid) throw new Error(amtCheck.error);

  const amountWei = ethers.parseUnits(amountTokens.trim(), decimals);
  return ERC20_INTERFACE.encodeFunctionData('transfer', [to.trim(), amountWei]);
}

/**
 * Encodes an ERC-20 approve(address spender, uint256 amount) call.
 * If isUnlimited is true, uses MAX_UINT256.
 */
export function encodeErc20Approve(spender: string, amountTokens: string, isUnlimited = false, decimals = 18): string {
  const addrCheck = validateEvmAddress(spender);
  if (!addrCheck.isValid) throw new Error(addrCheck.error);

  let amountWei: bigint;
  if (isUnlimited) {
    amountWei = ethers.MaxUint256;
  } else {
    const amtCheck = validateAmount(amountTokens);
    if (!amtCheck.isValid) throw new Error(amtCheck.error);
    amountWei = ethers.parseUnits(amountTokens.trim(), decimals);
  }

  return ERC20_INTERFACE.encodeFunctionData('approve', [spender.trim(), amountWei]);
}

/**
 * Encodes an ERC-20 transferFrom(address from, address to, uint256 amount) call.
 */
export function encodeErc20TransferFrom(from: string, to: string, amountTokens: string, decimals = 18): string {
  const fromCheck = validateEvmAddress(from);
  if (!fromCheck.isValid) throw new Error('From ' + fromCheck.error);
  const toCheck = validateEvmAddress(to);
  if (!toCheck.isValid) throw new Error('To ' + toCheck.error);
  const amtCheck = validateAmount(amountTokens);
  if (!amtCheck.isValid) throw new Error(amtCheck.error);

  const amountWei = ethers.parseUnits(amountTokens.trim(), decimals);
  return ERC20_INTERFACE.encodeFunctionData('transferFrom', [from.trim(), to.trim(), amountWei]);
}

/**
 * Encodes SafeVault.deposit(uint256 amount) call.
 */
export function encodeVaultDeposit(amountTokens: string, decimals = 18): string {
  const amtCheck = validateAmount(amountTokens);
  if (!amtCheck.isValid) throw new Error(amtCheck.error);

  const amountWei = ethers.parseUnits(amountTokens.trim(), decimals);
  return VAULT_INTERFACE.encodeFunctionData('deposit', [amountWei]);
}

/**
 * Encodes SafeVault.withdraw(uint256 amount) call.
 */
export function encodeVaultWithdraw(amountTokens: string, decimals = 18): string {
  const amtCheck = validateAmount(amountTokens);
  if (!amtCheck.isValid) throw new Error(amtCheck.error);

  const amountWei = ethers.parseUnits(amountTokens.trim(), decimals);
  return VAULT_INTERFACE.encodeFunctionData('withdraw', [amountWei]);
}

/**
 * Encodes HoneypotToken.setTradingLocked(bool locked) call.
 */
export function encodeHoneypotSetTradingLocked(locked: boolean): string {
  return HONEYPOT_INTERFACE.encodeFunctionData('setTradingLocked', [locked]);
}

/**
 * Formats Wei into decimal ETH string.
 */
export function formatEth(wei: bigint | string): string {
  try {
    const b = typeof wei === 'string' ? BigInt(wei) : wei;
    return ethers.formatEther(b);
  } catch {
    return '0.0';
  }
}
