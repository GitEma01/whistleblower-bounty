export const BountyFactoryABI = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_proofVerifier", "type": "address" }
    ]
  },
  {
    "type": "function",
    "name": "createBounty",
    "inputs": [
      { "name": "_domain", "type": "string" },
      { "name": "_description", "type": "string" },
      { "name": "_deadline", "type": "uint256" },
      { "name": "_keywords", "type": "string[]" }
    ],
    "outputs": [
      { "name": "bountyId", "type": "uint256" },
      { "name": "escrowAddress", "type": "address" }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getBounty",
    "inputs": [
      { "name": "_bountyId", "type": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "domain", "type": "string" },
          { "name": "description", "type": "string" },
          { "name": "totalReward", "type": "uint256" },
          { "name": "deadline", "type": "uint256" },
          { "name": "status", "type": "uint8" },
          { "name": "creator", "type": "address" },
          { "name": "createdAt", "type": "uint256" },
          { "name": "keywords", "type": "string[]" },
          { "name": "hashedKeywords", "type": "bytes32[]" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBountyCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEscrowAddress",
    "inputs": [
      { "name": "_bountyId", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getActiveBounties",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBountyKeywords",
    "inputs": [
      { "name": "_bountyId", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "string[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getBountyKeywordHashes",
    "inputs": [
      { "name": "_bountyId", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bytes32[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStats",
    "inputs": [],
    "outputs": [
      { "name": "totalBounties", "type": "uint256" },
      { "name": "activeBounties", "type": "uint256" },
      { "name": "totalValueLocked", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "BountyCreated",
    "inputs": [
      { "name": "bountyId", "type": "uint256", "indexed": true },
      { "name": "creator", "type": "address", "indexed": true },
      { "name": "escrowAddress", "type": "address", "indexed": false },
      { "name": "domain", "type": "string", "indexed": false },
      { "name": "reward", "type": "uint256", "indexed": false },
      { "name": "deadline", "type": "uint256", "indexed": false },
      { "name": "keywordCount", "type": "uint256", "indexed": false }
    ]
  }
] as const;
