import { useState, useCallback } from 'react';
import {
  Shield, RefreshCw, Bell, BarChart3, Key, LogOut,
  Bookmark, Calculator,
} from 'lucide-react';
import { api } from './utils/api';
import { usePolling } from './hooks/useApi';
import { PriceTable } from './components/PriceTable';
import { AlertFeed } from './components/AlertFeed';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PriceChart } from './components/PriceChart';
import { LoginForm } from './components/LoginForm';
import { FearGreedGauge } from './components/FearGreedGauge';
import { PriceAlerts } from './components/PriceAlerts';
import { PortfolioTracker } from './components/PortfolioTracker';
import { MarketOverview } from './components/MarketOverview';
import { TopMovers } from './components/TopMovers';
import { Watchlist } from './components/Watchlist';
import { DCACalculator } from './components/DCACalculator';
import { PublicPortfolio } from './components/PublicPortfolio';
import { SkeletonRow } from './components/SkeletonCard';
import type { Analysis } from './types';

type Tab = 'dashboard' | 'watchlist' | 'dca' | 'analysis' | 'keys';

// ─── Card wrapper ──────────────────────────────────────────────────────────────
function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 shadow-lg p-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── Dashboard grid ─────────────────────────────────────────────────────────
function DashboardGrid({
  priceData,
  pricesLoading,
  alertData,
  onSelectSymbol,
  onMarkRead,
}: {
  priceData: any;
  pricesLoading: boolean;
  alertData: any;
  onSelectSymbol: (s: string) => void;
  onMarkRead: (ids: string[]) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Row 1: Fear & Greed + Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Fear & Greed — compact */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg overflow-hidden">
          <FearGreedGauge compact />
        </div>
        {/* Market Overview spans 2 cols on desktop */}
        <div className="lg:col-span-2">
          <MarketOverview />
        </div>
      </div>

      {/* Row 2: Price table (2 cols) + Top Movers (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-brand-400" />
              <span className="text-sm font-semibold text-gray-300">Live Prices</span>
            </div>
            {pricesLoading && (
              <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="px-2 py-2">
            {pricesLoading && !priceData ? (
              <div className="px-3 divide-y divide-gray-800/50">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            ) : (
              <PriceTable
                prices={priceData?.prices || []}
                onSelectSymbol={onSelectSymbol}
              />
            )}
          </div>
        </Card>

        <TopMovers />
      </div>

      {/* Row 3: Portfolio full width */}
      <Card>
        <PortfolioTracker />
      </Card>

      {/* Row 4: Price Alerts + Alerts Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <PriceAlerts />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-brand-400" />
              <span className="text-sm font-semibold text-gray-300">Alert Feed</span>
            </div>
            {alertData?.alerts?.filter((a: any) => !a.is_read).length > 0 && (
              <span className="text-xs bg-red-900/50 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full">
                {alertData.alerts.filter((a: any) => !a.is_read).length} unread
              </span>
            )}
          </div>
          {!alertData ? (
            <div className="text-center py-8 text-gray-600">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No alerts yet — create alert rules to get started!</p>
            </div>
          ) : alertData.alerts?.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No alerts yet — create alert rules to get started!</p>
            </div>
          ) : (
            <AlertFeed
              alerts={(alertData.alerts || []).slice(0, 5)}
              onMarkRead={onMarkRead}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Analysis tab ────────────────────────────────────────────────────────────
function AnalysisTab({
  analysis,
  loading,
  error,
  onSelect,
  priceData,
}: {
  analysis: Analysis | null;
  loading: boolean;
  error: string | null;
  onSelect: (s: string) => void;
  priceData: any;
}) {
  const symbols = priceData?.prices?.map((p: any) => p.symbol) || [
    'BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'LINK',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-3">
        <Card>
          <p className="text-sm font-semibold text-gray-300 mb-3">Quick Analyze</p>
          <div className="flex flex-wrap gap-2">
            {symbols.map((s: string) => (
              <button
                key={s}
                onClick={() => onSelect(s)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors border border-gray-700"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
        {analysis && (
          <Card>
            <PriceChart symbol={analysis.symbol} />
          </Card>
        )}
      </div>
      <div className="lg:col-span-2">
        <Card className="min-h-[300px]">
          <AnalysisPanel analysis={analysis} loading={loading} error={error} />
        </Card>
      </div>
    </div>
  );
}

// ─── API Keys panel ──────────────────────────────────────────────────────────
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
    <Card>
      <h2 className="text-lg font-semibold mb-4">API Keys</h2>

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

      {createdKey && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-400 mb-1">New API key — copy it now, it won't be shown again.</p>
          <code className="block bg-gray-900 rounded p-3 text-sm font-mono text-green-300 break-all">
            {createdKey}
          </code>
        </div>
      )}

      <div className="space-y-3">
        {keys.map((k: any) => (
          <div key={k.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-4">
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
    </Card>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
function Dashboard() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { data: priceData, loading: pricesLoading } = usePolling(
    () => api.getPrices(),
    60_000,
  );

  const { data: alertData, refetch: refetchAlerts } = usePolling(
    () => api.getAlerts(),
    30_000,
  );

  const handleSelectSymbol = useCallback(async (symbol: string) => {
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
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark },
    { id: 'dca', label: 'DCA Calculator', icon: Calculator },
    { id: 'analysis', label: 'AI Analysis', icon: RefreshCw, badge: unreadCount },
    { id: 'keys', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-brand-500" />
            <h1 className="text-lg font-bold">CryptoSentinel</h1>
            <span className="hidden sm:inline text-xs bg-brand-900/50 text-brand-400 px-2 py-0.5 rounded-full">
              AI Powered
            </span>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="text-xs bg-red-900/60 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full">
                {unreadCount} alert{unreadCount !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* Tab nav */}
        <nav className="flex gap-0.5 mb-5 bg-gray-900/80 rounded-lg p-1 w-fit overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                tab === id
                  ? 'bg-gray-800 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={14} />
              {label}
              {badge !== undefined && badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        {tab === 'dashboard' && (
          <DashboardGrid
            priceData={priceData}
            pricesLoading={pricesLoading}
            alertData={alertData}
            onSelectSymbol={handleSelectSymbol}
            onMarkRead={handleMarkRead}
          />
        )}

        {tab === 'watchlist' && (
          <Card>
            <Watchlist />
          </Card>
        )}

        {tab === 'dca' && (
          <Card>
            <DCACalculator />
          </Card>
        )}

        {tab === 'analysis' && (
          <AnalysisTab
            analysis={analysis}
            loading={analysisLoading}
            error={analysisError}
            onSelect={handleSelectSymbol}
            priceData={priceData}
          />
        )}

        {tab === 'keys' && <ApiKeysPanel />}
      </div>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  // Check for public portfolio share link
  const urlParams = new URLSearchParams(window.location.search);
  const publicToken = urlParams.get('portfolio');
  if (publicToken) {
    return <PublicPortfolio token={publicToken} />;
  }

  const [authed, setAuthed] = useState(!!api.getToken());

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  return <Dashboard />;
}
