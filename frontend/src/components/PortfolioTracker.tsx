import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wallet, Trash2, TrendingUp, TrendingDown, Share2, Copy, Check } from 'lucide-react';
import { api } from '../utils/api';
import type { PortfolioResponse } from '../types';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'LINK', 'BNB', 'MATIC'];

const DONUT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#14b8a6',
];

function fmt(n: number | null | undefined, prefix = '$', decimals = 2): string {
  if (n == null) return '—';
  return `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function PnlBadge({ value, percent }: { value: number | null; percent: number | null }) {
  if (value == null || percent == null) return <span className="text-gray-500 text-sm">—</span>;
  const positive = value >= 0;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {fmt(value)} ({percent >= 0 ? '+' : ''}{percent.toFixed(2)}%)
    </span>
  );
}

export function PortfolioTracker() {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    try {
      const result = await api.getPortfolio();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const handleAdd = async () => {
    const amt = parseFloat(amount);
    const bp = parseFloat(buyPrice);
    if (isNaN(amt) || amt <= 0 || isNaN(bp) || bp <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.addHolding(symbol, amt, bp);
      setAmount('');
      setBuyPrice('');
      await fetchPortfolio();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteHolding(id);
      await fetchPortfolio();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await api.sharePortfolio();
      setShareToken(res.share_token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}${window.location.pathname}?portfolio=${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const donutData = (data?.holdings || [])
    .filter((h) => h.current_value != null && h.current_value > 0)
    .map((h) => ({ name: h.symbol, value: h.current_value! }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Portfolio Tracker</h2>
        {data && data.holdings.length > 0 && (
          <div className="flex items-center gap-2">
            {shareToken ? (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 text-green-400 rounded-lg transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            ) : (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                <Share2 size={12} />
                {sharing ? 'Generating...' : 'Share Portfolio'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add holding form */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
        <p className="text-sm text-gray-400 mb-3">Add a holding</p>
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
            <label className="text-xs text-gray-500">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 0.5"
              min="0"
              step="any"
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm w-32"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Buy Price (USD)</label>
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="e.g. 60000"
              min="0"
              step="any"
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm w-40"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={submitting || !amount || !buyPrice}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors"
          >
            {submitting ? 'Adding...' : 'Add Holding'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {shareToken && (
        <div className="bg-gray-900 border border-green-700/30 rounded-lg p-3 mb-4 flex items-center gap-3">
          <Share2 size={14} className="text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-green-400 font-medium mb-0.5">Portfolio share link generated</p>
            <p className="text-xs text-gray-500 truncate">
              {window.location.origin}{window.location.pathname}?portfolio={shareToken}
            </p>
          </div>
          <button onClick={handleCopyLink} className="text-xs text-green-400 hover:text-green-300 flex-shrink-0">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : !data || data.holdings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Wallet size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No holdings yet</p>
          <p className="text-sm">Add your first position above to track P&L.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Value', value: fmt(data.total_value) },
              { label: 'Total Cost', value: fmt(data.total_cost) },
              {
                label: 'Total P&L',
                value: (
                  <PnlBadge value={data.total_pnl} percent={data.total_pnl_percent} />
                ),
              },
              {
                label: 'Holdings',
                value: <span className="text-sm font-medium text-white">{data.holdings.length}</span>,
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <div className="font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Holdings table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="pb-2 text-left">Token</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2 text-right">Buy Price</th>
                    <th className="pb-2 text-right">Current Price</th>
                    <th className="pb-2 text-right">Value</th>
                    <th className="pb-2 text-right">P&L</th>
                    <th className="pb-2 text-right">P&L%</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {data.holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-800/20 transition-colors">
                      <td className="py-3 font-medium">{h.symbol}</td>
                      <td className="py-3 text-right text-gray-300">{h.amount}</td>
                      <td className="py-3 text-right text-gray-300">{fmt(h.buy_price)}</td>
                      <td className="py-3 text-right text-gray-300">{fmt(h.current_price)}</td>
                      <td className="py-3 text-right text-gray-300">{fmt(h.current_value)}</td>
                      <td className="py-3 text-right">
                        {h.pnl != null ? (
                          <span className={h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {fmt(h.pnl)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        {h.pnl_percent != null ? (
                          <span className={h.pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {h.pnl_percent >= 0 ? '+' : ''}{h.pnl_percent.toFixed(2)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDelete(h.id)}
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

            {/* Donut chart */}
            {donutData.length > 0 && (
              <div className="w-full lg:w-64 flex-shrink-0">
                <p className="text-xs text-gray-500 mb-2 text-center">Allocation</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Value']}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
