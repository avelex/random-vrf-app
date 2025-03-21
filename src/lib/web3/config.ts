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
