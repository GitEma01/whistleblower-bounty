import { useState, useCallback } from 'react';

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

/**
 * Hook per generare prove ZK Email
 * Aggiornato per SDK 3.0.0-nightly.13
 * 
 * Cambiamenti rispetto alla versione precedente:
 * - Usa default export invece di named export
 * - zkSdk() invece di initZkEmailSdk()
 * - isLocal invece di isRemote per il prover
 */
export function useZkEmailProof() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  /**
   * Genera una prova ZK per un'email
   * @param emailContent - Contenuto raw dell'email (.eml)
   * @param blueprintSlug - Slug del blueprint (es. "GitEma01/GmailDebugBlueprint@v2")
   * @param useRemoteProving - Se true usa proving remoto (default), se false usa proving locale
   */
  const generateProof = useCallback(async (
    emailContent: string, 
    blueprintSlug: string,
    useRemoteProving: boolean = true
  ): Promise<ProofResult | null> => {
    setIsGenerating(true);
    setError(null);
    setProgress('Inizializzazione SDK...');

    try {
      if (!blueprintSlug) {
        throw new Error("Blueprint slug mancante");
      }

      if (!emailContent || emailContent.length < 100) {
        throw new Error("Contenuto email non valido o troppo corto");
      }

      // NUOVA SINTASSI SDK 3.0.0-nightly.13
      // Import del default export
      const zkeSdk = (await import('@zk-email/sdk')).default;
      
      setProgress('Connessione al server ZK Email...');
      
      // Inizializza SDK con logging abilitato per debug
      const sdk = zkeSdk({ 
        logging: { 
          enabled: true, 
          level: 'debug' 
        } 
      });
      
      console.log('SDK inizializzato');

      setProgress(`Caricamento blueprint: ${blueprintSlug}`);
      const blueprint = await sdk.getBlueprint(blueprintSlug);
      console.log('Blueprint caricato:', blueprint);

      // Validazione opzionale dell'email
      setProgress('Validazione email...');
      try {
        const isValidEmail = await blueprint.validateEmail(emailContent);
        console.log('Email valida per questo blueprint:', isValidEmail);
        
        if (!isValidEmail) {
          console.warn('Attenzione: l\'email potrebbe non essere completamente valida per questo blueprint');
        }
      } catch (validationError: any) {
        console.warn('Errore durante validazione (non critico):', validationError.message);
        // Continua comunque
      }

      setProgress('Creazione prover...');
      
      // NUOVA SINTASSI: isLocal invece di isRemote
      // isLocal: true = proving nel browser
      // isLocal: false = proving remoto (più veloce)
      const prover = blueprint.createProver({ 
        isLocal: !useRemoteProving 
      });
      
      console.log(`Prover creato (${useRemoteProving ? 'remoto' : 'locale'})`);

      setProgress(`Generazione prova ZK ${useRemoteProving ? '(remota)' : '(locale)'} - può richiedere 30-120 secondi...`);
      
      // Genera la prova
      const proof = await prover.generateProof(emailContent);
      console.log('Prova generata:', proof);

      setProgress('Verifica prova off-chain...');
      const isValid = await blueprint.verifyProof(proof);
      console.log('Verifica off-chain:', isValid);

      if (!isValid) {
        throw new Error('La prova generata non è valida');
      }

      const proofData = proof.props.proofData;
      
      // Formatta la prova per il contratto Solidity
      const formattedProof = {
        pi_a: [
          BigInt(proofData.pi_a[0]),
          BigInt(proofData.pi_a[1])
        ] as [bigint, bigint],
        pi_b: [
          [BigInt(proofData.pi_b[0][1]), BigInt(proofData.pi_b[0][0])] as [bigint, bigint],
          [BigInt(proofData.pi_b[1][1]), BigInt(proofData.pi_b[1][0])] as [bigint, bigint]
        ] as [[bigint, bigint], [bigint, bigint]],
        pi_c: [
          BigInt(proofData.pi_c[0]),
          BigInt(proofData.pi_c[1])
        ] as [bigint, bigint],
        publicSignals: proof.props.publicOutputs.map((s: string) => BigInt(s))
      };

      const publicData = proof.props.publicData || {};
      
      setProgress('Prova generata con successo! ✅');
      
      return {
        proof: formattedProof,
        publicData,
        isValid
      };

    } catch (err: any) {
      console.error('Errore generazione prova:', err);
      
      let errorMessage = err.message || 'Errore nella generazione della prova';
      
      // Gestione errori specifici ZK Email
      if (errorMessage.includes('TargetNotRepeatable')) {
        errorMessage = 'Errore Blueprint: La Regex del circuito non è valida (capture group ripetuto). Contatta lo sviluppatore del blueprint.';
      } else if (errorMessage.includes('DKIM')) {
        errorMessage = 'Errore verifica DKIM: la firma dell\'email potrebbe non essere valida o il dominio non supportato.';
      } else if (errorMessage.includes('blueprint') || errorMessage.includes('Blueprint')) {
        errorMessage = `Blueprint non trovato o non disponibile: ${blueprintSlug}`;
      } else if (errorMessage.includes('Remote proving failed')) {
        errorMessage = 'Errore proving remoto: il server non è riuscito a generare la prova. Riprova tra qualche minuto.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        errorMessage = 'Timeout: la generazione della prova ha impiegato troppo tempo. Riprova.';
      } else if (errorMessage.includes('CSP') || errorMessage.includes('eval')) {
        errorMessage = 'Errore CSP: il browser blocca l\'esecuzione del codice ZK. Verifica la configurazione di Next.js.';
      }
      
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Estrae il dominio da un'email raw
   */
  const extractDomainFromEmail = useCallback((emailContent: string): string | null => {
    // Metodo 1: From: Name <email@domain.com>
    const fromMatch1 = emailContent.match(/^From:\s*[^<]*<([^>]+)>/mi);
    if (fromMatch1) {
      const email = fromMatch1[1];
      const atIndex = email.lastIndexOf('@');
      if (atIndex !== -1) {
        return email.substring(atIndex + 1).toLowerCase().trim();
      }
    }
    
    // Metodo 2: From: email@domain.com
    const fromMatch2 = emailContent.match(/^From:\s*(\S+@\S+)/mi);
    if (fromMatch2) {
      const email = fromMatch2[1];
      const atIndex = email.lastIndexOf('@');
      if (atIndex !== -1) {
        return email.substring(atIndex + 1).toLowerCase().trim();
      }
    }
    
    // Metodo 3: DKIM d= field
    const dkimMatch = emailContent.match(/dkim-signature:[\s\S]*?d=([a-zA-Z0-9.-]+)/i);
    if (dkimMatch) {
      return dkimMatch[1].toLowerCase();
    }
    
    return null;
  }, []);

  /**
   * Valida un'email contro un blueprint senza generare la prova
   */
  const validateEmail = useCallback(async (
    emailContent: string, 
    blueprintSlug: string
  ): Promise<boolean> => {
    try {
      const zkeSdk = (await import('@zk-email/sdk')).default;
      const sdk = zkeSdk();
      const blueprint = await sdk.getBlueprint(blueprintSlug);
      return await blueprint.validateEmail(emailContent);
    } catch (err) {
      console.error('Errore validazione:', err);
      return false;
    }
  }, []);

  /**
   * Reset dello stato dell'hook
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setError(null);
    setProgress('');
  }, []);

  return {
    generateProof,
    extractDomainFromEmail,
    validateEmail,
    reset,
    isGenerating,
    error,
    progress
  };
}
