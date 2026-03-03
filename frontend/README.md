# Frontend

Next.js web application for the Whistleblower Bounty Platform, providing a UI for creating bounties, generating ZK proofs from emails, and submitting them on-chain.

## Tech Stack

- **Next.js 16** + **React 19** (App Router, TypeScript)
- **Wagmi 2** + **RainbowKit 2** (wallet connection, contract interactions)
- **ZK Email SDK 3.0.0** (Groth16 proof generation via remote prover)
- **Tailwind CSS 4** (styling)
- **Viem** (Ethereum utilities)

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page with platform overview |
| `/create` | `app/create/page.tsx` | Create a bounty: choose domain, set keywords, deposit ETH |
| `/bounties` | `app/bounties/page.tsx` | Browse all active bounties |
| `/submit-proof` | `app/submit-proof/page.tsx` | Upload `.eml`, generate ZK proof, submit on-chain |
| `/claim` | `app/claim/page.tsx` | Claim reward after dispute period expires |

## Proof Generation Flow

The submit proof page handles the full ZK proof lifecycle:

1. **Upload** -- User uploads a `.eml` file
2. **Parse** -- Extract sender domain from `From:` header, find required keywords in body
3. **DKIM Detection** -- Match `DKIM-Signature:` header to determine signing domain and select the correct ZK Email blueprint
4. **Generate Proof** -- Initialize ZK Email SDK, fetch blueprint, create remote prover, generate Groth16 proof
5. **Format** -- Use SDK's `createCallData()` to format proof for Solidity (handles `pi_b` swap)
6. **Submit** -- Call `BountyEscrow.submitProof()` via Wagmi

### DKIM Domain Handling

- Gmail signs with `d=google.com`, not `d=gmail.com` -- the frontend detects both and selects the Gmail blueprint
- Succinct signs with `d=succinct.xyz` -- detected from `DKIM-Signature:` headers (not ARC headers)
- The domain passed to the contract for verification uses the bounty's domain to avoid mismatches

## Key Files

### Components

| File | Description |
|---|---|
| `components/Header.tsx` | Navigation header |
| `components/BountyCard.tsx` | Bounty display card |
| `components/Providers.tsx` | Wagmi + RainbowKit + React Query provider wrapper |
| `components/Navbar.tsx` | Navigation bar |

### Hooks

| File | Description |
|---|---|
| `hooks/useZkEmailProof.ts` | ZK Email SDK integration hook for proof generation and formatting |

### Config

| File | Description |
|---|---|
| `config/contracts.ts` | Contract addresses, domain-to-blueprint mapping, supported domains, keyword hashing |
| `config/wagmi.ts` | Wagmi + RainbowKit chain configuration (Base Sepolia) |

### ABIs

| File | Description |
|---|---|
| `abi/BountyFactory.ts` | BountyFactory contract ABI |
| `abi/BountyEscrow.ts` | BountyEscrow contract ABI |

## Getting Started

### Install

```bash
npm install
```

### Configure

Create `.env.local`:

```env
NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS=0x...   # Deployed BountyFactory
NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS=0x...   # Deployed ProofVerifier
NEXT_PUBLIC_CHAIN_ID=84532                 # Base Sepolia
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...   # From cloud.walletconnect.com
```

### Run

```bash
npm run dev       # Dev server on localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

## Supported Domains

Configured in [`config/contracts.ts`](src/config/contracts.ts):

| Domain | Blueprint | Verifier |
|---|---|---|
| `gmail.com` | `GitEma01/GmailDebugBlueprint@v4` | `0x8391c7A7...` |
| `succinct.xyz` | `Bisht13/SuccinctZKResidencyInvite@v3` | `0xB0c096A9...` |

To add a new domain:

1. Add entries to `DOMAIN_BLUEPRINTS` and `BLUEPRINTS` in `config/contracts.ts`
2. Add DKIM detection logic in `submit-proof/page.tsx` if the signing domain differs from the user-facing domain
3. Register the Groth16 verifier on-chain via `ProofVerifier.registerVerifier()`

## WASM Support

The ZK Email SDK requires WebAssembly. Configured in `next.config.ts`:

- `asyncWebAssembly: true`
- `topLevelAwait: true`

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   ├── create/page.tsx       # Create bounty
│   │   ├── bounties/page.tsx     # Browse bounties
│   │   ├── submit-proof/page.tsx # Submit ZK proof
│   │   └── claim/page.tsx        # Claim reward
│   ├── abi/                      # Contract ABIs
│   ├── components/               # React components
│   ├── config/                   # Contracts, wagmi config
│   └── hooks/                    # Custom hooks
├── public/                       # Static assets
├── .env.local                    # Environment variables
├── next.config.ts
├── package.json
└── tsconfig.json
```
