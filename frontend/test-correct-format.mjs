// test-correct-format.mjs
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const VERIFIER_ABI = [{
  inputs: [
    { name: "proofType", type: "uint8" },
    { name: "a", type: "uint256[2]" },
    { name: "b", type: "uint256[2][2]" },
    { name: "c", type: "uint256[2]" },
    { name: "signals", type: "uint256[8]" }
  ],
  name: "verify",
  outputs: [{ type: "bool" }],
  stateMutability: "view",
  type: "function"
}];

async function main() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org')
  });

  // Dati esatti da createCallData()
  const a = [
    BigInt("9326074680234992930295715601845459271254819750019896685239518315601379584303"),
    BigInt("10857552973822295632254479331174178352650390905488081825654609815845315743899")
  ];
  
  const b = [
    [
      BigInt("14181135677254019100202319312069501416502879929680044439469130226514622610236"),
      BigInt("5062802394071428103086017081953197403222874899452557786729603928217928942826")
    ],
    [
      BigInt("19650126529087221425163123052026984043118651811393423471336240975069268861189"),
      BigInt("427017115833198989027213197091895894340988641223633518150504281481728326253")
    ]
  ];
  
  const c = [
    BigInt("5016525446244303634169908294355019715125197174621922398528442126451585245783"),
    BigInt("6121701401428804337410089104356473419579027694322556376852029224847368873029")
  ];
  
  const signals = [
    BigInt("17065011482015124977282970298439631182550457267344513671014250909064553612521"),
    BigInt("52352752354244467950513147857578709131"),
    BigInt("274064983910760223810904298937823921978"),
    BigInt("2334392307038315863"),
    BigInt("0"),
    BigInt("902461930945294469469049061864238462133168371753019686485682756284276"),
    BigInt("0"),
    BigInt("0")
  ];

  console.log('=== TEST WITH createCallData FORMAT ===');
  console.log('a:', a.map(x => x.toString()));
  console.log('b:', b.map(row => row.map(x => x.toString())));
  console.log('c:', c.map(x => x.toString()));

  try {
    const result = await client.readContract({
      address: '0xD6FC8cb985AEf1dB7F601c2cD7007DA83f067848',
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [1, a, b, c, signals]
    });
    console.log('\n✅ RESULT:', result);
  } catch (e) {
    console.log('\n❌ Error:', e.message.split('\n')[0]);
  }
}

main().catch(console.error);
