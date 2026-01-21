// Salva come: test-verifier-signature.mjs
// Esegui con: node test-verifier-signature.mjs

import { createPublicClient, http, keccak256, toHex } from 'viem';
import { baseSepolia } from 'viem/chains';

const VERIFIER = '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Calcola i selector
console.log('=== FUNCTION SELECTORS ===\n');
const signatures = [
  'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[])',
  'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[8])',
];
for (const sig of signatures) {
  const hash = keccak256(toHex(sig));
  console.log(`${hash.slice(0, 10)} <- ${sig}`);
}

// Dati di test (dummy)
const testA = [1n, 1n];
const testB = [[1n, 1n], [1n, 1n]];
const testC = [1n, 1n];
const testSignals8 = [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n];

// ABI per array dinamico
const abiDynamic = [{
  type: 'function',
  name: 'verifyProof',
  inputs: [
    { name: '_pA', type: 'uint256[2]' },
    { name: '_pB', type: 'uint256[2][2]' },
    { name: '_pC', type: 'uint256[2]' },
    { name: '_pubSignals', type: 'uint256[]' }
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'view'
}];

// ABI per array fisso [8]
const abiFixed8 = [{
  type: 'function',
  name: 'verifyProof',
  inputs: [
    { name: '_pA', type: 'uint256[2]' },
    { name: '_pB', type: 'uint256[2][2]' },
    { name: '_pC', type: 'uint256[2]' },
    { name: '_pubSignals', type: 'uint256[8]' }
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'view'
}];

console.log('\n=== TESTING SIGNATURES ===\n');

// Test array dinamico
console.log('1. Testing verifyProof with uint256[] (dynamic)...');
try {
  const result = await client.readContract({
    address: VERIFIER,
    abi: abiDynamic,
    functionName: 'verifyProof',
    args: [testA, testB, testC, testSignals8]
  });
  console.log('   ✅ FUNZIONA! Result:', result);
} catch (e) {
  const msg = e.shortMessage || e.message;
  if (msg.includes('reverted')) {
    console.log('   ⚠️ Funzione ESISTE ma reverted (normale con dati dummy)');
  } else if (msg.includes('returned no data') || msg.includes('could not decode')) {
    console.log('   ❌ Funzione NON ESISTE (selector non trovato)');
  } else {
    console.log('   ❌ Errore:', msg.split('\n')[0]);
  }
}

// Test array fisso [8]
console.log('\n2. Testing verifyProof with uint256[8] (fixed)...');
try {
  const result = await client.readContract({
    address: VERIFIER,
    abi: abiFixed8,
    functionName: 'verifyProof',
    args: [testA, testB, testC, testSignals8]
  });
  console.log('   ✅ FUNZIONA! Result:', result);
} catch (e) {
  const msg = e.shortMessage || e.message;
  if (msg.includes('reverted')) {
    console.log('   ⚠️ Funzione ESISTE ma reverted (normale con dati dummy)');
  } else if (msg.includes('returned no data') || msg.includes('could not decode')) {
    console.log('   ❌ Funzione NON ESISTE (selector non trovato)');
  } else {
    console.log('   ❌ Errore:', msg.split('\n')[0]);
  }
}

// Leggiamo il bytecode per cercare i selector
console.log('\n=== BYTECODE ANALYSIS ===\n');
const code = await client.getCode({ address: VERIFIER });
console.log('Contract code length:', code.length, 'characters');

// Cerca selectors nel bytecode (senza 0x prefix)
const selectorsToFind = [
  { name: 'verifyProof(dynamic)', sel: 'c32e370e' },
  { name: 'verifyProof(fixed[8])', sel: 'c9219a7a' },
];

for (const { name, sel } of selectorsToFind) {
  if (code.toLowerCase().includes(sel)) {
    console.log(`✅ TROVATO: ${sel} <- ${name}`);
  } else {
    console.log(`❌ NON TROVATO: ${sel} <- ${name}`);
  }
}

console.log('\n=== CONCLUSIONE ===');
console.log('Se vedi "Funzione ESISTE ma reverted" per una delle firme,');
console.log('quella è la firma corretta da usare nel tuo ProofVerifier.sol');
