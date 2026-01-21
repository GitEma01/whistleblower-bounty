// Salva come: analyze-verifier.mjs
import { createPublicClient, http, keccak256, toHex, decodeFunctionData, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';

const VERIFIER = '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

console.log('=== ANALISI BYTECODE VERIFIER SUCCINCT ===\n');

// Ottieni il bytecode
const code = await client.getCode({ address: VERIFIER });
console.log('Bytecode length:', code.length, 'chars');

// I selector sono tipicamente nei primi bytes dopo il dispatcher
// Cerchiamo pattern comuni di function selector (4 bytes dopo 63xxxxxx che è PUSH4)
console.log('\n=== CERCANDO SELECTORS NEL BYTECODE ===\n');

// Estrai tutti i potenziali selector (pattern: 63XXXXXXXX = PUSH4)
const bytecode = code.toLowerCase().slice(2); // rimuovi 0x
const selectors = new Set();

// Cerca PUSH4 (0x63) seguito da 4 bytes
for (let i = 0; i < bytecode.length - 10; i += 2) {
  if (bytecode.slice(i, i+2) === '63') {
    const selector = bytecode.slice(i+2, i+10);
    if (selector.length === 8) {
      selectors.add(selector);
    }
  }
}

console.log('Potenziali selectors trovati:');
for (const sel of selectors) {
  console.log(`  0x${sel}`);
}

// Ora testiamo firme comuni per verifier Groth16
console.log('\n=== TESTING FIRME COMUNI ===\n');

const commonSignatures = [
  // Standard snarkjs
  'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[])',
  'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[8])',
  'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[1])',
  
  // ZK Email Registry wrapper
  'verify(uint8,uint256[2],uint256[2][2],uint256[2],uint256[8])',
  'verify(uint256[2],uint256[2][2],uint256[2],uint256[8])',
  'verify(uint256[2],uint256[2][2],uint256[2],uint256[])',
  
  // Altri comuni
  'verifyProof(bytes)',
  'verifyProof(uint256[8])',
  'verify(bytes)',
];

for (const sig of commonSignatures) {
  const hash = keccak256(toHex(sig));
  const selector = hash.slice(2, 10); // senza 0x
  const found = selectors.has(selector);
  console.log(`${found ? '✅' : '❌'} 0x${selector} <- ${sig}`);
}

// Test diretto con le firme più probabili
console.log('\n=== TEST DIRETTO CHIAMATE ===\n');

const testA = [1n, 1n];
const testB = [[1n, 1n], [1n, 1n]];
const testC = [1n, 1n];
const testSignals8 = [1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n];

// Test: verify(uint8,uint256[2],uint256[2][2],uint256[2],uint256[8])
const abiVerifyWithType = [{
  type: 'function',
  name: 'verify',
  inputs: [
    { name: 'proofType', type: 'uint8' },
    { name: '_pA', type: 'uint256[2]' },
    { name: '_pB', type: 'uint256[2][2]' },
    { name: '_pC', type: 'uint256[2]' },
    { name: '_pubSignals', type: 'uint256[8]' }
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'view'
}];

console.log('Testing: verify(uint8,uint256[2],uint256[2][2],uint256[2],uint256[8])...');
try {
  const result = await client.readContract({
    address: VERIFIER,
    abi: abiVerifyWithType,
    functionName: 'verify',
    args: [1, testA, testB, testC, testSignals8]
  });
  console.log('   ✅ FUNZIONA! Result:', result);
} catch (e) {
  const msg = e.shortMessage || e.message;
  if (msg.includes('reverted')) {
    console.log('   ⚠️ Funzione ESISTE - reverted (normale con dummy data)');
  } else {
    console.log('   ❌', msg.split('\n')[0]);
  }
}

// Test: verify(uint256[2],uint256[2][2],uint256[2],uint256[8])
const abiVerifyNoType = [{
  type: 'function',
  name: 'verify',
  inputs: [
    { name: '_pA', type: 'uint256[2]' },
    { name: '_pB', type: 'uint256[2][2]' },
    { name: '_pC', type: 'uint256[2]' },
    { name: '_pubSignals', type: 'uint256[8]' }
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'view'
}];

console.log('\nTesting: verify(uint256[2],uint256[2][2],uint256[2],uint256[8])...');
try {
  const result = await client.readContract({
    address: VERIFIER,
    abi: abiVerifyNoType,
    functionName: 'verify',
    args: [testA, testB, testC, testSignals8]
  });
  console.log('   ✅ FUNZIONA! Result:', result);
} catch (e) {
  const msg = e.shortMessage || e.message;
  if (msg.includes('reverted')) {
    console.log('   ⚠️ Funzione ESISTE - reverted (normale con dummy data)');
  } else {
    console.log('   ❌', msg.split('\n')[0]);
  }
}

// Stampa i primi 500 caratteri del bytecode per analisi manuale
console.log('\n=== BYTECODE (primi 500 chars) ===\n');
console.log(code.slice(0, 500));
