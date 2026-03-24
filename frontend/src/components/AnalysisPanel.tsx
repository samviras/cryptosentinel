import { Brain, Loader2, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Analysis } from '../types';

interface Props {
  analysis: Analysis | null;
  loading: boolean;
  error: string | null;
}

const sentimentColors: Record<string, string> = {
  bullish: 'text-green-400',
  bearish: 'text-red-400',
  neutral: 'text-gray-400',
  mixed: 'text-yellow-400',
};

const riskColors: Record<string, string> = {
  low: 'text-green-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  extreme: 'text-red-400',
};

export function AnalysisPanel({ analysis, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-brand-500" size={32} />
        <span className="ml-3 text-gray-400">Claude Haiku analyzing market data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-400">
        <AlertTriangle size={32} className="mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Brain size={40} className="mx-auto mb-3 opacity-40" />
        <p>Select an asset to run AI analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Brain size={20} className="text-brand-500" />
          {analysis.symbol} Analysis
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className={sentimentColors[analysis.sentiment] || 'text-gray-400'}>
            {analysis.sentiment?.toUpperCase()}
          </span>
          <span className="text-gray-600">|</span>
          <span className={riskColors[analysis.risk_level] || 'text-gray-400'}>
            Risk: {analysis.risk_level}
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            Confidence: {(analysis.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <p className="text-gray-300 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Recommendation */}
      <div className="bg-brand-900/20 border border-brand-700/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-brand-400 mb-1 flex items-center gap-1">
          <Shield size={14} />
          Recommendation
        </h4>
        <p className="text-gray-200">{analysis.recommendation}</p>
      </div>

      {/* Signals */}
      {analysis.signals && analysis.signals.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-1">
            <TrendingUp size={14} />
            Signals
          </h4>
          <div className="space-y-2">
            {analysis.signals.map((signal, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-900/30 rounded p-3">
                <span className={`text-xs px-2 py-0.5 rounded-full mt-0.5 ${
                  signal.strength === 'strong' ? 'bg-green-900 text-green-300' :
                  signal.strength === 'moderate' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {signal.strength}
                </span>
                <div>
                  <span className="text-xs text-gray-500 uppercase">{signal.type}</span>
                  <p className="text-sm text-gray-300">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        Generated {new Date(analysis.generated_at).toLocaleString()} · Powered by Claude Haiku
      </p>
    </div>
  );
}
