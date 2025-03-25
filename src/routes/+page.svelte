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

  <main class="main" style="min-height: 80vh; position: relative;">
    
    <div class="header-container">
      {#if $walletStore.isConnected && $walletStore.chainId !== null && !$walletStore.isSupportedNetwork}
        <div class="network-warning">
          <p>Please switch to a supported network to use this app</p>
          <p class="network-debug">Current network: {$walletStore.currentNetwork?.name || 'Unknown'} (Chain ID {$walletStore.chainId})</p>
        </div>
      {/if}


      
      <!-- Main Button -->
      <div class="button-container {$randomNumberStore.txHash ? 'moved' : ''}">
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
    </div>

<style>
  .header-container {
    width: 100%;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }


  
  .button-container {
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 0;
    position: absolute;
    top: 35%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .main-button {
    display: block;
    min-width: 280px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background-color: transparent;
    color: #fff;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .logo {
    font-family: var(--logo-font-family);
    font-size: 70px;
    letter-spacing: 1px;
    line-height: 1;
    display: flex;
    align-items: center;
    color: #7C8492;
    font-weight: bold;
  }
  
  .network-dropdown {
    position: relative;
  }

  .network-select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    background-color: #E3E6ED;
    color: #7C8492;
    padding: 10px 15px;
    border: none;
    border-radius: 60px;
    font-size: 1.2rem;
    cursor: pointer;
    min-width: 220px;
    font-weight: normal;
    font-family: 'Onest', sans-serif;
    box-shadow: -12px -12px 20px #FFFFFF, 12px 12px 20px #D1D9E6;
    transition: all 0.2s ease;
    height: 48px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Additional properties to ensure no arrow appears */
    background-image: none;
  }

  .network-select:focus {
    outline: none;
  }
  
  .network-select:hover {
    background-color: #D6DAE3;
    box-shadow: -14px -14px 25px #FFFFFF, 14px 14px 25px #D1D9E6;
  }

  .network-dropdown {
    position: relative;
    display: inline-block;
    margin-right: 13px;
  }
  
  /* Removed dropdown arrow */

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
  
  /* Use the global info-box styles from styles.css and just add positioning */
  .processing-container {
    position: absolute;
    top: 30%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    width: 100%;
    max-width: 620px;
  }
  
  .random-number {
    font-size: 2.0rem;
    font-weight: bold;
    margin: 10px 0;
    margin-left: 1.0rem;  
    color: #7C8492;
    text-align: left;
    z-index: 20;
  }
  
  .button-container.moved {
    top: 75%;
  }
</style>
    {#if $randomNumberStore.txHash}
      <div class="processing-container">
        <div class="info-box">
        <!-- Request ID with copy button -->
        {#if $randomNumberStore.requestId}
          <div class="step-container">
            <div class="copy-wrapper">
              <span>Request ID: {formatRequestId($randomNumberStore.requestId)}</span>
              <button 
                class="copy-button" 
                on:click={() => copyToClipboard($randomNumberStore.requestId || '', 'requestId')}
                title="Copy to clipboard"
              >
                {#if copyState.requestId}
                  <span class="copied-text">Copied!</span>
                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                {/if}
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
              title="Copy to clipboard"
            >
              {#if copyState.randomNumber}
                <span class="copied-text">Copied!</span>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              {/if}
            </button>
          </div>
        {/if}
        </div>
      </div>
    {/if}

    {#if $randomNumberStore.error}
      <div class="error">
        Error: {$randomNumberStore.error}
      </div>
    {/if}
  </main>
</div>
