// test-exact-sdk-copy.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';  // L'SDK usa 'base', non 'baseSepolia'!
import * as snarkjs from 'snarkjs';
import fs from 'fs';

// Copia esatta della funzione getVerifierContractAbi dall'SDK
function getVerifierContractAbi(signalLength) {
  return [
    {
      type: "function",
      name: "verify",
      inputs: [
        {
          name: "proofType",
          type: "uint8",
          internalType: "ProofType",
        },
        {
          name: "a",
          type: "uint256[2]",
          internalType: "uint256[2]",
        },
        {
          name: "b",
          type: "uint256[2][2]",
          internalType: "uint256[2][2]",
        },
        {
          name: "c",
          type: "uint256[2]",
          internalType: "uint256[2]",
        },
        {
          name: "signals",
          type: `uint256[${signalLength}]`,
          internalType: `uint256[${signalLength}]`,
        },
      ],
      outputs: [],
      stateMutability: "view",
    },
  ];
}

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
  console.log('publicOutputs.length:', publicOutputs.length);

  // Copia ESATTA del codice SDK
  const client = createPublicClient({
    chain: base,  // SDK usa 'base'
    transport: http("https://sepolia.base.org"),
  });

  let calldata = await snarkjs.groth16.exportSolidityCallData(proofData, publicOutputs);
  calldata = JSON.parse(`[${calldata}]`);

  console.log('\n=== EXACT SDK REPLICA ===');
  console.log('Chain:', 'base (id: 8453)');
  console.log('Transport:', 'https://sepolia.base.org');
  console.log('Verifier:', blueprint.props.verifierContract.address);
  console.log('ABI signals type:', `uint256[${publicOutputs.length}]`);
  console.log('Args: [1, ...calldata]');
  
  try {
    await client.readContract({
      address: blueprint.props.verifierContract.address,
      abi: getVerifierContractAbi(publicOutputs.length),
      functionName: "verify",
      args: [1, ...calldata],
    });
    console.log('\n✅ VERIFICATION PASSED!');
  } catch (error) {
    console.log('\n❌ Error:', error.shortMessage || error.message.split('\n')[0]);
    
    // Mostra i dettagli dell'errore
    if (error.cause) {
      console.log('Cause:', error.cause.shortMessage || error.cause.message?.split('\n')[0]);
    }
  }

  // Confronto diretto con SDK
  console.log('\n=== DIRECT SDK CALL FOR COMPARISON ===');
  try {
    const sdkResult = await blueprint.verifyProofOnChain(proof);
    console.log('✅ SDK Result:', sdkResult);
  } catch (e) {
    console.log('❌ SDK Error:', e.message);
  }
}

main().catch(console.error);
