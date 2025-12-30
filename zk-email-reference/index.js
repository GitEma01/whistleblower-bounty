import zkeSDK from "@zk-email/sdk";
import fs from "fs/promises";

async function main() {
  try {
    console.log("🚀 Inizializzazione ZK Email SDK...");
    
    // Inizializza l'SDK
    const sdk = zkeSDK();
    console.log("✅ SDK inizializzato");

    // Ottieni il blueprint dalla registry
    console.log("📥 Scaricando blueprint dalla registry...");
    const blueprintName = "Bisht13/SuccinctZKResidencyInvite@v3";
    const blueprint = await sdk.getBlueprint(blueprintName);
    console.log(`✅ Blueprint '${blueprintName}' scaricato`);

    // Leggi il file email
    console.log("📄 Leggendo file email...");
    const eml = await fs.readFile("samples/residency.EML", "utf-8");
    console.log("✅ File email letto");

    // Crea il prover
    console.log("🔧 Creando prover...");
    const prover = blueprint.createProver();
    console.log("✅ Prover creato");

    // Genera la proof
    console.log("⚡ Generando proof (questo potrebbe richiedere 10-30 secondi)...");
    const proof = await prover.generateProof(eml);
    console.log("✅ Proof generata!");

    // Verifica la proof off-chain
    console.log("\n🔐 Verificando proof off-chain...");
    const verificationOffChain = await blueprint.verifyProof(proof);
    console.log("✅ Verifica off-chain riuscita:", verificationOffChain);

    // Stampa la proof
    console.log("\n📊 Proof generata:");
    console.log(JSON.stringify(proof, null, 2));

    // Salva la proof in un file
    await fs.writeFile(
      "proof-output.json",
      JSON.stringify(proof, null, 2)
    );
    console.log("\n💾 Proof salvata in 'proof-output.json'");

  } catch (error) {
    console.error("❌ Errore:", error.message);
    console.error(error);
  }
}

main();
