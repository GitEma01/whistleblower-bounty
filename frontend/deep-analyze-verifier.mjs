// deep-analyze-verifier.mjs
import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { baseSepolia } from 'viem/chains';
import zkeSDK from '@zk-email/sdk';
import fs from 'fs';

const VERIFIER = '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

async function main() {
  console.log('=== ANALISI APPROFONDITA VERIFIER ===\n');
  
  // 1. Verifichiamo tutte le funzioni disponibili nel contratto
  console.log('=== FUNZIONI NEL CONTRATTO ===\n');
  
  const selectors = [
    { sel: '0x2b7ac3f3', name: '???' },
    { sel: '0x3d683bb6', name: '???' },
    { sel: '0x518a6150', name: '???' },
    { sel: '0x6423f1e2', name: '???' },
    { sel: '0x715018a6', name: 'renounceOwnership()' },
    { sel: '0x8da5cb5b', name: 'owner()' },
    { sel: '0xc2fb26a6', name: '???' },
    { sel: '0xeb610a85', name: 'verify(uint256[2],uint256[2][2],uint256[2],uint256[8])' },
    { sel: '0xf2fde38b', name: 'transferOwnership(address)' },
  ];
  
  for (const { sel, name } of selectors) {
    console.log(`${sel} -> ${name}`);
  }
  
  // 2. Proviamo a chiamare owner() per verificare che il contratto risponda
  console.log('\n=== TEST FUNZIONI BASE ===\n');
  
  const ownerAbi = [{
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view'
  }];
  
  try {
    const owner = await client.readContract({
      address: VERIFIER,
      abi: ownerAbi,
      functionName: 'owner'
    });
    console.log('✅ owner():', owner);
  } catch (e) {
    console.log('❌ owner() failed:', e.message.split('\n')[0]);
  }
  
  // 3. Proviamo le funzioni sconosciute
  console.log('\n=== TEST FUNZIONI SCONOSCIUTE ===\n');
  
  // 0x3d683bb6 - potrebbe essere getVerifyingKey o simile
  // 0xc2fb26a6 - potrebbe essere setVerifyingKey o simile
  // 0x518a6150 - ???
  // 0x6423f1e2 - ???
  
  // Proviamo a chiamare raw con solo il selector
  for (const sel of ['0x2b7ac3f3', '0x3d683bb6', '0x518a6150', '0x6423f1e2', '0xc2fb26a6']) {
    try {
      const result = await client.call({
        to: VERIFIER,
        data: sel
      });
      console.log(`${sel}: returned`, result.data || '(empty)');
    } catch (e) {
      console.log(`${sel}: ${e.shortMessage || e.message.split('\n')[0]}`);
    }
  }
  
  // 4. Genera proof e testa con chiamata raw
  console.log('\n=== GENERAZIONE PROOF E TEST RAW ===\n');
  
  const emlPath = process.argv[2] || './residency.eml';
  const eml = fs.readFileSync(emlPath, 'utf-8');
  
  const sdk = zkeSDK();
  const blueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  const prover = blueprint.createProver({ isLocal: false });
  const proof = await prover.generateProof(eml);
  
  const proofData = proof.props.proofData;
  const publicOutputs = proof.props.publicOutputs;
  
  // Usa snarkjs per formattare correttamente
  const snarkjs = await import('snarkjs');
  let calldata = await snarkjs.groth16.exportSolidityCallData(proofData, publicOutputs);
  calldata = JSON.parse(`[${calldata}]`);
  
  const a = calldata[0].map(x => BigInt(x));
  const b = calldata[1].map(row => row.map(x => BigInt(x)));
  const c = calldata[2].map(x => BigInt(x));
  
  // Pad signals to 8
  const signals8 = [];
  for (let i = 0; i < 8; i++) {
    signals8.push(i < calldata[3].length ? BigInt(calldata[3][i]) : 0n);
  }
  
  // 5. Test chiamata raw con eth_call
  console.log('=== TEST RAW eth_call ===\n');
  
  const verifyAbi = [{
    type: 'function',
    name: 'verify',
    inputs: [
      { name: '_pA', type: 'uint256[2]' },
      { name: '_pB', type: 'uint256[2][2]' },
      { name: '_pC', type: 'uint256[2]' },
      { name: '_pubSignals', type: 'uint256[8]' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  }];
  
  const encoded = encodeFunctionData({
    abi: verifyAbi,
    functionName: 'verify',
    args: [a, b, c, signals8]
  });
  
  console.log('Encoded calldata length:', encoded.length);
  console.log('Selector:', encoded.slice(0, 10));
  
  try {
    const rawResult = await client.call({
      to: VERIFIER,
      data: encoded
    });
    console.log('Raw result:', rawResult);
    
    if (rawResult.data && rawResult.data !== '0x') {
      const decoded = decodeFunctionResult({
        abi: verifyAbi,
        functionName: 'verify',
        data: rawResult.data
      });
      console.log('Decoded:', decoded);
    }
  } catch (e) {
    console.log('Raw call error:', e.shortMessage || e.message.split('\n')[0]);
  }
  
  // 6. Prova TUTTE le combinazioni di pi_b
  console.log('\n=== TEST TUTTE LE COMBINAZIONI pi_b ===\n');
  
  const pi_b_variants = [
    {
      name: 'Original (snarkjs)',
      b: b
    },
    {
      name: 'Swap inner [0][0]<->[0][1], [1][0]<->[1][1]',
      b: [
        [b[0][1], b[0][0]],
        [b[1][1], b[1][0]]
      ]
    },
    {
      name: 'Swap rows [0]<->[1]',
      b: [b[1], b[0]]
    },
    {
      name: 'Full reverse',
      b: [
        [b[1][1], b[1][0]],
        [b[0][1], b[0][0]]
      ]
    },
    {
      name: 'Direct from proofData (no snarkjs)',
      b: [
        [BigInt(proofData.pi_b[0][0]), BigInt(proofData.pi_b[0][1])],
        [BigInt(proofData.pi_b[1][0]), BigInt(proofData.pi_b[1][1])]
      ]
    },
    {
      name: 'Direct inverted inner',
      b: [
        [BigInt(proofData.pi_b[0][1]), BigInt(proofData.pi_b[0][0])],
        [BigInt(proofData.pi_b[1][1]), BigInt(proofData.pi_b[1][0])]
      ]
    }
  ];
  
  for (const variant of pi_b_variants) {
    try {
      const result = await client.readContract({
        address: VERIFIER,
        abi: verifyAbi,
        functionName: 'verify',
        args: [a, variant.b, c, signals8]
      });
      console.log(`✅ ${variant.name}: ${result}`);
    } catch (e) {
      const msg = e.shortMessage || e.message.split('\n')[0];
      if (msg.includes('no data')) {
        console.log(`⚠️ ${variant.name}: returned 0x (empty)`);
      } else if (msg.includes('reverted')) {
        console.log(`❌ ${variant.name}: reverted`);
      } else {
        console.log(`❌ ${variant.name}: ${msg}`);
      }
    }
  }
  
  // 7. Verifica che i public signals siano corretti
  console.log('\n=== VERIFICA PUBLIC SIGNALS ===\n');
  console.log('Numero signals:', publicOutputs.length);
  console.log('Signals:');
  publicOutputs.forEach((s, i) => {
    console.log(`  [${i}]: ${s}`);
  });
  
  // 8. Confronta con la verifica SDK on-chain
  console.log('\n=== SDK verifyProofOnChain ===\n');
  try {
    const sdkResult = await blueprint.verifyProofOnChain(proof);
    console.log('SDK on-chain result:', sdkResult);
  } catch (e) {
    console.log('SDK on-chain error:', e.message.split('\n')[0]);
  }
}

main().catch(console.error);
