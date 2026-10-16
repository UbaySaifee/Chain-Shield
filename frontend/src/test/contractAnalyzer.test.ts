import { describe, it, expect } from 'vitest';
import contractsData from '../config/contracts.json';

describe('Contract Security Analyzer Unit Tests', () => {
  const validContracts = contractsData.contracts;

  it('contains valid addresses for all local demonstration contracts', () => {
    expect(validContracts.MockERC20.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(validContracts.SafeVault.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(validContracts.HoneypotToken.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(validContracts.DangerousApprovalSpender.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('validates 42-character EVM contract address syntax', () => {
    const isValidAddress = (addr: string) => addr.startsWith('0x') && addr.length === 42 && /^0x[a-fA-F0-9]{40}$/.test(addr);

    expect(isValidAddress(validContracts.MockERC20.address)).toBe(true);
    expect(isValidAddress('0x1234')).toBe(false);
    expect(isValidAddress('invalid-address-string')).toBe(false);
    expect(isValidAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
  });

  it('correctly maps risk categories for demo testbed fixtures', () => {
    expect(validContracts.MockERC20.expectedRisk).toBe('LOW');
    expect(validContracts.SafeVault.expectedRisk).toBe('LOW');
    expect(validContracts.DangerousApprovalSpender.expectedRisk).toBe('HIGH');
    expect(validContracts.HoneypotToken.expectedRisk).toBe('CRITICAL');
  });

  it('verifies that EOA account is distinct from smart contract fixtures', () => {
    const testUser = contractsData.testUser;
    expect(testUser).toBeDefined();
    expect(testUser).not.toBe(validContracts.MockERC20.address);
    expect(testUser).not.toBe(validContracts.HoneypotToken.address);
  });
});
