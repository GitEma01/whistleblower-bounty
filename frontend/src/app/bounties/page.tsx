'use client';

import { Header } from '@/components/Header';
import { BountyCard } from '@/components/BountyCard';
import { useReadContract, useReadContracts } from 'wagmi';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { CONTRACTS } from '@/config/contracts';
import Link from 'next/link';

export default function BountiesPage() {
  const { data: bountyCount } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getBountyCount',
  });

  const bountyIds = bountyCount ? Array.from({ length: Number(bountyCount) }, (_, i) => i) : [];
  
  const { data: bountiesData, isLoading } = useReadContracts({
    contracts: bountyIds.map((id) => ({
      address: CONTRACTS.BOUNTY_FACTORY,
      abi: BountyFactoryABI,
      functionName: 'getBounty',
      args: [BigInt(id)],
    })),
  });

  const bounties = bountiesData
    ?.map((result, index) => {
      if (result.status === 'success' && result.result) {
        const data = result.result as any;
        return {
          id: index,
          domain: data.domain,
          description: data.description,
          totalReward: data.totalReward,
          deadline: data.deadline,
          status: data.status,
          creator: data.creator,
        };
      }
      return null;
    })
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Bounties</h1>
            <p className="text-gray-400 mt-2">
              Esplora tutti i bounties attivi e trova prove da sottomettere
            </p>
          </div>
          <Link
            href="/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            + Crea Bounty
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-gray-400 mt-4">Caricamento bounties...</p>
          </div>
        ) : bounties && bounties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bounties.map((bounty: any) => (
              <BountyCard
                key={bounty.id}
                id={bounty.id}
                domain={bounty.domain}
                description={bounty.description}
                totalReward={bounty.totalReward}
                deadline={bounty.deadline}
                status={bounty.status}
                creator={bounty.creator}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Nessun bounty trovato
            </h3>
            <p className="text-gray-400 mb-6">
              Sii il primo a creare un bounty per whistleblower!
            </p>
            <Link
              href="/create"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Crea il Primo Bounty
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
