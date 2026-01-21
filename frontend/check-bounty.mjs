// Salva come: check-bounty.mjs

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

const ESCROW_ADDRESS = '0x7e526BB9E9D4B2FFAd95978c2F8c3b199CFcACEB';
const PROOF_VERIFIER_ADDRESS = '0x8D57d8b286DB0F57CdaDbe168C88D92eCc9C2894';

const escrowAbi = [
  { name: 'groth16Verifier', type: 'function', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
  { name: 'domain', type: 'function', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
  { name: 'proofVerifier', type: 'function', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' }
];

const proofVerifierAbi = [
  { name: 'testMode', type: 'function', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' }
];

async function main() {
  console.log('=== BOUNTY ESCROW (ID 3) ===');
  console.log('Address:', ESCROW_ADDRESS);
  
  const domain = await client.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: 'domain'
  });
  console.log('Domain:', domain);

  const groth16Verifier = await client.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: 'groth16Verifier'
  });
  console.log('Groth16 Verifier:', groth16Verifier);

  const proofVerifier = await client.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: 'proofVerifier'
  });
  console.log('Proof Verifier (Router):', proofVerifier);

  console.log('\n=== PROOF VERIFIER (ROUTER) ===');
  console.log('Address:', PROOF_VERIFIER_ADDRESS);

  const testMode = await client.readContract({
    address: PROOF_VERIFIER_ADDRESS,
    abi: proofVerifierAbi,
    functionName: 'testMode'
  });
  console.log('Test Mode:', testMode);

  console.log('\n=== VERIFIER ATTESI DAL REGISTRY ===');
  console.log('Gmail (GitEma01/GmailDebugBlueprint@v4):', '0x9e310d2dF602C45922CC810A0F2A98F92e065A3e');
  console.log('Succinct (Bisht13/SuccinctZKResidencyInvite@v3):', '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848');

  console.log('\n=== CONFRONTO ===');
  if (domain.toLowerCase() === 'gmail.com') {
    console.log('Match Gmail:', groth16Verifier.toLowerCase() === '0x9e310d2dF602C45922CC810A0F2A98F92e065A3e'.toLowerCase() ? '✅ OK' : '❌ MISMATCH');
  } else if (domain.toLowerCase() === 'succinct.xyz') {
    console.log('Match Succinct:', groth16Verifier.toLowerCase() === '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848'.toLowerCase() ? '✅ OK' : '❌ MISMATCH');
  }
}

main().catch(console.error);
