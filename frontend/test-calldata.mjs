// test-calldata.mjs
import zkeSDK from '@zk-email/sdk';
import fs from 'fs';

async function main() {
  const emlPath = process.argv[2] || './residency.eml';
  
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  console.log('=== PROOF METHODS TEST ===\n');
  
  // Test createCallData
  if (typeof proof.createCallData === 'function') {
    console.log('=== createCallData() ===');
    try {
      const callData = await proof.createCallData();
      console.log('CallData:', JSON.stringify(callData, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  
  // Test packProof
  if (typeof proof.packProof === 'function') {
    console.log('\n=== packProof() ===');
    try {
      const packed = await proof.packProof();
      console.log('Packed:', JSON.stringify(packed, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  // Test getProofData  
  if (typeof proof.getProofData === 'function') {
    console.log('\n=== getProofData() ===');
    try {
      const data = await proof.getProofData();
      console.log('ProofData:', JSON.stringify(data, (k, v) => 
        typeof v === 'bigint' ? v.toString() : v, 2));
    } catch (e) {
      console.log('Error:', e.message);
    }
  }

  // Confronta con i raw proof data
  console.log('\n=== RAW PROOF DATA ===');
  console.log('pi_a:', proof.props.proofData.pi_a);
  console.log('pi_b:', proof.props.proofData.pi_b);
  console.log('pi_c:', proof.props.proofData.pi_c);
  
  // Verifica off-chain per conferma
  console.log('\n=== OFF-CHAIN VERIFY ===');
  const offChain = await blueprint.verifyProof(proof);
  console.log('Result:', offChain);
}

main().catch(console.error);
