// scripts/get-verifier-addresses.ts
import { initZkEmailSdk } from "@zk-email/sdk";

async function main() {
  const sdk = initZkEmailSdk({ logging: { enabled: true, level: 'debug' } });
  
  // Blueprint per Gmail
  const gmailBlueprint = await sdk.getBlueprint("GitEma01/GmailDebugBlueprint@v4");
  console.log("\n=== GMAIL BLUEPRINT ===");
  console.log("Blueprint props:", JSON.stringify(gmailBlueprint.props, null, 2));
  
  // Cerca il verifier address nelle props
  // Potrebbe essere in: gmailBlueprint.props.verifierAddress 
  //                  o: gmailBlueprint.props.verifierContractAddress
  //                  o: gmailBlueprint.props.contractAddress
  
  // Blueprint per Succinct
  const succinctBlueprint = await sdk.getBlueprint("Bisht13/SuccinctZKResidencyInvite@v3");
  console.log("\n=== SUCCINCT BLUEPRINT ===");
  console.log("Blueprint props:", JSON.stringify(succinctBlueprint.props, null, 2));
}

main().catch(console.error);
