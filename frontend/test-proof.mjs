import { initZkEmailSdk } from '@zk-email/sdk';
import { readFileSync } from 'fs';

async function test() {
  try {
    // Leggi l'email (metti il path corretto)
    const emailContent = readFileSync('./test-email.eml', 'utf-8');
    console.log('Email caricata, lunghezza:', emailContent.length);
    
    console.log('Inizializzando SDK...');
    const sdk = await initZkEmailSdk();
    
    console.log('Caricando blueprint...');
    const blueprint = await sdk.getBlueprint('Bisht13/SuccinctZKResidencyInvite@v5');
    
    console.log('Creando prover...');
    const prover = blueprint.createProver();
    
    console.log('Generando prova (questo richiede tempo)...');
    const proof = await prover.generateProof(emailContent);
    
    console.log('SUCCESSO! Prova generata');
    console.log(proof);
    
  } catch (err) {
    console.error('ERRORE:', err);
  }
}

test();
