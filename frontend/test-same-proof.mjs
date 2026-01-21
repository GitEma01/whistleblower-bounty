// test-same-proof.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';
import * as snarkjs from 'snarkjs';
import fs from 'fs';

async function main() {
  const emlPath = process.argv[2] || './residency.eml';
  
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('=== GENERATING PROOF (ONCE) ===');
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  // Salva i dati della proof
  const proofData = proof.props.proofData;
  const publicOutputs = proof.props.publicOutputs;
  
  console.log('Proof ID:', proof.props?.id || 'N/A');
  console.log('pi_a[0]:', proofData.pi_a[0]);
  
  // 1. Prima verifica con SDK
  console.log('\n=== TEST 1: SDK verifyProofOnChain (FIRST) ===');
  const sdkResult1 = await blueprint.verifyProofOnChain(proof);
  console.log('SDK Result:', sdkResult1);
  
  // 2. Ora facciamo la nostra chiamata con la STESSA proof
  console.log('\n=== TEST 2: OUR CALL (SAME PROOF) ===');
  
  let snarkjsCalldata = await snarkjs.groth16.exportSolidityCallData(proofData, publicOutputs);
  snarkjsCalldata = JSON.parse(`[${snarkjsCalldata}]`);
  
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

  const a = snarkjsCalldata[0].map(x => BigInt(x));
  const b = snarkjsCalldata[1].map(row => row.map(x => BigInt(x)));
  const c = snarkjsCalldata[2].map(x => BigInt(x));
  const signals = snarkjsCalldata[3].map(x => BigInt(x));

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  try {
    await client.readContract({
      address: blueprint.props.verifierContract.address,
      abi: ABI,
      functionName: 'verify',
      args: [1, a, b, c, signals]
    });
    console.log('✅ Our call succeeded!');
  } catch (e) {
    console.log('❌ Our call failed:', e.shortMessage);
  }

  // 3. Verifica SDK di nuovo con la stessa proof
  console.log('\n=== TEST 3: SDK verifyProofOnChain (SECOND) ===');
  const sdkResult2 = await blueprint.verifyProofOnChain(proof);
  console.log('SDK Result:', sdkResult2);
  
  // 4. Confronta i calldata
  console.log('\n=== COMPARE: Our calldata vs SDK ===');
  console.log('Our a[0]:', snarkjsCalldata[0][0]);
  console.log('Our b[0][0]:', snarkjsCalldata[1][0][0]);
  
  // Cattura il calldata dell'SDK
  console.log('\n=== INTERCEPT SDK CALL ===');
  const originalFetch = global.fetch;
  let sdkCalldata = null;
  
  global.fetch = async (...args) => {
    if (args[0] === 'https://sepolia.base.org' && args[1]?.body) {
      const body = JSON.parse(args[1].body);
      if (body.method === 'eth_call') {
        sdkCalldata = body.params[0].data;
        console.log('SDK calldata captured!');
        console.log('SDK data preview:', sdkCalldata.slice(0, 100));
      }
    }
    return originalFetch(...args);
  };
  
  const sdkResult3 = await blueprint.verifyProofOnChain(proof);
  console.log('SDK Result:', sdkResult3);
  
  global.fetch = originalFetch;
  
  // Confronta
  const ourCalldata = encodeFunctionData({
    abi: ABI,
    functionName: 'verify',
    args: [1, a, b, c, signals]
  });
  
  console.log('\n=== FINAL COMPARISON ===');
  console.log('Our calldata:', ourCalldata.slice(0, 100));
  console.log('SDK calldata:', sdkCalldata?.slice(0, 100));
  console.log('Match:', ourCalldata === sdkCalldata);
}

main().catch(console.error);
