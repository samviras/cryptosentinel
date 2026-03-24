import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';
import type { FearGreedResponse } from '../types';

function getColor(value: number): string {
  if (value <= 25) return '#ef4444';   // red — Extreme Fear
  if (value <= 45) return '#f97316';   // orange — Fear
  if (value <= 55) return '#eab308';   // yellow — Neutral
  if (value <= 75) return '#84cc16';   // lime — Greed
  return '#22c55e';                    // green — Extreme Greed
}

function getLabel(value: number): string {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

function GaugeMeter({ value }: { value: number }) {
  const color = getColor(value);
  const rotation = -90 + (value / 100) * 180;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 110" className="w-48 h-24">
        {/* Track */}
        <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="#374151" strokeWidth="16" strokeLinecap="round" />
        {/* Colored arc segments */}
        <path d="M 10 100 A 90 90 0 0 1 55 27" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="butt" opacity="0.7" />
        <path d="M 55 27 A 90 90 0 0 1 100 10" fill="none" stroke="#f97316" strokeWidth="16" strokeLinecap="butt" opacity="0.7" />
        <path d="M 100 10 A 90 90 0 0 1 145 27" fill="none" stroke="#eab308" strokeWidth="16" strokeLinecap="butt" opacity="0.7" />
        <path d="M 145 27 A 90 90 0 0 1 190 100" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="butt" opacity="0.7" />
        {/* Needle */}
        <g transform={`rotate(${rotation}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="18" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill={color} />
        </g>
      </svg>
      <div className="text-4xl font-bold" style={{ color }}>{value}</div>
      <div className="text-sm font-medium" style={{ color }}>{getLabel(value)}</div>
    </div>
  );
}



export function FearGreedGauge({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<FearGreedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getFearGreed()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-sm text-center py-8">{error}</p>;
  }

  if (!data?.current) {
    return <p className="text-gray-500 text-center py-8">No data available.</p>;
  }

  const currentValue = parseInt(data.current.value, 10);

  const chartData = [...data.history]
    .reverse()
    .map((entry) => ({
      date: new Date(parseInt(entry.timestamp, 10) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseInt(entry.value, 10),
    }));

  if (compact) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-gray-300">Fear &amp; Greed Index</span>
        </div>
        <div className="flex items-center gap-4">
          <GaugeMeter value={currentValue} />
          <div>
            <p className="text-xs text-gray-500 mt-2">
              {new Date(parseInt(data.current.timestamp, 10) * 1000).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">Fear &amp; Greed Index</h2>
      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
        {/* Gauge */}
        <div className="flex flex-col items-center gap-4">
          <GaugeMeter value={currentValue} />
          <p className="text-xs text-gray-500">
            Updated {new Date(parseInt(data.current.timestamp, 10) * 1000).toLocaleDateString()}
          </p>
          {/* Legend */}
          <div className="flex gap-3 flex-wrap justify-center text-xs">
            {[
              { label: 'Extreme Fear', color: '#ef4444' },
              { label: 'Fear', color: '#f97316' },
              { label: 'Neutral', color: '#eab308' },
              { label: 'Greed', color: '#84cc16' },
              { label: 'Extreme Greed', color: '#22c55e' },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-gray-400">{label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex-1 w-full">
          <p className="text-sm text-gray-400 mb-2">Last 30 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                itemStyle={{ color: '#a5b4fc' }}
                formatter={(v: number) => [`${v} — ${getLabel(v)}`, 'Index']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#fgGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
