'use client';

// ════════════════════════════════════════════════════════════════════════════
// RegWatchPanel - Regulatory updates feed
// ════════════════════════════════════════════════════════════════════════════

import { Card } from '../shared/Card';
import { Badge, BadgeVariant } from '../shared/Badge';
import { StateWrapper } from '../shared/StateWrapper';

export type RegEventStatus = 'new' | 'acknowledged' | 'actioned' | 'dismissed';

export interface RegEvent {
  id: string;
  title: string;
  summary?: string;
  source: string;
  publishedAt: string;
  status: RegEventStatus;
  impact?: 'high' | 'medium' | 'low';
  technicalId?: string;
}

interface RegWatchPanelProps {
  events: RegEvent[];
  loading?: boolean;
  error?: string | null;
  onEventClick?: (eventId: string) => void;
  onRetry?: () => void;
  advancedMode?: boolean;
}

const statusConfig: Record<RegEventStatus, { variant: BadgeVariant; label: string }> = {
  new: { variant: 'error', label: 'Yeni' },
  acknowledged: { variant: 'warning', label: 'Inceleniyor' },
  actioned: { variant: 'success', label: 'Tamamlandi' },
  dismissed: { variant: 'neutral', label: 'Reddedildi' },
};

const impactConfig: Record<string, { variant: BadgeVariant; label: string }> = {
  high: { variant: 'error', label: 'Yuksek Etki' },
  medium: { variant: 'warning', label: 'Orta Etki' },
  low: { variant: 'info', label: 'Dusuk Etki' },
};

export function RegWatchPanel({
  events,
  loading = false,
  error = null,
  onEventClick,
  onRetry,
  advancedMode = false
}: RegWatchPanelProps) {
  const newCount = events.filter(e => e.status === 'new').length;

  return (
    <Card
      title="Mevzuat Takibi"
      headerColor={newCount > 0 ? 'blue' : 'default'}
      headerRight={
        newCount > 0 && <Badge variant="info">{newCount} yeni</Badge>
      }
    >
      <StateWrapper
        loading={loading}
        error={error}
        empty={events.length === 0}
        emptyMessage="Mevzuat guncellemesi yok"
        onRetry={onRetry}
      >
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {events.map((event) => {
            const config = statusConfig[event.status];
            return (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  event.status === 'new'
                    ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {event.title}
                    </p>
                    {event.summary && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {event.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {event.impact && (
                        <Badge variant={impactConfig[event.impact].variant}>
                          {impactConfig[event.impact].label}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {event.publishedAt}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{event.source}</p>
                  </div>
                </div>
                {advancedMode && event.technicalId && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-mono text-gray-400">{event.technicalId}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </StateWrapper>
    </Card>
  );
}

export default RegWatchPanel;
