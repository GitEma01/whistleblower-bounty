import { useState } from 'react';
// Rimosso import di ZK_EMAIL_BLUEPRINT che causava errore

interface ProofResult {
  proof: {
    pi_a: [bigint, bigint];
    pi_b: [[bigint, bigint], [bigint, bigint]];
    pi_c: [bigint, bigint];
    publicSignals: bigint[];
  };
  publicData: {
    senderDomain?: string;
    [key: string]: any;
  };
  isValid: boolean;
}

export function useZkEmailProof() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  // FIX: Ora accetta blueprintSlug come argomento
  const generateProof = async (emailContent: string, blueprintSlug: string): Promise<ProofResult | null> => {
    setIsGenerating(true);
    setError(null);
    setProgress('Inizializzazione SDK...');

    try {
      if (!blueprintSlug) {
        throw new Error("Blueprint slug mancante");
      }

      // Import dinamico dell'SDK
      const { initZkEmailSdk } = await import('@zk-email/sdk');
      
      setProgress('Connessione al server ZK Email...');
      const sdk = await initZkEmailSdk();
      console.log('SDK inizializzato:', sdk);

      setProgress(`Caricamento blueprint: ${blueprintSlug}`);
      
      const blueprint = await sdk.getBlueprint(blueprintSlug);
      console.log('Blueprint caricato:', blueprint);

      setProgress('Creazione prover...');
      const prover = blueprint.createProver();

      setProgress('Generazione prova ZK (può richiedere 10-60 secondi)...');
      
      // La generazione effettiva
      const proof = await prover.generateProof(emailContent);
      console.log('Prova generata:', proof);

      setProgress('Verifica prova off-chain...');
      const isValid = await blueprint.verifyProof(proof);
      console.log('Verifica off-chain:', isValid);

      const proofData = proof.props.proofData;
      
      // Formatta la prova per il contratto Solidity
      const formattedProof = {
        pi_a: [
          BigInt(proofData.pi_a[0]),
          BigInt(proofData.pi_a[1])
        ] as [bigint, bigint],
        pi_b: [
          [BigInt(proofData.pi_b[0][0]), BigInt(proofData.pi_b[0][1])] as [bigint, bigint],
          [BigInt(proofData.pi_b[1][0]), BigInt(proofData.pi_b[1][1])] as [bigint, bigint]
        ] as [[bigint, bigint], [bigint, bigint]],
        pi_c: [
          BigInt(proofData.pi_c[0]),
          BigInt(proofData.pi_c[1])
        ] as [bigint, bigint],
        publicSignals: proof.props.publicOutputs.map((s: string) => BigInt(s))
      };

      const publicData = proof.props.publicData || {};
      
      setProgress('Prova pronta!');
      
      return {
        proof: formattedProof,
        publicData,
        isValid
      };

    } catch (err: any) {
      console.error('Errore generazione prova:', err);
      
      let errorMessage = err.message || 'Errore nella generazione della prova';
      
      // Gestione errori specifici ZK Regex
      if (errorMessage.includes('TargetNotRepeatable')) {
        errorMessage = 'Errore Blueprint: La Regex del circuito non è valida (capture group ripetuto). Contatta lo sviluppatore del blueprint.';
      } else if (errorMessage.includes('DKIM')) {
        errorMessage = 'Errore verifica DKIM: la firma dell\'email potrebbe non essere valida o il dominio non supportato.';
      } else if (errorMessage.includes('blueprint')) {
        errorMessage = 'Blueprint non trovato sul registry.';
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper per estrarre il dominio da un'email raw
  const extractDomainFromEmail = (emailContent: string): string | null => {
    const fromMatch = emailContent.match(/^From:\s*.*?@([a-zA-Z0-9.-]+)/mi);
    if (fromMatch) {
      return fromMatch[1].toLowerCase();
    }
    const dkimMatch = emailContent.match(/dkim-signature:[\s\S]*?d=([a-zA-Z0-9.-]+)/i);
    if (dkimMatch) {
      return dkimMatch[1].toLowerCase();
    }
    return null;
  };

  return {
    generateProof,
    extractDomainFromEmail,
    isGenerating,
    error,
    progress
  };
}
