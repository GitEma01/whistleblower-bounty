'use client';

import { Header } from '@/components/Header';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { BountyEscrowABI } from '@/abi/BountyEscrow';
import { CONTRACTS } from '@/config/contracts';
import { keccak256, toBytes } from 'viem';
import Link from 'next/link';
import { useZkEmailProof } from '@/hooks/useZkEmailProof';

export default function SubmitProofPage() {
  const { isConnected } = useAccount();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emailContent, setEmailContent] = useState<string>('');
  const [bountyId, setBountyId] = useState('');
  const [proofGenerated, setProofGenerated] = useState(false);
  const [proofData, setProofData] = useState<any>(null);
  const [error, setError] = useState('');
  const [escrowAddress, setEscrowAddress] = useState<string>('');
  const [useRealZk, setUseRealZk] = useState(false);

  const { generateProof, isGenerating, error: zkError, progress } = useZkEmailProof();

  const { data: escrowAddr } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getEscrowAddress',
    args: bountyId ? [BigInt(bountyId)] : undefined,
  });

  const { data: bountyDetails } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getBounty',
    args: bountyId ? [BigInt(bountyId)] : undefined,
  });

  useEffect(() => {
    if (escrowAddr) {
      setEscrowAddress(escrowAddr as string);
    }
  }, [escrowAddr]);

  const { data: hash, writeContract, isPending, error: writeError } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.eml')) {
        setSelectedFile(file);
        const content = await file.text();
        setEmailContent(content);
        setError('');
        console.log('Email caricata, lunghezza:', content.length);
        console.log('Prime 500 chars:', content.substring(0, 500));
      } else {
        setError('Per favore carica un file .eml');
      }
    }
  };

  const handleGenerateSimulatedProof = async () => {
    if (!emailContent || !bountyId || !bountyDetails) {
      setError('Seleziona un file e inserisci il Bounty ID');
      return;
    }

    try {
      const domain = (bountyDetails as any).domain;
      const nullifierInput = emailContent + bountyId + Date.now().toString();
      const nullifierHash = keccak256(toBytes(nullifierInput));
      const domainHash = keccak256(toBytes(domain));

      const simulatedProof = {
        pi_a: [BigInt(1), BigInt(2)] as [bigint, bigint],
        pi_b: [
          [BigInt(3), BigInt(4)] as [bigint, bigint],
          [BigInt(5), BigInt(6)] as [bigint, bigint]
        ] as [[bigint, bigint], [bigint, bigint]],
        pi_c: [BigInt(7), BigInt(8)] as [bigint, bigint],
        publicSignals: [BigInt(domainHash), BigInt(nullifierHash)] as bigint[]
      };

      setProofData(simulatedProof);
      setProofGenerated(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateRealProof = async () => {
    if (!emailContent) {
      setError('Carica prima un file email');
      return;
    }

    const result = await generateProof(emailContent);
    if (result) {
      setProofData(result.proof);
      setProofGenerated(true);
      console.log('Prova ZK reale generata:', result);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofData || !escrowAddress) {
      setError('Prova non generata o escrow non trovato');
      return;
    }

    console.log('Submitting proof to escrow:', escrowAddress);
    console.log('Proof data:', proofData);

    try {
      writeContract({
        address: escrowAddress as `0x${string}`,
        abi: BountyEscrowABI,
        functionName: 'submitProof',
        args: [proofData],
      });
    } catch (err: any) {
      console.error('Errore submit:', err);
      setError(err.message);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-8">Sottometti una Prova</h1>
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-white mb-2">Connetti il tuo Wallet</h3>
            <p className="text-gray-400">Devi connettere il wallet per sottomettere una prova</p>
          </div>
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-green-900/50 rounded-lg p-8 text-center border border-green-700">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-white mb-2">Prova Sottomessa con Successo!</h3>
            <p className="text-gray-300 mb-4">
              La tua prova e stata verificata e registrata on-chain.
              Dopo il periodo di disputa, potrai reclamare la ricompensa.
            </p>
            <Link
              href="/bounties"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Vai ai Bounties
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Sottometti una Prova</h1>
        <p className="text-gray-400 mb-8">Genera una prova ZK dalla tua email e reclama la ricompensa</p>

        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">Modalita Prova:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUseRealZk(false)}
                  className={!useRealZk ? 'bg-blue-600 text-white px-4 py-2 rounded-lg' : 'bg-gray-700 text-gray-300 px-4 py-2 rounded-lg'}
                >
                  Test (Simulata)
                </button>
                <button
                  onClick={() => setUseRealZk(true)}
                  className={useRealZk ? 'bg-purple-600 text-white px-4 py-2 rounded-lg' : 'bg-gray-700 text-gray-300 px-4 py-2 rounded-lg'}
                >
                  Reale (ZK + DKIM)
                </button>
              </div>
            </div>
          </div>

          {/* Step 1: Bounty ID */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
              <h3 className="text-lg font-semibold text-white">Seleziona il Bounty</h3>
            </div>
            <input
              type="number"
              value={bountyId}
              onChange={(e) => setBountyId(e.target.value)}
              placeholder="Inserisci il Bounty ID (es. 0, 1, 2...)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {bountyDetails && (
              <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Domain: </span>
                  @{(bountyDetails as any).domain}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="text-gray-400">Escrow: </span>
                  {escrowAddress ? escrowAddress.slice(0, 10) + '...' : 'Loading...'}
                </p>
              </div>
            )}
          </div>

          {/* Step 2: Upload Email */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
              <h3 className="text-lg font-semibold text-white">Carica il File Email (.eml)</h3>
            </div>
            
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".eml"
                onChange={handleFileChange}
                className="hidden"
                id="email-upload"
              />
              <label htmlFor="email-upload" className="cursor-pointer">
                {selectedFile ? (
                  <div>
                    <div className="text-4xl mb-2">📧</div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="text-gray-400 text-sm mt-1">Clicca per cambiare file</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📤</div>
                    <p className="text-white font-medium">Clicca per caricare un file .eml</p>
                    <p className="text-gray-400 text-sm mt-1">Esporta email da Gmail, Outlook, etc.</p>
                  </div>
                )}
              </label>
            </div>
            
            {useRealZk && (
              <div className="mt-3 p-3 bg-purple-900/30 rounded-lg border border-purple-700">
                <p className="text-xs text-purple-300">
                  <strong>Nota:</strong> Per la prova ZK reale, usa il file residency.EML 
                  (email Succinct ZK Residency) che hai gia testato.
                </p>
              </div>
            )}
          </div>

          {/* Step 3: Generate Proof */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
              <h3 className="text-lg font-semibold text-white">Genera la Prova ZK</h3>
            </div>
            
            {proofGenerated ? (
              <div className="bg-green-900/30 rounded-lg p-4 border border-green-700">
                <p className="text-green-400 flex items-center">
                  <span className="mr-2">✅</span>
                  Prova generata con successo!
                </p>
              </div>
            ) : isGenerating ? (
              <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700">
                <p className="text-purple-400">{progress}</p>
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            ) : (
              <button
                onClick={useRealZk ? handleGenerateRealProof : handleGenerateSimulatedProof}
                disabled={!selectedFile || (!useRealZk && !bountyId)}
                className={useRealZk 
                  ? "w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition"
                  : "w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition"
                }
              >
                {useRealZk ? 'Genera Prova ZK Reale (DKIM)' : 'Genera Prova Simulata'}
              </button>
            )}
          </div>

          {/* Step 4: Submit Proof */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center mb-4">
              <span className={proofGenerated ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3' : 'bg-gray-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3'}>4</span>
              <h3 className={proofGenerated ? 'text-lg font-semibold text-white' : 'text-lg font-semibold text-gray-500'}>Sottometti On-Chain</h3>
            </div>
            
            <button
              onClick={handleSubmitProof}
              disabled={!proofGenerated || isPending || isConfirming}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition"
            >
              {isPending ? 'Conferma nel Wallet...' : isConfirming ? 'Sottomissione in corso...' : 'Sottometti Prova'}
            </button>
          </div>

          {/* Errors */}
          {(error || writeError || zkError) && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error || writeError?.message || zkError}</p>
            </div>
          )}

          {/* Info Box */}
          {useRealZk ? (
            <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700">
              <h4 className="text-sm font-semibold text-purple-400 mb-2">Modalita ZK Reale</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>Verifica firma DKIM dell email</li>
                <li>Genera prova Groth16 crittografica</li>
                <li>Usa blueprint: Bisht13/SuccinctZKResidencyInvite@v3</li>
                <li>Tempo generazione: 10-30 secondi</li>
              </ul>
            </div>
          ) : (
            <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-700">
              <h4 className="text-sm font-semibold text-yellow-400 mb-2">Modalita Test</h4>
              <p className="text-xs text-gray-400">
                Prova simulata per testing. In produzione usa la modalita ZK Reale.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
