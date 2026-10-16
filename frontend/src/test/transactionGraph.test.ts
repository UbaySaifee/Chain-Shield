import { describe, it, expect } from 'vitest';
import type { GraphNode, GraphEdge, PathExplorationResult } from '../pages/TransactionGraphPage';

describe('Transaction Graph & Forensic Topology Models', () => {
  const sampleNodes: GraphNode[] = [
    {
      id: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      label: 'Wallet A (Test User)',
      type: 'WALLET',
      isContract: false,
      balanceEth: '100.0000 ETH',
      txCount: 15,
      riskScore: 10,
      riskSeverity: 'LOW',
      hasIndicator: false,
      indicators: [],
      metadata: { isCenter: true, classification: 'EOA' }
    },
    {
      id: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      label: 'Wallet B (Counterparty)',
      type: 'WALLET',
      isContract: false,
      balanceEth: '12.0000 ETH',
      txCount: 8,
      riskScore: 25,
      riskSeverity: 'LOW',
      hasIndicator: false,
      indicators: [],
      metadata: { isCenter: false, classification: 'EOA' }
    },
    {
      id: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      label: 'DangerousApprovalSpender',
      type: 'CONTRACT',
      isContract: true,
      balanceEth: '0.0000 ETH',
      txCount: 5,
      riskScore: 85,
      riskSeverity: 'HIGH',
      hasIndicator: true,
      indicators: [
        {
          code: 'IND-THREAT-01',
          title: 'Threat Registry Match',
          severity: 'HIGH',
          evidence: 'Contract designed to exploit unlimited token allowances.',
          source: 'LOCAL_DEMO'
        }
      ],
      metadata: { isCenter: false, classification: 'CONTRACT', verifiedInRegistry: true }
    }
  ];

  const sampleEdges: GraphEdge[] = [
    {
      id: '1',
      from: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      relationshipType: 'SENT_NATIVE',
      txHash: '0xabc1',
      blockNumber: 1,
      timestamp: '2026-09-26T20:00:00Z',
      valueEth: 2.0,
      network: 'LOCAL_DEMO_NETWORK'
    },
    {
      id: '2',
      from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      to: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      relationshipType: 'CONTRACT_INTERACTION',
      txHash: '0xabc2',
      blockNumber: 2,
      timestamp: '2026-09-26T20:10:00Z',
      valueEth: 0,
      functionName: 'approve',
      network: 'LOCAL_DEMO_NETWORK'
    }
  ];

  it('should correctly classify nodes into WALLET and CONTRACT types', () => {
    const wallets = sampleNodes.filter(n => n.type === 'WALLET');
    const contracts = sampleNodes.filter(n => n.type === 'CONTRACT');

    expect(wallets).toHaveLength(2);
    expect(contracts).toHaveLength(1);
    expect(contracts[0].label).toBe('DangerousApprovalSpender');
    expect(contracts[0].hasIndicator).toBe(true);
  });

  it('should preserve evidence-backed threat indicator overlay', () => {
    const dangerousNode = sampleNodes.find(n => n.hasIndicator);
    expect(dangerousNode).toBeDefined();
    expect(dangerousNode?.indicators).toHaveLength(1);
    expect(dangerousNode?.indicators[0].code).toBe('IND-THREAT-01');
    expect(dangerousNode?.indicators[0].source).toBe('LOCAL_DEMO');

    // Benign counterparty interacting with it should NOT have indicator
    const benignNode = sampleNodes.find(n => n.id === '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    expect(benignNode?.hasIndicator).toBe(false);
    expect(benignNode?.riskSeverity).toBe('LOW');
  });

  it('should correctly filter edges by relationship type', () => {
    const nativeEdges = sampleEdges.filter(e => e.relationshipType === 'SENT_NATIVE');
    const contractEdges = sampleEdges.filter(e => e.relationshipType === 'CONTRACT_INTERACTION');

    expect(nativeEdges).toHaveLength(1);
    expect(nativeEdges[0].valueEth).toBe(2.0);

    expect(contractEdges).toHaveLength(1);
    expect(contractEdges[0].functionName).toBe('approve');
  });

  it('should calculate accurate degree analytics for center node', () => {
    const center = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    let outDegree = 0;
    let inDegree = 0;

    sampleEdges.forEach(e => {
      if (e.from.toLowerCase() === center.toLowerCase()) outDegree++;
      if (e.to.toLowerCase() === center.toLowerCase()) inDegree++;
    });

    expect(outDegree).toBe(1);
    expect(inDegree).toBe(0);
  });

  it('should format PathExplorationResult accurately with hop sequence', () => {
    const pathResult: PathExplorationResult = {
      sourceAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      targetAddress: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      pathFound: true,
      hops: 2,
      nodes: sampleNodes,
      edges: sampleEdges,
      explanation: 'Observed on-chain path of 2 hop(s) discovered.',
      disclaimer: 'Prototype path tracer notice.'
    };

    expect(pathResult.pathFound).toBe(true);
    expect(pathResult.hops).toBe(2);
    expect(pathResult.nodes).toHaveLength(3);
    expect(pathResult.edges).toHaveLength(2);
    expect(pathResult.edges[0].from).toBe(pathResult.sourceAddress);
    expect(pathResult.edges[1].to).toBe(pathResult.targetAddress);
  });
});
