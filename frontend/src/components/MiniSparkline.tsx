import { useState, useEffect } from 'react';
import { api } from '../utils/api';

// Module-level cache: symbol → { prices, fetchedAt }
const cache: Record<string, { prices: number[]; fetchedAt: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface Props {
  symbol: string;
  change24h: number;
  width?: number;
  height?: number;
}

export function MiniSparkline({ symbol, change24h, width = 64, height = 24 }: Props) {
  const [prices, setPrices] = useState<number[]>([]);

  useEffect(() => {
    const now = Date.now();
    const cached = cache[symbol];
    if (cached && now - cached.fetchedAt < CACHE_TTL) {
      setPrices(cached.prices);
      return;
    }

    api.getPriceHistory(symbol, 1).then((res) => {
      const pts = (res.data || []).map((d: any) => Number(d.price_usd)).filter(Boolean);
      if (pts.length > 1) {
        cache[symbol] = { prices: pts, fetchedAt: Date.now() };
        setPrices(pts);
      }
    }).catch(() => {});
  }, [symbol]);

  if (prices.length < 2) {
    // Fallback: simple arrow
    return (
      <span className={`text-xs font-bold ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change24h >= 0 ? '▲' : '▼'}
      </span>
    );
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 2;

  const toX = (i: number) => pad + (i / (prices.length - 1)) * (width - pad * 2);
  const toY = (p: number) => pad + (1 - (p - min) / range) * (height - pad * 2);

  const d = prices
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p).toFixed(1)}`)
    .join(' ');

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? '#10b981' : '#ef4444';

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
