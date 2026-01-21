// Salva come: test-verify.mjs

import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

// Verifier Groth16 del Registry per Succinct
const GROTH16_VERIFIER = '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848';

// ABI del verifier Groth16 generato da snarkjs/ZK Email
// Proviamo diverse firme possibili
const verifierAbiDynamic = [{
  name: 'verifyProof',
  type: 'function',
  inputs: [
    { name: '_pA', type: 'uint256[2]' },
    { name: '_pB', type: 'uint256[2][2]' },
    { name: '_pC', type: 'uint256[2]' },
    { name: '_pubSignals', type: 'uint256[]' }  // Dinamico
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'view'
}];

// Prova con 8 public signals fissi
const verifierAbiFixed8 = [{
  name: 'verifyProof',
  type: 'function',
  inputs: [
    { name: '_pA', type: 'uint256[2]' },
    { name: '_pB', type: 'uint256[2][2]' },
    { name: '_pC', type: 'uint256[2]' },
    { name: '_pubSignals', type: 'uint256[8]' }  // Fisso a 8
  ],
  outputs: [{ type: 'bool' }],
  stateMutability: 'view'
}];

async function main() {
  console.log('=== TEST VERIFIER GROTH16 ===');
  console.log('Address:', GROTH16_VERIFIER);

  // Questa è la proof Succinct che hai generato (copia i valori dalla console)
  // SOSTITUISCI CON I TUOI VALORI REALI
  const pi_a = [
    BigInt('6730186700657480475023972044757926068921787357627122849956231703813463353690'),
    BigInt('17005593157785970306907351846601870961330274289906593236569964115148994834888')
  ];
  
  // pi_b DEVE essere invertito per Solidity
  const pi_b = [
    [
      BigInt('9149939363745174821116087018582350994541257625443748241611085768651469757454'),
      BigInt('21318123474164967521425633245073110739774391704739550100861550658951803667621')
    ],
    [
      BigInt('5352744840864718064727637860922640189480319344083109172229906862402306638660'),
      BigInt('5449413898667034773814648245114185817835151604987519855611442823014569501479')
    ]
  ];
  
  const pi_c = [
    BigInt('8432449784323667229877632277125828401393569189688835223148874548924564172698'),
    BigInt('15231086262894557332288934510001164636902093070688250237011456214873797903332')
  ];
  
  const publicSignals = [
    BigInt('17065011482015124977282970298439631182550457267344513671014250909064553612521'),
    BigInt('52352752354244467950513147857578709131'),
    BigInt('274064983910760223810904298937823921978'),
    BigInt('2334392307038315863'),
    BigInt('0'),
    BigInt('902461930945294469469049061864238462133168371753019686485682756284276'),
    BigInt('0'),
    BigInt('0')
  ];

  console.log('\n--- Prova con array dinamico ---');
  try {
    const result = await client.readContract({
      address: GROTH16_VERIFIER,
      abi: verifierAbiDynamic,
      functionName: 'verifyProof',
      args: [pi_a, pi_b, pi_c, publicSignals]
    });
    console.log('Risultato (dinamico):', result);
  } catch (e) {
    console.log('Errore (dinamico):', e.shortMessage || e.message);
  }

  console.log('\n--- Prova con array fisso [8] ---');
  try {
    const result = await client.readContract({
      address: GROTH16_VERIFIER,
      abi: verifierAbiFixed8,
      functionName: 'verifyProof',
      args: [pi_a, pi_b, pi_c, publicSignals]
    });
    console.log('Risultato (fisso 8):', result);
  } catch (e) {
    console.log('Errore (fisso 8):', e.shortMessage || e.message);
  }

  // Prova SENZA inversione di pi_b
  console.log('\n--- Prova SENZA inversione pi_b ---');
  const pi_b_non_invertito = [
    [
      BigInt('21318123474164967521425633245073110739774391704739550100861550658951803667621'),
      BigInt('9149939363745174821116087018582350994541257625443748241611085768651469757454')
    ],
    [
      BigInt('5449413898667034773814648245114185817835151604987519855611442823014569501479'),
      BigInt('5352744840864718064727637860922640189480319344083109172229906862402306638660')
    ]
  ];
  
  try {
    const result = await client.readContract({
      address: GROTH16_VERIFIER,
      abi: verifierAbiDynamic,
      functionName: 'verifyProof',
      args: [pi_a, pi_b_non_invertito, pi_c, publicSignals]
    });
    console.log('Risultato (non invertito):', result);
  } catch (e) {
    console.log('Errore (non invertito):', e.shortMessage || e.message);
  }
}

main().catch(console.error);
