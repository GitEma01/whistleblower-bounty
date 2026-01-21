// test-vkey-match.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

async function main() {
  const sdk = zkeSDK();
  
  // Carica il blueprint
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  console.log('=== BLUEPRINT INFO ===');
  console.log('Slug:', blueprint.props.slug);
  console.log('Version:', blueprint.props.version);
  console.log('Verifier Contract:', blueprint.props.verifierContract);
  console.log('Client Status:', blueprint.props.clientStatus);
  console.log('Server Status:', blueprint.props.serverStatus);
  
  // Scarica la verification key dal blueprint
  console.log('\n=== VERIFICATION KEY ===');
  const vkey = await blueprint.getVkey();
  console.log('Vkey protocol:', JSON.parse(vkey).protocol);
  console.log('Vkey nPublic:', JSON.parse(vkey).nPublic);
  
  // Verifica che il verifier contract esista
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });
  
  const verifierAddress = blueprint.props.verifierContract?.address;
  console.log('\n=== ON-CHAIN VERIFIER CHECK ===');
  console.log('Verifier address:', verifierAddress);
  
  const code = await client.getBytecode({ address: verifierAddress });
  console.log('Contract deployed:', code ? 'YES' : 'NO');
  console.log('Bytecode length:', code?.length || 0);
}

main().catch(console.error);
