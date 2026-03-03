// src/abi/BountyEscrow.ts

export const BountyEscrowABI = [
  {
    "type": "function",
    "name": "submitProof",
    "inputs": [
      {
        "name": "proofData",
        "type": "tuple",
        "internalType": "struct BountyLib.ProofData",
        "components": [
          { "name": "pi_a", "type": "uint256[2]", "internalType": "uint256[2]" },
          { "name": "pi_b", "type": "uint256[2][2]", "internalType": "uint256[2][2]" },
          { "name": "pi_c", "type": "uint256[2]", "internalType": "uint256[2]" },
          { "name": "publicSignals", "type": "uint256[]", "internalType": "uint256[]" }
        ]
      },
      { "name": "provenDomain", "type": "string", "internalType": "string" },
      { "name": "keywordHashes", "type": "bytes32[]", "internalType": "bytes32[]" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimReward",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getBountyDetails",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct BountyLib.BountyDetails",
        "components": [
          { "name": "id", "type": "uint256", "internalType": "uint256" },
          { "name": "domain", "type": "string", "internalType": "string" },
          { "name": "description", "type": "string", "internalType": "string" },
          { "name": "totalReward", "type": "uint256", "internalType": "uint256" },
          { "name": "deadline", "type": "uint256", "internalType": "uint256" },
          { "name": "status", "type": "uint8", "internalType": "enum BountyLib.BountyStatus" },
          { "name": "creator", "type": "address", "internalType": "address" },
          { "name": "createdAt", "type": "uint256", "internalType": "uint256" },
          { "name": "keywords", "type": "string[]", "internalType": "string[]" },
          { "name": "hashedKeywords", "type": "bytes32[]", "internalType": "bytes32[]" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getClaimInfo",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct BountyLib.ClaimInfo",
        "components": [
          { "name": "claimant", "type": "address", "internalType": "address" },
          { "name": "claimTimestamp", "type": "uint256", "internalType": "uint256" },
          { "name": "nullifier", "type": "bytes32", "internalType": "bytes32" },
          { "name": "disputeDeadline", "type": "uint256", "internalType": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "status",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint8", "internalType": "enum BountyLib.BountyStatus" }],
    "stateMutability": "view"
  }
] as const;
