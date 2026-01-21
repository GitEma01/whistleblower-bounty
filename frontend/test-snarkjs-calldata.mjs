// test-snarkjs-calldata.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import * as snarkjs from 'snarkjs';
import fs from 'fs';

async function main() {
  const emlPath = process.argv[2] || './residency.eml';
  
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('=== GENERATING PROOF ===');
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  const proofData = proof.props.proofData;
  const publicOutputs = proof.props.publicOutputs;
  
  console.log('Proof generated');
  console.log('Public outputs length:', publicOutputs.length);

  // Usa snarkjs per generare il calldata (come fa l'SDK)
  console.log('\n=== SNARKJS exportSolidityCallData ===');
  let calldata = await snarkjs.groth16.exportSolidityCallData(proofData, publicOutputs);
  console.log('Raw calldata string:', calldata.substring(0, 200) + '...');
  
  calldata = JSON.parse(`[${calldata}]`);
  console.log('\nParsed calldata:');
  console.log('a:', calldata[0]);
  console.log('b:', calldata[1]);
  console.log('c:', calldata[2]);
  console.log('signals:', calldata[3]);

  // Verifica on-chain con il calldata di snarkjs
  console.log('\n=== ON-CHAIN VERIFICATION ===');
  
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  const VERIFIER_ABI = [{
    inputs: [
      { name: "proofType", type: "uint8" },
      { name: "a", type: "uint256[2]" },
      { name: "b", type: "uint256[2][2]" },
      { name: "c", type: "uint256[2]" },
      { name: "signals", type: `uint256[${publicOutputs.length}]` }
    ],
    name: "verify",
    outputs: [],
    stateMutability: "view",
    type: "function"
  }];

  try {
    await client.readContract({
      address: blueprint.props.verifierContract.address,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, ...calldata]
    });
    console.log('✅ VERIFICATION PASSED!');
  } catch (e) {
    console.log('❌ Error:', e.message.split('\n')[0]);
  }
}

main().catch(console.error);
