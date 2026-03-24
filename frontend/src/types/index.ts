export interface Price {
  symbol: string;
  price_usd: number;
  volume_24h: number;
  market_cap: number;
  change_24h: number;
  change_7d?: number;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'arbitrage' | 'liquidation' | 'governance' | 'momentum' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  symbol: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
}

export interface Analysis {
  symbol: string;
  summary: string;
  sentiment: string;
  signals: Signal[];
  risk_level: string;
  recommendation: string;
  confidence: number;
  generated_at: string;
}

export interface Signal {
  type: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface User {
  id: string;
  email: string;
  company_name?: string;
  tier: string;
}

export interface FearGreedEntry {
  value: string;
  value_classification: string;
  timestamp: string;
  time_until_update?: string;
}

export interface FearGreedResponse {
  current: FearGreedEntry | null;
  history: FearGreedEntry[];
}

export interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  direction: 'above' | 'below';
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface PortfolioHolding {
  id: string;
  user_id: string;
  symbol: string;
  amount: number;
  buy_price: number;
  added_at: string;
  current_price: number | null;
  current_value: number | null;
  pnl: number | null;
  pnl_percent: number | null;
}

export interface PortfolioResponse {
  holdings: PortfolioHolding[];
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_percent: number;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  symbol: string;
  buy_target: number | null;
  sell_target: number | null;
  notes: string | null;
  created_at: string;
  current_price: number | null;
  near_buy_target: boolean | null;
  near_sell_target: boolean | null;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
  count: number;
}

export interface GlobalMarket {
  total_market_cap: number;
  total_volume_24h: number;
  btc_dominance: number;
  eth_dominance: number;
  market_cap_change_24h: number;
  active_cryptocurrencies: number;
}

export interface Mover {
  symbol: string;
  price_usd: number;
  change_24h: number;
}

export interface TopMoversResponse {
  gainers: Mover[];
  losers: Mover[];
}

export interface PublicPortfolioAllocation {
  symbol: string;
  percentage: number;
}

export interface PublicPortfolioResponse {
  allocations: PublicPortfolioAllocation[];
  total_holdings: number;
  performance: string | null;
}
