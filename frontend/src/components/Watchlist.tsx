import { useState, useEffect, useCallback } from 'react';
import { Bookmark, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { api } from '../utils/api';
import type { WatchlistItem } from '../types';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'LINK', 'BNB', 'MATIC', 'UNI', 'AAVE'];

function fmt(n: number | null | undefined, prefix = '$'): string {
  if (n == null) return '—';
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function NearTargetBadge({ label, near }: { label: string; near: boolean | null }) {
  if (near === null) return null;
  return near ? (
    <span className="inline-flex items-center gap-1 text-xs bg-amber-900/40 text-amber-400 border border-amber-700/40 px-1.5 py-0.5 rounded">
      <AlertTriangle size={9} />
      {label} near
    </span>
  ) : null;
}

export function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [symbol, setSymbol] = useState('BTC');
  const [buyTarget, setBuyTarget] = useState('');
  const [sellTarget, setSellTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await api.getWatchlist();
      setItems(res.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const handleAdd = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.addToWatchlist(
        symbol,
        buyTarget ? parseFloat(buyTarget) : undefined,
        sellTarget ? parseFloat(sellTarget) : undefined,
        notes || undefined,
      );
      setBuyTarget('');
      setSellTarget('');
      setNotes('');
      setShowForm(false);
      await fetchWatchlist();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.removeFromWatchlist(id);
      await fetchWatchlist();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Bookmark size={18} className="text-brand-400" />
          <h2 className="text-lg font-semibold">Watchlist</h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Token
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-5">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Token</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm"
              >
                {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Buy Target (USD)</label>
              <input
                type="number"
                value={buyTarget}
                onChange={(e) => setBuyTarget(e.target.value)}
                placeholder="e.g. 50000"
                min="0"
                step="any"
                className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Sell Target (USD)</label>
              <input
                type="number"
                value={sellTarget}
                onChange={(e) => setSellTarget(e.target.value)}
                placeholder="e.g. 80000"
                min="0"
                step="any"
                className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm w-36"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <label className="text-xs text-gray-500">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. DCA target"
                className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors"
            >
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bookmark size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No tokens in watchlist</p>
          <p className="text-sm">Add tokens to track their prices and set buy/sell targets.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="pb-2 text-left">Token</th>
                <th className="pb-2 text-right">Current Price</th>
                <th className="pb-2 text-right">Buy Target</th>
                <th className="pb-2 text-right">Sell Target</th>
                <th className="pb-2 text-left pl-4">Status</th>
                <th className="pb-2 text-left pl-4">Notes</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 font-semibold">{item.symbol}</td>
                  <td className="py-3 text-right font-mono text-gray-300">
                    {item.current_price
                      ? `$${item.current_price < 1 ? item.current_price.toFixed(6) : item.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="py-3 text-right text-gray-400">{fmt(item.buy_target)}</td>
                  <td className="py-3 text-right text-gray-400">{fmt(item.sell_target)}</td>
                  <td className="py-3 pl-4">
                    <div className="flex flex-wrap gap-1">
                      <NearTargetBadge label="Buy" near={item.near_buy_target} />
                      <NearTargetBadge label="Sell" near={item.near_sell_target} />
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-gray-500 text-xs">{item.notes || ''}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
