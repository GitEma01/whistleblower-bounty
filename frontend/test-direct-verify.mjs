// test-direct-verify.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';

const VERIFIER_ABI = [
  {
    "inputs": [
      {"internalType": "uint8", "name": "proofType", "type": "uint8"},
      {"internalType": "uint256[2]", "name": "a", "type": "uint256[2]"},
      {"internalType": "uint256[2][2]", "name": "b", "type": "uint256[2][2]"},
      {"internalType": "uint256[2]", "name": "c", "type": "uint256[2]"},
      {"internalType": "uint256[8]", "name": "signals", "type": "uint256[8]"}
    ],
    "name": "verify",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256[2]", "name": "_pA", "type": "uint256[2]"},
      {"internalType": "uint256[2][2]", "name": "_pB", "type": "uint256[2][2]"},
      {"internalType": "uint256[2]", "name": "_pC", "type": "uint256[2]"},
      {"internalType": "uint256[]", "name": "_pubSignals", "type": "uint256[]"}
    ],
    "name": "verifyProof",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  const emlPath = process.argv[2];
  if (!emlPath) {
    console.log('Usage: node test-direct-verify.mjs <path-to-eml>');
    return;
  }

  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('=== GENERATING PROOF ===');
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  const proofData = proof.props.proofData;
  const publicOutputs = proof.props.publicOutputs;
  
  console.log('\n=== PROOF DATA ===');
  console.log('pi_a:', proofData.pi_a);
  console.log('pi_b:', proofData.pi_b);
  console.log('pi_c:', proofData.pi_c);
  console.log('publicOutputs length:', publicOutputs.length);
  console.log('publicOutputs:', publicOutputs);

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  const verifierAddress = blueprint.props.verifierContract.address;

  // Prepara i dati
  const pi_a = [BigInt(proofData.pi_a[0]), BigInt(proofData.pi_a[1])];
  const pi_b = [
    [BigInt(proofData.pi_b[0][0]), BigInt(proofData.pi_b[0][1])],
    [BigInt(proofData.pi_b[1][0]), BigInt(proofData.pi_b[1][1])]
  ];
  const pi_c = [BigInt(proofData.pi_c[0]), BigInt(proofData.pi_c[1])];
  const signals = publicOutputs.map(s => BigInt(s));

  // Test 1: Prova con verify() - interfaccia Registry
  console.log('\n=== TEST 1: verify() with proofType=1 ===');
  try {
    const signals8 = signals.slice(0, 8);
    while (signals8.length < 8) signals8.push(0n);
    
    const result = await client.readContract({
      address: verifierAddress,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, pi_a, pi_b, pi_c, signals8]
    });
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Test 2: Prova con verifyProof() - interfaccia standard
  console.log('\n=== TEST 2: verifyProof() standard ===');
  try {
    const result = await client.readContract({
      address: verifierAddress,
      abi: VERIFIER_ABI,
      functionName: 'verifyProof',
      args: [pi_a, pi_b, pi_c, signals]
    });
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Test 3: Prova con pi_b invertito (come richiesto da alcuni verifier)
  console.log('\n=== TEST 3: verify() with swapped pi_b ===');
  try {
    const pi_b_swapped = [
      [BigInt(proofData.pi_b[0][1]), BigInt(proofData.pi_b[0][0])],
      [BigInt(proofData.pi_b[1][1]), BigInt(proofData.pi_b[1][0])]
    ];
    const signals8 = signals.slice(0, 8);
    while (signals8.length < 8) signals8.push(0n);
    
    const result = await client.readContract({
      address: verifierAddress,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, pi_a, pi_b_swapped, pi_c, signals8]
    });
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.message);
  }

  // Test 4: Prova con pi_b completamente invertito
  console.log('\n=== TEST 4: verify() with fully swapped pi_b ===');
  try {
    const pi_b_full_swap = [
      [BigInt(proofData.pi_b[1][1]), BigInt(proofData.pi_b[1][0])],
      [BigInt(proofData.pi_b[0][1]), BigInt(proofData.pi_b[0][0])]
    ];
    const signals8 = signals.slice(0, 8);
    while (signals8.length < 8) signals8.push(0n);
    
    const result = await client.readContract({
      address: verifierAddress,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, pi_a, pi_b_full_swap, pi_c, signals8]
    });
    console.log('Result:', result);
  } catch (e) {
    console.log('Error:', e.message);
  }
}

main().catch(console.error);
