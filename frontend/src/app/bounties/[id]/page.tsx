'use client';

import { Header } from '@/components/Header';
import { useParams } from 'next/navigation';
import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { BountyEscrowABI } from '@/abi/BountyEscrow';
import { CONTRACTS } from '@/config/contracts';
import { formatEther, parseEther } from 'viem';
import { useState } from 'react';
import Link from 'next/link';

const STATUS_LABELS: Record<number, string> = {
  0: 'OPEN',
  1: 'PENDING CLAIM',
  2: 'CLAIMED',
  3: 'EXPIRED',
  4: 'DISPUTED',
  5: 'CANCELLED',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-green-500',
  1: 'bg-yellow-500',
  2: 'bg-blue-500',
  3: 'bg-gray-500',
  4: 'bg-red-500',
  5: 'bg-gray-600',
};

export default function BountyDetailPage() {
  const params = useParams();
  const bountyId = params.id as string;
  const { address, isConnected } = useAccount();
  const [contributeAmount, setContributeAmount] = useState('');

  // Leggi i dettagli del bounty
  const { data: bounty, isLoading } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getBounty',
    args: [BigInt(bountyId || 0)],
  });

  // Leggi l'indirizzo dell'escrow
  const { data: escrowAddress } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getEscrowAddress',
    args: [BigInt(bountyId || 0)],
  });

  // Leggi le keywords richieste
  const { data: requiredKeywords } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getBountyKeywords',
    args: [BigInt(bountyId || 0)],
  });

  // Contribuzione
  const { data: contributeHash, writeContract: contribute, isPending: isContributing } = useWriteContract();
  const { isLoading: isConfirmingContribute, isSuccess: contributeSuccess } = useWaitForTransactionReceipt({
    hash: contributeHash,
  });

  const handleContribute = () => {
    if (!escrowAddress || !contributeAmount) return;
    
    contribute({
      address: escrowAddress as `0x${string}`,
      abi: BountyEscrowABI,
      functionName: 'contribute',
      value: parseEther(contributeAmount),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3 mb-8"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  const bountyData = bounty as any;
  if (!bountyData) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Bounty Non Trovato</h1>
          <p className="text-gray-400 mb-6">Il bounty #{bountyId} non esiste</p>
          <Link href="/bounties" className="text-blue-400 hover:underline">
            ← Torna alla lista
          </Link>
        </main>
      </div>
    );
  }

  const deadlineDate = new Date(Number(bountyData.deadline) * 1000);
  const isExpired = deadlineDate < new Date();
  const status = Number(bountyData.status);
  const keywordCount = bountyData.hashedKeywords?.length || 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link href="/bounties" className="text-blue-400 hover:underline mb-6 inline-block">
          ← Torna alla lista
        </Link>

        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-sm text-gray-400">Bounty #{bountyId}</span>
              <h1 className="text-3xl font-bold text-white mt-1">
                @{bountyData.domain}
              </h1>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium text-white ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          
          <p className="text-gray-300 mb-6">{bountyData.description}</p>

          {/* Keywords Section */}
          {keywordCount > 0 && (
            <div className="mb-6 p-4 bg-purple-900/30 rounded-lg border border-purple-700">
              <h3 className="text-sm font-semibold text-purple-400 mb-2">
                🔑 Keywords Richieste ({keywordCount})
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                L'email del whistleblower deve contenere tutte queste parole chiave per poter claimare.
              </p>
              <div className="flex flex-wrap gap-2">
                {(requiredKeywords as `0x${string}`[])?.map((hash, index) => (
                  <span
                    key={index}
                    className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-xs font-mono"
                    title={hash}
                  >
                    Hash #{index + 1}: {hash.slice(0, 10)}...
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-gray-400">Ricompensa</span>
              <p className="text-2xl font-bold text-green-400">
                {formatEther(bountyData.totalReward)} ETH
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Deadline</span>
              <p className={`text-lg ${isExpired ? 'text-red-400' : 'text-white'}`}>
                {deadlineDate.toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Creato da</span>
              <p className="text-sm text-gray-300 font-mono truncate">
                {bountyData.creator.slice(0, 6)}...{bountyData.creator.slice(-4)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Escrow</span>
              <p className="text-sm text-gray-300 font-mono truncate">
                {escrowAddress ? `${String(escrowAddress).slice(0, 6)}...${String(escrowAddress).slice(-4)}` : '...'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contribute */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">💰 Contribuisci</h3>
            
            {status === 0 && !isExpired ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    placeholder="0.1 ETH"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                  />
                  <button
                    onClick={handleContribute}
                    disabled={!isConnected || !contributeAmount || isContributing || isConfirmingContribute}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition"
                  >
                    {isContributing || isConfirmingContribute ? '...' : 'Aggiungi'}
                  </button>
                </div>
                {contributeSuccess && (
                  <p className="text-green-400 text-sm">✅ Contributo aggiunto!</p>
                )}
              </>
            ) : (
              <p className="text-gray-400">
                {isExpired ? 'Bounty scaduto' : 'Non è possibile contribuire'}
              </p>
            )}
          </div>

          {/* Submit Proof */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">📧 Sottometti Prova</h3>
            
            {status === 0 && !isExpired ? (
              <>
                <p className="text-sm text-gray-400 mb-4">
                  Per claimare questo bounty devi:
                </p>
                <ul className="text-xs text-gray-400 mb-4 space-y-1">
                  <li>• Avere un'email da @{bountyData.domain}</li>
                  {keywordCount > 0 && (
                    <li>• L'email deve contenere {keywordCount} keyword(s) specifiche</li>
                  )}
                  <li>• Generare una prova ZK valida</li>
                </ul>
                <Link
                  href={`/submit-proof?bountyId=${bountyId}`}
                  className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition"
                >
                  Genera e Sottometti Prova ZK
                </Link>
              </>
            ) : (
              <p className="text-gray-400">
                {status === 1 ? 'Prova già sottomessa, in attesa di claim' :
                 status === 2 ? 'Bounty già reclamato' :
                 isExpired ? 'Bounty scaduto' : 'Non disponibile'}
              </p>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">ℹ️ Informazioni</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Dominio richiesto:</span>
              <span className="ml-2 text-white font-mono">@{bountyData.domain}</span>
            </div>
            <div>
              <span className="text-gray-400">Keywords richieste:</span>
              <span className="ml-2 text-purple-400">{keywordCount}</span>
            </div>
            <div>
              <span className="text-gray-400">Periodo disputa:</span>
              <span className="ml-2 text-white">24 ore</span>
            </div>
            <div>
              <span className="text-gray-400">Creato il:</span>
              <span className="ml-2 text-white">
                {new Date(Number(bountyData.createdAt) * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
