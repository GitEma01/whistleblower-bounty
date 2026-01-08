import { initZkEmailSdk } from '@zk-email/sdk';
import { readFileSync } from 'fs';

async function test() {
  try {
    const emailContent = readFileSync('./gmail-test.eml', 'utf-8');
    console.log('Email lunghezza:', emailContent.length);
    
    const sdk = await initZkEmailSdk();
    
    // Vedi metodi SDK per auth
    console.log('SDK methods:', Object.keys(sdk));
    console.log('SDK:', sdk);
    
    // Prova a vedere se c'è un metodo auth/login
    if (sdk.auth) console.log('Auth:', sdk.auth);
    if (sdk.login) console.log('Login disponibile');
    
    const blueprint = await sdk.getBlueprint('GitEma01/GmailDebugBlueprint@v2');
    
    // Prova LOCAL (non richiede auth)
    console.log('\nProvo LOCAL...');
    const prover = blueprint.createProver({ isLocal: true });
    const proof = await prover.generateProof(emailContent);
    console.log('SUCCESSO!');
    
  } catch (err) {
    console.error('ERRORE:', err.message);
  }
}

test();
