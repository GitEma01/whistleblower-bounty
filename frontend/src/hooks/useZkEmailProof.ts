import { useState } from 'react';

interface ProofResult {
  proof: {
    pi_a: [bigint, bigint];
    pi_b: [[bigint, bigint], [bigint, bigint]];
    pi_c: [bigint, bigint];
    publicSignals: bigint[];
  };
  publicData: any;
  isValid: boolean;
}

export function useZkEmailProof() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const generateProof = async (emailContent: string): Promise<ProofResult | null> => {
    setIsGenerating(true);
    setError(null);
    setProgress('Inizializzazione SDK...');

    try {
      const { initZkEmailSdk } = await import('@zk-email/sdk');
      
      setProgress('Connessione al server ZK Email...');
      const sdk = await initZkEmailSdk();
      console.log('SDK inizializzato:', sdk);

      const blueprintSlug = 'Bisht13/SuccinctZKResidencyInvite@v3';
      setProgress('Caricamento blueprint: ' + blueprintSlug);
      
      const blueprint = await sdk.getBlueprint(blueprintSlug);
      console.log('Blueprint caricato:', blueprint);

      setProgress('Creazione prover...');
      const prover = blueprint.createProver();

      setProgress('Generazione prova ZK (10-30 secondi)...');
      const proof = await prover.generateProof(emailContent);
      console.log('Prova generata:', proof);

      setProgress('Verifica prova off-chain...');
      const isValid = await blueprint.verifyProof(proof);
      console.log('Verifica off-chain:', isValid);

      const proofData = proof.props.proofData;
      
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

      setProgress('Prova pronta!');
      
      return {
        proof: formattedProof,
        publicData: proof.props.publicData,
        isValid
      };

    } catch (err: any) {
      console.error('Errore generazione prova:', err);
      setError(err.message || 'Errore nella generazione della prova');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateProof,
    isGenerating,
    error,
    progress
  };
}
