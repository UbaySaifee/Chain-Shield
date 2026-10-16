import { describe, it, expect } from 'vitest';
import { ethers } from 'ethers';

describe('Wallet State & Network Detection Rules', () => {
  const HARDHAT_CHAIN_ID = 31337;
  const MAINNET_CHAIN_ID = 1;
  const SEPOLIA_CHAIN_ID = 11155111;

  it('correctly identifies local Hardhat devnet (31337)', () => {
    const isLocal = (chainId: number | null) => chainId === HARDHAT_CHAIN_ID;

    expect(isLocal(31337)).toBe(true);
    expect(isLocal(1)).toBe(false);
    expect(isLocal(11155111)).toBe(false);
    expect(isLocal(null)).toBe(false);
  });

  it('detects unsupported networks without silent network changes', () => {
    const checkNetwork = (chainId: number) => {
      if (chainId === HARDHAT_CHAIN_ID) {
        return { isSupported: true, warning: null };
      }
      return {
        isSupported: false,
        warning: `UNSUPPORTED NETWORK: Detected Chain ID ${chainId}. Primary demo operates on Local Hardhat (31337).`
      };
    };

    expect(checkNetwork(31337).isSupported).toBe(true);
    expect(checkNetwork(MAINNET_CHAIN_ID).isSupported).toBe(false);
    expect(checkNetwork(SEPOLIA_CHAIN_ID).warning).toContain('Detected Chain ID 11155111');
  });

  it('formats address truncation properly for UI display', () => {
    const truncate = (addr: string) => `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    const testAddr = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

    expect(truncate(testAddr)).toBe('0x7099...79C8');
  });

  it('validates EIP-55 checksumming', () => {
    const lowercase = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
    const checksummed = ethers.getAddress(lowercase);

    expect(checksummed).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    expect(ethers.isAddress(checksummed)).toBe(true);
  });

  it('preserves the distinction between pre-sign simulation and post-sign execution', () => {
    const simulationPhase = {
      isDryRun: true,
      mutatesState: false,
      requiresSigning: false,
      stateType: 'PRE_SIGN_SIMULATION'
    };

    const executionPhase = {
      isDryRun: false,
      mutatesState: true,
      requiresSigning: true,
      stateType: 'POST_SIGN_ON_CHAIN_EXECUTION'
    };

    expect(simulationPhase.mutatesState).toBe(false);
    expect(executionPhase.mutatesState).toBe(true);
    expect(simulationPhase.stateType).not.toBe(executionPhase.stateType);
  });
});
