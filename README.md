# Web3 Random Number Generator

A minimalist web application built with Svelte 5 that interacts with a VRF (Verifiable Random Function) smart contract on Arbitrum Sepolia to request and display random numbers.

## Features

- Connect to MetaMask wallet
- Request random numbers from VRF smart contract
- Display transaction hash, request ID, and random number
- Minimalist black and white UI

## Prerequisites

- Node.js and npm installed
- MetaMask browser extension
- Some Arbitrum Sepolia testnet ETH (for gas fees and contract calls)

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
