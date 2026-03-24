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
