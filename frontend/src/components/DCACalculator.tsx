import { useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../utils/api';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'LINK', 'BNB', 'MATIC', 'UNI', 'AAVE'];

type Frequency = 'daily' | 'weekly' | 'monthly';

interface DataPoint {
  date: string;
  invested: number;
  value: number;
  units: number;
}

interface DCAResult {
  points: DataPoint[];
  totalInvested: number;
  totalUnits: number;
  currentValue: number;
  roi: number;
  avgBuyPrice: number;
}

function intervalDays(freq: Frequency): number {
  return freq === 'daily' ? 1 : freq === 'weekly' ? 7 : 30;
}

function fmtDollar(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-brand-400">Value: {fmtDollar(payload[1]?.value || 0)}</p>
      <p className="text-gray-400">Invested: {fmtDollar(payload[0]?.value || 0)}</p>
    </div>
  );
}

export function DCACalculator() {
  const [symbol, setSymbol] = useState('BTC');
  const [amountPerPeriod, setAmountPerPeriod] = useState('100');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [days, setDays] = useState(90);

  const [result, setResult] = useState<DCAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async () => {
    const amount = parseFloat(amountPerPeriod);
    if (isNaN(amount) || amount <= 0) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.getPriceHistory(symbol, days);
      const rawData: { price_usd: number; recorded_at: string }[] = res.data || [];
      if (rawData.length < 2) {
        setError('Not enough price history. Try a longer period or check back later.');
        return;
      }

      // Sort oldest → newest
      const sorted = [...rawData].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );

      const interval = intervalDays(frequency);
      let totalUnits = 0;
      let totalInvested = 0;
      const points: DataPoint[] = [];
      let nextBuyIdx = 0;

      for (let i = 0; i < sorted.length; i++) {
        const row = sorted[i];
        const price = Number(row.price_usd);
        const date = new Date(row.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Buy on interval
        if (i === 0 || i - nextBuyIdx >= interval) {
          const units = amount / price;
          totalUnits += units;
          totalInvested += amount;
          nextBuyIdx = i;
        }

        const currentValue = totalUnits * price;
        points.push({ date, invested: totalInvested, value: currentValue, units: totalUnits });
      }

      // Downsample to max 90 points for chart readability
      const step = Math.ceil(points.length / 90);
      const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);

      const last = points[points.length - 1];
      const avgBuyPrice = totalInvested / totalUnits;
      const roi = totalInvested > 0 ? ((last.value - totalInvested) / totalInvested) * 100 : 0;

      setResult({
        points: sampled,
        totalInvested,
        totalUnits,
        currentValue: last.value,
        roi,
        avgBuyPrice,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, amountPerPeriod, frequency, days]);

  const roiPositive = (result?.roi ?? 0) >= 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Calculator size={18} className="text-brand-400" />
        <h2 className="text-lg font-semibold">DCA Calculator</h2>
      </div>

      {/* Inputs */}
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
            <label className="text-xs text-gray-500">Amount per Period (USD)</label>
            <input
              type="number"
              value={amountPerPeriod}
              onChange={(e) => setAmountPerPeriod(e.target.value)}
              placeholder="100"
              min="1"
              step="any"
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">History</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
          <button
            onClick={calculate}
            disabled={loading}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors"
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {result && (
        <div className="space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Invested', value: fmtDollar(result.totalInvested), color: 'text-white' },
              { label: 'Current Value', value: fmtDollar(result.currentValue), color: roiPositive ? 'text-green-400' : 'text-red-400' },
              {
                label: 'ROI',
                value: (
                  <span className={`flex items-center gap-1 ${roiPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {roiPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {roiPositive ? '+' : ''}{result.roi.toFixed(2)}%
                  </span>
                ),
                color: '',
              },
              { label: 'Avg Buy Price', value: fmtDollar(result.avgBuyPrice), color: 'text-gray-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <div className={`font-semibold text-sm ${color}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-3">Portfolio Value vs. Total Invested</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={result.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dcaInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dcaValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={roiPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={roiPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  fill="url(#dcaInvested)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={roiPositive ? '#10b981' : '#ef4444'}
                  strokeWidth={2}
                  fill="url(#dcaValue)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className="inline-block w-3 h-0.5 bg-indigo-500" /> Invested
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className={`inline-block w-3 h-0.5 ${roiPositive ? 'bg-green-500' : 'bg-red-500'}`} /> Value
              </span>
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Calculator size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">Configure your DCA strategy above</p>
          <p className="text-sm">See how dollar-cost averaging would have performed using real stored price data.</p>
        </div>
      )}
    </div>
  );
}
