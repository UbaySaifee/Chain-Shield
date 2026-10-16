import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export interface WalletReceipt {
  transactionHash: string;
  blockNumber: number;
  status: boolean; // true = success (1), false = reverted (0)
  gasUsed: string;
  from: string;
  to: string;
  logsCount: number;
}

export interface WalletContextType {
  account: string | null;
  chainId: number | null;
  balance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isLocalNetwork: boolean;
  isMetaMaskInstalled: boolean;
  isSimulatorMode: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchOrAddHardhatNetwork: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTransaction: (tx: { to: string; value?: string; data?: string }) => Promise<string>;
  waitForTransactionReceipt: (txHash: string) => Promise<WalletReceipt>;
  enableSimulatorMode: () => void;
}

const HARDHAT_CHAIN_ID = 31337;
const HARDHAT_CHAIN_HEX = '0x7a69'; // 31337 in hex
const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';
const DEMO_TEST_ACCOUNT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);

  // Check if browser has EIP-1193 provider (e.g. MetaMask)
  const isMetaMaskInstalled = typeof window !== 'undefined' && Boolean((window as any).ethereum);

  const fetchBalance = useCallback(async (addr: string, provider: ethers.Provider) => {
    try {
      const bal = await provider.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch (e: any) {
      console.warn('Failed to fetch balance:', e);
      setBalance('0.0');
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!account) return;
    if (isSimulatorMode || !isMetaMaskInstalled) {
      try {
        const localProvider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
        await fetchBalance(account, localProvider);
      } catch (e) {
        // Fallback to static balance for offline demo
        setBalance('10000.0');
      }
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      await fetchBalance(account, browserProvider);
    } catch (e: any) {
      console.warn('Could not refresh balance:', e.message);
    }
  }, [account, isSimulatorMode, isMetaMaskInstalled, fetchBalance]);

  // Connect wallet method
  const connectWallet = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    if (!isMetaMaskInstalled) {
      setIsConnecting(false);
      setError('No browser Web3 wallet detected (e.g. MetaMask). You can install MetaMask or use the built-in local test account simulator.');
      return;
    }

    try {
      const eth = (window as any).ethereum;
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts authorized by user.');
      }

      const activeAccount = ethers.getAddress(accounts[0]);
      setAccount(activeAccount);

      const chainIdHex: string = await eth.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);
      setChainId(currentChainId);

      setIsSimulatorMode(false);

      const browserProvider = new ethers.BrowserProvider(eth);
      await fetchBalance(activeAccount, browserProvider);
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      if (err.code === 4001) {
        setError('Wallet connection rejected by user.');
      } else {
        setError(err.message || 'Failed to connect wallet.');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskInstalled, fetchBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setBalance(null);
    setError(null);
    setIsSimulatorMode(false);
  }, []);

  // Simulator mode fallback for headless or non-MetaMask presentations
  const enableSimulatorMode = useCallback(async () => {
    setError(null);
    setIsSimulatorMode(true);
    setAccount(DEMO_TEST_ACCOUNT);
    setChainId(HARDHAT_CHAIN_ID);
    try {
      const localProvider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const bal = await localProvider.getBalance(DEMO_TEST_ACCOUNT);
      setBalance(ethers.formatEther(bal));
    } catch (e) {
      setBalance('10000.0');
    }
  }, []);

  // Switch or Add Hardhat Network (Chain ID 31337)
  const switchOrAddHardhatNetwork = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      setError('Browser wallet not detected.');
      return;
    }

    const eth = (window as any).ethereum;
    try {
      setError(null);
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_CHAIN_HEX }]
      });
    } catch (switchError: any) {
      // 4902 error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
        try {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: HARDHAT_CHAIN_HEX,
                chainName: 'Hardhat Local EVM',
                rpcUrls: [HARDHAT_RPC_URL],
                nativeCurrency: {
                  name: 'Test Ether',
                  symbol: 'ETH',
                  decimals: 18
                }
              }
            ]
          });
        } catch (addError: any) {
          setError('Failed to add local Hardhat network: ' + addError.message);
        }
      } else if (switchError.code === 4001) {
        setError('Network switch rejected by user.');
      } else {
        setError('Failed to switch network: ' + switchError.message);
      }
    }
  }, [isMetaMaskInstalled]);

  // Send transaction with explicit wallet approval (App never sees private keys)
  const sendTransaction = useCallback(
    async (tx: { to: string; value?: string; data?: string }): Promise<string> => {
      setError(null);

      if (isSimulatorMode) {
        // In simulator mode, execute directly against local Hardhat node via JSON-RPC
        try {
          const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
          const signer = await provider.getSigner(account || DEMO_TEST_ACCOUNT);
          const txResponse = await signer.sendTransaction({
            to: tx.to,
            value: tx.value ? BigInt(tx.value) : 0n,
            data: tx.data || '0x'
          });
          return txResponse.hash;
        } catch (e: any) {
          throw new Error('Local simulation send failed: ' + e.message);
        }
      }

      if (!isMetaMaskInstalled || !account) {
        throw new Error('Please connect your browser wallet first.');
      }

      const eth = (window as any).ethereum;

      const txParams: Record<string, string> = {
        from: account,
        to: tx.to,
        data: tx.data || '0x'
      };

      if (tx.value && tx.value !== '0') {
        txParams.value = '0x' + BigInt(tx.value).toString(16);
      }

      try {
        const txHash: string = await eth.request({
          method: 'eth_sendTransaction',
          params: [txParams]
        });
        return txHash;
      } catch (err: any) {
        if (err.code === 4001) {
          throw new Error('TRANSACTION_REJECTED: Signing was cancelled by user in wallet.');
        }
        throw new Error(err.message || 'Transaction signing failed.');
      }
    },
    [account, isMetaMaskInstalled, isSimulatorMode]
  );

  // Poll for transaction receipt
  const waitForTransactionReceipt = useCallback(
    async (txHash: string): Promise<WalletReceipt> => {
      const provider = isSimulatorMode || !isMetaMaskInstalled
        ? new ethers.JsonRpcProvider(HARDHAT_RPC_URL)
        : new ethers.BrowserProvider((window as any).ethereum);

      // Poll up to 30 times with 1 second interval
      for (let i = 0; i < 30; i++) {
        try {
          const receipt = await provider.getTransactionReceipt(txHash);
          if (receipt) {
            await refreshBalance();
            return {
              transactionHash: receipt.hash,
              blockNumber: receipt.blockNumber,
              status: receipt.status === 1,
              gasUsed: receipt.gasUsed.toString(),
              from: receipt.from,
              to: receipt.to || '',
              logsCount: receipt.logs.length
            };
          }
        } catch (e) {
          // Continue polling
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error('Transaction confirmation timed out. Transaction was broadcast with hash: ' + txHash);
    },
    [isSimulatorMode, isMetaMaskInstalled, refreshBalance]
  );

  // Listen to provider events (accountsChanged, chainChanged)
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const eth = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else {
        const newAcc = ethers.getAddress(accounts[0]);
        setAccount(newAcc);
        const browserProvider = new ethers.BrowserProvider(eth);
        fetchBalance(newAcc, browserProvider);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      if (account) {
        const browserProvider = new ethers.BrowserProvider(eth);
        fetchBalance(account, browserProvider);
      }
    };

    eth.on?.('accountsChanged', handleAccountsChanged);
    eth.on?.('chainChanged', handleChainChanged);

    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [isMetaMaskInstalled, account, disconnectWallet, fetchBalance]);

  const isConnected = Boolean(account);
  const isLocalNetwork = chainId === HARDHAT_CHAIN_ID;

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        balance,
        isConnecting,
        isConnected,
        isLocalNetwork,
        isMetaMaskInstalled,
        isSimulatorMode,
        error,
        connectWallet,
        disconnectWallet,
        switchOrAddHardhatNetwork,
        refreshBalance,
        sendTransaction,
        waitForTransactionReceipt,
        enableSimulatorMode
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
