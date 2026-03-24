import { useState, useCallback } from 'react';
import { Shield, RefreshCw, Bell, BarChart3, Key, LogOut } from 'lucide-react';
import { api } from './utils/api';
import { usePolling } from './hooks/useApi';
import { PriceTable } from './components/PriceTable';
import { AlertFeed } from './components/AlertFeed';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PriceChart } from './components/PriceChart';
import { LoginForm } from './components/LoginForm';
import type { Analysis } from './types';

type Tab = 'prices' | 'alerts' | 'analysis' | 'keys';

function Dashboard() {
  const [tab, setTab] = useState<Tab>('prices');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Poll prices every 60s
  const { data: priceData, loading: pricesLoading } = usePolling(
    () => api.getPrices(),
    60_000,
  );

  // Poll alerts every 30s
  const { data: alertData, refetch: refetchAlerts } = usePolling(
    () => api.getAlerts(),
    30_000,
  );

  const handleSelectSymbol = useCallback(async (symbol: string) => {
    setSelectedSymbol(symbol);
    setTab('analysis');
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await api.getAnalysis(symbol);
      setAnalysis(result);
    } catch (e: any) {
      setAnalysisError(e.message);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const handleMarkRead = useCallback(async (ids: string[]) => {
    await api.markAlertsRead(ids);
    refetchAlerts();
  }, [refetchAlerts]);

  const handleLogout = () => {
    api.clearToken();
    window.location.reload();
  };

  const unreadCount = alertData?.alerts?.filter((a: any) => !a.is_read).length || 0;

  const tabs: { id: Tab; label: string; icon: typeof Shield; badge?: number }[] = [
    { id: 'prices', label: 'Prices', icon: BarChart3 },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadCount },
    { id: 'analysis', label: 'AI Analysis', icon: RefreshCw },
    { id: 'keys', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-brand-500" />
            <h1 className="text-xl font-bold">CryptoSentinel</h1>
            <span className="text-xs bg-brand-900/50 text-brand-400 px-2 py-0.5 rounded-full">AI Powered</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <nav className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6">
          {tab === 'prices' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Market Overview</h2>
              {pricesLoading && !priceData ? (
                <p className="text-gray-500">Loading prices...</p>
              ) : (
                <>
                  <PriceTable
                    prices={priceData?.prices || []}
                    onSelectSymbol={handleSelectSymbol}
                  />
                  {selectedSymbol && (
                    <div className="mt-6 pt-6 border-t border-gray-800">
                      <PriceChart symbol={selectedSymbol} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'alerts' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Alerts</h2>
                <div className="flex gap-2">
                  {['all', 'arbitrage', 'liquidation', 'momentum', 'governance'].map((t) => (
                    <button
                      key={t}
                      className="text-xs px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <AlertFeed
                alerts={alertData?.alerts || []}
                onMarkRead={handleMarkRead}
              />
            </div>
          )}

          {tab === 'analysis' && (
            <div>
              {!selectedSymbol && (
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-2">Quick Analyze</h2>
                  <div className="flex gap-2 flex-wrap">
                    {['BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'LINK'].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSelectSymbol(s)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <AnalysisPanel
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
              />
            </div>
          )}

          {tab === 'keys' && (
            <ApiKeysPanel />
          )}
        </div>
      </div>
    </div>
  );
}

function ApiKeysPanel() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    api.getApiKeys().then(setKeys).finally(() => setLoading(false));
  });

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    try {
      const result = await api.createApiKey(newKeyName);
      setCreatedKey(result.key);
      setNewKeyName('');
      const updated = await api.getApiKeys();
      setKeys(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">API Keys</h2>

      {/* Create new key */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g., Production)"
          className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
        />
        <button
          onClick={handleCreate}
          className="px-6 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg font-semibold transition-colors"
        >
          Create Key
        </button>
      </div>

      {/* Show newly created key */}
      {createdKey && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-400 mb-1">New API key created! Copy it now — it won't be shown again.</p>
          <code className="block bg-gray-900 rounded p-3 text-sm font-mono text-green-300 break-all">
            {createdKey}
          </code>
        </div>
      )}

      {/* Key list */}
      <div className="space-y-3">
        {keys.map((k: any) => (
          <div key={k.id} className="flex items-center justify-between bg-gray-900 rounded-lg p-4">
            <div>
              <p className="font-medium">{k.name}</p>
              <p className="text-xs text-gray-500">
                Created {new Date(k.created_at).toLocaleDateString()} · Used {k.usage_count || 0} times
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded ${k.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {k.is_active ? 'Active' : 'Revoked'}
              </span>
              {k.is_active && (
                <button
                  onClick={async () => {
                    await api.revokeApiKey(k.id);
                    const updated = await api.getApiKeys();
                    setKeys(updated);
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && keys.length === 0 && (
          <p className="text-gray-500 text-center py-8">No API keys yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!api.getToken());

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return <Dashboard />;
}
