// decode-calldata.mjs
import { decodeAbiParameters } from 'viem';

// Calldata dall'intercept (rimuovo 0xdf6871b3 che è il selettore)
const calldata = '000000000000000000000000000000000000000000000000000000000000000107f66f84cace7610230eaa16f90d596504607bc293e4100a37b4a8741a0d1d2f0ebdaa32988c2b5f7e654f606b2141e5385cc833ea04c91f082e0227e6e909542d4b947f23e672ad5711874345b79da72d72959929dd545f332c35a8e32a0e58119e7ba480c40d392363478d9be59809bade58ebb5c4418fc5ebcbe0a995834b1583adce2c5ea8287c6f9edbb349596259df6f249adad907aeb1f1b5d500a3780c4b3e5cb39d81e035d';

console.log('Selector: 0xdf6871b3');
console.log('Calldata length:', calldata.length / 2, 'bytes');

// Prova a decodificare
const params = [
  { name: 'proofType', type: 'uint8' },
  { name: 'a', type: 'uint256[2]' },
  { name: 'b', type: 'uint256[2][2]' },
  { name: 'c', type: 'uint256[2]' },
  { name: 'signals', type: 'uint256[8]' },
];

try {
  const decoded = decodeAbiParameters(params, `0x${calldata}`);
  console.log('\nDecoded parameters:');
  console.log('proofType:', decoded[0]);
  console.log('a:', decoded[1].map(x => x.toString()));
  console.log('b:', decoded[2].map(row => row.map(x => x.toString())));
  console.log('c:', decoded[3].map(x => x.toString()));
  console.log('signals:', decoded[4].map(x => x.toString()));
} catch (e) {
  console.log('Decode error:', e.message);
}
