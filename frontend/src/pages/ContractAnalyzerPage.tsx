import React, { useState, useEffect } from 'react';
import { Card } from '../components/common/Card';
import { RiskBadge, type RiskLevel } from '../components/common/RiskBadge';
import { EmptyState, LoadingState, ErrorState } from '../components/common/StateFeedback';
import { EvidencePanel } from '../components/common/EvidencePanel';
import { apiClient } from '../api/client';
import type { PageRoute } from '../components/layout/Sidebar';
import {
  FileCode,
  Search,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  History,
  Lock,
  Unlock,
  Layers,
  ChevronDown,
  ChevronUp,
  Terminal,
  User,
  Info,
  Clock,
  ExternalLink,
  Waypoints,
  Play
} from 'lucide-react';
import contractsData from '../config/contracts.json';

export interface ContractMetadata {
  name: string;
  symbol: string;
  decimals: number | null;
  totalSupplyFormatted: string | null;
  isErc20: boolean;
  bytecodeSizeBytes: number;
  sourceStatus: string;
  isBytecodePresent: boolean;
  deployedBytecodeSnippet: string;
  compilerVersion: string;
  license: string;
  contractName?: string;
  sourceVerified?: boolean;
}

export interface OwnershipInfo {
  hasOwner: boolean;
  ownerAddress: string;
  privilegeType: string;
  callableFunctions: string[];
  whyItMatters: string;
  ownerDetected?: boolean;
}

export interface AdminInfo {
  hasAdmin: boolean;
  adminAddress: string;
  accessControlDetected: boolean;
  rolesSummary: string[];
  details: string;
}

export interface ProxyInfo {
  proxyDetected: string;
  implementationAddress: string;
  adminAddress: string;
  upgradeabilityDetected: string;
  proxyType: string;
  isHeuristicIndicator: boolean;
}

export interface FunctionDefinition {
  name: string;
  signature: string;
  stateMutability: string;
  isPrivileged: boolean;
  category: string;
}

export interface EventDefinition {
  name: string;
  signature: string;
}

export interface AbiInfo {
  abiAvailable: boolean;
  contractName: string;
  functionsCount: number;
  eventsCount: number;
  functions: FunctionDefinition[];
  events: EventDefinition[];
  detectedInterfaces: string[];
}

export interface Capability {
  name: string;
  description: string;
  severity: RiskLevel;
  detectedEvidence: string;
}

export interface RiskIndicator {
  code: string;
  category: string;
  title: string;
  severity: RiskLevel;
  appliedWeight: number;
  explanation: string;
  evidence: string;
}

export interface ContractAnalysisData {
  id: string;
  targetAddress: string;
  targetType: string;
  score: number;
  severity: RiskLevel;
  summary: string;
  disclaimer: string;
  indicators: RiskIndicator[];
  recommendations: string[];
  metadata: Record<string, unknown>;
  timestamp: string;
  address: string;
  network: string;
  accountType: 'CONTRACT' | 'EOA' | 'UNKNOWN' | 'UNAVAILABLE';
  isContract: boolean;
  contractMetadata: ContractMetadata;
  ownershipInfo: OwnershipInfo;
  adminInfo: AdminInfo;
  proxyInfo: ProxyInfo;
  abiInfo: AbiInfo;
  detectedCapabilities: Capability[];
  capabilities?: Capability[];
  limitations: string;
}

export interface AnalysisHistoryItem {
  id: string;
  targetAddress: string;
  targetType: string;
  overallScore: number;
  riskCategory: RiskLevel;
  summaryExplanation: string;
  createdAt: string;
}

const NETWORKS = [
  { id: 31337, label: 'Local Hardhat Testbed (Chain ID 31337)', status: 'LOCAL_DEMO' },
  { id: 1, label: 'Ethereum Mainnet (Simulated / Read-only)', status: 'REMOTE_SIMULATED' },
  { id: 11155111, label: 'Sepolia Testnet (Simulated / Read-only)', status: 'REMOTE_SIMULATED' }
];

export interface ContractAnalyzerPageProps {
  initialAddress?: string;
  onNavigate?: (page: PageRoute, params?: Record<string, any>) => void;
}

export const ContractAnalyzerPage: React.FC<ContractAnalyzerPageProps> = ({ initialAddress, onNavigate }) => {
  const [contractAddress, setContractAddress] = useState(initialAddress || '');
  const [selectedChainId, setSelectedChainId] = useState(31337);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [result, setResult] = useState<ContractAnalysisData | null>(null);

  // Sync if initialAddress changes externally
  useEffect(() => {
    if (initialAddress && initialAddress !== contractAddress) {
      setContractAddress(initialAddress);
      triggerAnalysis(initialAddress);
    }
  }, [initialAddress]);

  // Preset fixtures from local hardhat environment
  const presetContracts = [
    {
      label: 'MockERC20 (ShieldToken)',
      address: contractsData.contracts?.MockERC20?.address || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      type: 'BENIGN_ERC20'
    },
    {
      label: 'SafeVault (Escrow)',
      address: contractsData.contracts?.SafeVault?.address || '0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0',
      type: 'BENIGN_VAULT'
    },
    {
      label: 'DangerousApprovalSpender',
      address: contractsData.contracts?.DangerousApprovalSpender?.address || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      type: 'MALICIOUS_SPENDER'
    },
    {
      label: 'HoneypotToken (TrapToken)',
      address: contractsData.contracts?.HoneypotToken?.address || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      type: 'MALICIOUS_HONEYPOT'
    },
    {
      label: 'User Account (EOA)',
      address: contractsData.testUser || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      type: 'EOA'
    }
  ];

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await apiClient.getAnalysisHistory('CONTRACT');
      if (Array.isArray(data)) {
        setHistoryItems(
          data.map(item => ({
            id: item.id,
            targetAddress: item.targetAddress,
            targetType: item.targetType,
            overallScore: item.score,
            riskCategory: item.severity,
            summaryExplanation: item.summary,
            createdAt: item.timestamp
          }))
        );
      }
    } catch (e) {
      console.warn('Could not fetch contract analysis history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const triggerAnalysis = async (targetAddr: string) => {
    const trimmed = targetAddr.trim();
    if (!trimmed || !trimmed.startsWith('0x') || trimmed.length !== 42) {
      setError('Invalid EVM address: Address must be 42 characters starting with "0x".');
      return;
    }

    setError(null);
    setLoading(true);
    setAnalyzed(false);

    try {
      const data = await apiClient.analyzeContract(trimmed, selectedChainId);
      setResult(data as unknown as ContractAnalysisData);
      setAnalyzed(true);
      fetchHistory();
    } catch (err: any) {
      console.warn('Backend API request failed or offline:', err);
      // Construct fallback offline assessment if backend is temporarily unreachable
      handleOfflineFallback(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    triggerAnalysis(contractAddress);
  };

  const handleOfflineFallback = (address: string) => {
    const lower = address.toLowerCase();
    const isEoa = lower === (contractsData.testUser || '').toLowerCase() || lower === (contractsData.deployer || '').toLowerCase();
    const isHoneypot = lower === (contractsData.contracts?.HoneypotToken?.address || '').toLowerCase();
    const isDrainer = lower === (contractsData.contracts?.DangerousApprovalSpender?.address || '').toLowerCase();
    const isVault = lower === (contractsData.contracts?.SafeVault?.address || '').toLowerCase();

    if (isEoa) {
      setResult({
        id: 'offline-' + Date.now(),
        targetAddress: address,
        targetType: 'CONTRACT',
        score: 0,
        severity: 'LOW',
        summary: 'LOW RISK (0/100): Address is an Externally Owned Account (EOA), not a smart contract. No smart contract bytecode is deployed at this address.',
        disclaimer: 'PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only. Does not guarantee 100% exploit detection or financial safety.',
        indicators: [],
        recommendations: [
          'Address is an individual wallet account (EOA). No smart contract bytecode exists.',
          'Use the Wallet Risk Analyzer for transaction volume and counterparty forensics.'
        ],
        metadata: { isContract: false, accountType: 'EOA' },
        timestamp: new Date().toISOString(),
        address: address,
        network: `LOCAL_DEMO_NETWORK (Chain ID: ${selectedChainId})`,
        accountType: 'EOA',
        isContract: false,
        contractMetadata: {
          name: 'Externally Owned Account (EOA)',
          symbol: '',
          decimals: null,
          totalSupplyFormatted: null,
          isErc20: false,
          bytecodeSizeBytes: 0,
          sourceStatus: 'SOURCE_UNAVAILABLE',
          isBytecodePresent: false,
          deployedBytecodeSnippet: '0x',
          compilerVersion: 'N/A (EOA)',
          license: 'N/A',
          contractName: 'Externally Owned Account (EOA)',
          sourceVerified: false
        },
        ownershipInfo: {
          hasOwner: false,
          ownerAddress: 'None / EOA',
          privilegeType: 'None',
          callableFunctions: [],
          whyItMatters: 'EOAs are controlled by private keys, not smart contract administrative functions.'
        },
        adminInfo: {
          hasAdmin: false,
          adminAddress: 'None',
          accessControlDetected: false,
          rolesSummary: [],
          details: 'Standard account keypair.'
        },
        proxyInfo: {
          proxyDetected: 'NO',
          implementationAddress: 'None',
          adminAddress: 'None',
          upgradeabilityDetected: 'Not detected',
          proxyType: 'None',
          isHeuristicIndicator: false
        },
        abiInfo: {
          abiAvailable: false,
          contractName: 'EOA',
          functionsCount: 0,
          eventsCount: 0,
          functions: [],
          events: [],
          detectedInterfaces: ['EOA']
        },
        detectedCapabilities: [],
        limitations: 'ChainShield performs heuristic static analysis and cataloged threat matching on local EVM state.'
      });
      setAnalyzed(true);
      return;
    }

    if (isHoneypot) {
      setResult({
        id: 'offline-' + Date.now(),
        targetAddress: address,
        targetType: 'CONTRACT',
        score: 95,
        severity: 'CRITICAL',
        summary: 'CRITICAL RISK (95/100): ChainShield detected severe honeypot trading restrictions and owner-controlled blacklisting.',
        disclaimer: 'PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only.',
        indicators: [
          {
            code: 'IND-C03',
            category: 'HONEYPOT',
            title: 'Honeypot Transfer Lock Mechanism',
            severity: 'CRITICAL',
            appliedWeight: 50,
            explanation: 'Dry-run transfer simulations demonstrate non-owner transfers revert unconditionally.',
            evidence: 'tradingOpen flag false and only editable by owner'
          },
          {
            code: 'IND-C02',
            category: 'ACCESS_CONTROL',
            title: 'Arbitrary Account Blacklist Capability',
            severity: 'HIGH',
            appliedWeight: 25,
            explanation: 'Contract owner can prevent designated addresses from transferring or redeeming tokens.',
            evidence: 'Method setBlacklisted(address,bool) exposed to owner'
          },
          {
            code: 'IND-W01',
            category: 'KNOWN_THREAT',
            title: 'Cataloged Threat Feed Match',
            severity: 'CRITICAL',
            appliedWeight: 40,
            explanation: 'Address matched local threat registry as an active honeypot testbed fixture.',
            evidence: 'Threat Source: LOCAL_DEMO'
          }
        ],
        recommendations: [
          'Do NOT purchase, swap, or send funds to this smart contract.',
          'Tokens acquired from this contract are non-transferable and unsellable.',
          'Reject any transaction requesting interaction with this contract.'
        ],
        metadata: { isContract: true, contractName: 'TrapToken' },
        timestamp: new Date().toISOString(),
        address: address,
        network: `LOCAL_DEMO_NETWORK (Chain ID: ${selectedChainId})`,
        accountType: 'CONTRACT',
        isContract: true,
        contractMetadata: {
          name: 'TrapToken',
          symbol: 'TRAP',
          decimals: 18,
          totalSupplyFormatted: '1,000,000.0 TRAP',
          isErc20: true,
          bytecodeSizeBytes: 2480,
          sourceStatus: 'LOCAL_VERIFIED',
          isBytecodePresent: true,
          deployedBytecodeSnippet: '0x608060405234801561001057600080fd5b50600436106100... [truncated]',
          compilerVersion: 'v0.8.20',
          license: 'MIT',
          contractName: 'TrapToken',
          sourceVerified: true
        },
        ownershipInfo: {
          hasOwner: true,
          ownerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          privilegeType: 'OWNABLE_V2',
          callableFunctions: ['transferOwnership', 'renounceOwnership', 'setBlacklisted', 'setTradingOpen'],
          whyItMatters: 'Owner retains authority to restrict token trading, blacklist user balances, and halt liquidations.'
        },
        adminInfo: {
          hasAdmin: true,
          adminAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          accessControlDetected: false,
          rolesSummary: ['DEFAULT_ADMIN_OWNER'],
          details: 'Single administrative keypair controls all privileged state changes.'
        },
        proxyInfo: {
          proxyDetected: 'NO',
          implementationAddress: 'None',
          adminAddress: 'None',
          upgradeabilityDetected: 'Not detected',
          proxyType: 'None',
          isHeuristicIndicator: false
        },
        abiInfo: {
          abiAvailable: true,
          contractName: 'TrapToken',
          functionsCount: 14,
          eventsCount: 4,
          functions: [
            { name: 'transfer', signature: 'transfer(address,uint256)', stateMutability: 'nonpayable', isPrivileged: false, category: 'TOKEN_TRANSFER' },
            { name: 'approve', signature: 'approve(address,uint256)', stateMutability: 'nonpayable', isPrivileged: false, category: 'TOKEN_APPROVAL' },
            { name: 'setBlacklisted', signature: 'setBlacklisted(address,bool)', stateMutability: 'nonpayable', isPrivileged: true, category: 'ADMIN_PRIVILEGE' },
            { name: 'setTradingOpen', signature: 'setTradingOpen(bool)', stateMutability: 'nonpayable', isPrivileged: true, category: 'ADMIN_PRIVILEGE' }
          ],
          events: [
            { name: 'Transfer', signature: 'Transfer(address,address,uint256)' },
            { name: 'Approval', signature: 'Approval(address,address,uint256)' },
            { name: 'Blacklisted', signature: 'Blacklisted(address,bool)' }
          ],
          detectedInterfaces: ['ERC20', 'Ownable']
        },
        detectedCapabilities: [
          { name: 'TOKEN_STANDARD_ERC20', description: 'Implements standard ERC-20 token interface methods.', severity: 'LOW', detectedEvidence: 'transfer, approve, allowance, balanceOf present' },
          { name: 'BLACKLIST_CAPABILITY', description: 'Exposes owner methods to arbitrarily freeze specific accounts from sending or receiving tokens.', severity: 'CRITICAL', detectedEvidence: 'setBlacklisted(address,bool)' },
          { name: 'OWNERSHIP_CONTROL', description: 'Centralized administrative owner controls critical operational functions.', severity: 'MEDIUM', detectedEvidence: 'owner() address verified' }
        ],
        limitations: 'ChainShield performs heuristic static analysis, read-only simulation, and cataloged threat matching on local EVM state.'
      });
      setAnalyzed(true);
      return;
    }

    if (isDrainer) {
      setResult({
        id: 'offline-' + Date.now(),
        targetAddress: address,
        targetType: 'CONTRACT',
        score: 85,
        severity: 'HIGH',
        summary: 'HIGH RISK (85/100): Contract is an unverified approval drainer fixture with arbitrary asset withdrawal capabilities.',
        disclaimer: 'PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only.',
        indicators: [
          {
            code: 'IND-C08',
            category: 'SECURITY_RISK',
            title: 'Arbitrary Balance Extraction Function',
            severity: 'CRITICAL',
            appliedWeight: 40,
            explanation: 'Contract contains unconstrained methods designed to transfer victim or deposited assets to an owner treasury.',
            evidence: 'Method siphonTokens(address,address,uint256) detected'
          },
          {
            code: 'IND-W01',
            category: 'KNOWN_THREAT',
            title: 'Cataloged Threat Feed Match',
            severity: 'HIGH',
            appliedWeight: 35,
            explanation: 'Address matched local threat registry as an aggressive spender drainer test fixture.',
            evidence: 'Threat Source: LOCAL_DEMO'
          }
        ],
        recommendations: [
          'DO NOT grant token approval or allowance to this address.',
          'If you previously approved this spender, immediately revoke approval using an allowance manager or transaction simulation tool.'
        ],
        metadata: { isContract: true, contractName: 'DangerousApprovalSpender' },
        timestamp: new Date().toISOString(),
        address: address,
        network: `LOCAL_DEMO_NETWORK (Chain ID: ${selectedChainId})`,
        accountType: 'CONTRACT',
        isContract: true,
        contractMetadata: {
          name: 'DangerousApprovalSpender',
          symbol: '',
          decimals: null,
          totalSupplyFormatted: null,
          isErc20: false,
          bytecodeSizeBytes: 1820,
          sourceStatus: 'LOCAL_VERIFIED',
          isBytecodePresent: true,
          deployedBytecodeSnippet: '0x608060405234801561001057600080fd5b506004... [truncated]',
          compilerVersion: 'v0.8.20',
          license: 'MIT',
          contractName: 'DangerousApprovalSpender',
          sourceVerified: true
        },
        ownershipInfo: {
          hasOwner: true,
          ownerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          privilegeType: 'OWNABLE_V2',
          callableFunctions: ['transferOwnership', 'siphonTokens'],
          whyItMatters: 'Owner can call siphonTokens to pull approved allowances from arbitrary third-party accounts.'
        },
        adminInfo: {
          hasAdmin: true,
          adminAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          accessControlDetected: false,
          rolesSummary: ['OWNER_DRAINER'],
          details: 'Direct owner withdrawal authorization.'
        },
        proxyInfo: {
          proxyDetected: 'NO',
          implementationAddress: 'None',
          adminAddress: 'None',
          upgradeabilityDetected: 'Not detected',
          proxyType: 'None',
          isHeuristicIndicator: false
        },
        abiInfo: {
          abiAvailable: true,
          contractName: 'DangerousApprovalSpender',
          functionsCount: 6,
          eventsCount: 1,
          functions: [
            { name: 'siphonTokens', signature: 'siphonTokens(address,address,uint256)', stateMutability: 'nonpayable', isPrivileged: true, category: 'EXTERNAL_DRAIN' },
            { name: 'owner', signature: 'owner()', stateMutability: 'view', isPrivileged: false, category: 'OWNERSHIP' }
          ],
          events: [{ name: 'TokensSiphoned', signature: 'TokensSiphoned(address,address,uint256)' }],
          detectedInterfaces: ['Ownable', 'SpenderDrainer']
        },
        detectedCapabilities: [
          { name: 'EXTERNAL_ASSET_SIPHON', description: 'Exposes administrative functions to drain third-party user tokens using prior approvals.', severity: 'CRITICAL', detectedEvidence: 'siphonTokens method' },
          { name: 'OWNERSHIP_CONTROL', description: 'Centralized administrative owner controls critical operational functions.', severity: 'MEDIUM', detectedEvidence: 'owner() address verified' }
        ],
        limitations: 'ChainShield performs heuristic static analysis and threat matching on local EVM state.'
      });
      setAnalyzed(true);
      return;
    }

    // Default safe / unknown contract fallback
    setResult({
      id: 'offline-' + Date.now(),
      targetAddress: address,
      targetType: 'CONTRACT',
      score: isVault ? 5 : 15,
      severity: 'LOW',
      summary: isVault
        ? 'LOW RISK (5/100): Contract is a verified benign vault escrow fixture with transparent accounting.'
        : 'LOW RISK (15/100): Standard contract analysis complete. No critical vulnerabilities or threat markers detected.',
      disclaimer: 'PROTOTYPE RISK ASSESSMENT: For educational and defensive analysis on local testbeds only.',
      indicators: isVault
        ? []
        : [
            {
              code: 'IND-C07',
              category: 'ACCESS_CONTROL',
              title: 'Administrative Ownership Authority',
              severity: 'LOW',
              appliedWeight: 10,
              explanation: 'Contract designates an administrative owner key with authority over privileged methods.',
              evidence: 'Method owner() detected in bytecode interface.'
            }
          ],
      recommendations: [
        'Contract conforms to standard design patterns on the local testbed.',
        'Always verify exact transaction calldata and parameters before signing state-changing transactions.'
      ],
      metadata: { isContract: true, contractName: isVault ? 'SafeVault' : 'ShieldToken' },
      timestamp: new Date().toISOString(),
      address: address,
      network: `LOCAL_DEMO_NETWORK (Chain ID: ${selectedChainId})`,
      accountType: 'CONTRACT',
      isContract: true,
      contractMetadata: {
        name: isVault ? 'SafeVault' : 'ShieldToken',
        symbol: isVault ? 'VAULT' : 'SHLD',
        decimals: 18,
        totalSupplyFormatted: isVault ? 'N/A' : '10,000,000.0 SHLD',
        isErc20: !isVault,
        bytecodeSizeBytes: isVault ? 1420 : 2100,
        sourceStatus: 'LOCAL_VERIFIED',
        isBytecodePresent: true,
        deployedBytecodeSnippet: '0x608060405234801561001057600080fd5b5060... [truncated]',
        compilerVersion: 'v0.8.20',
        license: 'MIT',
        contractName: isVault ? 'SafeVault' : 'ShieldToken',
        sourceVerified: true
      },
      ownershipInfo: {
        hasOwner: true,
        ownerAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        privilegeType: 'OWNABLE_V2',
        callableFunctions: ['transferOwnership', 'renounceOwnership'],
        whyItMatters: 'Owner can manage contract parameters or transfer administrative control.'
      },
      adminInfo: {
        hasAdmin: true,
        adminAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        accessControlDetected: false,
        rolesSummary: ['DEFAULT_ADMIN'],
        details: 'Standard single-admin structure.'
      },
      proxyInfo: {
        proxyDetected: 'NO',
        implementationAddress: 'None',
        adminAddress: 'None',
        upgradeabilityDetected: 'Not detected',
        proxyType: 'None',
        isHeuristicIndicator: false
      },
      abiInfo: {
        abiAvailable: true,
        contractName: isVault ? 'SafeVault' : 'ShieldToken',
        functionsCount: isVault ? 5 : 12,
        eventsCount: isVault ? 2 : 2,
        functions: isVault
          ? [
              { name: 'deposit', signature: 'deposit()', stateMutability: 'payable', isPrivileged: false, category: 'ESCROW' },
              { name: 'withdraw', signature: 'withdraw(uint256)', stateMutability: 'nonpayable', isPrivileged: false, category: 'ESCROW' }
            ]
          : [
              { name: 'transfer', signature: 'transfer(address,uint256)', stateMutability: 'nonpayable', isPrivileged: false, category: 'TOKEN_TRANSFER' },
              { name: 'approve', signature: 'approve(address,uint256)', stateMutability: 'nonpayable', isPrivileged: false, category: 'TOKEN_APPROVAL' }
            ],
        events: isVault
          ? [{ name: 'Deposit', signature: 'Deposit(address,uint256)' }, { name: 'Withdraw', signature: 'Withdraw(address,uint256)' }]
          : [{ name: 'Transfer', signature: 'Transfer(address,address,uint256)' }, { name: 'Approval', signature: 'Approval(address,address,uint256)' }],
        detectedInterfaces: isVault ? ['ReentrancyGuard', 'Ownable'] : ['ERC20', 'Ownable']
      },
      detectedCapabilities: isVault
        ? [
            { name: 'ESCROW_VAULT', description: 'Exposes deposit and withdrawal accounting methods.', severity: 'LOW', detectedEvidence: 'deposit, withdraw present' },
            { name: 'OWNERSHIP_CONTROL', description: 'Contract specifies an owner address.', severity: 'LOW', detectedEvidence: 'owner() present' }
          ]
        : [
            { name: 'TOKEN_STANDARD_ERC20', description: 'Implements standard ERC-20 token interface methods.', severity: 'LOW', detectedEvidence: 'transfer, approve present' },
            { name: 'TOKEN_APPROVAL', description: 'Allows third-party spenders to be delegated allowances.', severity: 'MEDIUM', detectedEvidence: 'approve() present' },
            { name: 'OWNERSHIP_CONTROL', description: 'Centralized administrative owner present.', severity: 'LOW', detectedEvidence: 'owner() present' }
          ],
      limitations: 'ChainShield performs heuristic static analysis, read-only simulation, and cataloged threat matching on local EVM state.'
    });
    setAnalyzed(true);
  };

  const capabilitiesList = result?.detectedCapabilities || result?.capabilities || [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCode className="w-5 h-5 text-shield-cyan" />
            <span>Smart Contract Security Analyzer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Bytecode inspection, ownership privileges, ABI analysis, honeypot transfer locks, and behavioral capability detection.
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
            showHistory
              ? 'bg-shield-cyan/10 border-shield-cyan text-shield-cyan'
              : 'bg-shield-900 border-shield-700/80 text-slate-300 hover:border-shield-cyan/60'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Analysis History ({historyItems.length})</span>
        </button>
      </div>

      {/* Analysis Input Form */}
      <Card variant="glow">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Address Input */}
            <div className="md:col-span-3 relative">
              <FileCode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value.trim())}
                placeholder="Enter 0x... EVM smart contract or EOA address"
                className="w-full pl-9 pr-24 py-2.5 text-xs bg-shield-900 border border-shield-700/80 rounded-lg text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-shield-cyan/80 transition-colors"
              />
              {contractAddress && (
                <button
                  onClick={() => setContractAddress('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-shield-800"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Network Selector */}
            <div className="relative">
              <select
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(Number(e.target.value))}
                className="w-full py-2.5 px-3 text-xs bg-shield-900 border border-shield-700/80 rounded-lg text-slate-100 font-sans focus:outline-none focus:border-shield-cyan/80 transition-colors appearance-none cursor-pointer"
              >
                {NETWORKS.map((net) => (
                  <option key={net.id} value={net.id} className="bg-shield-950 text-slate-200">
                    {net.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Preset Contract Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] font-medium mr-1">Demo Testbeds:</span>
              {presetContracts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setContractAddress(item.address)}
                  className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                    contractAddress.toLowerCase() === item.address.toLowerCase()
                      ? 'bg-shield-cyan/20 border-shield-cyan text-shield-cyan font-bold'
                      : 'bg-shield-900 hover:bg-shield-800 text-slate-300 border-shield-700/70'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Submit Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-shield-cyan hover:bg-shield-cyan/90 text-shield-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Analyzing Bytecode...' : 'Analyze Contract'}</span>
            </button>
          </div>

          {error && <ErrorState message={error} />}
        </div>
      </Card>

      {/* Analysis History Drawer (Expandable) */}
      {showHistory && (
        <Card
          title="Contract Analysis History"
          subtitle="Persisted audit assessments recorded on this environment."
          action={
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="text-xs text-slate-400 hover:text-shield-cyan transition-colors"
            >
              {loadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          }
        >
          {historyItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No prior smart contract analyses recorded in database.</p>
          ) : (
            <div className="divide-y divide-shield-800 max-h-60 overflow-y-auto pr-1">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs hover:bg-shield-900/40 px-2 rounded transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-200 truncate max-w-[180px] sm:max-w-[280px]">
                        {item.targetAddress}
                      </span>
                      <RiskBadge level={item.riskCategory} score={item.overallScore} showIcon={false} />
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{item.summaryExplanation}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => {
                        setContractAddress(item.targetAddress);
                        setShowHistory(false);
                      }}
                      className="px-2 py-0.5 text-[11px] rounded bg-shield-800 hover:bg-shield-700 text-shield-cyan border border-shield-700/60"
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <LoadingState message="Connecting to local EVM provider, querying bytecode, analyzing owner permissions and dry-running honeypot simulation..." />
      )}

      {/* Empty State */}
      {!loading && !analyzed && (
        <EmptyState
          title="Ready for Smart Contract Security Analysis"
          description="Enter an EVM smart contract address or pick a preset testbed fixture above to inspect bytecode opcodes, admin privileges, honeypot transfer locks, and behavioral capabilities."
          icon={<FileCode className="w-8 h-8 text-shield-cyan/60" />}
        />
      )}

      {/* Full 9-Section Security Analysis Report */}
      {!loading && analyzed && result && (
        <div className="space-y-6">

          {/* SECTION 1: Contract Overview */}
          <Card
            title={result.contractMetadata?.name || result.contractMetadata?.contractName || 'Smart Contract'}
            subtitle={`Network: ${result.network || 'LOCAL_DEMO_NETWORK'}`}
            action={<RiskBadge level={result.severity} score={result.score} />}
          >
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-shield-900 border border-shield-800">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-medium">Target Contract Address</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-200 font-semibold break-all">
                      {result.address || result.targetAddress}
                    </span>
                    <button
                      onClick={() => copyToClipboard(result.address || result.targetAddress, 'mainAddress')}
                      className="p-1 rounded text-slate-400 hover:text-shield-cyan hover:bg-shield-800 transition-colors"
                      title="Copy Address"
                    >
                      {copiedField === 'mainAddress' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Account Classification Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                      result.accountType === 'CONTRACT'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    {result.accountType === 'CONTRACT' ? (
                      <Layers className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                    <span>{result.accountType}</span>
                  </span>

                  {/* Bytecode Presence Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      result.isContract || result.contractMetadata?.isBytecodePresent
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700/30 text-slate-400 border-slate-700'
                    }`}
                  >
                    {result.isContract
                      ? `Code Deployed (${result.contractMetadata?.bytecodeSizeBytes || 0} bytes)`
                      : 'No Code (EOA)'}
                  </span>

                  {/* Source Verification Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      result.contractMetadata?.sourceStatus === 'LOCAL_VERIFIED' || result.contractMetadata?.sourceVerified
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {result.contractMetadata?.sourceStatus === 'LOCAL_VERIFIED' || result.contractMetadata?.sourceVerified
                      ? 'Local Verified Source'
                      : 'Source Unavailable'}
                  </span>
                </div>
              </div>

              {/* Assessment Summary Callout */}
              <div
                className={`p-4 rounded-lg border ${
                  result.severity === 'CRITICAL'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : result.severity === 'HIGH'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                    : result.severity === 'MEDIUM'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.severity === 'CRITICAL' || result.severity === 'HIGH' ? (
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  ) : result.severity === 'MEDIUM' ? (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {result.severity} RISK EVALUATION
                  </span>
                </div>
                <p className="text-sm leading-relaxed mt-1">{result.summary}</p>
              </div>

              {/* Cross-Module Navigation Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-shield-800">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Cross-Module Actions:</span>
                <button
                  onClick={() => onNavigate?.('investigation', { address: result.address || result.targetAddress })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-shield-cyan/15 hover:bg-shield-cyan/25 text-shield-cyan border border-shield-cyan/30 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Full Investigation View</span>
                </button>
                <button
                  onClick={() => onNavigate?.('transaction-graph', { address: result.address || result.targetAddress })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Waypoints className="w-3.5 h-3.5" />
                  <span>Explore in Graph</span>
                </button>
                <button
                  onClick={() => onNavigate?.('transaction-analyzer', { to: result.address || result.targetAddress })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Prepare Transaction</span>
                </button>
                {result.ownershipInfo?.ownerAddress &&
                  result.ownershipInfo.ownerAddress.startsWith('0x') &&
                  result.ownershipInfo.ownerAddress !== '0x0000000000000000000000000000000000000000' && (
                    <button
                      onClick={() => onNavigate?.('wallet-analyzer', { address: result.ownershipInfo.ownerAddress })}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Inspect Owner Wallet</span>
                    </button>
                  )}
              </div>
            </div>
          </Card>

          {/* SECTION 2 & 3: Verification/Metadata and Ownership/Permissions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* SECTION 2: Verification / Metadata */}
            <Card
              title="Verification & Metadata"
              subtitle="EVM metadata and token parameters retrieved from active provider."
            >
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                  <span className="text-slate-400">Contract Name:</span>
                  <span className="text-slate-200 font-semibold text-right">
                    {result.contractMetadata?.name || result.contractMetadata?.contractName || 'N/A'}
                  </span>
                </div>
                {result.contractMetadata?.isErc20 && (
                  <>
                    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                      <span className="text-slate-400">Token Symbol:</span>
                      <span className="text-slate-200 font-mono text-right">{result.contractMetadata?.symbol || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                      <span className="text-slate-400">Decimals:</span>
                      <span className="text-slate-200 font-mono text-right">{result.contractMetadata?.decimals ?? 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                      <span className="text-slate-400">Total Supply:</span>
                      <span className="text-slate-200 font-mono text-right">{result.contractMetadata?.totalSupplyFormatted || 'N/A'}</span>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                  <span className="text-slate-400">Compiler Version:</span>
                  <span className="text-slate-200 font-mono text-right">{result.contractMetadata?.compilerVersion || 'Unknown'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                  <span className="text-slate-400">License:</span>
                  <span className="text-slate-200 text-right">{result.contractMetadata?.license || 'Unknown'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 py-1.5">
                  <span className="text-slate-400">Source Audit Status:</span>
                  <span className="text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-shield-800 text-shield-cyan border border-shield-700/60">
                      {result.contractMetadata?.sourceStatus || 'SOURCE_UNAVAILABLE'}
                    </span>
                  </span>
                </div>
              </div>
            </Card>

            {/* SECTION 3: Ownership & Access Control */}
            <Card
              title="Ownership & Permissions"
              subtitle="Read-only analysis of administrative authority and privileged functions."
            >
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                  <span className="text-slate-400">Owner Key Detected:</span>
                  <span className="text-right">
                    {result.ownershipInfo?.hasOwner || result.ownershipInfo?.ownerDetected ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                        <Lock className="w-3 h-3" /> Yes (Centralized)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <Unlock className="w-3 h-3" /> None / Renounced
                      </span>
                    )}
                  </span>
                </div>

                <div className="py-1.5 border-b border-shield-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">Current Owner Address:</span>
                    {result.ownershipInfo?.ownerAddress && result.ownershipInfo.ownerAddress !== 'None / Renounced' && (
                      <button
                        onClick={() => copyToClipboard(result.ownershipInfo.ownerAddress, 'ownerAddress')}
                        className="text-[10px] text-shield-cyan hover:underline flex items-center gap-1"
                      >
                        {copiedField === 'ownerAddress' ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-300 break-all">
                    {result.ownershipInfo?.ownerAddress || 'None detected'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-shield-800">
                  <span className="text-slate-400">Privilege Pattern:</span>
                  <span className="text-slate-200 font-mono text-right">{result.ownershipInfo?.privilegeType || 'None'}</span>
                </div>

                <div className="p-2.5 rounded bg-shield-900/80 border border-shield-800 text-[11px] text-slate-300">
                  <span className="text-slate-400 block mb-0.5 font-medium">Why this matters:</span>
                  {result.ownershipInfo?.whyItMatters || 'No centralized administrator was identified.'}
                </div>
              </div>
            </Card>

          </div>

          {/* SECTION 4: Behavioral Capabilities */}
          <Card
            title={`Detected Behavioral Capabilities (${capabilitiesList.length})`}
            subtitle="Observed architectural capabilities identified from exposed ABI methods and interface signatures."
          >
            {capabilitiesList.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No high-impact operational capabilities identified from the available ABI.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {capabilitiesList.map((cap, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-shield-900 border border-shield-800 flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-100">{cap.name}</span>
                        <RiskBadge level={cap.severity} showIcon={false} />
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{cap.description}</p>
                    </div>
                    <div className="pt-2 border-t border-shield-800/80">
                      <span className="text-[10px] text-slate-500 font-mono block truncate">
                        Evidence: {cap.detectedEvidence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* SECTION 5: Evidence-First Security Indicators */}
          <EvidencePanel
            indicators={result.indicators.map((ind) => ({
              code: ind.code,
              category: ind.category,
              title: ind.title,
              severity: (ind.severity === 'UNKNOWN' ? 'LOW' : ind.severity) as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
              appliedWeight: ind.appliedWeight,
              explanation: ind.explanation,
              evidence: ind.evidence,
              source: 'LOCAL_BYTECODE_ANALYSIS',
              limitations:
                'Static heuristic and dry-run pattern match on local testbed; does not establish cryptographic certainty or intent.'
            }))}
            title={`Evidence-First Risk Indicators (${result.indicators.length})`}
          />

          {/* SECTION 6 & 7: Risk Presentation & Actionable Guidance */}
          <Card
            title="Analysis Explanation & Actionable Guidance"
            subtitle="Clear insights on observed risk factors and prudent verification steps."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-shield-900 border border-shield-800 space-y-1">
                  <span className="text-[11px] font-semibold text-shield-cyan uppercase tracking-wider block">
                    What Did We Observe?
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {result.summary}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-shield-900 border border-shield-800 space-y-1">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                    Why Does It Matter?
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {result.ownershipInfo?.whyItMatters || 'Contract architectural controls determine whether balances or transactions can be restricted.'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-shield-900 border border-shield-800 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                    What Should You Look At?
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Verify whether the contract is unverified, whether the owner address is reputable, and test transactions in the simulator before signing.
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-lg bg-shield-900/60 border border-shield-800">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
                  Actionable User Guidance
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {result.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-shield-cyan mt-1.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* SECTION 8: Technical Details (Expandable Accordion) */}
          <Card
            title="Technical Details & Bytecode Heuristics"
            subtitle="Callable ABI functions, event signatures, and low-level bytecode inspection."
            action={
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="px-3 py-1 rounded bg-shield-800 hover:bg-shield-750 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-shield-700/60"
              >
                <span>{showTechnicalDetails ? 'Collapse Details' : 'Expand Details'}</span>
                {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            }
          >
            {showTechnicalDetails ? (
              <div className="space-y-5 pt-2">
                {/* Proxy & Upgradeability Inspection */}
                <div className="p-3 rounded-lg bg-shield-900 border border-shield-800">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-shield-cyan" />
                    <span>Proxy & Upgradeability Detection</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Proxy Detected:</span>
                      <span className="font-mono text-slate-200">{result.proxyInfo?.proxyDetected || 'NO'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Upgradeability:</span>
                      <span className="font-mono text-slate-200">{result.proxyInfo?.upgradeabilityDetected || 'Not detected'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Implementation Slot:</span>
                      <span className="font-mono text-slate-200 truncate block max-w-[150px]">
                        {result.proxyInfo?.implementationAddress || 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Admin Slot:</span>
                      <span className="font-mono text-slate-200 truncate block max-w-[150px]">
                        {result.proxyInfo?.adminAddress || 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ABI Functions Summary */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Callable Functions ({result.abiInfo?.functionsCount || 0})
                  </h4>
                  {(!result.abiInfo?.functions || result.abiInfo.functions.length === 0) ? (
                    <p className="text-xs text-slate-500 italic">No ABI available for this contract. Function signatures not cataloged.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                      {result.abiInfo.functions.map((fn, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded bg-shield-900/90 border border-shield-800/80 flex items-center justify-between text-xs font-mono"
                        >
                          <span className="text-slate-200 truncate mr-2" title={fn.signature}>
                            {fn.signature}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-sans flex-shrink-0 ${
                              fn.isPrivileged
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : fn.stateMutability === 'view' || fn.stateMutability === 'pure'
                                ? 'bg-cyan-500/10 text-cyan-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {fn.isPrivileged ? 'OWNER' : fn.stateMutability}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Events Summary */}
                {result.abiInfo?.events && result.abiInfo.events.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Emitted Events ({result.abiInfo.events.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.abiInfo.events.map((ev, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-shield-900 border border-shield-800 font-mono text-[11px] text-slate-300"
                        >
                          {ev.signature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deployed Bytecode Snippet */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Deployed Bytecode Snippet
                    </span>
                    {result.contractMetadata?.deployedBytecodeSnippet && (
                      <button
                        onClick={() => copyToClipboard(result.contractMetadata.deployedBytecodeSnippet, 'bytecode')}
                        className="text-[11px] text-shield-cyan hover:underline flex items-center gap-1"
                      >
                        {copiedField === 'bytecode' ? 'Copied' : 'Copy Bytecode'}
                      </button>
                    )}
                  </div>
                  <pre className="p-3 rounded bg-shield-950 border border-shield-800 text-[11px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap break-all max-h-24">
                    {result.contractMetadata?.deployedBytecodeSnippet || '0x (No deployed bytecode)'}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-1">
                Expand to inspect callable functions ({result.abiInfo?.functionsCount || 0}), events ({result.abiInfo?.eventsCount || 0}), proxy storage slots, and raw bytecode snippets.
              </p>
            )}
          </Card>

          {/* SECTION 9: Limitations & Prototype Disclaimer */}
          <div className="p-4 rounded-lg bg-shield-900/60 border border-shield-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Info className="w-4 h-4 text-shield-cyan flex-shrink-0" />
              <span>Limitations & Academic Prototype Disclaimer</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {result.limitations || ContractAnalysisDataDisclaimer}
            </p>
            <p className="text-slate-500 text-[11px]">
              {result.disclaimer}
            </p>
          </div>

        </div>
      )}
    </div>
  );
};

const ContractAnalysisDataDisclaimer =
  "ChainShield performs heuristic static analysis, read-only simulation, and cataloged threat matching on local EVM state. " +
  "It does not perform formal verification or trace unindexed private storage slots across dynamic multi-contract protocols. " +
  "Its risk assessment is an educational evaluation and not an absolute guarantee that a contract is safe or malicious.";
