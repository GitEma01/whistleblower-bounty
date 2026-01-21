// Salva come: check-bounty2.mjs

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Questo è il ProofVerifier che il bounty sta REALMENTE usando
const ACTUAL_PROOF_VERIFIER = '0x5eA441DbaD3ecc19e5318942b0B2170c95E1e6b9';

const proofVerifierAbi = [
  { name: 'testMode', type: 'function', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { name: 'owner', type: 'function', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' }
];

async function main() {
  console.log('=== PROOF VERIFIER USATO DAL BOUNTY ===');
  console.log('Address:', ACTUAL_PROOF_VERIFIER);

  try {
    const testMode = await client.readContract({
      address: ACTUAL_PROOF_VERIFIER,
      abi: proofVerifierAbi,
      functionName: 'testMode'
    });
    console.log('Test Mode:', testMode);
  } catch (e) {
    console.log('Errore testMode:', e.shortMessage);
  }

  try {
    const owner = await client.readContract({
      address: ACTUAL_PROOF_VERIFIER,
      abi: proofVerifierAbi,
      functionName: 'owner'
    });
    console.log('Owner:', owner);
  } catch (e) {
    console.log('Errore owner:', e.shortMessage);
  }
}

main().catch(console.error);
