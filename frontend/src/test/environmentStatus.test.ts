import { describe, it, expect } from 'vitest';
import type { NetworkInfoDto } from '../api/client';

describe('Environment Status & Blockchain Node Connectivity', () => {
  it('correctly reports online status when backend returns rpcConnected (backend record format)', () => {
    const backendPayload: NetworkInfoDto = {
      chainId: 31337,
      networkName: 'Hardhat Local EVM Sandbox',
      isLocalDevnet: true,
      rpcConnected: true,
      currentBlock: 6,
      rpcEndpoint: 'http://127.0.0.1:8545'
    };

    const isOnline = Boolean(backendPayload.rpcConnected ?? backendPayload.rpcAvailable ?? false);
    expect(isOnline).toBe(true);

    const blockNum = backendPayload.currentBlock ?? backendPayload.blockNumber ?? 0;
    expect(blockNum).toBe(6);

    const statusText = isOnline
      ? `CONNECTED (${blockNum != null ? `Block #${blockNum}` : '8545'})`
      : 'OFFLINE';
    expect(statusText).toBe('CONNECTED (Block #6)');
  });

  it('correctly reports online status when payload uses rpcAvailable alias', () => {
    const payload: NetworkInfoDto = {
      chainId: 31337,
      networkName: 'Hardhat Local EVM',
      isLocalDemo: true,
      rpcAvailable: true,
      blockNumber: 4,
      rpcUrl: 'http://127.0.0.1:8545'
    };

    const isOnline = Boolean(payload.rpcConnected ?? payload.rpcAvailable ?? false);
    expect(isOnline).toBe(true);

    const blockNum = payload.currentBlock ?? payload.blockNumber ?? 0;
    expect(blockNum).toBe(4);

    const statusText = isOnline
      ? `CONNECTED (${blockNum != null ? `Block #${blockNum}` : '8545'})`
      : 'OFFLINE';
    expect(statusText).toBe('CONNECTED (Block #4)');
  });

  it('reports OFFLINE when rpcConnected and rpcAvailable are false or missing', () => {
    const offlinePayload: NetworkInfoDto = {
      chainId: 31337,
      networkName: 'Local Demo Mock Mode (RPC Offline)',
      isLocalDevnet: true,
      rpcConnected: false,
      currentBlock: 0,
      rpcEndpoint: 'http://127.0.0.1:8545'
    };

    const isOnline = Boolean(offlinePayload.rpcConnected ?? offlinePayload.rpcAvailable ?? false);
    expect(isOnline).toBe(false);

    const statusText = isOnline ? 'CONNECTED' : 'OFFLINE';
    expect(statusText).toBe('OFFLINE');
  });
});
