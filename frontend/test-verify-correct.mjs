// test-verify-correct.mjs
// Testa la firma corretta: verify(uint256[2],uint256[2][2],uint256[2],uint256[8])

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import zkeSDK from '@zk-email/sdk';
import fs from 'fs';

const VERIFIER = '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// ABI corretto per il verifier Succinct
const CORRECT_ABI = [{
  type: 'function',
  name: 'verify',  // NON verifyProof!
  inputs: [
    { name: '_pA', type: 'uint256[2]' },
    { name: '_pB', type: 'uint256[2][2]' },
    { name: '_pC', type: 'uint256[2]' },
    { name: '_pubSignals', type: 'uint256[8]' }  // FISSO [8], NON dinamico!
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'view'
}];

async function main() {
  console.log('=== TEST VERIFICA CON FIRMA CORRETTA ===\n');
  console.log('Verifier:', VERIFIER);
  console.log('Firma: verify(uint256[2],uint256[2][2],uint256[2],uint256[8])\n');
  
  // Carica email
  const emlPath = process.argv[2] || './residency.eml';
  if (!fs.existsSync(emlPath)) {
    console.log('❌ File non trovato:', emlPath);
    console.log('Uso: node test-verify-correct.mjs <path-to-eml>');
    return;
  }
  
  const eml = fs.readFileSync(emlPath, 'utf-8');
  console.log('Email caricata:', emlPath, '(', eml.length, 'bytes)\n');
  
  // Genera proof
  console.log('Generando proof con SDK...');
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  console.log('✅ Proof generata!\n');
  
  // Estrai dati dalla proof
  const proofData = proof.props.proofData;
  const publicOutputs = proof.props.publicOutputs;
  
  // Formatta per Solidity
  const pi_a = [BigInt(proofData.pi_a[0]), BigInt(proofData.pi_a[1])];
  
  // IMPORTANTE: pi_b deve essere invertito per Solidity!
  const pi_b = [
    [BigInt(proofData.pi_b[0][1]), BigInt(proofData.pi_b[0][0])],
    [BigInt(proofData.pi_b[1][1]), BigInt(proofData.pi_b[1][0])]
  ];
  
  const pi_c = [BigInt(proofData.pi_c[0]), BigInt(proofData.pi_c[1])];
  
  // Converti signals in array fisso [8]
  const signals = [];
  for (let i = 0; i < 8; i++) {
    signals.push(i < publicOutputs.length ? BigInt(publicOutputs[i]) : 0n);
  }
  
  console.log('=== DATI FORMATTATI ===\n');
  console.log('pi_a:', pi_a.map(x => x.toString()));
  console.log('pi_b:', pi_b.map(row => row.map(x => x.toString())));
  console.log('pi_c:', pi_c.map(x => x.toString()));
  console.log('signals (8):', signals.map(x => x.toString()));
  
  // Test 1: pi_b invertito
  console.log('\n=== TEST 1: pi_b INVERTITO ===');
  try {
    const result = await client.readContract({
      address: VERIFIER,
      abi: CORRECT_ABI,
      functionName: 'verify',
      args: [pi_a, pi_b, pi_c, signals]
    });
    console.log('Risultato:', result ? '✅ VALID!' : '❌ INVALID');
  } catch (e) {
    console.log('❌ Errore:', e.shortMessage || e.message.split('\n')[0]);
  }
  
  // Test 2: pi_b NON invertito
  console.log('\n=== TEST 2: pi_b NON INVERTITO ===');
  const pi_b_direct = [
    [BigInt(proofData.pi_b[0][0]), BigInt(proofData.pi_b[0][1])],
    [BigInt(proofData.pi_b[1][0]), BigInt(proofData.pi_b[1][1])]
  ];
  
  try {
    const result = await client.readContract({
      address: VERIFIER,
      abi: CORRECT_ABI,
      functionName: 'verify',
      args: [pi_a, pi_b_direct, pi_c, signals]
    });
    console.log('Risultato:', result ? '✅ VALID!' : '❌ INVALID');
  } catch (e) {
    console.log('❌ Errore:', e.shortMessage || e.message.split('\n')[0]);
  }
  
  // Test 3: snarkjs exportSolidityCallData
  console.log('\n=== TEST 3: FORMATO SNARKJS ===');
  const snarkjs = await import('snarkjs');
  let calldata = await snarkjs.groth16.exportSolidityCallData(proofData, publicOutputs);
  calldata = JSON.parse(`[${calldata}]`);
  
  const snarkA = calldata[0].map(x => BigInt(x));
  const snarkB = calldata[1].map(row => row.map(x => BigInt(x)));
  const snarkC = calldata[2].map(x => BigInt(x));
  const snarkSignals = [];
  for (let i = 0; i < 8; i++) {
    snarkSignals.push(i < calldata[3].length ? BigInt(calldata[3][i]) : 0n);
  }
  
  console.log('snarkjs a:', snarkA.map(x => x.toString()));
  console.log('snarkjs b:', snarkB.map(row => row.map(x => x.toString())));
  
  try {
    const result = await client.readContract({
      address: VERIFIER,
      abi: CORRECT_ABI,
      functionName: 'verify',
      args: [snarkA, snarkB, snarkC, snarkSignals]
    });
    console.log('Risultato:', result ? '✅ VALID!' : '❌ INVALID');
  } catch (e) {
    console.log('❌ Errore:', e.shortMessage || e.message.split('\n')[0]);
  }
  
  console.log('\n=== VERIFICA OFF-CHAIN ===');
  const offChainResult = await blueprint.verifyProof(proof);
  console.log('Off-chain:', offChainResult ? '✅ VALID' : '❌ INVALID');
}

main().catch(console.error);
