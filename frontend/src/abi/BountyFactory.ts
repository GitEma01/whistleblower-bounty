// src/abi/BountyFactory.ts

export const BountyFactoryABI = [
  {
    "type": "constructor",
    "inputs": [{ "name": "_proofVerifier", "type": "address", "internalType": "address" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createBounty",
    "inputs": [
      { "name": "domain", "type": "string", "internalType": "string" },
      { "name": "description", "type": "string", "internalType": "string" },
      { "name": "deadline", "type": "uint256", "internalType": "uint256" },
      { "name": "keywords", "type": "string[]", "internalType": "string[]" },
      { "name": "_groth16Verifier", "type": "address", "internalType": "address" } // <--- FONDAMENTALE
    ],
    "outputs": [
      { "name": "bountyId", "type": "uint256", "internalType": "uint256" },
      { "name": "escrowAddress", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getBounty",
    "inputs": [{ "name": "bountyId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      {
        "name": "details",
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
    "name": "getEscrowAddress",
    "inputs": [{ "name": "bountyId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBountyCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStats",
    "inputs": [],
    "outputs": [
      { "name": "totalBounties", "type": "uint256", "internalType": "uint256" },
      { "name": "activeBounties", "type": "uint256", "internalType": "uint256" },
      { "name": "totalValueLocked", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  }
] as const;
