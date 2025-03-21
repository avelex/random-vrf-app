import { writable } from 'svelte/store';
import { parseEther } from 'ethers';
import { getPublicClient, getWalletClient, waitForTransactionReceipt } from '@wagmi/core';
import { config, VRF_REQUEST_CLIENT_ADDRESS, VRF_REQUEST_ADDRESS } from './config';

// Import contract ABIs
import VRFRequestClientABI from '../abi/VRFRequestClient.json';
import VRFRequestV1ABI from '../abi/VRFRequestV1.json';

type RandomNumberState = {
  isRequesting: boolean;
  isWaitingForRandomness: boolean;
  requestId: string | null;
  txHash: string | null;
  responseTxHash: string | null;
  randomNumber: string | null;
  error: string | null;
  requestTimestamp: number | null;
  responseTimestamp: number | null;
};

// Store for random number request state
export const randomNumberStore = writable<RandomNumberState>({
  isRequesting: false,
  isWaitingForRandomness: false,
  requestId: null,
  txHash: null,
  responseTxHash: null,
  randomNumber: null,
  error: null,
  requestTimestamp: null,
  responseTimestamp: null,
});

// Request a random number from the VRF contract
export async function requestRandomNumber() {
  try {
    randomNumberStore.update((state: RandomNumberState) => ({ 
      ...state, 
      isRequesting: true,
      isWaitingForRandomness: false,
      error: null,
      requestId: null,
      txHash: null,
      responseTxHash: null,
      randomNumber: null,
      requestTimestamp: Date.now(),
      responseTimestamp: null
    }));

    const walletClient = await getWalletClient(config);
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    // Prepare transaction parameters
    const parameters = '0x'; // Empty bytes parameter
    const callbackGasLimit = BigInt(100000); // Adjust as needed

    // Request randomness with 1 wei value
    const hash = await walletClient.writeContract({
      address: VRF_REQUEST_CLIENT_ADDRESS as `0x${string}`,
      abi: VRFRequestClientABI.abi,
      functionName: 'requestRandomness',
      args: [parameters, callbackGasLimit],
      value: parseEther('0.000000000000000001') // 1 wei
    });

    randomNumberStore.update((state: RandomNumberState) => ({ ...state, txHash: hash }));

    // Wait for transaction receipt
    const receipt = await waitForTransactionReceipt(config, { hash });
    
    // Listen for RandomnessRequested event
    const publicClient = getPublicClient(config);
    const logs = await publicClient.getLogs({
      address: VRF_REQUEST_ADDRESS as `0x${string}`,
      event: {
        type: 'event',
        name: 'RandomnessRequested',
        inputs: [
          { type: 'bytes32', name: 'requestId', indexed: true },
          { type: 'address', name: 'requester', indexed: true }
        ]
      },
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber
    });

    if (logs.length > 0) {
      const requestId = logs[0].args.requestId as `0x${string}`;
      randomNumberStore.update((state: RandomNumberState) => ({ 
        ...state, 
        requestId: requestId,
        isRequesting: false,
        isWaitingForRandomness: true
      }));
      
      // Start listening for RandomnessReceived event
      listenForRandomness(requestId);
    } else {
      throw new Error('Request event not found in transaction logs');
    }
  } catch (error) {
    console.error('Error requesting random number:', error);
    randomNumberStore.update((state: RandomNumberState) => ({ 
      ...state, 
      isRequesting: false,
      isWaitingForRandomness: false,
      error: error instanceof Error ? error.message : 'Failed to request random number'
    }));
  }
}

// Listen for the RandomnessReceived event
async function listenForRandomness(requestId: `0x${string}`) {
  try {
    const publicClient = getPublicClient(config);
    
    // Create an unwatch function to clean up the listener
    const unwatch = publicClient.watchEvent({
      address: VRF_REQUEST_ADDRESS as `0x${string}`,
      event: {
        type: 'event',
        name: 'RandomnessReceived',
        inputs: [
          { type: 'bytes32', name: 'requestId', indexed: true },
          { type: 'uint256', name: 'randomness', indexed: false },
          { type: 'uint8', name: 'status', indexed: false }
        ]
      },
      onLogs: (logs) => {
        for (const log of logs) {
          if (log.args.requestId === requestId) {
            const randomness = log.args.randomness?.toString() || null;
            const responseTxHash = log.transactionHash;
            randomNumberStore.update((state: RandomNumberState) => ({ 
              ...state, 
              randomNumber: randomness,
              responseTxHash: responseTxHash,
              isWaitingForRandomness: false,
              responseTimestamp: Date.now()
            }));
            
            // Clean up the listener
            unwatch();
            break;
          }
        }
      }
    });
  } catch (error) {
    console.error('Error listening for randomness:', error);
  }
}

// Format random number to show first 6 and last 6 digits
export function formatRandomNumber(randomNumber: string | null): string {
  if (!randomNumber) return '';
  
  if (randomNumber.length <= 12) {
    return randomNumber;
  }
  
  const firstSix = randomNumber.substring(0, 6);
  const lastSix = randomNumber.substring(randomNumber.length - 6);
  
  return `${firstSix}...${lastSix}`;
}
