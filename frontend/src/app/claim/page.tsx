'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from 'viem';
import { readContract } from '@wagmi/core';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { BountyEscrowABI } from '@/abi/BountyEscrow';
import { CONTRACTS } from '@/config/contracts';
import { config } from '@/config/wagmi';

interface BountyData {
  domain: string;
  reward: bigint;
  status: number;
}

interface ClaimData {
  claimant: string;
  disputeDeadline: number;
}

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [bountyId, setBountyId] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [escrowAddress, setEscrowAddress] = useState<`0x${string}` | null>(null);
  const [bountyData, setBountyData] = useState<BountyData | null>(null);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Claim reward
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Calcola tempo rimanente per disputa
  const [timeRemaining, setTimeRemaining] = useState<{canClaim: boolean; text: string} | null>(null);

  useEffect(() => {
    if (!claimData?.disputeDeadline) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const deadlineMs = claimData.disputeDeadline * 1000;
      const now = Date.now();
      const remaining = deadlineMs - now;

      if (remaining <= 0) {
        return { canClaim: true, text: 'Periodo disputa terminato ✅' };
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      return {
        canClaim: false,
        text: `${hours}h ${minutes}m ${seconds}s rimanenti`
      };
    };

    setTimeRemaining(calculateTimeRemaining());
    
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [claimData?.disputeDeadline]);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setBountyData(null);
    setClaimData(null);
    setEscrowAddress(null);

    try {
      console.log('Searching for bounty ID:', bountyId);

      // 1. Get escrow address
      const escrow = await readContract(config, {
        address: CONTRACTS.BOUNTY_FACTORY,
        abi: BountyFactoryABI,
        functionName: 'getEscrowAddress',
        args: [BigInt(bountyId)],
      });

      console.log('Escrow address:', escrow);

      if (!escrow || escrow === '0x0000000000000000000000000000000000000000') {
        setError('Bounty non trovato');
        setIsLoading(false);
        return;
      }

      setEscrowAddress(escrow as `0x${string}`);

      // 2. Get bounty details
      const details = await readContract(config, {
        address: escrow as `0x${string}`,
        abi: BountyEscrowABI,
        functionName: 'getBountyDetails',
      }) as any;

      console.log('Bounty details:', details);

      if (details) {
        // Supporta sia oggetto che array
        const domain = details.domain ?? details[1];
        const reward = details.totalReward ?? details[3];
        const status = details.status ?? details[5];
        
        setBountyData({
          domain: domain as string,
          reward: reward as bigint,
          status: Number(status),
        });
      }

      // 3. Get claim info
      const claim = await readContract(config, {
        address: escrow as `0x${string}`,
        abi: BountyEscrowABI,
        functionName: 'getClaimInfo',
      }) as any;

      console.log('Claim info:', claim);

      const claimant = claim?.claimant ?? claim?.[0];
      const disputeDeadline = claim?.disputeDeadline ?? claim?.[3];
      
      if (claimant && claimant !== '0x0000000000000000000000000000000000000000') {
        setClaimData({
          claimant: claimant as string,
          disputeDeadline: Number(disputeDeadline),
        });
      }

    } catch (err) {
      console.error('Error fetching bounty:', err);
      setError('Errore nel caricamento del bounty');
    }

    setIsLoading(false);
  }, [bountyId]);

  const handleClaim = () => {
    if (!escrowAddress) return;

    writeContract({
      address: escrowAddress,
      abi: BountyEscrowABI,
      functionName: 'claimReward',
    });
  };

  // Status mapping
  const statusMap: Record<number, string> = {
    0: 'OPEN',
    1: 'PENDING_CLAIM',
    2: 'CLAIMED',
    3: 'EXPIRED',
    4: 'DISPUTED',
    5: 'CANCELLED'
  };

  const getStatusColor = (s: number) => {
    switch (s) {
      case 0: return 'bg-green-500';
      case 1: return 'bg-yellow-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-gray-500';
      case 4: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Verifica se l'utente è il claimant
  const isClaimant = claimData?.claimant && address && 
    claimData.claimant.toLowerCase() === address.toLowerCase();

  // Formatta reward in modo sicuro
  const formatReward = (r: bigint | undefined) => {
    if (!r) return '0';
    try {
      return formatEther(r);
    } catch {
      return '0';
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-green-900/50 border border-green-500 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              Ricompensa Reclamata con Successo!
            </h2>
            <p className="text-gray-300 mb-6">
              I fondi sono stati trasferiti al tuo wallet.
            </p>
            <p className="text-2xl font-bold text-white mb-6">
              +{formatReward(bountyData?.reward)} ETH
            </p>
            <Link
              href="/bounties"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
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
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Reclama Ricompensa</h1>
        <p className="text-gray-400 mb-8">
          Reclama la tua ricompensa dopo il periodo di disputa.
        </p>

        {!isConnected ? (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 mb-6">
            <p className="text-yellow-400">⚠️ Connetti il tuo wallet per continuare</p>
          </div>
        ) : (
          <>
            {/* Search Bounty */}
            <div className="bg-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Cerca Bounty</h2>
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Bounty ID"
                  value={bountyId}
                  onChange={(e) => setBountyId(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
                />
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  {isLoading ? 'Caricamento...' : 'Cerca'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6 text-center">
                <p className="text-red-400">❌ {error}</p>
              </div>
            )}

            {/* Bounty Details */}
            {bountyData && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Dettagli Bounty #{bountyId}</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Dominio:</span>
                    <span className="font-mono text-white">{bountyData.domain}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Ricompensa:</span>
                    <span className="text-green-400 font-bold text-xl">
                      {formatReward(bountyData.reward)} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status:</span>
                    <span className={`${getStatusColor(bountyData.status)} px-3 py-1 rounded-full text-sm font-medium text-white`}>
                      {statusMap[bountyData.status] || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Claim Info */}
            {claimData && claimData.claimant && (
              <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Informazioni Claim</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Claimant:</span>
                    <span className="font-mono text-white text-sm">
                      {claimData.claimant.slice(0, 6)}...{claimData.claimant.slice(-4)}
                      {isClaimant && <span className="ml-2 text-green-400">(Tu)</span>}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Periodo Disputa:</span>
                    <span className={`font-medium ${timeRemaining?.canClaim ? 'text-green-400' : 'text-yellow-400'}`}>
                      {timeRemaining?.text || 'Caricamento...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Claim Button */}
            {bountyData?.status === 1 && isClaimant && (
              <div className="bg-gray-800 rounded-xl p-6">
                {!timeRemaining?.canClaim ? (
                  <div className="text-center">
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-gray-300 mb-2">
                      Devi aspettare la fine del periodo di disputa
                    </p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {timeRemaining?.text}
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleClaim}
                      disabled={isPending || isConfirming}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-lg transition-colors"
                    >
                      {isPending ? '⏳ Conferma nel wallet...' :
                       isConfirming ? '⏳ Transazione in corso...' :
                       `💰 Reclama ${formatReward(bountyData?.reward)} ETH`}
                    </button>
                    
                    {writeError && (
                      <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-4">
                        <p className="text-red-400 text-sm">
                          Errore: {writeError.message}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Not Claimant Warning */}
            {bountyData?.status === 1 && !isClaimant && claimData && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
                <p className="text-yellow-400">
                  ⚠️ Solo il claimant ({claimData.claimant.slice(0, 6)}...{claimData.claimant.slice(-4)}) può reclamare questa ricompensa.
                </p>
              </div>
            )}

            {/* Already Claimed */}
            {bountyData?.status === 2 && (
              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-6 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-blue-400 text-lg font-semibold mb-2">
                  Questa ricompensa è già stata reclamata.
                </p>
                <p className="text-gray-400">
                  Bounty #{bountyId} - {bountyData.domain} - {formatReward(bountyData.reward)} ETH
                </p>
              </div>
            )}

            {/* Still Open */}
            {bountyData?.status === 0 && (
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-300">
                  Questo bounty è ancora aperto. Nessuna prova è stata sottomessa.
                </p>
                <Link
                  href="/submit-proof"
                  className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Sottometti Prova
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
