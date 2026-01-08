'use client';

import { Header } from '@/components/Header';
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { BountyFactoryABI } from '@/abi/BountyFactory';
import { CONTRACTS, isDomainSupported, SUPPORTED_DOMAINS } from '@/config/contracts';
import Link from 'next/link';

const MAX_KEYWORDS = 5;

export default function CreateBountyPage() {
  const { isConnected } = useAccount();
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Check se il dominio è supportato per ZK
  const domainSupported = domain ? isDomainSupported(domain) : null;

  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    
    const newKeywords = keywordInput
      .split(/[,;\s]+/)
      .map(kw => kw.trim().toLowerCase())
      .filter(kw => kw.length > 0)
      .filter(kw => !keywords.includes(kw));
    
    if (newKeywords.length === 0) {
      setKeywordInput('');
      return;
    }
    
    const totalAfterAdd = keywords.length + newKeywords.length;
    if (totalAfterAdd > MAX_KEYWORDS) {
      alert(`Massimo ${MAX_KEYWORDS} keywords.`);
      return;
    }
    
    setKeywords([...keywords, ...newKeywords]);
    setKeywordInput('');
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain || !description || !reward) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const durationInSeconds = Number(durationDays) * 24 * 60 * 60;
    const safetyMargin = 3600;
    const deadline = BigInt(nowInSeconds + durationInSeconds + safetyMargin);

    writeContract({
      address: CONTRACTS.BOUNTY_FACTORY,
      abi: BountyFactoryABI,
      functionName: 'createBounty',
      args: [domain.toLowerCase(), description, deadline, keywords],
      value: parseEther(reward),
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-white mb-8">Crea un Bounty</h1>
          <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
            <div className="text-5xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-white mb-2">Connetti il tuo Wallet</h3>
          </div>
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-green-900/50 rounded-lg p-8 text-center border border-green-700">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-white mb-2">Bounty Creato!</h3>
            <Link href="/bounties" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg mt-4">
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
      
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Crea un Bounty</h1>
        <p className="text-gray-400 mb-8">Incentiva whistleblower a condividere prove verificabili</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dominio Email *
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value.toLowerCase())}
              placeholder="es. gmail.com, succinct.xyz"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              required
            />
            
            {/* Domain support indicator */}
            {domain && (
              <div className={`mt-2 p-2 rounded ${domainSupported ? 'bg-green-900/30 border border-green-700' : 'bg-yellow-900/30 border border-yellow-700'}`}>
                {domainSupported ? (
                  <p className="text-green-400 text-sm">✅ @{domain} supporta prova ZK reale</p>
                ) : (
                  <p className="text-yellow-400 text-sm">⚠️ @{domain} supporta solo modalità Test</p>
                )}
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              Domini con ZK reale: <span className="text-purple-400">{SUPPORTED_DOMAINS.join(', ')}</span>
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrizione *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi che tipo di prove stai cercando..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500"
              required
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Keywords Richieste (opzionale)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="fraud, confidential, secret"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                disabled={keywords.length >= MAX_KEYWORDS}
              />
              <button
                type="button"
                onClick={addKeyword}
                disabled={keywords.length >= MAX_KEYWORDS || !keywordInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                Aggiungi
              </button>
            </div>
            
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {keywords.map((kw, index) => (
                  <span key={index} className="inline-flex items-center bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-sm">
                    {kw}
                    <button type="button" onClick={() => removeKeyword(index)} className="ml-2 text-purple-400 hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500">{keywords.length}/{MAX_KEYWORDS} keywords</p>
          </div>

          {/* Reward */}
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Durata</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
            >
              <option value="7">7 giorni</option>
              <option value="14">14 giorni</option>
              <option value="30">30 giorni</option>
              <option value="60">60 giorni</option>
              <option value="90">90 giorni</option>
            </select>
          </div>

          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-3">📋 Riepilogo</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-gray-400">Dominio:</span>
              <span className="text-white">@{domain || '...'}</span>
              <span className="text-gray-400">Ricompensa:</span>
              <span className="text-green-400">{reward || '0'} ETH</span>
              <span className="text-gray-400">Keywords:</span>
              <span className="text-purple-400">{keywords.length > 0 ? keywords.join(', ') : 'Nessuna'}</span>
              <span className="text-gray-400">Prova ZK:</span>
              <span className={domainSupported ? 'text-green-400' : 'text-yellow-400'}>
                {domainSupported ? '✅ Reale' : '⚠️ Solo Test'}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error.message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-4 rounded-lg font-semibold"
          >
            {isPending ? 'Conferma nel Wallet...' : isConfirming ? 'Creazione...' : 'Crea Bounty'}
          </button>
        </form>
      </main>
    </div>
  );
}
