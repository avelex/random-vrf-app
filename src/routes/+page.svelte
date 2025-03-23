<script lang="ts">
  import { onMount } from 'svelte';
  import { walletStore, networkStore, connectWallet, formatAddress, initWallet, switchToNetwork, checkNetwork } from '$lib/web3/wallet';
  import { randomNumberStore, requestRandomNumber, formatRandomNumber } from '$lib/web3/contracts';
  import { RANDOM_EXPLORER_URL } from '$lib/web3/config';
  import type { NetworkConfig } from '$lib/web3/config';

  // For copy functionality
  type CopyState = {
    requestId: boolean;
    randomNumber: boolean;
  };

  let copyState: CopyState = {
    requestId: false,
    randomNumber: false
  };

  onMount(() => {
    initWallet();
    // Force a network check on mount
    checkNetwork().catch(err => console.error('Error checking network on mount:', err));
  });

  function handleConnectWallet() {
    connectWallet();
  }

  async function handleRequestRandomness() {
    // Check if connected to wallet
    if (!$walletStore.isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    // Check if on a supported network
    const isCorrectNetwork = await checkNetwork();
    if (!isCorrectNetwork) {
      // If not on correct network, prompt to switch
      const selectedNetwork = $networkStore.selectedNetwork;
      const switchConfirmed = confirm(`You need to be on ${selectedNetwork.name} network to use this feature. Would you like to switch networks now?`);
      
      if (switchConfirmed) {
        switchToNetwork(selectedNetwork);
      }
      return;
    }
    
    // If all checks pass, request the random number
    requestRandomNumber();
  }
  
  // Handle network selection change
  function handleNetworkChange(network: NetworkConfig) {
    switchToNetwork(network);
  }

  async function copyToClipboard(text: string, type: keyof CopyState) {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      copyState[type] = true;
      
      // Reset copy state after 2 seconds
      setTimeout(() => {
        copyState[type] = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  // Format TX hash for display (first 6 and last 4 chars)
  function formatTxHash(hash: string | null): string {
    if (!hash) return '';
    if (hash.length <= 10) return hash;
    
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  }
  
  // Format request ID for display (first 4 and last 4 chars)
  function formatRequestId(requestId: string | null): string {
    if (!requestId) return '';
    if (requestId.length <= 8) return requestId;
    
    return `${requestId.substring(0, 4)}...${requestId.substring(requestId.length - 4)}`;
  }
  
  // Calculate elapsed time between blockchain transaction timestamps
  function calculateElapsedTime(startTime: number | null, endTime: number | null): string {
    if (!startTime || !endTime) return '';
    
    const elapsedMs = endTime - startTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    
    // Format the time more precisely
    if (totalSeconds < 60) {
      // Less than a minute, show seconds
      return `${totalSeconds} seconds`;
    } else {
      // More than a minute, show minutes and seconds
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes} minutes ${seconds} seconds`;
    }
  }
</script>

<div class="container">
  <header class="header">
    <div class="logo">RANDOM VRF</div>
    <div class="header-right">
      {#if $walletStore.isConnected}
        <div class="network-dropdown">
          <select 
            class="network-select button"
            value={$walletStore.currentNetwork?.chainId} 
            on:change={(e) => {
              const target = e.target as HTMLSelectElement;
              const selectedNetwork = $networkStore.networks.find(network => network.chainId === parseInt(target.value));
              if (selectedNetwork) handleNetworkChange(selectedNetwork);
            }}
          >
            {#each $networkStore.networks as network}
              <option value={network.chainId}>{network.name}</option>
            {/each}
          </select>
          <span class="dropdown-arrow">▼</span>
        </div>
      {/if}
      <button 
        class="button" 
        on:click={handleConnectWallet} 
        disabled={$walletStore.isConnecting}
      >
        {#if $walletStore.isConnecting}
          Connecting...
        {:else if $walletStore.isConnected}
          {formatAddress($walletStore.address)}
        {:else}
          Connect Wallet
        {/if}
      </button>
    </div>
  </header>

  <main class="main">
    
    <div class="header-container">
      {#if $walletStore.isConnected && $walletStore.chainId !== null && !$walletStore.isSupportedNetwork}
        <div class="network-warning">
          <p>Please switch to a supported network to use this app</p>
          <p class="network-debug">Current network: {$walletStore.currentNetwork?.name || 'Unknown'} (Chain ID {$walletStore.chainId})</p>
        </div>
      {/if}


      
      <!-- Main Button -->
      <button 
        class="button main-button" 
        on:click={$walletStore.isConnected && !$walletStore.isSupportedNetwork ? 
          () => switchToNetwork($networkStore.selectedNetwork) : 
          handleRequestRandomness}
        disabled={!$walletStore.isConnected || ($randomNumberStore.isRequesting && $walletStore.isSupportedNetwork)}
      >
        {#if $randomNumberStore.isRequesting}
          Requesting...
        {:else if !$walletStore.isSupportedNetwork && $walletStore.isConnected}
          Switch to {$networkStore.selectedNetwork.name}
        {:else}
          Give me Random Number
        {/if}
      </button>
    </div>

<style>
  .header-container {
    width: 100%;
    margin-bottom: 20px;
  }


  
  .main-button {
    display: block;
    margin: 0 auto 20px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background-color: white;
    color: #000;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .logo {
    font-family: var(--logo-font-family);
    font-size: 52px;
    letter-spacing: 1px;
    line-height: 1;
    display: flex;
    align-items: center;
    color: #000;
  }
  
  .network-dropdown {
    position: relative;
  }

  .network-select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-color: white;
    color: black;
    padding: 10px 30px 10px 15px;
    border: 1px solid black;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    min-width: 180px;
    font-weight: bold;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .network-select:focus {
    outline: none;
  }
  
  .network-select:hover {
    background-color: white;
    border-color: #333;
  }

  .network-dropdown {
    position: relative;
    display: inline-block;
  }
  
  .dropdown-arrow {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: black;
    font-size: 8px;
  }

  .network-warning {
    background-color: #ffdddd;
    border-left: 6px solid #f44336;
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 4px;
  }

  .network-debug {
    font-size: 0.8em;
    color: #666;
    margin-top: 5px;
  }
</style>
    {#if $randomNumberStore.requestId || $randomNumberStore.isRequesting}
      <div class="info-box">
        <!-- Request ID with copy button -->
        {#if $randomNumberStore.requestId}
          <div class="step-container">
            <div class="copy-wrapper">
              <span>Request ID: {formatRequestId($randomNumberStore.requestId)}</span>
              <button 
                class="copy-button" 
                on:click={() => copyToClipboard($randomNumberStore.requestId || '', 'requestId')}
              >
                {copyState.requestId ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        {/if}
        
        <!-- Step 1: Request Randomness -->
        <div class="step-container">
          <div class="step-header">
            <span>Step 1: Request Randomness</span>
            {#if $randomNumberStore.isRequesting}
              <div class="status-indicator">
                <div class="spinner"></div>
              </div>
            {:else if $randomNumberStore.txHash}
              <div class="status-indicator">
                <div class="success-mark">✓</div>
                <a 
                  href="{($walletStore.currentNetwork?.explorerUrl || '') + ($randomNumberStore.txHash || '')}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="explorer-link"
                >
                  View ({formatTxHash($randomNumberStore.txHash)})
                </a>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Step 2: Receive VRF Request -->
        <div class="step-container">
          <div class="step-header">
            <span>Step 2: Receive VRF Request</span>
            {#if $randomNumberStore.requestId && !$randomNumberStore.randomNetworkRequestReceived}
              <div class="status-indicator">
                <div class="spinner"></div>
              </div>
            {:else if $randomNumberStore.randomNetworkRequestReceived}
              <div class="status-indicator">
                <div class="success-mark">✓</div>
                {#if $randomNumberStore.randomNetworkRequestTxHash}
                  <a 
                    href="{RANDOM_EXPLORER_URL + $randomNumberStore.randomNetworkRequestTxHash}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="explorer-link"
                  >
                    View on Random Explorer ({formatTxHash($randomNumberStore.randomNetworkRequestTxHash)})
                  </a>
                {/if}
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Step 3: VRF Executed -->
        <div class="step-container">
          <div class="step-header">
            <span>Step 3: VRF Executed</span>
            {#if $randomNumberStore.randomNetworkRequestReceived && !$randomNumberStore.randomNetworkVrfExecuted}
              <div class="status-indicator">
                <div class="spinner"></div>
              </div>
            {:else if $randomNumberStore.randomNetworkVrfExecuted}
              <div class="status-indicator">
                <div class="success-mark">✓</div>
                {#if $randomNumberStore.randomNetworkVrfTxHash}
                  <a 
                    href="{RANDOM_EXPLORER_URL + $randomNumberStore.randomNetworkVrfTxHash}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="explorer-link"
                  >
                    View on Random Explorer ({formatTxHash($randomNumberStore.randomNetworkVrfTxHash)})
                  </a>
                {/if}
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Step 4: Receive Randomness -->
        <div class="step-container">
          <div class="step-header">
            <span>Step 4: Receive Randomness</span>
            {#if $randomNumberStore.isWaitingForStep4}
              <div class="status-indicator">
                <div class="spinner"></div>
                <span class="waiting-text">Waiting for randomness...</span>
              </div>
            {:else if $randomNumberStore.requestId && !$randomNumberStore.randomNumber && $randomNumberStore.randomNetworkVrfExecuted}
              <div class="status-indicator">
                <div class="spinner"></div>
              </div>
            {:else if $randomNumberStore.randomNumber}
              <div class="status-indicator">
                <div class="success-mark">✓</div>
                <a 
                  href="{($walletStore.currentNetwork?.explorerUrl || '') + ($randomNumberStore.responseTxHash || $randomNumberStore.txHash || '')}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="explorer-link"
                >
                  View ({formatTxHash($randomNumberStore.responseTxHash || $randomNumberStore.txHash)})
                </a>
                {#if $randomNumberStore.requestTimestamp && $randomNumberStore.responseTimestamp}
                  <span class="time-indicator">took {calculateElapsedTime($randomNumberStore.requestTimestamp, $randomNumberStore.responseTimestamp)} 🚀</span>
                {/if}
              </div>
            {/if}
          </div>
        </div>
        
        {#if $randomNumberStore.randomNumber}
          <div class="copy-wrapper">
            <div class="random-number">
              {formatRandomNumber($randomNumberStore.randomNumber)}
            </div>
            <button 
              class="copy-button" 
              on:click={() => copyToClipboard($randomNumberStore.randomNumber || '', 'randomNumber')}
            >
              {copyState.randomNumber ? 'Copied!' : 'Copy'}
            </button>
          </div>
        {/if}
      </div>
    {/if}

    {#if $randomNumberStore.error}
      <div class="error">
        Error: {$randomNumberStore.error}
      </div>
    {/if}
  </main>
</div>
