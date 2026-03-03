# Whistleblower Bounty Platform

A decentralized whistleblower bounty platform on Base Sepolia where bounty creators escrow ETH and whistleblowers prove possession of specific DKIM-signed emails using zero-knowledge proofs (Groth16) — without revealing their identity or email content.

## How It Works

1. **Create a Bounty** — A bounty creator deposits ETH into an escrow contract, specifying a target email domain (e.g. `gmail.com`, `succinct.xyz`) and optional keywords that must appear in the email.
2. **Submit a Proof** — A whistleblower uploads a `.eml` file. The frontend generates a Groth16 zero-knowledge proof via the [ZK Email SDK](https://github.com/zkemail/zk-email-sdk), proving the email is DKIM-signed by the target domain and contains the required keywords — without revealing the email content or sender identity.
3. **On-Chain Verification** — The proof is submitted to the smart contract, which verifies it against the domain-specific Groth16 verifier deployed on-chain.
4. **Claim Reward** — After a 5-minute dispute period, the whistleblower can claim the escrowed ETH reward.

## Architecture

```
BountyFactory (factory)
  └── deploys BountyEscrow (per-bounty escrow)
        └── verifies via ProofVerifier (router)
              └── delegates to domain-specific Groth16Verifier contracts
```

### Smart Contracts

| Contract | Description |
|---|---|
| `BountyFactory` | Factory that deploys individual `BountyEscrow` contracts per bounty |
| `BountyEscrow` | Manages funds, proof submission, dispute period, and reward claiming for a single bounty |
| `ProofVerifier` | Routes ZK proofs to the correct Groth16 verifier based on email domain |
| `BountyLib` | Shared data structures, constants (min reward, dispute period, max keywords) |

### Frontend Pages

| Page | Description |
|---|---|
| `/` | Landing page |
| `/create` | Create a new bounty with domain, keywords, and ETH reward |
| `/bounties` | Browse active bounties |
| `/submit-proof` | Upload `.eml` file, generate ZK proof, and submit on-chain |
| `/claim` | Claim reward after dispute period |

## Tech Stack

**Contracts**
- Solidity 0.8.24 (IR optimizer, 200 runs)
- Foundry (build, test, deploy)
- OpenZeppelin (access control, reentrancy guard)
- Chain: Base Sepolia (84532)

**Frontend**
- Next.js 16 + React 19 (TypeScript)
- Wagmi + RainbowKit (wallet connection)
- ZK Email SDK 3.0.0 (Groth16 proof generation)
- Tailwind CSS 4

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) >= 18
- A wallet with Base Sepolia ETH ([faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))

### Contracts

```bash
cd contracts
forge install          # Install dependencies
forge build            # Compile
forge test             # Run tests
forge test --match-test testFunctionName -vvv  # Single test, verbose
```

### Frontend

```bash
cd frontend
npm install            # Install dependencies
npm run dev            # Dev server on localhost:3000
npm run build          # Production build
```

### Deploy to Base Sepolia

```bash
cd contracts
cp .env.example .env   # Fill in PRIVATE_KEY and RPC_URL
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

After deployment, update `frontend/.env.local` with the new contract addresses printed in the deploy output.

### Environment Variables

**Contracts** (`.env`)
| Variable | Description |
|---|---|
| `RPC_URL` | Base Sepolia RPC endpoint |
| `PRIVATE_KEY` | Deployer wallet private key |

**Frontend** (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS` | Deployed BountyFactory address |
| `NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS` | Deployed ProofVerifier address |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID (84532 for Base Sepolia) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |

## Supported Email Domains

| Domain | Blueprint | Public Signals |
|---|---|---|
| `gmail.com` | `GitEma01/GmailDebugBlueprint@v4` | 7 |
| `succinct.xyz` | `Bisht13/SuccinctZKResidencyInvite@v3` | 8 |

Each domain has a dedicated Groth16 verifier contract deployed on Base Sepolia. The `ProofVerifier` router dynamically builds the correct function selector based on the public signals count.

## Privacy & Security

- **Zero-knowledge proofs** — The whistleblower proves email authenticity without revealing the email content, sender, or their own identity.
- **DKIM verification** — Proofs are tied to the email's DKIM signature, which is cryptographically signed by the sending mail server.
- **Nullifiers** — Each email proof produces a unique nullifier that prevents double-claiming.
- **Keyword hashes** — Required keywords are stored as keccak256 hashes on-chain, not in plaintext.
- **Dispute period** — A 5-minute window after proof submission allows bounty contributors to challenge fraudulent claims.

## Key Implementation Details

- **Groth16 proof formatting**: `pi_b` array elements are swapped (index 0 <-> 1 within each pair) when converting from snarkjs to Solidity format. This is handled by the ZK Email SDK's `createCallData()` method.
- **Verifier addresses**: The ZK Email Registry deploys wrapper contracts that delegate to inner Groth16 verifiers. The platform uses the inner verifier addresses directly because `verifyProof()` only exists on the inner contracts.
- **DKIM domain aliases**: Gmail signs emails with `d=google.com`, not `d=gmail.com`. The contracts normalize `google.com` to `gmail.com` for domain matching.

## License

MIT
