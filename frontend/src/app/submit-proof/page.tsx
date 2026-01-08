'use client';

import { Header } from '@/components/Header';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { BountyEscrowABI } from '@/abi/BountyEscrow';
import { 
  CONTRACTS, 
  hashKeyword, 
  getBlueprintForDomain, 
  isDomainSupported,
  SUPPORTED_DOMAINS 
} from '@/config/contracts';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { keccak256, toBytes } from 'viem';

export default function SubmitProofPage() {
  const { isConnected } = useAccount();
  const searchParams = useSearchParams();
  const initialBountyId = searchParams.get('bountyId') || '';
  
  // Form state
  const [bountyId, setBountyId] = useState(initialBountyId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emailContent, setEmailContent] = useState<string>('');
  
  // Extracted data
  const [extractedDomain, setExtractedDomain] = useState<string>('');
  const [foundKeywords, setFoundKeywords] = useState<string[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  
  // Proof state
  const [proofGenerated, setProofGenerated] = useState(false);
  const [proofData, setProofData] = useState<any>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofProgress, setProofProgress] = useState('');
  
  const [error, setError] = useState('');

  // Read bounty details
  const { data: bountyDetails } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getBounty',
    args: bountyId ? [BigInt(bountyId)] : undefined,
  });

  // Read escrow address
  const { data: escrowAddress } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getEscrowAddress',
    args: bountyId ? [BigInt(bountyId)] : undefined,
  });

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Bounty data
  const bountyDomain = (bountyDetails as any)?.domain?.toLowerCase() || '';
  const bountyKeywords: string[] = (bountyDetails as any)?.keywords || [];
  
  // Blueprint per questo dominio
  const blueprintSlug = getBlueprintForDomain(bountyDomain);
  const domainSupported = isDomainSupported(bountyDomain);

  // ========== PARSING EMAIL ==========

  const extractDomainFromEmail = useCallback((content: string): string => {
    // Metodo 1: From: Name <email@domain.com>
    const fromMatch1 = content.match(/^From:\s*[^<]*<([^>]+)>/mi);
    if (fromMatch1) {
      const email = fromMatch1[1];
      const atIndex = email.lastIndexOf('@');
      if (atIndex !== -1) {
        return email.substring(atIndex + 1).toLowerCase().trim();
      }
    }
    
    // Metodo 2: From: email@domain.com
    const fromMatch2 = content.match(/^From:\s*(\S+@\S+)/mi);
    if (fromMatch2) {
      const email = fromMatch2[1];
      const atIndex = email.lastIndexOf('@');
      if (atIndex !== -1) {
        return email.substring(atIndex + 1).toLowerCase().trim();
      }
    }
    
    // Metodo 3: DKIM d= field
    const dkimMatch = content.match(/dkim-signature:[^;]*;\s*[^;]*d=([a-zA-Z0-9.-]+)/i);
    if (dkimMatch) {
      return dkimMatch[1].toLowerCase();
    }
    
    return '';
  }, []);

  const extractEmailBody = useCallback((content: string): string => {
    let body = '';
    
    const headerEndMatch = content.match(/\r?\n\r?\n/);
    if (!headerEndMatch) {
      return content.toLowerCase();
    }
    
    const headerEndIndex = content.indexOf(headerEndMatch[0]) + headerEndMatch[0].length;
    body = content.substring(headerEndIndex);
    
    // Multipart
    const boundaryMatch = content.match(/boundary="?([^"\r\n]+)"?/i);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = body.split('--' + boundary);
      
      for (const part of parts) {
        if (part.includes('Content-Type: text/plain') || part.includes('Content-Type:text/plain')) {
          const partBodyMatch = part.match(/\r?\n\r?\n([\s\S]*)/);
          if (partBodyMatch) {
            body = partBodyMatch[1];
            break;
          }
        }
        if (part.includes('Content-Type: text/html') || part.includes('Content-Type:text/html')) {
          const partBodyMatch = part.match(/\r?\n\r?\n([\s\S]*)/);
          if (partBodyMatch) {
            body = partBodyMatch[1].replace(/<[^>]*>/g, ' ');
          }
        }
      }
    }
    
    // Decode quoted-printable
    body = body.replace(/=\r?\n/g, '');
    body = body.replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });
    
    // Cleanup
    body = body
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
    
    return body.toLowerCase();
  }, []);

  const findKeywordsInBody = useCallback((body: string, keywordsToFind: string[]): { found: string[], missing: string[] } => {
    const bodyLower = body.toLowerCase();
    const found: string[] = [];
    const missing: string[] = [];
    
    for (const kw of keywordsToFind) {
      const kwLower = kw.toLowerCase().trim();
      if (bodyLower.includes(kwLower)) {
        found.push(kw);
      } else {
        missing.push(kw);
      }
    }
    
    return { found, missing };
  }, []);

  // ========== EFFECTS ==========

  useEffect(() => {
    if (!emailContent || !bountyDetails) return;
    
    const domain = extractDomainFromEmail(emailContent);
    setExtractedDomain(domain);
    
    if (bountyKeywords.length > 0) {
      const body = extractEmailBody(emailContent);
      const { found, missing } = findKeywordsInBody(body, bountyKeywords);
      setFoundKeywords(found);
      setMissingKeywords(missing);
    } else {
      setFoundKeywords([]);
      setMissingKeywords([]);
    }
  }, [emailContent, bountyDetails, bountyKeywords, extractDomainFromEmail, extractEmailBody, findKeywordsInBody]);

  // ========== HANDLERS ==========

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.eml')) {
        setSelectedFile(file);
        const content = await file.text();
        setEmailContent(content);
        setError('');
        setProofGenerated(false);
        setProofData(null);
      } else {
        setError('Per favore carica un file .eml');
      }
    }
  };

  const handleGenerateSimulatedProof = () => {
    if (!emailContent) {
      setError('Carica prima un file email');
      return;
    }
    
    if (extractedDomain.toLowerCase() !== bountyDomain.toLowerCase()) {
      setError(`Dominio non corrispondente. Richiesto: ${bountyDomain}, Trovato: ${extractedDomain}`);
      return;
    }
    
    if (bountyKeywords.length > 0 && missingKeywords.length > 0) {
      setError(`Keywords mancanti: ${missingKeywords.join(', ')}`);
      return;
    }

    const nullifier = keccak256(toBytes(emailContent.slice(0, 100) + Date.now()));
    const domainHash = keccak256(toBytes(extractedDomain));

    const simulatedProof = {
      pi_a: [BigInt(1), BigInt(2)],
      pi_b: [[BigInt(3), BigInt(4)], [BigInt(5), BigInt(6)]],
      pi_c: [BigInt(7), BigInt(8)],
      publicSignals: [BigInt(domainHash), BigInt(nullifier)]
    };

    setProofData(simulatedProof);
    setProofGenerated(true);
    setError('');
  };

  const handleGenerateRealProof = async () => {
    if (!emailContent) {
      setError('Carica prima un file email');
      return;
    }
    
    if (extractedDomain.toLowerCase() !== bountyDomain.toLowerCase()) {
      setError(`Dominio non corrispondente. Richiesto: ${bountyDomain}, Trovato: ${extractedDomain}`);
      return;
    }
    
    if (!blueprintSlug) {
      setError(`Nessun blueprint disponibile per il dominio ${bountyDomain}. Usa la modalità Test.`);
      return;
    }
    
    if (bountyKeywords.length > 0 && missingKeywords.length > 0) {
      setError(`Keywords mancanti: ${missingKeywords.join(', ')}`);
      return;
    }

    setIsGeneratingProof(true);
    setError('');
    setProofProgress('Inizializzazione SDK...');

    try {
      const { initZkEmailSdk } = await import('@zk-email/sdk');
      
      setProofProgress('Connessione al server...');
      const sdk = await initZkEmailSdk();
      
      setProofProgress(`Caricamento blueprint: ${blueprintSlug}`);
      const blueprint = await sdk.getBlueprint(blueprintSlug);
      
      setProofProgress('Creazione prover...');
      const prover = blueprint.createProver({ isRemote: true });
      
      setProofProgress('Generazione prova ZK (30-60 secondi)...');

      const proof = await prover.generateProof(emailContent);
      
      setProofProgress('Verifica prova...');
      const isValid = await blueprint.verifyProof(proof);
      
      if (!isValid) {
        throw new Error('La prova generata non è valida');
      }
      
      const proofDataRaw = proof.props.proofData;
      const formattedProof = {
        pi_a: [BigInt(proofDataRaw.pi_a[0]), BigInt(proofDataRaw.pi_a[1])],
        pi_b: [
          [BigInt(proofDataRaw.pi_b[0][0]), BigInt(proofDataRaw.pi_b[0][1])],
          [BigInt(proofDataRaw.pi_b[1][0]), BigInt(proofDataRaw.pi_b[1][1])]
        ],
        pi_c: [BigInt(proofDataRaw.pi_c[0]), BigInt(proofDataRaw.pi_c[1])],
        publicSignals: proof.props.publicOutputs.map((s: string) => BigInt(s))
      };
      
      setProofData(formattedProof);
      setProofGenerated(true);
      setProofProgress('Prova generata!');
      
    } catch (err: any) {
      console.error('Errore:', err);
      setError(err.message || 'Errore nella generazione');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const handleSubmitProof = () => {
    if (!proofData || !escrowAddress) {
      setError('Genera prima la prova');
      return;
    }

    const keywordHashes = foundKeywords.map(kw => hashKeyword(kw));

    writeContract({
      address: escrowAddress as `0x${string}`,
      abi: BountyEscrowABI,
      functionName: 'submitProof',
      args: [proofData, extractedDomain, keywordHashes],
    });
  };

  // ========== UI ==========
  
  const domainMatch = extractedDomain && bountyDomain && 
    extractedDomain.toLowerCase() === bountyDomain.toLowerCase();
  
  const allKeywordsFound = bountyKeywords.length === 0 || 
    (foundKeywords.length === bountyKeywords.length && missingKeywords.length === 0);

  const canGenerateProof = emailContent && domainMatch && allKeywordsFound;

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-green-900/50 rounded-lg p-8 text-center border border-green-700">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-white mb-2">Prova Sottomessa!</h3>
            <p className="text-gray-300 mb-4">Dopo 24h potrai reclamare la ricompensa.</p>
            <div className="flex gap-4 justify-center">
              <Link href={`/bounties/${bountyId}`} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">Vedi Bounty</Link>
              <Link href="/claim" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg">Vai a Claim</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Sottometti Prova</h1>
        <p className="text-gray-400 mb-8">Carica la tua email - le keywords vengono verificate automaticamente</p>

        <div className="space-y-6">
          
          {/* Step 1: Seleziona Bounty */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">1</span>
              <h3 className="text-lg font-semibold text-white">Seleziona Bounty</h3>
            </div>
            
            <input
              type="number"
              value={bountyId}
              onChange={(e) => setBountyId(e.target.value)}
              placeholder="Bounty ID (es. 0, 1, 2...)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
            />
            
            {bountyDetails && (
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Dominio richiesto:</span>
                  <span className="text-white font-mono">@{bountyDomain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Keywords richieste:</span>
                  <span className="text-purple-400">
                    {bountyKeywords.length > 0 ? bountyKeywords.join(', ') : 'Nessuna'}
                  </span>
                </div>
                {/* Blueprint status */}
                <div className="flex justify-between">
                  <span className="text-gray-400">Prova ZK:</span>
                  {domainSupported ? (
                    <span className="text-green-400">✅ Supportato ({blueprintSlug})</span>
                  ) : (
                    <span className="text-yellow-400">⚠️ Solo modalità Test</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Domains supported info */}
          {bountyDomain && !domainSupported && (
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
              <p className="text-yellow-400 text-sm">
                ⚠️ Il dominio <strong>@{bountyDomain}</strong> non ha un blueprint ZK configurato.
                <br />
                Domini supportati per prova ZK reale: <strong>{SUPPORTED_DOMAINS.join(', ')}</strong>
                <br />
                Puoi comunque usare la modalità Test per dimostrare il flusso.
              </p>
            </div>
          )}

          {/* Step 2: Carica Email */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">2</span>
              <h3 className="text-lg font-semibold text-white">Carica Email (.eml)</h3>
            </div>
            
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
              <input type="file" accept=".eml" onChange={handleFileChange} className="hidden" id="email-upload" />
              <label htmlFor="email-upload" className="cursor-pointer">
                {selectedFile ? (
                  <div>
                    <div className="text-3xl mb-2">📧</div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-3xl mb-2">📤</div>
                    <p className="text-white">Clicca per caricare</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Step 3: Verifica Automatica */}
          {emailContent && bountyDetails && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center mb-4">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">3</span>
                <h3 className="text-lg font-semibold text-white">Verifica Automatica</h3>
              </div>
              
              {/* Domain check */}
              <div className={`p-3 rounded-lg mb-3 ${domainMatch ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Dominio:</span>
                  <span className={domainMatch ? 'text-green-400' : 'text-red-400'}>
                    {domainMatch ? '✅' : '❌'} @{extractedDomain || '???'}
                  </span>
                </div>
              </div>
              
              {/* Keywords check */}
              {bountyKeywords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm mb-2">Keywords trovate:</p>
                  {bountyKeywords.map((kw, i) => {
                    const isFound = foundKeywords.includes(kw);
                    return (
                      <div key={i} className={`p-2 rounded flex items-center ${isFound ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                        <span className="mr-2">{isFound ? '✅' : '❌'}</span>
                        <span className={isFound ? 'text-green-400' : 'text-red-400'}>"{kw}"</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Genera Prova */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className={`${canGenerateProof ? 'bg-blue-600' : 'bg-gray-600'} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3`}>4</span>
              <h3 className={`text-lg font-semibold ${canGenerateProof ? 'text-white' : 'text-gray-500'}`}>Genera Prova</h3>
            </div>
            
            {proofGenerated ? (
              <div className="bg-green-900/30 rounded-lg p-4 border border-green-700">
                <p className="text-green-400">✅ Prova generata!</p>
              </div>
            ) : isGeneratingProof ? (
              <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                <p className="text-blue-400">{proofProgress}</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateSimulatedProof}
                  disabled={!canGenerateProof}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg"
                >
                  🧪 Test (Simulata)
                </button>
                <button
                  onClick={handleGenerateRealProof}
                  disabled={!canGenerateProof || !domainSupported}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg"
                  title={!domainSupported ? `Nessun blueprint per ${bountyDomain}` : ''}
                >
                  🔐 Reale (ZK)
                </button>
              </div>
            )}
            
            {!domainSupported && bountyDomain && (
              <p className="text-yellow-400 text-xs mt-2">
                ⚠️ Prova ZK reale non disponibile per @{bountyDomain}
              </p>
            )}
          </div>

          {/* Step 5: Submit */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className={`${proofGenerated ? 'bg-green-600' : 'bg-gray-600'} text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3`}>5</span>
              <h3 className={`text-lg font-semibold ${proofGenerated ? 'text-white' : 'text-gray-500'}`}>Submit On-Chain</h3>
            </div>
            
            <button
              onClick={handleSubmitProof}
              disabled={!proofGenerated || isPending || isConfirming || !isConnected}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold"
            >
              {!isConnected ? 'Connetti Wallet' :
               isPending ? '⏳ Conferma...' : 
               isConfirming ? '⏳ Transazione...' : 
               '🚀 Sottometti'}
            </button>
          </div>

          {/* Errors */}
          {(error || writeError) && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error || writeError?.message}</p>
            </div>
          )}

          {/* Info box */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2">ℹ️ Domini supportati per ZK</h4>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_DOMAINS.map(d => (
                <span key={d} className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs">
                  @{d}
                </span>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Altri domini funzionano solo in modalità Test (prova simulata).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
