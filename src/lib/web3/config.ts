import { createConfig, http } from 'wagmi';
import { arbitrumSepolia, sepolia, optimismSepolia } from 'wagmi/chains';

// Define supported networks
export type NetworkConfig = {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  vrfRequestClientAddress: string;
  vrfRequestAddress: string;
  isDefault?: boolean;
};

// Network configurations
export const SUPPORTED_NETWORKS: NetworkConfig[] = [
  {
    chainId: arbitrumSepolia.id, // 421614
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://arbitrum-sepolia.infura.io/v3/18dc852a5a164c14bfd0777052c107a0',
    explorerUrl: 'https://sepolia.arbiscan.io/tx/',
    vrfRequestClientAddress: '0x64842c038db9aF44D29D2A27EF50dBBa6f7E43Bb',
    vrfRequestAddress: '0x008635105b348396B6ccD18BB715A9b6Db0E0D12',
    isDefault: true
  },
  {
    chainId: sepolia.id, // 11155111
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/cce51b0782b44680b492486884fdaba0',
    explorerUrl: 'https://sepolia.etherscan.io/tx/',
    vrfRequestClientAddress: '0xBD16beD149AA683252748C498F348Fe4b0b1A031',
    vrfRequestAddress: '0xa6334941d20b76af46379606a80F73a9c1406586'
  },
  {
    chainId: optimismSepolia.id, // 11155420
    name: 'Optimism Sepolia',
    rpcUrl: 'https://optimism-sepolia.infura.io/v3/cce51b0782b44680b492486884fdaba0',
    explorerUrl: 'https://sepolia-optimism.etherscan.io/tx/',
    vrfRequestClientAddress: '0xBD16beD149AA683252748C498F348Fe4b0b1A031',
    vrfRequestAddress: '0xa6334941d20b76af46379606a80F73a9c1406586'
  }
];

// Get default network
export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.find(network => network.isDefault) || SUPPORTED_NETWORKS[0];

// Create Wagmi config with all supported chains
export const config = createConfig({
  chains: [arbitrumSepolia, sepolia, optimismSepolia],
  transports: {
    [arbitrumSepolia.id]: http(SUPPORTED_NETWORKS[0].rpcUrl),
    [sepolia.id]: http(SUPPORTED_NETWORKS[1].rpcUrl),
    [optimismSepolia.id]: http(SUPPORTED_NETWORKS[2].rpcUrl)
  },
});

// Helper function to get network config by chain ID
export function getNetworkConfig(chainId: number): NetworkConfig {
  return SUPPORTED_NETWORKS.find(network => network.chainId === chainId) || DEFAULT_NETWORK;
}

// Random Network Configuration (this is separate from the EVM networks above)
export const RANDOM_NETWORK_RPC = 'https://rpc.random-network.org';
export const RANDOM_NETWORK_CHAIN_ID = 112000;
export const RANDOM_EXPLORER_URL = 'https://testnet.random-network.org/tx/';

// Random Network Contract Addresses
export const RANDOM_VRF_CLIENT_ADDRESS = '0x9bF90104DC52b645038780f5e4410eC036DD273d';
