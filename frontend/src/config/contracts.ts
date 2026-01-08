import { keccak256, toBytes } from 'viem';

export const CONTRACTS = {
  BOUNTY_FACTORY: process.env.NEXT_PUBLIC_BOUNTY_FACTORY_ADDRESS as `0x${string}`,
  PROOF_VERIFIER: process.env.NEXT_PUBLIC_PROOF_VERIFIER_ADDRESS as `0x${string}`,
} as const;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 84532;

// ============ MULTI-BLUEPRINT CONFIGURATION ============

/**
 * Mapping dominio → blueprint ZK Email
 * FIX: Ripristinata la v3 per Succinct che è stabile.
 * NOTA: Se Gmail dà errore "TargetNotRepeatable", la regex nel registry va semplificata.
 */
export const DOMAIN_BLUEPRINTS: Record<string, string> = {
  'gmail.com': 'GitEma01/GmailDebugBlueprint@v2',
  'succinct.xyz': 'Bisht13/SuccinctZKResidencyInvite@v3', // Reverted to v3 (Stable) from v5
};

/**
 * Lista dei domini supportati per la verifica ZK
 */
export const SUPPORTED_DOMAINS = Object.keys(DOMAIN_BLUEPRINTS);

/**
 * Restituisce il blueprint per un dominio specifico
 */
export function getBlueprintForDomain(domain: string): string | null {
  const normalizedDomain = domain.toLowerCase().trim();
  return DOMAIN_BLUEPRINTS[normalizedDomain] || null;
}

/**
 * Verifica se un dominio è supportato per la prova ZK
 */
export function isDomainSupported(domain: string): boolean {
  return getBlueprintForDomain(domain) !== null;
}

// ============ CONSTANTS ============

export const MIN_REWARD_ETH = 0.01;
export const MAX_KEYWORDS = 5;
export const MIN_BOUNTY_DURATION_DAYS = 7;
export const MAX_BOUNTY_DURATION_DAYS = 365;

// ============ HELPER FUNCTIONS ============

/**
 * Hash di una keyword per la verifica on-chain
 */
export function hashKeyword(keyword: string): `0x${string}` {
  const lowercaseKeyword = keyword.toLowerCase().trim();
  return keccak256(toBytes(lowercaseKeyword));
}

export function hashKeywords(keywords: string[]): `0x${string}`[] {
  return keywords.map(kw => hashKeyword(kw));
}
