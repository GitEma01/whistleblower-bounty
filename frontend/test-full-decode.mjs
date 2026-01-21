// test-full-decode.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http, decodeAbiParameters, encodeFunctionData, keccak256, toBytes } from 'viem';
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
  
  console.log('Proof generated\n');

  // 1. Genera calldata con snarkjs (come fa l'SDK)
  let snarkjsCalldata = await snarkjs.groth16.exportSolidityCallData(proofData, publicOutputs);
  snarkjsCalldata = JSON.parse(`[${snarkjsCalldata}]`);
  
  console.log('=== SNARKJS CALLDATA ===');
  console.log('a:', snarkjsCalldata[0]);
  console.log('b:', snarkjsCalldata[1]);
  console.log('c:', snarkjsCalldata[2]);
  console.log('signals:', snarkjsCalldata[3]);

  // 2. Codifica come fa viem
  const ABI = [{
    type: 'function',
    name: 'verify',
    inputs: [
      { name: 'proofType', type: 'uint8' },
      { name: 'a', type: 'uint256[2]' },
      { name: 'b', type: 'uint256[2][2]' },
      { name: 'c', type: 'uint256[2]' },
      { name: 'signals', type: 'uint256[8]' }
    ],
    outputs: [],
    stateMutability: 'view'
  }];

  // Converti in BigInt
  const a = snarkjsCalldata[0].map(x => BigInt(x));
  const b = snarkjsCalldata[1].map(row => row.map(x => BigInt(x)));
  const c = snarkjsCalldata[2].map(x => BigInt(x));
  const signals = snarkjsCalldata[3].map(x => BigInt(x));

  const encodedData = encodeFunctionData({
    abi: ABI,
    functionName: 'verify',
    args: [1, a, b, c, signals]
  });

  console.log('\n=== ENCODED CALLDATA ===');
  console.log('Length:', encodedData.length);
  console.log('Selector:', encodedData.slice(0, 10));
  console.log('Data preview:', encodedData.slice(0, 100) + '...');

  // 3. Chiamata diretta
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  console.log('\n=== DIRECT CALL WITH ENCODED DATA ===');
  try {
    const result = await client.call({
      to: blueprint.props.verifierContract.address,
      data: encodedData
    });
    console.log('✅ Call succeeded! Result:', result);
  } catch (e) {
    console.log('❌ Call failed:', e.shortMessage || e.message.split('\n')[0]);
  }

  // 4. SDK call per confronto
  console.log('\n=== SDK CALL ===');
  const sdkResult = await blueprint.verifyProofOnChain(proof);
  console.log('SDK Result:', sdkResult);
}

main().catch(console.error);
