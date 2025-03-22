import { createConfig, http } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});

export const VRF_REQUEST_CLIENT_ADDRESS = '0x64842c038db9aF44D29D2A27EF50dBBa6f7E43Bb';
export const VRF_REQUEST_ADDRESS = '0x008635105b348396B6ccD18BB715A9b6Db0E0D12';

// Arbitrum Sepolia Explorer URL
export const EXPLORER_URL = 'https://sepolia.arbiscan.io/tx/';

// Random Network Configuration
// Use HTTPS for production and HTTP for local development
export const RANDOM_NETWORK_RPC = 'http://167.172.174.224:8547';
export const RANDOM_NETWORK_CHAIN_ID = 1918;
export const RANDOM_EXPLORER_URL = 'https://testnet.random-network.org/tx/';

// Random Network Contract Addresses
export const RANDOM_VRF_CLIENT_ADDRESS = '0x9bF90104DC52b645038780f5e4410eC036DD273d';
