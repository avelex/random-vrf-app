<script lang="ts">
  import { onMount } from 'svelte';
  import { walletStore, connectWallet, formatAddress, initWallet, switchToArbitrumSepolia, checkNetwork } from '$lib/web3/wallet';
  import { randomNumberStore, requestRandomNumber, formatRandomNumber } from '$lib/web3/contracts';
  import { EXPLORER_URL, RANDOM_EXPLORER_URL } from '$lib/web3/config';

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
    
    // Check if on Arbitrum Sepolia network
    const isCorrectNetwork = await checkNetwork();
    if (!isCorrectNetwork) {
      // If not on correct network, prompt to switch
      const switchConfirmed = confirm('You need to be on Arbitrum Sepolia network to use this feature. Would you like to switch networks now?');
      
      if (switchConfirmed) {
        switchToArbitrumSepolia();
      }
      return;
    }
    
    // If all checks pass, request the random number
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
    
    {#if $walletStore.isConnected && $walletStore.chainId !== null && !$walletStore.isArbitrumSepolia}
      <div class="network-warning">
        <p>Please switch to Arbitrum Sepolia network to use this app</p>
        <p class="network-debug">Current network: Chain ID {$walletStore.chainId}</p>
      </div>
    {/if}

    <button 
      class="button" 
      on:click={$walletStore.isConnected && !$walletStore.isArbitrumSepolia ? switchToArbitrumSepolia : handleRequestRandomness}
      disabled={!$walletStore.isConnected || ($randomNumberStore.isRequesting && $walletStore.isArbitrumSepolia)}
    >
      {#if $randomNumberStore.isRequesting}
        Requesting...
      {:else if !$walletStore.isArbitrumSepolia && $walletStore.isConnected}
        Switch to Arbitrum Sepolia
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
