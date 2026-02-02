# Contracts

Solidity smart contracts for the Whistleblower Bounty Platform, built with [Foundry](https://book.getfoundry.sh/).

## Overview

The contract system follows a **Factory -> Escrow -> Verifier** pattern:

```
BountyFactory
  |
  |-- createBounty() --> deploys BountyEscrow (one per bounty)
  |
  +-- BountyEscrow
        |
        |-- submitProof() --> calls ProofVerifier
        |                       |
        |                       +-- staticcall --> Groth16Verifier (per domain)
        |
        |-- claimReward()    (after dispute period)
        |-- openDispute()    (during dispute period)
        +-- refund()         (after deadline, if unclaimed)
```

## Contracts

### Core

| Contract | Description |
|---|---|
| [`BountyFactory`](src/BountyFactory.sol) | Creates and indexes bounties. Deploys a new `BountyEscrow` per bounty with escrowed ETH. |
| [`BountyEscrow`](src/BountyEscrow.sol) | Manages the lifecycle of a single bounty: proof submission, dispute period (5 min), reward claiming, refunds. |
| [`ProofVerifier`](src/ProofVerifier.sol) | Routes ZK proofs to domain-specific Groth16 verifiers using low-level `staticcall` with dynamically built selectors. |

### Libraries & Interfaces

| File | Description |
|---|---|
| [`BountyLib`](src/libraries/BountyLib.sol) | Shared structs (`ProofData`, `ClaimInfo`, `BountyDetails`), constants (`MIN_REWARD`, `DISPUTE_PERIOD`, `MAX_KEYWORDS`). |
| [`IBountyFactory`](src/interfaces/IBountyFactory.sol) | Factory interface |
| [`IBountyEscrow`](src/interfaces/IBountyEscrow.sol) | Escrow interface |
| [`IProofVerifier`](src/interfaces/IProofVerifier.sol) | Verifier router interface |

## Proof Verification

The `ProofVerifier` does **not** use a standard Solidity interface to call Groth16 verifiers because the public signals array size varies per domain (7 for Gmail, 8 for Succinct). Instead, it:

1. Dynamically builds the function selector: `verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[N])`
2. Encodes calldata manually with `abi.encodePacked` (fixed-size arrays, no offsets)
3. Executes a `staticcall` to the domain's inner Groth16 verifier
4. Decodes the `bool` return value

### Registered Verifiers (Base Sepolia)

| Domain | Inner Groth16 Verifier | Public Signals |
|---|---|---|
| `gmail.com` | `0x8391c7A7CEf5693d2BF4dB5377210582340a89a5` | 7 |
| `succinct.xyz` | `0xB0c096A981e40Aa8DADB46A53f2DC159b2a0697e` | 8 |

> **Important**: These are the *inner* Groth16 verifier addresses, not the ZK Email Registry wrapper contracts. The wrappers expose `verify()` but the inner contracts expose `verifyProof()` which is what `ProofVerifier` calls.

## Build & Test

```bash
forge build                                    # Compile all contracts
forge test                                     # Run all tests
forge test --match-test testFunctionName -vvv  # Single test, verbose
forge fmt                                      # Format Solidity code
```

## Deploy

```bash
cp .env.example .env    # Set PRIVATE_KEY and RPC_URL
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Deployment Scripts

| Script | Description |
|---|---|
| `DeployScript` | Full deployment: ProofVerifier + domain verifier registration + BountyFactory |
| `RegisterVerifierScript` | Register a new domain verifier on an existing ProofVerifier |
| `CreateTestBountyScript` | Create a test bounty for development |
| `ViewVerifierStatusScript` | Print ProofVerifier status and registered domains |

After deployment, update the frontend environment variables with the addresses printed in the deploy output.

## Configuration

Defined in [`foundry.toml`](foundry.toml):

- Solidity 0.8.24 with IR optimizer (200 runs)
- Remappings: `@openzeppelin/` -> `lib/openzeppelin-contracts/`, `forge-std/` -> `lib/forge-std/src/`
- Fuzz testing: 256 runs
- Target chain: Base Sepolia (84532)

## Project Structure

```
contracts/
├── src/
│   ├── BountyFactory.sol
│   ├── BountyEscrow.sol
│   ├── ProofVerifier.sol
│   ├── interfaces/
│   │   ├── IBountyFactory.sol
│   │   ├── IBountyEscrow.sol
│   │   └── IProofVerifier.sol
│   └── libraries/
│       └── BountyLib.sol
├── test/
│   ├── BountyFactory.t.sol
│   ├── BountyEscrow.t.sol
│   └── ProofVerifier.t.sol
├── script/
│   └── Deploy.s.sol
├── broadcast/           # Deployment artifacts
└── foundry.toml
```
