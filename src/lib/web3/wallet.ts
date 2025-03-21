import { writable } from 'svelte/store';
import { getAccount, connect, disconnect } from '@wagmi/core';
import { injected } from '@wagmi/connectors';
import { config } from './config';

type WalletState = {
  address: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
};

export const walletStore = writable<WalletState>({
  address: '',
  isConnected: false,
  isConnecting: false,
  error: null,
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

// Initialize wallet connection status
export function initWallet() {
  const account = getAccount(config);
  
  if (account.isConnected && account.address) {
    walletStore.update((state: WalletState) => ({
      ...state,
      address: account.address as string,
      isConnected: true,
    }));
  }
}
