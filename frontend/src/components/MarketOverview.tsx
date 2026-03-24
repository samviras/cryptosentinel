import { useEffect, useState } from 'react';
import { Globe, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../utils/api';
import type { GlobalMarket } from '../types';
import { SkeletonCard } from './SkeletonCard';

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

export function MarketOverview() {
  const [data, setData] = useState<GlobalMarket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getGlobalMarket()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-brand-400" />
          <span className="text-sm font-semibold text-gray-300">Market Overview</span>
        </div>
        <SkeletonCard lines={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-brand-400" />
          <span className="text-sm font-semibold text-gray-300">Market Overview</span>
        </div>
        <p className="text-red-400 text-xs">{error || 'Failed to load'}</p>
      </div>
    );
  }

  const changeUp = data.market_cap_change_24h >= 0;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-brand-400" />
          <span className="text-sm font-semibold text-gray-300">Market Overview</span>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium ${changeUp ? 'text-green-400' : 'text-red-400'}`}>
          {changeUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {changeUp ? '+' : ''}{data.market_cap_change_24h.toFixed(2)}% 24h
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Total Market Cap</span>
          <span className="text-sm font-semibold">{fmtCap(data.total_market_cap)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">24h Volume</span>
          <span className="text-sm font-semibold">{fmtCap(data.total_volume_24h)}</span>
        </div>

        {/* BTC Dominance */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">BTC Dominance</span>
            <span className="text-sm font-semibold text-amber-400">{data.btc_dominance.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.btc_dominance, 100)}%` }}
            />
          </div>
        </div>

        {/* ETH Dominance */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">ETH Dominance</span>
            <span className="text-sm font-semibold text-indigo-400">{data.eth_dominance.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.eth_dominance, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-gray-800">
          <span className="text-xs text-gray-500">Active Coins</span>
          <span className="text-xs text-gray-400">{data.active_cryptocurrencies.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
