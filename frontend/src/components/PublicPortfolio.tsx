import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Shield, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import { api } from '../utils/api';
import type { PublicPortfolioResponse } from '../types';

const COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#84cc16', '#14b8a6',
];

export function PublicPortfolio({ token }: { token: string }) {
  const [data, setData] = useState<PublicPortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicPortfolio(token)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Shield size={28} className="text-brand-500" />
          <h1 className="text-xl font-bold">CryptoSentinel</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={14} className="text-gray-500" />
            <p className="text-xs text-gray-500">Shared portfolio — allocation only, amounts hidden</p>
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-400 font-medium">Portfolio not found</p>
              <p className="text-gray-500 text-sm mt-1">This link may have expired or been removed.</p>
            </div>
          )}

          {data && !loading && (
            <>
              {data.allocations.length === 0 ? (
                <p className="text-center text-gray-500 py-8">This portfolio has no holdings.</p>
              ) : (
                <>
                  {/* Performance badge */}
                  {data.performance && (
                    <div className="flex justify-center mb-4">
                      <span className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${
                        data.performance.startsWith('+')
                          ? 'bg-green-900/30 text-green-400 border border-green-700/30'
                          : 'bg-red-900/30 text-red-400 border border-red-700/30'
                      }`}>
                        {data.performance.startsWith('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {data.performance} overall
                      </span>
                    </div>
                  )}

                  {/* Pie chart */}
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={data.allocations}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        dataKey="percentage"
                        nameKey="symbol"
                        strokeWidth={0}
                      >
                        {data.allocations.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                        formatter={(v: number) => [`${v}%`, 'Allocation']}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Allocation list */}
                  <div className="mt-4 space-y-2">
                    {data.allocations.map((a, i) => (
                      <div key={a.symbol} className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-sm font-medium flex-1">{a.symbol}</span>
                        <span className="text-sm text-gray-400">{a.percentage}%</span>
                        <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${a.percentage}%`,
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-center text-xs text-gray-600 mt-5">
                    {data.total_holdings} asset{data.total_holdings !== 1 ? 's' : ''} · Powered by CryptoSentinel
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
