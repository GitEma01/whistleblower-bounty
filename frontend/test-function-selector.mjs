// test-function-selector.mjs
import { keccak256, toBytes } from 'viem';

// Calcola i selettori di diverse funzioni
const functions = [
  'verify(uint8,uint256[2],uint256[2][2],uint256[2],uint256[8])',
  'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[8])',
  'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[])',
];

console.log('Function selectors:');
for (const func of functions) {
  const hash = keccak256(toBytes(func));
  const selector = hash.slice(0, 10);
  console.log(`${selector} = ${func}`);
}

console.log('\nSDK uses: 0xdf6871b3');
