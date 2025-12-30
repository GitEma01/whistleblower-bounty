import zkeSDK from "@zk-email/sdk";
import fs from "fs/promises";
import { ethers } from "ethers";
import dotenv from "dotenv";

// Carica le variabili d'ambiente
dotenv.config();

async function main() {
  try {
    console.log("Avvio script on-chain...");

    // --- 1. CONTROLLI PRELIMINARI ---
    const key = process.env.PRIVATE_KEY || "";
    if (!key.startsWith("0x") || key.length !== 66) {
        throw new Error("Formato chiave privata errato nel file .env! Deve iniziare con 0x ed essere lunga 66 caratteri.");
    }
    
    // Setup Provider e Wallet
    console.log("Connessione a Base Sepolia...");
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(key, provider);
    
    // Controllo Saldo
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet: ${wallet.address}`);
    console.log(`Saldo: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
        throw new Error("Saldo insufficiente! Assicurati di aver fatto il bridge su Base Sepolia.");
    }

    // --- 2. INIZIALIZZAZIONE SDK ---
    console.log("\n Inizializzazione SDK e Blueprint...");
    const sdk = zkeSDK();
    const blueprintName = "GitEma01/ZKEmail@v2";
    const blueprint = await sdk.getBlueprint(blueprintName);
    console.log(`Blueprint '${blueprintName}' caricato`);

    // --- 3. GENERAZIONE PROOF FRESCA ---
    // NOTA: Rigeneriamo la prova qui per evitare errori di "revert" dovuti a file vecchi/non allineati
    console.log("\n Lettura email e generazione Proof (attendere ~30 sec)...");
    const emlContent = await fs.readFile("samples/residency.EML", "utf-8");
    const prover = blueprint.createProver();
    const proof = await prover.generateProof(emlContent);
    console.log("Proof generata con successo!");

    // --- 4. VERIFICA ON-CHAIN ---
    console.log("\n Invio transazione di verifica al contratto...");
    
    // La funzione verifyProofOnChain firma e invia la transazione
    const tx = await blueprint.verifyProofOnChain(proof, wallet);
    console.log(`Transazione inviata! Hash: ${tx.hash}`);
    console.log("In attesa di conferma sul blocco...");

    // Attendi che la transazione venga minata
    const receipt = await tx.wait();

    if (receipt.status === 1) {
        console.log("\n SUCCESSO! La prova è stata verificata on-chain.");
        console.log(`Explorer: https://sepolia.basescan.org/tx/${receipt.hash}`);
    } else {
        console.error("\n ERRORE: La transazione è stata inclusa ma l'esecuzione è fallita (reverted).");
    }

  } catch (error) {
    console.error("\n ERRORE FATALE:");
    // Gestione errori specifica di ethers/viem per darti messaggi più chiari
    if (error.code === 'CALL_EXCEPTION') {
        console.error("Il contratto ha rifiutato la prova (Execution Reverted).");
        console.error("Possibili cause: La prova è scaduta, non valida o il contratto è in pausa.");
    } else {
        console.error(error);
    }
  }
}

main();