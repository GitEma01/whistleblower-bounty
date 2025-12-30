'use client';

import { Header } from '@/components/Header';
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { CONTRACTS } from '@/config/contracts';
import Link from 'next/link';

export default function CreateBountyPage() {
  const { isConnected } = useAccount();
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [durationDays, setDurationDays] = useState('30');

  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain || !description || !reward) {
      alert('Compila tutti i campi');
      return;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const durationInSeconds = Number(durationDays) * 24 * 60 * 60;
    // Aggiungi 1 ora di margine per compensare differenze tra PC e blockchain
    const safetyMargin = 3600;
    const deadlineTimestamp = nowInSeconds + durationInSeconds + safetyMargin;
    
    console.log('=== DEBUG DEADLINE ===');
    console.log('Now (seconds):', nowInSeconds);
    console.log('Duration days:', durationDays);
    console.log('Duration (seconds):', durationInSeconds);
    console.log('Deadline timestamp:', deadlineTimestamp);
    console.log('Deadline date:', new Date(deadlineTimestamp * 1000).toISOString());
    console.log('====================');

    const deadline = BigInt(deadlineTimestamp);

    writeContract({
      address: CONTRACTS.BOUNTY_FACTORY,
      abi: BountyFactoryABI,
      functionName: 'createBounty',
      args: [domain, description, deadline],
      value: parseEther(reward),
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-8">Crea un Bounty</h1>
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Connetti il tuo Wallet
            </h3>
            <p className="text-gray-400">
              Devi connettere il wallet per creare un bounty
            </p>
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
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Bounty Creato con Successo!
            </h3>
            <p className="text-gray-300 mb-4">
              Il tuo bounty è stato creato e i fondi sono in escrow.
            </p>
            <Link
              href="/bounties"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Vedi Tutti i Bounties
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
        <h1 className="text-3xl font-bold text-white mb-2">Crea un Bounty</h1>
        <p className="text-gray-400 mb-8">
          Crea un bounty per incentivare whistleblower a condividere prove verificabili
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dominio Email *
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="es. enron.com, bigbank.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Il dominio email da cui deve provenire la prova
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrizione *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi che tipo di prove stai cercando..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Ricompensa (ETH) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="0.1"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimo 0.01 ETH. Questi fondi saranno bloccati in escrow.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Durata (giorni)
            </label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">7 giorni</option>
              <option value="14">14 giorni</option>
              <option value="30">30 giorni</option>
              <option value="60">60 giorni</option>
              <option value="90">90 giorni</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                Errore: {error.message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition"
          >
            {isPending ? 'Conferma nel Wallet...' : isConfirming ? 'Creazione in corso...' : 'Crea Bounty'}
          </button>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2">Come funziona</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>I fondi vengono bloccati in uno smart contract escrow</li>
              <li>I whistleblower possono sottomettere prove ZK</li>
              <li>Dopo verifica e periodo di disputa, i fondi vengono rilasciati</li>
              <li>Se scade senza prove valide, puoi richiedere il rimborso</li>
            </ul>
          </div>
        </form>
      </main>
    </div>
  );
}
