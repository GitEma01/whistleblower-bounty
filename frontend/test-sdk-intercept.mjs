// test-sdk-intercept.mjs
import zkeSDK from '@zk-email/sdk';
import fs from 'fs';

// Intercetta tutte le chiamate fetch per vedere cosa fa l'SDK
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  console.log('\n[FETCH INTERCEPT]', args[0]);
  if (args[1]) {
    console.log('[FETCH BODY]', JSON.stringify(args[1]).substring(0, 500));
  }
  return originalFetch(...args);
};

async function main() {
  const emlPath = process.argv[2] || './residency.eml';
  
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('=== GENERATING PROOF ===');
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  console.log('\n=== CALLING verifyProofOnChain ===');
  console.log('Watching for RPC calls...\n');
  
  try {
    const result = await blueprint.verifyProofOnChain(proof);
    console.log('\n✅ Result:', result);
  } catch (e) {
    console.log('\n❌ Error:', e.message);
  }
}

main().catch(console.error);
