export const BountyEscrowABI = [
  {
    "type": "function",
    "name": "contribute",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "submitProof",
    "inputs": [
      {
        "name": "_proof",
        "type": "tuple",
        "components": [
          { "name": "pi_a", "type": "uint256[2]" },
          { "name": "pi_b", "type": "uint256[2][2]" },
          { "name": "pi_c", "type": "uint256[2]" },
          { "name": "publicSignals", "type": "uint256[]" }
        ]
      },
      { "name": "_provenDomain", "type": "string" },
      { "name": "_keywordHashes", "type": "bytes32[]" }
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
    "name": "refund",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "openDispute",
    "inputs": [
      { "name": "_reason", "type": "string" }
    ],
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
    "name": "getClaimInfo",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "claimant", "type": "address" },
          { "name": "claimTimestamp", "type": "uint256" },
          { "name": "nullifier", "type": "bytes32" },
          { "name": "disputeDeadline", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getKeywords",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getHashedKeywords",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bytes32[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getKeywordCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getContribution",
    "inputs": [
      { "name": "_contributor", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isActive",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ProofSubmitted",
    "inputs": [
      { "name": "claimant", "type": "address", "indexed": true },
      { "name": "nullifier", "type": "bytes32", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "RewardClaimed",
    "inputs": [
      { "name": "claimant", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "FundsAdded",
    "inputs": [
      { "name": "contributor", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "DisputeOpened",
    "inputs": [
      { "name": "disputant", "type": "address", "indexed": true },
      { "name": "reason", "type": "string", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "RefundProcessed",
    "inputs": [
      { "name": "contributor", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint256", "indexed": false }
    ]
  }
] as const;
