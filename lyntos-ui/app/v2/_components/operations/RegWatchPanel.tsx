'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';

const REGWATCH_ACTIVE_KEY = 'lyntos-regwatch-active';

interface RegWatchEvent {
  id: string;
  title: string;
  source: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  impact?: string;
}

interface RegWatchResult {
  is_active: boolean;
  pending_count: number;
  last_scan?: string;
  events: RegWatchEvent[];
  stats?: {
    last_7_days: number;
    last_30_days: number;
  };
}

function normalizeRegWatch(raw: unknown): PanelEnvelope<RegWatchResult> {
  return normalizeToEnvelope<RegWatchResult>(raw, (r) => {
    const obj = r as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;

    const isActive = data?.is_active === true || data?.status === 'ACTIVE' || data?.active === true;
    const pendingCount = typeof data?.pending_count === 'number' ? data.pending_count : 0;

    const eventsRaw = data?.events || data?.pending || data?.items || [];
    const events: RegWatchEvent[] = Array.isArray(eventsRaw)
      ? eventsRaw.slice(0, 5).map((evt: Record<string, unknown>, idx: number) => ({
          id: String(evt.id || evt.event_id || `evt-${idx}`),
          title: String(evt.title || evt.description || evt.name || 'Mevzuat degisikligi'),
          source: String(evt.source || evt.kaynak || 'Resmi Gazete'),
          date: String(evt.date || evt.tarih || evt.published_at || new Date().toISOString()),
          status: (evt.status || 'pending') as RegWatchEvent['status'],
          impact: evt.impact ? String(evt.impact) : undefined,
        }))
      : [];

    const stats = data?.statistics || data?.stats;

    return {
      is_active: isActive,
      pending_count: pendingCount,
      last_scan: data?.last_scan ? String(data.last_scan) : undefined,
      events,
      stats: stats ? {
        last_7_days: typeof (stats as Record<string, unknown>).last_7_days === 'number'
          ? (stats as Record<string, unknown>).last_7_days as number : 0,
        last_30_days: typeof (stats as Record<string, unknown>).last_30_days === 'number'
          ? (stats as Record<string, unknown>).last_30_days as number : 0,
      } : undefined,
    };
  });
}

export function RegWatchPanel() {
  const envelope = useFailSoftFetch<RegWatchResult>(ENDPOINTS.REGWATCH_STATUS, normalizeRegWatch);
  const { status, reason_tr, data } = envelope;

  // Local state for activation (persisted to localStorage)
  const [localActive, setLocalActive] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(REGWATCH_ACTIVE_KEY);
      if (stored === 'true') {
        setLocalActive(true);
      }
    }
  }, []);

  // Determine effective active state (local override or backend)
  const isActive = localActive === true || data?.is_active === true;

  const handleStartTracking = async () => {
    setIsStarting(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLocalActive(true);
    localStorage.setItem(REGWATCH_ACTIVE_KEY, 'true');
    setIsStarting(false);
  };

  const handleStopTracking = () => {
    setLocalActive(false);
    localStorage.removeItem(REGWATCH_ACTIVE_KEY);
  };

  return (
    <Card
      title="RegWatch Radar"
      subtitle={isActive ? 'Mevzuat takibi aktif' : 'Takip baslatilmadi'}
      headerAction={
        isActive ? (
          <Badge variant="success">AKTIF</Badge>
        ) : (
          <Badge variant="warning">PASIF</Badge>
        )
      }
    >
      <PanelState status={status} reason_tr={reason_tr}>
        {!isActive ? (
          // NOT ACTIVE - Single CTA
          <div className="text-center py-6">
            <span className="text-4xl mb-3 block">📡</span>
            <p className="text-sm text-slate-600 mb-4">
              Mevzuat degisikliklerini otomatik takip etmek icin RegWatch'i baslatin.
            </p>
            <button
              onClick={handleStartTracking}
              disabled={isStarting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? 'Baslatiliyor...' : 'Takibi Baslat'}
            </button>
          </div>
        ) : (
          // ACTIVE - Show stats and events
          <div className="space-y-4">
            {/* Stats Row */}
            {data?.stats && (
              <div className="flex gap-4">
                <div className="flex-1 text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{data.stats.last_7_days}</p>
                  <p className="text-xs text-slate-500">Son 7 gun</p>
                </div>
                <div className="flex-1 text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{data.stats.last_30_days}</p>
                  <p className="text-xs text-slate-500">Son 30 gun</p>
                </div>
                <div className="flex-1 text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{data.pending_count}</p>
                  <p className="text-xs text-slate-500">Bekleyen</p>
                </div>
              </div>
            )}

            {/* Events List */}
            {data?.events && data.events.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {data.events.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{evt.title}</p>
                      <p className="text-xs text-slate-500">{evt.source} • {evt.date}</p>
                    </div>
                    <Badge variant={evt.status === 'pending' ? 'warning' : evt.status === 'approved' ? 'success' : 'error'}>
                      {evt.status === 'pending' ? 'Bekliyor' : evt.status === 'approved' ? 'Onayli' : 'Red'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-2">Henuz olay yok</p>
            )}

            {/* Last Scan */}
            {data?.last_scan && (
              <p className="text-xs text-slate-400 text-center">
                Son tarama: {new Date(data.last_scan).toLocaleString('tr-TR')}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleStartTracking}
                disabled={isStarting}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {isStarting ? 'Taraniyor...' : 'Simdi Tara'}
              </button>
              <button
                onClick={handleStopTracking}
                className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Durdur
              </button>
            </div>
          </div>
        )}
      </PanelState>
    </Card>
  );
}
