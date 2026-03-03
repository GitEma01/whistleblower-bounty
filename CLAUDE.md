# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Decentralized whistleblower bounty platform on Base Sepolia. Bounty creators escrow ETH; whistleblowers prove they possess specific DKIM-signed emails using zero-knowledge proofs (Groth16 via ZK Email SDK) without revealing identity or email content.

## Build & Test Commands

### Contracts (Foundry)
```bash
cd contracts
forge build                   # Compile contracts
forge test                    # Run all tests
forge test --match-test testFunctionName -vvv  # Single test, verbose
forge fmt                     # Format Solidity
```

### Frontend (Next.js 16 + React 19)
```bash
cd frontend
npm install                   # Install dependencies
npm run dev                   # Dev server on localhost:3000
npm run build                 # Production build
npm run lint                  # ESLint
```

### Deploy (Base Sepolia)
```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## Architecture

**Contract flow:** `BountyFactory` (factory) → deploys `BountyEscrow` (per-bounty escrow) → verifies via `ProofVerifier` (router) → delegates to domain-specific `Groth16Verifier` contracts.

**Proof submission flow:** User uploads `.eml` file → frontend extracts domain/keywords → `useZkEmailProof` hook generates proof via ZK Email SDK (remote prover) → proof submitted to `BountyEscrow.submitProof()` → on-chain verification → 5-minute dispute period → `claimReward()`.

**Multi-domain support:** Each email domain (gmail.com, succinct.xyz) maps to a blueprint slug in `frontend/src/config/contracts.ts` (`DOMAIN_BLUEPRINTS`) and a corresponding on-chain Groth16 verifier registered in `ProofVerifier`.

## Key Files

- `contracts/src/BountyLib.sol` — Shared data structures, constants (MIN_REWARD, dispute period, max keywords)
- `contracts/src/ProofVerifier.sol` — Routes proofs to domain verifiers; has `testMode` flag for skipping crypto verification
- `frontend/src/hooks/useZkEmailProof.ts` — ZK Email SDK integration; handles proof generation and Solidity formatting (pi_b array swap)
- `frontend/src/config/contracts.ts` — Contract addresses, domain→blueprint mapping
- `frontend/src/config/wagmi.ts` — Wagmi/RainbowKit chain config

## Important Details

- **Groth16 proof formatting:** `pi_b` array elements must be swapped (index 0↔1 within each pair) when converting from snarkjs to Solidity format. This is handled in `useZkEmailProof.ts`.
- **Nullifiers** prevent double-claiming the same email proof.
- **Keywords** are stored as keccak256 hashes on-chain for privacy.
- **WASM support** is required in Next.js config (`asyncWebAssembly`, `topLevelAwait`) for the ZK Email SDK.
- **Solidity version:** 0.8.24 with IR optimizer (200 runs).
- **Chain:** Base Sepolia (84532). Contract addresses are in `frontend/src/config/contracts.ts` and deployment artifacts in `contracts/broadcast/`.
- **Environment variables:** See `.env.example`. Key vars: `RPC_URL`, `PRIVATE_KEY`, `NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS`, `NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- **Foundry remappings:** `@openzeppelin/` → `lib/openzeppelin-contracts/`, `forge-std/` → `lib/forge-std/src/`.
