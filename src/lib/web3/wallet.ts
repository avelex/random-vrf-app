import { writable } from 'svelte/store';
import { getAccount, connect, disconnect, getChainId } from '@wagmi/core';
import { injected } from '@wagmi/connectors';
import { config, SUPPORTED_NETWORKS, DEFAULT_NETWORK, getNetworkConfig } from './config';
import type { NetworkConfig } from './config';

type WalletState = {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  chainId: number | null;
  currentNetwork: NetworkConfig | null;
  isSupportedNetwork: boolean;
};

export const walletStore = writable<WalletState>({
  address: '',
  isConnected: false,
  isConnecting: false,
  error: null,
  chainId: null,
  currentNetwork: null,
  isSupportedNetwork: false,
});

// Create a store for the network list
export const networkStore = writable({
  networks: SUPPORTED_NETWORKS,
  selectedNetwork: DEFAULT_NETWORK,
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

// Check if user is on a supported network
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
    
    // Get the current network config based on chain ID
    const currentNetwork = getNetworkConfig(chainId);
    
    // Check if it's a supported network
    const isSupportedNetwork = SUPPORTED_NETWORKS.some(network => network.chainId === chainId);
    console.log('Current network:', currentNetwork.name);
    console.log('Is supported network:', isSupportedNetwork);
    
    // Update the stores
    walletStore.update((state: WalletState) => ({
      ...state,
      chainId: chainId,
      currentNetwork: currentNetwork,
      isSupportedNetwork: isSupportedNetwork,
    }));
    
    networkStore.update(state => ({
      ...state,
      selectedNetwork: currentNetwork
    }));
    
    return isSupportedNetwork;
  } catch (error) {
    console.error('Failed to check network:', error);
    walletStore.update((state: WalletState) => ({
      ...state,
      chainId: null,
      currentNetwork: null,
      isSupportedNetwork: false,
    }));
    return false;
  }
}

// Function to switch to a specific network
export function switchToNetwork(network: NetworkConfig) {
  if (window.ethereum) {
    const chainIdHex = `0x${network.chainId.toString(16)}`;
    
    // Update the selected network in the store
    networkStore.update(state => ({
      ...state,
      selectedNetwork: network
    }));
    
    window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    }).catch((switchError: any) => {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: network.name,
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: [network.explorerUrl.replace('/tx/', '')],
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

// For backward compatibility
export function switchToArbitrumSepolia() {
  const arbitrumSepoliaNetwork = SUPPORTED_NETWORKS.find(network => network.chainId === 421614);
  if (arbitrumSepoliaNetwork) {
    switchToNetwork(arbitrumSepoliaNetwork);
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
