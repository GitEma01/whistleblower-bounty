'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🔐</span>
            <span className="text-xl font-bold text-white">
              Whistleblower Bounty
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-300 hover:text-white transition"
            >
              Home
            </Link>
            <Link 
              href="/bounties" 
              className="text-gray-300 hover:text-white transition"
            >
              Bounties
            </Link>
            <Link 
              href="/create" 
              className="text-gray-300 hover:text-white transition"
            >
              Create Bounty
            </Link>
            <Link 
              href="/submit-proof" 
              className="text-gray-300 hover:text-white transition"
            >
              Submit Proof
            </Link>
            <Link 
              href="/claim" 
              className="text-gray-300 hover:text-white transition"
            >
              Claim Reward
            </Link>
          </nav>

          {/* Wallet Connect */}
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
