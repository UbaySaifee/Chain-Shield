import { describe, it, expect } from 'vitest';
import {
  validateEvmAddress,
  validateAmount,
  encodeErc20Transfer,
  encodeErc20Approve,
  encodeErc20TransferFrom,
  encodeVaultDeposit,
  encodeVaultWithdraw,
  formatEth,
  DEPLOYED_CONTRACTS,
  DEMO_RECIPIENT_ADDRESS,
  DEMO_RECIPIENT_LABEL
} from '../utils/transactionBuilder';

describe('Transaction Builder Utilities', () => {
  const validAddressA = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const validAddressB = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const invalidAddress = '0x1234notAnAddress';

  describe('Address Validation', () => {
    it('accepts valid 42-character checksummed and lowercase hex addresses', () => {
      expect(validateEvmAddress(validAddressA).isValid).toBe(true);
      expect(validateEvmAddress(validAddressA.toLowerCase()).isValid).toBe(true);
      expect(validateEvmAddress(validAddressB).isValid).toBe(true);
    });

    it('rejects malformed, empty, or short addresses', () => {
      expect(validateEvmAddress('').isValid).toBe(false);
      expect(validateEvmAddress(invalidAddress).isValid).toBe(false);
      expect(validateEvmAddress('0x0').isValid).toBe(false);
      expect(validateEvmAddress('random string').isValid).toBe(false);
    });
  });

  describe('Amount Validation', () => {
    it('accepts valid positive numbers and decimals', () => {
      expect(validateAmount('1').isValid).toBe(true);
      expect(validateAmount('0.005').isValid).toBe(true);
      expect(validateAmount('250.75').isValid).toBe(true);
    });

    it('rejects zero, negative, empty, or non-numeric inputs', () => {
      expect(validateAmount('').isValid).toBe(false);
      expect(validateAmount('0').isValid).toBe(false);
      expect(validateAmount('-5').isValid).toBe(false);
      expect(validateAmount('abc').isValid).toBe(false);
    });
  });

  describe('ERC-20 Function Encoding', () => {
    it('encodes transfer(address,uint256) with 0xa9059cbb selector', () => {
      const calldata = encodeErc20Transfer(validAddressA, '250', 18);
      expect(calldata.startsWith('0xa9059cbb')).toBe(true);
      // Padded address should appear in the first 32 bytes after selector
      expect(calldata.toLowerCase()).toContain(validAddressA.replace('0x', '').toLowerCase());
    });

    it('throws error when encoding transfer with invalid recipient', () => {
      expect(() => encodeErc20Transfer(invalidAddress, '100')).toThrow();
    });

    it('throws error when encoding transfer with invalid amount', () => {
      expect(() => encodeErc20Transfer(validAddressA, '-10')).toThrow();
    });

    it('encodes approve(address,uint256) with 0x095ea7b3 selector for exact amount', () => {
      const calldata = encodeErc20Approve(validAddressA, '50', false, 18);
      expect(calldata.startsWith('0x095ea7b3')).toBe(true);
      expect(calldata.toLowerCase()).toContain(validAddressA.replace('0x', '').toLowerCase());
    });

    it('encodes approve with MAX_UINT256 when isUnlimited is true', () => {
      const calldata = encodeErc20Approve(validAddressA, '0', true, 18);
      expect(calldata.startsWith('0x095ea7b3')).toBe(true);
      // Contains 64 f's representing uint256 max
      expect(calldata).toContain('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    });

    it('encodes transferFrom(address,address,uint256) with 0x23b872dd selector', () => {
      const calldata = encodeErc20TransferFrom(validAddressA, validAddressB, '10', 18);
      expect(calldata.startsWith('0x23b872dd')).toBe(true);
      expect(calldata.toLowerCase()).toContain(validAddressA.replace('0x', '').toLowerCase());
      expect(calldata.toLowerCase()).toContain(validAddressB.replace('0x', '').toLowerCase());
    });
  });

  describe('SafeVault Function Encoding', () => {
    it('encodes deposit(uint256) with 0xb6b55f25 selector', () => {
      const calldata = encodeVaultDeposit('100', 18);
      expect(calldata.startsWith('0xb6b55f25')).toBe(true);
    });

    it('encodes withdraw(uint256) with 0x2e1a7d4d selector', () => {
      const calldata = encodeVaultWithdraw('50', 18);
      expect(calldata.startsWith('0x2e1a7d4d')).toBe(true);
    });
  });

  describe('Formatting & Registry', () => {
    it('formats Wei into ETH strings correctly', () => {
      expect(formatEth(1000000000000000000n)).toBe('1.0');
      expect(formatEth('5000000000000000000')).toBe('5.0');
      expect(formatEth('0')).toBe('0.0');
    });

    it('contains all 4 local testbed contracts in registry', () => {
      expect(DEPLOYED_CONTRACTS.MockERC20).toBeDefined();
      expect(DEPLOYED_CONTRACTS.SafeVault).toBeDefined();
      expect(DEPLOYED_CONTRACTS.DangerousApprovalSpender).toBeDefined();
      expect(DEPLOYED_CONTRACTS.HoneypotToken).toBeDefined();
    });

    it('centralizes deterministic local demo recipient account', () => {
      expect(DEMO_RECIPIENT_ADDRESS).toBe('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
      expect(DEMO_RECIPIENT_LABEL).toContain('Local Demo Recipient');
    });

    it('encodes Safe Transfer demo payload targeting deterministic demo recipient for 250 tokens', () => {
      const calldata = encodeErc20Transfer(DEMO_RECIPIENT_ADDRESS, '250', 18);
      expect(calldata.startsWith('0xa9059cbb')).toBe(true);
      expect(calldata.toLowerCase()).toContain(DEMO_RECIPIENT_ADDRESS.replace('0x', '').toLowerCase());
      // 250 * 10^18 = 0xd8d726b7177a80000
      expect(calldata.toLowerCase()).toContain('d8d726b7177a80000');
    });
  });
});
