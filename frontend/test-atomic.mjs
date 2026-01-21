// test-atomic.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';

const VERIFIER_ABI = [{
  inputs: [
    { name: "proofType", type: "uint8" },
    { name: "a", type: "uint256[2]" },
    { name: "b", type: "uint256[2][2]" },
    { name: "c", type: "uint256[2]" },
    { name: "signals", type: "uint256[8]" }
  ],
  name: "verify",
  outputs: [{ type: "bool" }],
  stateMutability: "view",
  type: "function"
}];

async function main() {
  const emlPath = process.argv[2] || './residency.eml';
  
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('=== GENERATING PROOF ===');
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  console.log('Proof generated successfully');
  
  // Ottieni callData immediatamente
  const callData = await proof.createCallData();
  
  console.log('\n=== CALL DATA ===');
  console.log('a:', callData[0]);
  console.log('b:', callData[1]);
  console.log('c:', callData[2]);
  console.log('signals:', callData[3]);
  
  // Verifica off-chain prima
  console.log('\n=== OFF-CHAIN VERIFICATION ===');
  const offChain = await blueprint.verifyProof(proof);
  console.log('Result:', offChain);
  
  // Ora verifica on-chain con gli stessi dati
  console.log('\n=== ON-CHAIN VERIFICATION (direct call) ===');
  
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });
  
  const a = callData[0].map(x => BigInt(x));
  const b = callData[1].map(row => row.map(x => BigInt(x)));
  const c = callData[2].map(x => BigInt(x));
  const signals = callData[3].map(x => BigInt(x));
  
  try {
    const result = await client.readContract({
      address: blueprint.props.verifierContract.address,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, a, b, c, signals]
    });
    console.log('✅ RESULT:', result);
  } catch (e) {
    console.log('❌ Direct call failed:', e.message.split('\n')[0]);
  }
  
  // Prova anche con il metodo SDK
  console.log('\n=== ON-CHAIN VERIFICATION (SDK method) ===');
  try {
    const sdkResult = await blueprint.verifyProofOnChain(proof);
    console.log('✅ SDK Result:', sdkResult);
  } catch (e) {
    console.log('❌ SDK call failed:', e.message.split('\n')[0]);
  }
}

main().catch(console.error);
