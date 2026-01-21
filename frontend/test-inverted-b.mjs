// test-inverted-b.mjs
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';

const VERIFIER_ABI = [
  {
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
  }
];

async function main() {
  const data = JSON.parse(fs.readFileSync('proof-analysis.json', 'utf-8'));
  
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  const verifier = data.blueprint.verifier.address;
  
  // Test con formato INVERTITO (standard snarkjs -> solidity)
  console.log('=== TEST WITH INVERTED B FORMAT ===');
  
  const a = data.proof.invertedBFormat.a.map(x => BigInt(x));
  const b = data.proof.invertedBFormat.b.map(row => row.map(x => BigInt(x)));
  const c = data.proof.invertedBFormat.c.map(x => BigInt(x));
  const signals = data.publicSignals.map(x => BigInt(x));

  console.log('a:', a);
  console.log('b:', b);
  console.log('c:', c);
  console.log('signals:', signals);

  try {
    const result = await client.readContract({
      address: verifier,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, a, b, c, signals]
    });
    console.log('\nResult:', result ? '✅ VALID' : '❌ INVALID');
  } catch (e) {
    console.log('\nError:', e.message.split('\n')[0]);
  }

  // Test con formato DIRETTO (come lo passiamo nei nostri test)
  console.log('\n=== TEST WITH DIRECT FORMAT ===');
  
  const a2 = data.proof.directFormat.a.map(x => BigInt(x));
  const b2 = data.proof.directFormat.b.map(row => row.map(x => BigInt(x)));
  const c2 = data.proof.directFormat.c.map(x => BigInt(x));

  try {
    const result = await client.readContract({
      address: verifier,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, a2, b2, c2, signals]
    });
    console.log('Result:', result ? '✅ VALID' : '❌ INVALID');
  } catch (e) {
    console.log('Error:', e.message.split('\n')[0]);
  }
}

main().catch(console.error);
