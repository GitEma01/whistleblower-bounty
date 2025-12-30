export const CONTRACTS = {
  BOUNTY_FACTORY: process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS as `0x${string}`,
  PROOF_VERIFIER: process.env.NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS as `0x${string}`,
} as const;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532;

// Blueprint ZK Email da usare
export const ZK_EMAIL_BLUEPRINT = "Bisht13/SuccinctZKResidencyInvite@v3";

