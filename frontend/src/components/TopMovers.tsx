import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { api } from '../utils/api';
import type { TopMoversResponse } from '../types';
import { SkeletonCard } from './SkeletonCard';

function MoverRow({ symbol, price_usd, change_24h, positive }: {
  symbol: string;
  price_usd: number;
  change_24h: number;
  positive: boolean;
}) {
  const fmtPrice = (p: number) =>
    p < 1 ? `$${p.toFixed(4)}` : `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${positive ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm font-medium">{symbol}</span>
      </div>
      <div className="text-right">
        <div className="text-xs text-gray-400">{fmtPrice(price_usd)}</div>
        <div className={`text-xs font-semibold flex items-center gap-0.5 justify-end ${positive ? 'text-green-400' : 'text-red-400'}`}>
          {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {positive ? '+' : ''}{change_24h.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function TopMovers() {
  const [data, setData] = useState<TopMoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTopMovers()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-lg h-full">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-brand-400" />
        <span className="text-sm font-semibold text-gray-300">Top Movers</span>
        <span className="text-xs text-gray-600 ml-auto">24h</span>
      </div>

      {loading ? (
        <SkeletonCard lines={6} />
      ) : error ? (
        <p className="text-red-400 text-xs">{error}</p>
      ) : !data || (data.gainers.length === 0 && data.losers.length === 0) ? (
        <p className="text-gray-500 text-xs text-center py-4">No price data yet</p>
      ) : (
        <div className="space-y-3">
          {data.gainers.length > 0 && (
            <div>
              <p className="text-xs text-green-500 font-semibold mb-1 uppercase tracking-wide">Gainers</p>
              <div className="divide-y divide-gray-800/50">
                {data.gainers.map((m) => (
                  <MoverRow key={m.symbol} {...m} positive />
                ))}
              </div>
            </div>
          )}
          {data.losers.length > 0 && (
            <div>
              <p className="text-xs text-red-500 font-semibold mb-1 uppercase tracking-wide">Losers</p>
              <div className="divide-y divide-gray-800/50">
                {data.losers.map((m) => (
                  <MoverRow key={m.symbol} {...m} positive={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
