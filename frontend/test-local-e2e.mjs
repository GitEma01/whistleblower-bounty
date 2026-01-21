// test-local-e2e.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';

async function main() {
  const emlPath = process.argv[2];
  if (!emlPath) {
    console.log('Usage: node test-local-e2e.mjs <path-to-eml>');
    return;
  }

  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  // 1. Ottieni la verification key
  console.log('=== STEP 1: GET VERIFICATION KEY ===');
  const vkeyJson = await blueprint.getVkey();
  const vkey = JSON.parse(vkeyJson);
  console.log('Vkey IC length:', vkey.IC.length);
  console.log('Vkey nPublic:', vkey.nPublic);
  
  // 2. Genera la proof
  console.log('\n=== STEP 2: GENERATE PROOF ===');
  const eml = fs.readFileSync(emlPath, 'utf-8');
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  const proofData = proof.props.proofData;
  const publicOutputs = proof.props.publicOutputs;
  
  console.log('Proof protocol:', proofData.protocol);
  console.log('Public outputs count:', publicOutputs.length);
  
  // 3. Verifica off-chain con snarkjs
  console.log('\n=== STEP 3: OFF-CHAIN VERIFICATION (snarkjs format) ===');
  
  // Formato snarkjs standard
  const snarkjsProof = {
    pi_a: [proofData.pi_a[0], proofData.pi_a[1]],
    pi_b: [
      [proofData.pi_b[0][0], proofData.pi_b[0][1]],
      [proofData.pi_b[1][0], proofData.pi_b[1][1]]
    ],
    pi_c: [proofData.pi_c[0], proofData.pi_c[1]],
    protocol: "groth16",
    curve: "bn128"
  };
  
  console.log('snarkjs proof format:');
  console.log(JSON.stringify(snarkjsProof, null, 2));
  
  console.log('\nPublic signals:');
  console.log(JSON.stringify(publicOutputs, null, 2));
  
  // 4. Formato per smart contract (come lo passiamo)
  console.log('\n=== STEP 4: SMART CONTRACT FORMAT ===');
  
  // Formato diretto (come lo stiamo passando)
  const directFormat = {
    a: [proofData.pi_a[0], proofData.pi_a[1]],
    b: [
      [proofData.pi_b[0][0], proofData.pi_b[0][1]],
      [proofData.pi_b[1][0], proofData.pi_b[1][1]]
    ],
    c: [proofData.pi_c[0], proofData.pi_c[1]],
    signals: publicOutputs
  };
  
  console.log('Direct format (current):');
  console.log('a:', directFormat.a);
  console.log('b:', directFormat.b);
  console.log('c:', directFormat.c);
  
  // Formato con B invertito (snarkjs -> solidity richiede inversione)
  const invertedBFormat = {
    a: [proofData.pi_a[0], proofData.pi_a[1]],
    b: [
      [proofData.pi_b[0][1], proofData.pi_b[0][0]], // Invertito!
      [proofData.pi_b[1][1], proofData.pi_b[1][0]]  // Invertito!
    ],
    c: [proofData.pi_c[0], proofData.pi_c[1]],
    signals: publicOutputs
  };
  
  console.log('\nInverted B format (snarkjs->solidity standard):');
  console.log('a:', invertedBFormat.a);
  console.log('b:', invertedBFormat.b);
  console.log('c:', invertedBFormat.c);

  // 5. Salva tutto per analisi
  console.log('\n=== STEP 5: SAVING DATA FOR ANALYSIS ===');
  
  const analysisData = {
    vkey: vkey,
    proof: {
      raw: proofData,
      snarkjs: snarkjsProof,
      directFormat: directFormat,
      invertedBFormat: invertedBFormat
    },
    publicSignals: publicOutputs,
    blueprint: {
      slug: blueprint.props.slug,
      version: blueprint.props.version,
      verifier: blueprint.props.verifierContract
    }
  };
  
  fs.writeFileSync('proof-analysis.json', JSON.stringify(analysisData, null, 2));
  console.log('Saved to proof-analysis.json');
  
  // 6. Verifica con SDK (usa il loro metodo)
  console.log('\n=== STEP 6: SDK VERIFICATION METHODS ===');
  
  const offChainResult = await blueprint.verifyProof(proof);
  console.log('blueprint.verifyProof():', offChainResult);
  
  // 7. Mostra esattamente cosa passa verifyProofOnChain
  console.log('\n=== STEP 7: WHAT verifyProofOnChain SENDS ===');
  
  // Intercettiamo cosa fa l'SDK
  console.log('Calling blueprint.verifyProofOnChain() to see the actual call...');
  
  try {
    const onChainResult = await blueprint.verifyProofOnChain(proof);
    console.log('Result:', onChainResult);
  } catch (e) {
    // Estrai i dettagli della chiamata dall'errore
    if (e.message.includes('args:')) {
      const argsMatch = e.message.match(/args:\s*\((.*?)\)/s);
      if (argsMatch) {
        console.log('SDK sends these args:', argsMatch[1].substring(0, 500) + '...');
      }
    }
    console.log('\nFull error for analysis:');
    console.log(e.message);
  }
}

main().catch(console.error);
