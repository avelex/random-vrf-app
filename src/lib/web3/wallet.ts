import { writable } from 'svelte/store';
import { getAccount, connect, disconnect, getChainId } from '@wagmi/core';
import { injected } from '@wagmi/connectors';
import { config } from './config';

// Arbitrum Sepolia chain ID
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

type WalletState = {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  chainId: number | null;
  isArbitrumSepolia: boolean;
};

export const walletStore = writable<WalletState>({
  address: '',
  isConnected: false,
  isConnecting: false,
  error: null,
  chainId: null,
  isArbitrumSepolia: false,
});

export async function connectWallet() {
  try {
    walletStore.update((state: WalletState) => ({ ...state, isConnecting: true, error: null }));
    
    const result = await connect(config, {
      connector: injected(),
    });
    
    if (result.accounts.length > 0) {
      walletStore.update((state: WalletState) => ({
        ...state,
        address: result.accounts[0],
        isConnected: true,
        isConnecting: false,
      }));
    } else {
      throw new Error('No accounts found');
    }
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    walletStore.update((state: WalletState) => ({
      ...state,
      isConnecting: false,
      error: error instanceof Error ? error.message : 'Failed to connect wallet',
    }));
  }
}

export async function disconnectWallet() {
  try {
    await disconnect(config);
    walletStore.update((state: WalletState) => ({
      ...state,
      address: '',
      isConnected: false,
    }));
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
  }
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Check if user is on Arbitrum Sepolia network
export async function checkNetwork() {
  try {
    let chainId;
    let chainIdHex;
    
    // Try to get chain ID directly from MetaMask first
    if (window.ethereum) {
      try {
        chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        // Convert hex to decimal
        chainId = parseInt(chainIdHex, 16);
        console.log('MetaMask chainId (hex):', chainIdHex);
        console.log('MetaMask chainId (decimal):', chainId);
      } catch (err) {
        console.error('Error getting chain ID from MetaMask:', err);
        // Fall back to Wagmi if MetaMask direct access fails
        chainId = getChainId(config);
        console.log('Fallback chainId:', chainId);
      }
    } else {
      // Fall back to Wagmi if no MetaMask
      chainId = getChainId(config);
      console.log('Wagmi chainId:', chainId);
    }
    
    // Check if it matches Arbitrum Sepolia
    const isArbitrumSepolia = chainId === ARBITRUM_SEPOLIA_CHAIN_ID;
    console.log('Is Arbitrum Sepolia:', isArbitrumSepolia);
    
    // Update the store
    walletStore.update((state: WalletState) => ({
      ...state,
      chainId: chainId,
      isArbitrumSepolia: isArbitrumSepolia,
    }));
    
    return isArbitrumSepolia;
  } catch (error) {
    console.error('Failed to check network:', error);
    walletStore.update((state: WalletState) => ({
      ...state,
      chainId: null,
      isArbitrumSepolia: false,
    }));
    return false;
  }
}

// Function to switch to Arbitrum Sepolia
export function switchToArbitrumSepolia() {
  if (window.ethereum) {
    window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}` }],
    }).catch((switchError: any) => {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}`,
              chainName: 'Arbitrum Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
              blockExplorerUrls: ['https://sepolia.arbiscan.io'],
            },
          ],
        });
      }
    }).finally(() => {
      // Check network after attempting to switch
      setTimeout(async () => {
        await checkNetwork();
      }, 1000);
    });
  }
}

// Initialize wallet connection status
export function initWallet() {
  const account = getAccount(config);
  
  if (account.isConnected && account.address) {
    walletStore.update((state: WalletState) => ({
      ...state,
      address: account.address as string,
      isConnected: true,
    }));
    
    // Check network after wallet is initialized
    checkNetwork().catch(err => console.error('Error checking network during init:', err));
  }
  
  // Listen for chain changes
  if (window.ethereum) {
    // Define handler functions for events
    const handleChainChanged = (chainId: string) => {
      console.log('Chain changed to:', chainId);
      // Force immediate check
      setTimeout(async () => {
        await checkNetwork().catch(err => console.error('Error checking network after chain change:', err));
      }, 100);
    };
    
    const handleAccountsChanged = () => {
      setTimeout(async () => {
        await checkNetwork().catch(err => console.error('Error checking network after accounts change:', err));
      }, 100);
    };
    
    // Remove any existing listeners to avoid duplicates
    window.ethereum.removeListener('chainChanged', handleChainChanged);
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    
    // Add new listeners
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);
  }
}
