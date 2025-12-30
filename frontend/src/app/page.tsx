'use client';

import { Header } from '@/components/Header';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { CONTRACTS } from '@/config/contracts';
import { formatEther } from 'viem';

export default function Home() {
  // Leggi statistiche dal contratto
  const { data: stats } = useReadContract({
    address: CONTRACTS.BOUNTY_FACTORY,
    abi: BountyFactoryABI,
    functionName: 'getStats',
  });

  const totalBounties = stats?.[0] || 0n;
  const activeBounties = stats?.[1] || 0n;
  const totalValueLocked = stats?.[2] || 0n;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            🔐 Whistleblower Bounty
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Una piattaforma decentralizzata per ricompensare whistleblower 
            con prove crittografiche zero-knowledge. Proteggi la tua identità 
            mentre esponi la verità.
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link
              href="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              Crea un Bounty
            </Link>
            <Link
              href="/bounties"
              className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold transition"
            >
              Esplora Bounties
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
            <p className="text-4xl font-bold text-white mb-2">
              {totalBounties.toString()}
            </p>
            <p className="text-gray-400">Total Bounties</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
            <p className="text-4xl font-bold text-green-400 mb-2">
              {activeBounties.toString()}
            </p>
            <p className="text-gray-400">Active Bounties</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center border border-gray-700">
            <p className="text-4xl font-bold text-blue-400 mb-2">
              {formatEther(totalValueLocked)} ETH
            </p>
            <p className="text-gray-400">Total Value Locked</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Come Funziona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                1. Crea Bounty
              </h3>
              <p className="text-gray-400 text-sm">
                Un giornalista o investigatore crea un bounty specificando 
                il dominio email e la ricompensa.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                2. Email Proof
              </h3>
              <p className="text-gray-400 text-sm">
                Il whistleblower genera una prova ZK dalla sua email 
                senza rivelare il contenuto completo.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                3. Verifica On-Chain
              </h3>
              <p className="text-gray-400 text-sm">
                Lo smart contract verifica matematicamente la prova 
                senza accedere all&apos;email originale.
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">💰</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                4. Claim Reward
              </h3>
              <p className="text-gray-400 text-sm">
                Dopo il periodo di disputa, il whistleblower 
                reclama la ricompensa in modo anonimo.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Privacy Garantita
            </h3>
            <p className="text-gray-400">
              Le prove ZK nascondono l&apos;identità del whistleblower 
              e i dettagli sensibili dell&apos;email.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">⛓️</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Trustless & Decentralizzato
            </h3>
            <p className="text-gray-400">
              Nessun intermediario. I fondi sono gestiti da smart contract 
              immutabili su blockchain.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Crittograficamente Sicuro
            </h3>
            <p className="text-gray-400">
              Le prove si basano su firme DKIM verificabili, 
              garantendo autenticità delle email.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-400">
            Built with ZK Email SDK • Base Sepolia Testnet • 
            Progetto Esame Blockchain 2025
          </p>
        </div>
      </footer>
    </div>
  );
}
