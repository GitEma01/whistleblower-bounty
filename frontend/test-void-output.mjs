// test-void-output.mjs
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

  // Usa snarkjs per generare il calldata
  let calldata = await snarkjs.groth16.exportSolidityCallData(proofData, publicOutputs);
  calldata = JSON.parse(`[${calldata}]`);

  console.log('\n=== CALLDATA FROM SNARKJS ===');
  console.log('Length:', calldata.length);

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  // ABI con outputs VUOTO (come fa l'SDK)
  const VERIFIER_ABI_NO_OUTPUT = [{
    inputs: [
      { name: "proofType", type: "uint8" },
      { name: "a", type: "uint256[2]" },
      { name: "b", type: "uint256[2][2]" },
      { name: "c", type: "uint256[2]" },
      { name: "signals", type: `uint256[8]` }
    ],
    name: "verify",
    outputs: [],  // Nessun output!
    stateMutability: "view",
    type: "function"
  }];

  // ABI con output bool
  const VERIFIER_ABI_BOOL = [{
    inputs: [
      { name: "proofType", type: "uint8" },
      { name: "a", type: "uint256[2]" },
      { name: "b", type: "uint256[2][2]" },
      { name: "c", type: "uint256[2]" },
      { name: "signals", type: `uint256[8]` }
    ],
    name: "verify",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function"
  }];

  const verifierAddress = blueprint.props.verifierContract.address;

  // Test 1: Con outputs vuoto
  console.log('\n=== TEST 1: ABI with empty outputs ===');
  try {
    const result = await client.readContract({
      address: verifierAddress,
      abi: VERIFIER_ABI_NO_OUTPUT,
      functionName: 'verify',
      args: [1, ...calldata]
    });
    console.log('✅ SUCCESS! Result:', result);
  } catch (e) {
    console.log('❌ Failed:', e.shortMessage || e.message.split('\n')[0]);
  }

  // Test 2: Con output bool
  console.log('\n=== TEST 2: ABI with bool output ===');
  try {
    const result = await client.readContract({
      address: verifierAddress,
      abi: VERIFIER_ABI_BOOL,
      functionName: 'verify',
      args: [1, ...calldata]
    });
    console.log('✅ SUCCESS! Result:', result);
  } catch (e) {
    console.log('❌ Failed:', e.shortMessage || e.message.split('\n')[0]);
  }

  // Test 3: simulateContract invece di readContract
  console.log('\n=== TEST 3: Using simulateContract ===');
  try {
    const { request } = await client.simulateContract({
      address: verifierAddress,
      abi: VERIFIER_ABI_NO_OUTPUT,
      functionName: 'verify',
      args: [1, ...calldata]
    });
    console.log('✅ SUCCESS! Simulation passed');
  } catch (e) {
    console.log('❌ Failed:', e.shortMessage || e.message.split('\n')[0]);
  }

  // Test 4: Usa direttamente il metodo SDK
  console.log('\n=== TEST 4: SDK verifyProofOnChain ===');
  try {
    const result = await blueprint.verifyProofOnChain(proof);
    console.log('✅ SDK Result:', result);
  } catch (e) {
    console.log('❌ SDK Failed:', e.message);
  }
}

main().catch(console.error);
