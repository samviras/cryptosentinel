import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Price } from '../types';
import { MiniSparkline } from './MiniSparkline';

interface Props {
  prices: Price[];
  onSelectSymbol: (symbol: string) => void;
}

export function PriceTable({ prices, onSelectSymbol }: Props) {
  const formatNum = (n: number) =>
    n >= 1_000_000_000
      ? `$${(n / 1_000_000_000).toFixed(2)}B`
      : n >= 1_000_000
        ? `$${(n / 1_000_000).toFixed(2)}M`
        : `$${n.toLocaleString()}`;

  const changeColor = (val: number) =>
    val > 0 ? 'text-green-400' : val < 0 ? 'text-red-400' : 'text-gray-400';

  const ChangeIcon = ({ val }: { val: number }) =>
    val > 0 ? <TrendingUp size={13} /> : val < 0 ? <TrendingDown size={13} /> : <Minus size={13} />;

  if (prices.length === 0) {
    return (
      <div className="text-center py-10 text-gray-600">
        <p className="font-medium">No price data yet</p>
        <p className="text-sm mt-1">Prices update every 60 seconds.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            <th className="text-left py-3 px-3">#</th>
            <th className="text-left py-3 px-3">Asset</th>
            <th className="text-right py-3 px-3">Price</th>
            <th className="text-right py-3 px-3">24h</th>
            <th className="text-right py-3 px-3">7d</th>
            <th className="text-center py-3 px-3">Trend</th>
            <th className="text-right py-3 px-3">Volume</th>
            <th className="text-right py-3 px-3">Market Cap</th>
            <th className="text-center py-3 px-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p, idx) => (
            <tr
              key={p.symbol}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
              onClick={() => onSelectSymbol(p.symbol)}
            >
              <td className="py-3 px-3 text-gray-600 text-xs">{idx + 1}</td>
              <td className="py-3 px-3 font-semibold">{p.symbol}</td>
              <td className="py-3 px-3 text-right font-mono">
                ${p.price_usd < 1 ? p.price_usd.toFixed(6) : p.price_usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </td>
              <td className={`py-3 px-3 text-right ${changeColor(p.change_24h)}`}>
                <span className="inline-flex items-center gap-1">
                  <ChangeIcon val={p.change_24h} />
                  {Math.abs(p.change_24h).toFixed(2)}%
                </span>
              </td>
              <td className={`py-3 px-3 text-right ${changeColor(p.change_7d || 0)}`}>
                {p.change_7d != null ? `${p.change_7d > 0 ? '+' : ''}${p.change_7d.toFixed(2)}%` : '—'}
              </td>
              <td className="py-3 px-3 text-center">
                <MiniSparkline symbol={p.symbol} change24h={p.change_24h} />
              </td>
              <td className="py-3 px-3 text-right text-gray-300">{formatNum(p.volume_24h)}</td>
              <td className="py-3 px-3 text-right text-gray-300">{formatNum(p.market_cap)}</td>
              <td className="py-3 px-3 text-center">
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectSymbol(p.symbol); }}
                  className="px-3 py-1 text-xs bg-brand-600 hover:bg-brand-700 rounded transition-colors"
                >
                  Analyze
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
