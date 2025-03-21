<script lang="ts">
  import { onMount } from 'svelte';
  import { walletStore, connectWallet, formatAddress, initWallet } from '$lib/web3/wallet';
  import { randomNumberStore, requestRandomNumber, formatRandomNumber } from '$lib/web3/contracts';
  import { EXPLORER_URL } from '$lib/web3/config';

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
  });

  function handleConnectWallet() {
    connectWallet();
  }

  function handleRequestRandomness() {
    requestRandomNumber();
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
  
  // Calculate elapsed time in seconds
  function calculateElapsedTime(startTime: number | null, endTime: number | null): string {
    if (!startTime || !endTime) return '';
    
    const elapsedMs = endTime - startTime;
    const elapsedSeconds = (elapsedMs / 1000).toFixed(1);
    
    return `${elapsedSeconds} seconds`;
  }
</script>

<div class="container">
  <header class="header">
    <div class="logo">RANDOM VRF</div>
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
  </header>

  <main class="main">
    
    <button 
      class="button" 
      on:click={handleRequestRandomness}
      disabled={!$walletStore.isConnected || $randomNumberStore.isRequesting}
    >
      {#if $randomNumberStore.isRequesting}
        Requesting...
      {:else}
        Give me Random Number
      {/if}
    </button>

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
                  href="{EXPLORER_URL + $randomNumberStore.txHash}" 
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
        
        <!-- Step 2: Receive Randomness -->
        <div class="step-container">
          <div class="step-header">
            <span>Step 2: Receive Randomness</span>
            {#if $randomNumberStore.requestId && !$randomNumberStore.randomNumber}
              <div class="status-indicator">
                <div class="spinner"></div>
              </div>
            {:else if $randomNumberStore.randomNumber}
              <div class="status-indicator">
                <div class="success-mark">✓</div>
                <a 
                  href="{EXPLORER_URL + ($randomNumberStore.responseTxHash || $randomNumberStore.txHash)}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="explorer-link"
                >
                  View ({formatTxHash($randomNumberStore.responseTxHash || $randomNumberStore.txHash)})
                </a>
                {#if $randomNumberStore.requestTimestamp && $randomNumberStore.responseTimestamp}
                  <span class="time-indicator">took {calculateElapsedTime($randomNumberStore.requestTimestamp, $randomNumberStore.responseTimestamp)}</span>
                {/if}
              </div>
            {/if}
          </div>
          
          <div class="step-content">
            {#if $randomNumberStore.randomNumber}
              <div class="separator"></div>
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
