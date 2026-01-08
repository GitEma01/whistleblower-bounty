'use client';

import Link from 'next/link';
import { formatEther } from 'viem';

export type BountyStatus = 
  | 'OPEN' 
  | 'PENDING_CLAIM' 
  | 'CLAIMED' 
  | 'EXPIRED' 
  | 'DISPUTED' 
  | 'CANCELLED';

const STATUS_COLORS: Record<BountyStatus, string> = {
  OPEN: 'bg-green-500',
  PENDING_CLAIM: 'bg-yellow-500',
  CLAIMED: 'bg-blue-500',
  EXPIRED: 'bg-gray-500',
  DISPUTED: 'bg-red-500',
  CANCELLED: 'bg-gray-600',
};

const STATUS_LABELS: Record<number, BountyStatus> = {
  0: 'OPEN',
  1: 'PENDING_CLAIM',
  2: 'CLAIMED',
  3: 'EXPIRED',
  4: 'DISPUTED',
  5: 'CANCELLED',
};

interface BountyCardProps {
  id: number;
  domain: string;
  description: string;
  totalReward: bigint;
  deadline: bigint;
  status: number;
  creator: string;
  keywordCount?: number;
}

export function BountyCard({
  id,
  domain,
  description,
  totalReward,
  deadline,
  status,
  creator,
  keywordCount = 0,
}: BountyCardProps) {
  const statusLabel = STATUS_LABELS[status] || 'OPEN';
  const statusColor = STATUS_COLORS[statusLabel];
  const deadlineDate = new Date(Number(deadline) * 1000);
  const isExpired = deadlineDate < new Date();

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-gray-400">Bounty #{id}</span>
          <h3 className="text-lg font-semibold text-white mt-1">
            @{domain}
          </h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
        {description}
      </p>

      {/* Keywords Badge */}
      {keywordCount > 0 && (
        <div className="mb-4">
          <span className="inline-flex items-center bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-xs">
            🔑 {keywordCount} keyword{keywordCount > 1 ? 's' : ''} richieste
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-xs text-gray-400">Reward</span>
          <p className="text-lg font-bold text-green-400">
            {formatEther(totalReward)} ETH
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-400">Deadline</span>
          <p className={`text-sm ${isExpired ? 'text-red-400' : 'text-gray-300'}`}>
            {deadlineDate.toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Creator */}
      <div className="mb-4">
        <span className="text-xs text-gray-400">Created by</span>
        <p className="text-sm text-gray-300 font-mono truncate">
          {creator.slice(0, 6)}...{creator.slice(-4)}
        </p>
      </div>

      {/* Action Button */}
      <Link
        href={`/bounties/${id}`}
        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
      >
        View Details
      </Link>
    </div>
  );
}
