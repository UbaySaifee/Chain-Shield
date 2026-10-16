/**
 * Centralized, typed API client for ChainShield REST services.
 * Features centralized error handling, timeout handling, and typed models.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { detail: await response.text() };
      }

      const errorMessage =
        errorBody?.detail ||
        errorBody?.message ||
        errorBody?.title ||
        `HTTP Request failed with status ${response.status} (${response.statusText})`;

      throw new ApiError(errorMessage, response.status, errorBody);
    }

    // Handle 204 or empty response
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out after 12 seconds. Ensure ChainShield backend is reachable.', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors (e.g. failed to fetch / backend offline)
    throw new ApiError(
      'ChainShield backend is unavailable. Check that the Spring Boot server is running on port 8080.',
      0,
      err
    );
  }
}

// ==========================================
// DTO Types
// ==========================================

export interface DashboardStats {
  totalScannedEntities: number;
  highRiskDetectedCount: number;
  simulationsExecuted: number;
  activeThreatIndicatorsCount: number;
  riskDistribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  recentAssessments: Array<{
    id: string;
    targetAddress: string;
    targetType: string;
    overallScore: number;
    riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    primaryWarning: string;
    timestamp: string;
    keyIndicators?: string[];
  }>;
  walletAnalysesCount: number;
  contractAnalysesCount: number;
  transactionAnalysesCount: number;
  recentSimulations: Array<{
    id: string;
    fromAddress: string;
    toAddress: string;
    simulationStatus: string;
    gasUsed?: number;
    revertReason?: string;
    simulatedAt: string;
  }>;
  recentTransactions: Array<{
    txHash: string;
    fromAddress: string;
    toAddress: string;
    valueEth: number;
    tokenSymbol: string;
    relationshipType: string;
    functionName: string;
    blockTimestamp: string;
    blockNumber: number;
  }>;
  recentAddresses: string[];
  recentIndicators: string[];
}

export interface RiskIndicator {
  code: string;
  category: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  appliedWeight?: number;
  explanation?: string;
  contextExplanation?: string;
  evidence?: string;
  evidenceData?: string;
  source?: string;
  dataSource?: string;
}

export interface RiskAssessmentResponse {
  id: string;
  targetAddress: string;
  targetType: 'WALLET' | 'CONTRACT' | 'TRANSACTION';
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  disclaimer: string;
  indicators: RiskIndicator[];
  recommendations: string[];
  metadata: Record<string, any>;
  timestamp: string;
}

export interface ContractAnalysisResponse extends RiskAssessmentResponse {
  address: string;
  network: string;
  accountType: 'CONTRACT' | 'EOA' | 'UNKNOWN';
  isContract: boolean;
  codeExists: boolean;
  contractMetadata?: {
    name?: string;
    symbol?: string;
    decimals?: number;
    totalSupplyFormatted?: string;
    isErc20?: boolean;
    bytecodeSizeBytes?: number;
    sourceStatus?: string;
    compilerVersion?: string;
  };
  ownershipInfo?: {
    hasOwner: boolean;
    ownerAddress?: string;
    privilegeType?: string;
    callableFunctions?: string[];
    whyItMatters?: string;
  };
  proxyInfo?: {
    proxyDetected: string;
    implementationAddress?: string;
    proxyType?: string;
  };
  abiInfo?: {
    abiAvailable: boolean;
    functionsCount: number;
    eventsCount: number;
    functions: Array<{
      name: string;
      signature: string;
      stateMutability: string;
      isPrivileged: boolean;
      category: string;
    }>;
  };
  detectedCapabilities?: Array<{
    name: string;
    description: string;
    severity: string;
    detectedEvidence?: string;
  }>;
  limitations?: string;
}

export interface TransactionSimulationResponse {
  simulationStatus: 'SUCCESS' | 'REVERTED' | 'FAILED';
  gasEstimated: number;
  revertReason: string | null;
  decodedCall: {
    targetAddress: string;
    methodSelector: string;
    functionName: string;
    functionSignature: string;
    formattedExplanation: string;
    parameters: Record<string, any>;
    isUnlimitedApproval?: boolean;
  };
  projectedStateChanges: {
    nativeBalanceDeltaEth: string;
    tokenBalanceChanges: Array<{
      tokenAddress: string;
      tokenSymbol: string;
      account: string;
      deltaFormatted: string;
    }>;
    allowanceChanges: Array<{
      tokenAddress: string;
      tokenSymbol: string;
      owner: string;
      spender: string;
      previousAllowance: string;
      projectedAllowance: string;
      isUnlimited: boolean;
    }>;
    projectedEvents: string[];
  };
  riskAssessment: {
    score: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary: string;
    indicators: RiskIndicator[];
    recommendations: string[];
  };
  humanExplanation: string;
  recommendations: string[];
  networkInfo: string;
}

export interface AddressSummaryResponse {
  address: string;
  accountType: 'EOA' | 'CONTRACT' | 'UNKNOWN';
  isContract: boolean;
  nativeBalanceEth: string;
  transactionCount: number;
  contractInteractionCount: number;
  tokenTransferCount: number;
  uniqueCounterpartiesCount: number;
  firstSeenAt: string;
  lastActiveAt: string;
  riskScore: number;
  riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  indicators: Array<{
    code: string;
    title: string;
    severity: string;
    evidence: string;
    source: string;
  }>;
  relatedContracts: string[];
  relatedAddresses: string[];
  dataAvailability: string;
  network: string;
  disclaimer: string;
}

export interface TransactionHistoryItem {
  id: string;
  type: 'ON_CHAIN' | 'SIMULATION';
  timestamp: string;
  fromAddress: string;
  toAddress: string;
  functionName: string;
  status: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  txHash?: string;
  value: string;
  tokenSymbol: string;
  revertReason?: string;
  gasUsed?: number;
}

export interface AnalysisSummaryItem {
  id: string;
  targetAddress: string;
  targetType: 'WALLET' | 'CONTRACT' | 'TRANSACTION';
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  timestamp: string;
  keyIndicators?: string[];
}

export interface NetworkInfoDto {
  chainId: number;
  networkName: string;
  isLocalDevnet?: boolean;
  isLocalDemo?: boolean;
  rpcConnected?: boolean;
  rpcAvailable?: boolean;
  currentBlock?: number;
  blockNumber?: number;
  rpcEndpoint?: string;
  rpcUrl?: string;
}

export interface DeployedContractsInfo {
  network: string;
  chainId: number;
  deployerAddress: string;
  testUserAddress: string;
  contracts: Record<string, string>;
}

// ==========================================
// API Client Object
// ==========================================

export const apiClient = {
  // 1. Dashboard
  getDashboardStats: () => request<DashboardStats>('/api/v1/dashboard/stats'),

  // 2. Health & Network Status
  getHealth: () => request<any>('/api/health'),
  getBlockchainStatus: () => request<NetworkInfoDto>('/api/blockchain/status'),
  getDeployedContracts: () => request<DeployedContractsInfo>('/api/blockchain/contracts'),
  getTransactionReceipt: (txHash: string) => request<any>(`/api/blockchain/receipt/${txHash}`),

  // 3. Risk Analyzers
  analyzeWallet: (address: string, chainId = 31337) =>
    request<RiskAssessmentResponse>('/api/wallet/analyze', {
      method: 'POST',
      body: JSON.stringify({ address, chainId })
    }),

  analyzeContract: (contractAddress: string, chainId = 31337) =>
    request<ContractAnalysisResponse>('/api/contract/analyze', {
      method: 'POST',
      body: JSON.stringify({ contractAddress, chainId })
    }),

  analyzeTransaction: (payload: { fromAddress: string; toAddress: string; valueWei?: string; calldata?: string; chainId?: number }) =>
    request<RiskAssessmentResponse>('/api/transaction/analyze', {
      method: 'POST',
      body: JSON.stringify({ ...payload, chainId: payload.chainId ?? 31337 })
    }),

  // 4. Pre-execution Simulation
  simulateTransaction: (payload: { from: string; to: string; valueWei?: string; data?: string; chainId?: number }) =>
    request<TransactionSimulationResponse>('/api/transaction/simulate', {
      method: 'POST',
      body: JSON.stringify({ ...payload, chainId: payload.chainId ?? 31337 })
    }),

  // 5. History Endpoints
  getAnalysisHistory: (type?: string) => {
    const q = type && type !== 'ALL' ? `?type=${encodeURIComponent(type)}` : '';
    return request<AnalysisSummaryItem[]>(`/api/analyses${q}`);
  },

  getAnalysisById: (id: string) => request<RiskAssessmentResponse>(`/api/analyses/${id}`),

  getTransactionHistory: (type = 'ALL', limit = 50, offset = 0) =>
    request<TransactionHistoryItem[]>(
      `/api/transactions/history?type=${encodeURIComponent(type)}&limit=${limit}&offset=${offset}`
    ),

  // 6. Address Intelligence & Graph
  getAddressSummary: (address: string, chainId = 31337) =>
    request<AddressSummaryResponse>(`/api/address/${address}/summary?chainId=${chainId}`),

  getTransactionGraph: (
    address: string,
    options?: { depth?: number; nodeType?: string; edgeType?: string; chainId?: number }
  ) => {
    const params = new URLSearchParams({
      depth: String(options?.depth ?? 1),
      nodeType: options?.nodeType ?? 'ALL',
      edgeType: options?.edgeType ?? 'ALL',
      chainId: String(options?.chainId ?? 31337)
    });
    return request<any>(`/api/address/${address}/graph?${params.toString()}`);
  },

  getAddressTransactions: (address: string, limit = 50) =>
    request<any[]>(`/api/address/${address}/transactions?limit=${limit}`),

  explorePath: (payload: { sourceAddress: string; targetAddress: string; maxDepth?: number }) =>
    request<any>('/api/graph/path', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  seedDemoGraph: () =>
    request<any>('/api/graph/seed-demo', {
      method: 'POST'
    })
};
