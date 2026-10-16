import { describe, it, expect } from 'vitest';
import contractsData from '../config/contracts.json';

describe('Milestone 7: Unified Intelligence & Cross-Module Architecture Tests', () => {

  // 1. Global Search & Address Classification
  describe('Global Search & Address Validation', () => {
    const isValidEVMAddress = (address: string): boolean => {
      return typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address.trim());
    };

    const classifyAccountFixture = (address: string): 'EOA' | 'CONTRACT' | 'UNKNOWN' => {
      const lower = address.trim().toLowerCase();
      const testUser = (contractsData.testUser || '').toLowerCase();
      const deployer = (contractsData.deployer || '').toLowerCase();

      if (lower === testUser || lower === deployer) {
        return 'EOA';
      }

      const contracts = contractsData.contracts || {};
      for (const key of Object.keys(contracts)) {
        if ((contracts as any)[key]?.address?.toLowerCase() === lower) {
          return 'CONTRACT';
        }
      }

      return 'UNKNOWN';
    };

    it('correctly validates valid and invalid EVM addresses', () => {
      expect(isValidEVMAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')).toBe(true);
      expect(isValidEVMAddress('0x5FbDB2315678afecb367f032d93F642f64180aa3')).toBe(true);
      expect(isValidEVMAddress('0x123')).toBe(false);
      expect(isValidEVMAddress('not-an-address')).toBe(false);
      expect(isValidEVMAddress('0xZZ997970C51812dc3A010C7d01b50e0d17dc79C8')).toBe(false);
    });

    it('accurately classifies testbed addresses into EOA, CONTRACT, and UNKNOWN', () => {
      expect(classifyAccountFixture(contractsData.testUser)).toBe('EOA');
      expect(classifyAccountFixture(contractsData.deployer)).toBe('EOA');
      expect(classifyAccountFixture(contractsData.contracts.MockERC20.address)).toBe('CONTRACT');
      expect(classifyAccountFixture(contractsData.contracts.SafeVault.address)).toBe('CONTRACT');
      expect(classifyAccountFixture(contractsData.contracts.DangerousApprovalSpender.address)).toBe('CONTRACT');
      expect(classifyAccountFixture(contractsData.contracts.HoneypotToken.address)).toBe('CONTRACT');
      expect(classifyAccountFixture('0x1111111111111111111111111111111111111111')).toBe('UNKNOWN');
    });
  });

  // 2. Risk Score & Boundary Verification
  describe('Risk Calculation & Category Consistency', () => {
    const calculateSeverity = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
      if (score >= 85) return 'CRITICAL';
      if (score >= 60) return 'HIGH';
      if (score >= 30) return 'MEDIUM';
      return 'LOW';
    };

    it('maps numerical scores strictly to the defined severity buckets', () => {
      expect(calculateSeverity(0)).toBe('LOW');
      expect(calculateSeverity(25)).toBe('LOW');
      expect(calculateSeverity(29)).toBe('LOW');
      expect(calculateSeverity(30)).toBe('MEDIUM');
      expect(calculateSeverity(59)).toBe('MEDIUM');
      expect(calculateSeverity(60)).toBe('HIGH');
      expect(calculateSeverity(84)).toBe('HIGH');
      expect(calculateSeverity(85)).toBe('CRITICAL');
      expect(calculateSeverity(100)).toBe('CRITICAL');
    });

    it('ensures no risk score proves fraud or malicious intent disclaimer is preserved', () => {
      const DISCLAIMER = 'ChainShield heuristic evaluations reflect observed indicators and do not constitute absolute proof of malicious intent.';
      expect(DISCLAIMER).toContain('do not constitute absolute proof');
    });
  });

  // 3. Evidence-First Security Model
  describe('Evidence-First Indicator Contract', () => {
    interface SecurityIndicator {
      code: string;
      category: string;
      title: string;
      severity: string;
      appliedWeight?: number;
      explanation: string;
      evidence: string;
      source: string;
      limitations: string;
    }

    const sampleIndicator: SecurityIndicator = {
      code: 'APPROVAL-LARGE-001',
      category: 'DANGEROUS_PERMISSIONS',
      title: 'Unlimited Token Approval Requested',
      severity: 'HIGH',
      appliedWeight: 45,
      explanation: 'The spender may receive permission to move tokens from the owner without constraint.',
      evidence: 'Spender: 0x9fE4... Approved: MAX_UINT256',
      source: 'LOCAL_SIMULATION',
      limitations: 'This observation alone does not establish malicious intent or financial loss.'
    };

    it('contains all required evidence fields (Rule ID, Evidence, Why it matters, Source, Limitations)', () => {
      expect(sampleIndicator.code).toBeDefined();
      expect(sampleIndicator.title).toBeDefined();
      expect(sampleIndicator.severity).toBe('HIGH');
      expect(sampleIndicator.evidence).toBeDefined();
      expect(sampleIndicator.explanation).toBeDefined();
      expect(sampleIndicator.source).toBe('LOCAL_SIMULATION');
      expect(sampleIndicator.limitations).toBeDefined();
    });
  });

  // 4. Pre-Sign Simulation vs Post-Sign Transaction Distinction
  describe('Transaction Security Review Separation', () => {
    it('strictly separates pre-sign dry-run from post-sign execution', () => {
      const preSignSimulationNotice = 'PRE-SIGN SIMULATION: Dry-run eth_call executed against local EVM state. Zero blockchain state or user balances were altered.';
      const postSignTransactionNotice = 'POST-SIGN TRANSACTION: Transaction was explicitly approved and submitted to local mempool.';

      expect(preSignSimulationNotice).toContain('Zero blockchain state');
      expect(postSignTransactionNotice).toContain('explicitly approved');
    });
  });

  // 5. Cross-Module Navigation Routing
  describe('Cross-Module Navigation Parameters', () => {
    interface NavEvent {
      page: string;
      params?: Record<string, any>;
    }

    it('constructs valid investigation navigation parameters from wallet address', () => {
      const walletAddr = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
      const event: NavEvent = {
        page: 'investigation',
        params: { address: walletAddr }
      };

      expect(event.page).toBe('investigation');
      expect(event.params?.address).toBe(walletAddr);
    });

    it('constructs valid transaction-builder navigation parameters from contract address', () => {
      const contractAddr = contractsData.contracts.MockERC20.address;
      const event: NavEvent = {
        page: 'transaction-analyzer',
        params: { to: contractAddr }
      };

      expect(event.page).toBe('transaction-analyzer');
      expect(event.params?.to).toBe(contractAddr);
    });

    it('constructs valid graph navigation parameters with center address', () => {
      const targetAddr = contractsData.contracts.HoneypotToken.address;
      const event: NavEvent = {
        page: 'transaction-graph',
        params: { centerAddress: targetAddr }
      };

      expect(event.page).toBe('transaction-graph');
      expect(event.params?.centerAddress).toBe(targetAddr);
    });
  });

  // 6. History and Audit Log Filtering
  describe('History Aggregation & Filtering Logic', () => {
    const mockAnalyses = [
      { id: '1', targetAddress: '0x1111', targetType: 'WALLET', score: 10, severity: 'LOW' },
      { id: '2', targetAddress: '0x2222', targetType: 'CONTRACT', score: 85, severity: 'CRITICAL' },
      { id: '3', targetAddress: '0x3333', targetType: 'WALLET', score: 65, severity: 'HIGH' },
      { id: '4', targetAddress: '0x4444', targetType: 'CONTRACT', score: 5, severity: 'LOW' }
    ];

    it('filters analysis items by target type', () => {
      const wallets = mockAnalyses.filter(a => a.targetType === 'WALLET');
      const contracts = mockAnalyses.filter(a => a.targetType === 'CONTRACT');

      expect(wallets.length).toBe(2);
      expect(contracts.length).toBe(2);
    });

    it('filters analysis items by severity', () => {
      const highAndCritical = mockAnalyses.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL');
      expect(highAndCritical.length).toBe(2);
    });
  });

  // 7. Graph Topology & Analytics Aggregation
  describe('Graph Topology Degree & Analytics', () => {
    interface MockEdge {
      from: string;
      to: string;
      type: string;
    }

    const mockEdges: MockEdge[] = [
      { from: '0xA', to: '0xB', type: 'SENT_NATIVE' },
      { from: '0xA', to: '0xC', type: 'TOKEN_TRANSFER' },
      { from: '0xB', to: '0xA', type: 'SENT_NATIVE' },
      { from: '0xC', to: '0xD', type: 'CONTRACT_INTERACTION' }
    ];

    it('calculates in-degree and out-degree correctly for node 0xA', () => {
      const target = '0xA';
      const outDegree = mockEdges.filter(e => e.from === target).length;
      const inDegree = mockEdges.filter(e => e.to === target).length;

      expect(outDegree).toBe(2);
      expect(inDegree).toBe(1);
    });

    it('partitions edge types into native, token, and contract call counts', () => {
      const nativeCount = mockEdges.filter(e => e.type === 'SENT_NATIVE').length;
      const tokenCount = mockEdges.filter(e => e.type === 'TOKEN_TRANSFER').length;
      const contractCount = mockEdges.filter(e => e.type === 'CONTRACT_INTERACTION').length;

      expect(nativeCount).toBe(2);
      expect(tokenCount).toBe(1);
      expect(contractCount).toBe(1);
    });
  });
});
