// test-all-verifiers.mjs
import zkeSDK from '@zk-email/sdk';
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

const VERIFIERS = {
  v1: '0xb5FEc8A70f5838A3Fe8a872A8416D53D480Daa88',
  v2: '0x9D10c729B326af1884C1c9C20BBd6d61B98B3Bb4',
  v3: '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848'
};

async function main() {
  const emlPath = process.argv[2];
  if (!emlPath) {
    console.log('Usage: node test-all-verifiers.mjs <path-to-eml>');
    return;
  }

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  const sdk = zkeSDK();
  const eml = fs.readFileSync(emlPath, 'utf-8');

  // Testa ogni versione del blueprint con il suo verifier
  for (const version of [1, 2, 3]) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`TESTING v${version}`);
    console.log('='.repeat(50));

    try {
      const blueprint = await sdk.getBlueprint(`Bisht13/SuccinctZKResidencyInvite@v${version}`);
      const verifier = blueprint.props.verifierContract.address;
      
      console.log('Verifier:', verifier);
      console.log('Generating proof with v' + version + ' blueprint...');
      
      const prover = blueprint.createProver({ isLocal: false });
      const proof = await prover.generateProof(eml);
      
      const pd = proof.props.proofData;
      const po = proof.props.publicOutputs;
      
      console.log('Proof generated. Public outputs:', po.length);
      
      // Prepara i dati
      const pi_a = [BigInt(pd.pi_a[0]), BigInt(pd.pi_a[1])];
      const pi_b = [
        [BigInt(pd.pi_b[0][0]), BigInt(pd.pi_b[0][1])],
        [BigInt(pd.pi_b[1][0]), BigInt(pd.pi_b[1][1])]
      ];
      const pi_c = [BigInt(pd.pi_c[0]), BigInt(pd.pi_c[1])];
      
      const signals8 = po.slice(0, 8).map(s => BigInt(s));
      while (signals8.length < 8) signals8.push(0n);

      // Testa su TUTTI i verifier
      for (const [vName, vAddr] of Object.entries(VERIFIERS)) {
        try {
          const result = await client.readContract({
            address: vAddr,
            abi: VERIFIER_ABI,
            functionName: 'verify',
            args: [1, pi_a, pi_b, pi_c, signals8]
          });
          console.log(`  → Proof v${version} on verifier ${vName}: ${result ? '✅ VALID' : '❌ INVALID'}`);
        } catch (e) {
          console.log(`  → Proof v${version} on verifier ${vName}: ❌ REVERTED`);
        }
      }

      // Testa anche off-chain
      const offChain = await blueprint.verifyProof(proof);
      console.log(`  → Off-chain verification: ${offChain ? '✅ VALID' : '❌ INVALID'}`);

    } catch (e) {
      console.log('Error:', e.message);
    }
  }
}

main().catch(console.error);
