import { useState, useEffect, useCallback } from 'react';
import { Bell, Trash2, CheckCircle, Clock } from 'lucide-react';
import { api } from '../utils/api';
import type { PriceAlert } from '../types';

const SYMBOLS = ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'LINK', 'BNB', 'MATIC'];

export function PriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [symbol, setSymbol] = useState('BTC');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [targetPrice, setTargetPrice] = useState('');

  const fetchAlerts = useCallback(async () => {
    try {
      const result = await api.getPriceAlerts();
      setAlerts(result.alerts);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleCreate = async () => {
    const price = parseFloat(targetPrice);
    if (!targetPrice || isNaN(price) || price <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createPriceAlert(symbol, price, direction);
      setTargetPrice('');
      await fetchAlerts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePriceAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Price Alerts</h2>

      {/* Create form */}
      <div className="bg-gray-900 rounded-xl p-4 mb-6 border border-gray-800">
        <p className="text-sm text-gray-400 mb-3">Alert me when...</p>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Symbol */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Token</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm"
            >
              {SYMBOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Condition</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm"
            >
              <option value="above">goes above</option>
              <option value="below">goes below</option>
            </select>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">Price (USD)</label>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 75000"
              min="0"
              step="any"
              className="bg-gray-800 rounded-lg px-3 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none text-sm w-40"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={submitting || !targetPrice}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors"
          >
            {submitting ? 'Creating...' : 'Set Alert'}
          </button>
        </div>
        {/* Preview */}
        {targetPrice && !isNaN(parseFloat(targetPrice)) && (
          <p className="text-xs text-gray-500 mt-2">
            → Alert me when <span className="text-white font-medium">{symbol}</span> goes{' '}
            <span className={direction === 'above' ? 'text-green-400' : 'text-red-400'}>{direction}</span>{' '}
            <span className="text-white font-medium">${parseFloat(targetPrice).toLocaleString()}</span>
          </p>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {/* Alert list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p>No price alerts yet. Set one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                alert.is_triggered
                  ? 'bg-green-900/10 border-green-800/30'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.is_triggered ? (
                  <CheckCircle size={16} className="text-green-400 shrink-0" />
                ) : (
                  <Clock size={16} className="text-gray-500 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    <span className="text-white">{alert.symbol}</span>{' '}
                    <span className={alert.direction === 'above' ? 'text-green-400' : 'text-red-400'}>
                      {alert.direction}
                    </span>{' '}
                    <span className="text-white">${alert.target_price.toLocaleString()}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {alert.is_triggered
                      ? `Triggered ${alert.triggered_at ? new Date(alert.triggered_at).toLocaleString() : ''}`
                      : `Waiting · Created ${new Date(alert.created_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
