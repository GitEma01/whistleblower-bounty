// test-sdk-internal.mjs
import zkeSDK from '@zk-email/sdk';
import fs from 'fs';

async function main() {
  const emlPath = process.argv[2] || './residency.eml';
  
  const sdk = zkeSDK({ logging: { level: 'debug', enabled: true } });
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('=== BLUEPRINT VERIFIER INFO ===');
  console.log('Verifier contract:', blueprint.props.verifierContract);
  
  // Genera proof
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  console.log('\n=== PROOF PROPS ===');
  console.log('proofData keys:', Object.keys(proof.props.proofData));
  console.log('publicOutputs:', proof.props.publicOutputs);
  
  // Guarda se ci sono altri metodi/proprietà sulla proof
  console.log('\n=== PROOF OBJECT INSPECTION ===');
  console.log('Proof constructor:', proof.constructor.name);
  console.log('Proof methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(proof)));
  
  // Verifica se la proof ha un metodo per ottenere il calldata
  if (typeof proof.getCalldata === 'function') {
    console.log('\n=== PROOF CALLDATA ===');
    console.log(await proof.getCalldata());
  }
  
  if (typeof proof.getVerifyArgs === 'function') {
    console.log('\n=== PROOF VERIFY ARGS ===');
    console.log(await proof.getVerifyArgs());
  }

  // Prova verifyProofOnChain e cattura i dettagli
  console.log('\n=== CALLING verifyProofOnChain ===');
  try {
    const result = await blueprint.verifyProofOnChain(proof);
    console.log('Result:', result);
  } catch (e) {
    console.log('Error details:', e);
  }
}

main().catch(console.error);
