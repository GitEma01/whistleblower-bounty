// Salva come: test-sdk-verify.mjs

import zkeSDK from '@zk-email/sdk';
import fs from 'fs';

async function main() {
  console.log('=== TEST VERIFICA ON-CHAIN VIA SDK ===\n');
  
  const sdk = zkeSDK({ logging: { enabled: true, level: 'debug' } });
  
  // Carica il blueprint Succinct
  console.log('Caricamento blueprint Succinct...');
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('Verifier dal blueprint:', blueprint.props.verifierContract);
  
  // Leggi l'email che hai usato per generare la proof
  // SOSTITUISCI con il path del tuo file .eml
  const emlPath = process.argv[2];
  if (!emlPath) {
    console.log('\nUso: node test-sdk-verify.mjs <path-al-file.eml>');
    console.log('Esempio: node test-sdk-verify.mjs ./test-email.eml');
    return;
  }
  
  const eml = fs.readFileSync(emlPath, 'utf-8');
  console.log('\nEmail caricata, lunghezza:', eml.length);
  
  // Genera la proof
  console.log('\nGenerazione proof...');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  console.log('\n=== PROOF GENERATA ===');
  console.log('proofData:', JSON.stringify(proof.props.proofData, null, 2));
  console.log('publicOutputs:', proof.props.publicOutputs);
  
  // Verifica off-chain
  console.log('\n=== VERIFICA OFF-CHAIN ===');
  const offChainResult = await blueprint.verifyProof(proof);
  console.log('Risultato off-chain:', offChainResult);
  
  // Verifica on-chain tramite SDK
  console.log('\n=== VERIFICA ON-CHAIN VIA SDK ===');
  try {
    const onChainResult = await blueprint.verifyProofOnChain(proof);
    console.log('Risultato on-chain:', onChainResult);
  } catch (e) {
    console.log('Errore on-chain:', e.message);
  }
}

main().catch(console.error);
