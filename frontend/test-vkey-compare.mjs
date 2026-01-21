// test-vkey-compare.mjs
import zkeSDK from '@zk-email/sdk';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import crypto from 'crypto';

async function main() {
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  
  // Ottieni la vkey dal blueprint
  const vkeyJson = await blueprint.getVkey();
  const vkey = JSON.parse(vkeyJson);
  
  console.log('=== VERIFICATION KEY FROM BLUEPRINT ===');
  console.log('Protocol:', vkey.protocol);
  console.log('Curve:', vkey.curve);
  console.log('nPublic:', vkey.nPublic);
  console.log('vk_alpha_1:', vkey.vk_alpha_1);
  console.log('vk_beta_2:', vkey.vk_beta_2?.slice(0, 2), '...');
  console.log('vk_gamma_2:', vkey.vk_gamma_2?.slice(0, 2), '...');
  console.log('vk_delta_2:', vkey.vk_delta_2?.slice(0, 2), '...');
  console.log('IC length:', vkey.IC?.length);
  
  // Hash della vkey per confronto
  const vkeyHash = crypto.createHash('sha256').update(vkeyJson).digest('hex');
  console.log('\nVkey SHA256:', vkeyHash);

  // Controlla quando è stato deployato il verifier
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  console.log('\n=== VERIFIER CONTRACT INFO ===');
  console.log('Address:', blueprint.props.verifierContract.address);
  console.log('Blueprint created:', blueprint.props.createdAt);
  console.log('Blueprint updated:', blueprint.props.updatedAt);
  console.log('Blueprint version:', blueprint.props.version);
  console.log('Internal version:', blueprint.props.internalVersion);
  
  // Prova a vedere se ci sono altre versioni del blueprint
  console.log('\n=== CHECKING OTHER VERSIONS ===');
  
  for (let v = 1; v <= 3; v++) {
    try {
      const bp = await sdk.getBlueprint(`Bisht13/SuccinctZKResidencyInvite@v${v}`);
      const vc = bp.props.verifierContract;
      console.log(`v${v}: verifier=${vc?.address}, chain=${vc?.chain}, status=${bp.props.clientStatus}`);
    } catch (e) {
      console.log(`v${v}: not found`);
    }
  }
}

main().catch(console.error);
