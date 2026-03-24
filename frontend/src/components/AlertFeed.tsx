import { AlertTriangle, ArrowRightLeft, Flame, Vote, TrendingUp } from 'lucide-react';
import type { Alert } from '../types';

interface Props {
  alerts: Alert[];
  onMarkRead: (ids: string[]) => void;
}

const typeIcons: Record<string, typeof AlertTriangle> = {
  arbitrage: ArrowRightLeft,
  liquidation: Flame,
  governance: Vote,
  momentum: TrendingUp,
};

const severityColors: Record<string, string> = {
  low: 'border-l-blue-400 bg-blue-950/20',
  medium: 'border-l-yellow-400 bg-yellow-950/20',
  high: 'border-l-orange-400 bg-orange-950/20',
  critical: 'border-l-red-400 bg-red-950/30',
};

const severityBadge: Record<string, string> = {
  low: 'bg-blue-900 text-blue-300',
  medium: 'bg-yellow-900 text-yellow-300',
  high: 'bg-orange-900 text-orange-300',
  critical: 'bg-red-900 text-red-300',
};

export function AlertFeed({ alerts, onMarkRead }: Props) {
  if (!alerts.length) {
    return (
      <div className="text-center text-gray-500 py-12">
        <AlertTriangle size={32} className="mx-auto mb-3 opacity-50" />
        <p>No alerts yet. Monitoring is active.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = typeIcons[alert.type] || AlertTriangle;
        return (
          <div
            key={alert.id}
            className={`border-l-4 rounded-r-lg p-4 ${severityColors[alert.severity]} ${
              alert.is_read ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <Icon size={18} className="mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{alert.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">{alert.symbol}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{alert.message}</p>
                  <span className="text-xs text-gray-600 mt-1 block">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              {!alert.is_read && (
                <button
                  onClick={() => onMarkRead([alert.id])}
                  className="text-xs text-gray-500 hover:text-gray-300 whitespace-nowrap"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
