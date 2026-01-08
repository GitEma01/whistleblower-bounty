const { initZkEmailSdk } = require('@zk-email/sdk');

async function test() {
  try {
    console.log('Inizializzando SDK...');
    const sdk = await initZkEmailSdk();
    console.log('SDK OK');
    
    console.log('Caricando blueprint...');
    const blueprint = await sdk.getBlueprint('Bisht13/SuccinctZKResidencyInvite@v5');
    console.log('Blueprint OK:', blueprint);
  } catch (err) {
    console.error('ERRORE:', err);
  }
}

test();
