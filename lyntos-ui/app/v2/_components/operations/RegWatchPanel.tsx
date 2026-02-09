'use client';
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Radio, CheckCircle2 } from 'lucide-react';
import { Card } from '../shared/Card';
import { Badge } from '../shared/Badge';
import { PanelState } from '../shared/PanelState';
import { useFailSoftFetch } from '../hooks/useFailSoftFetch';
import { ENDPOINTS } from '../contracts/endpoints';
import { normalizeToEnvelope } from '../contracts/map';
import type { PanelEnvelope } from '../contracts/envelope';
import { useRegWatchScan, TRUSTED_SOURCES, type ScanResult } from './useRegWatchScan';

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

  // Use the RegWatch scan hook for real API integration
  const {
    scanResults,
    isScanning,
    scanProgress,
    currentSourceIndex,
    lastScanTime: hookLastScanTime,
    triggerScan,
  } = useRegWatchScan();

  // Local state for activation (persisted to localStorage)
  const [localActive, setLocalActive] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showSources, setShowSources] = useState(false);

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

  // Use hook's last scan time or backend's last_check
  const lastScanTime = hookLastScanTime || data?.last_scan;

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

  const handleScan = () => {
    triggerScan();
  };

  return (
    <Card
      title="Mevzuat Radarı"
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
          <div className="py-4">
            <div className="text-center mb-4">
              <span className="text-3xl mb-2 block">📡</span>
              <p className="text-sm text-[#5A5A5A]">
                Mevzuat değişikliklerini otomatik takip edin
              </p>
            </div>

            {/* Preview Section */}
            <div className="mb-4 p-3 bg-[#F5F6F8] rounded-lg">
              <p className="text-xs font-medium text-[#969696] mb-2">Takip Edilecek Kaynaklar</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#B4B4B4] rounded-full"></span>
                  <span className="text-[#969696]">GİB - Vergi Mevzuatı</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#B4B4B4] rounded-full"></span>
                  <span className="text-[#969696]">Resmi Gazete - Tebliğler</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#B4B4B4] rounded-full"></span>
                  <span className="text-[#969696]">SGK - Genelgeler</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#B4B4B4] rounded-full"></span>
                  <span className="text-[#969696]">TÜRMOB - Duyurular</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleStartTracking}
                disabled={isStarting}
                className="px-4 py-2 bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? 'Başlatılıyor...' : 'Takibi Başlat'}
              </button>
            </div>
          </div>
        ) : (
          // ACTIVE - Show scan UI and results
          <div className="space-y-4">
            {/* Scanning Animation */}
            {isScanning && (
              <div className="bg-[#E6F9FF] border border-[#ABEBFF] rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Radio className="w-5 h-5 text-[#0049AA] animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#00287F]">Tarama Devam Ediyor</p>
                    <p className="text-xs text-[#0049AA]">
                      {currentSourceIndex >= 0 && currentSourceIndex < TRUSTED_SOURCES.length
                        ? `${TRUSTED_SOURCES[currentSourceIndex].icon} ${TRUSTED_SOURCES[currentSourceIndex].name}`
                        : 'Baslaniyor...'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#0049AA]">{scanProgress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-[#ABEBFF] rounded-full h-2">
                  <div
                    className="bg-[#0049AA] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scan Complete - Results */}
            {!isScanning && scanResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#5A5A5A]">
                    <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-[#00804D]" />
                    {scanResults.length} degisiklik bulundu
                  </p>
                  <Badge variant="success">Tarama Tamamlandi</Badge>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {scanResults.map((result) => (
                    <a
                      key={result.id}
                      href={result.url || `/v2/regwatch/${result.id}`}
                      target={result.url?.startsWith('http') ? '_blank' : undefined}
                      rel={result.url?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="block p-3 bg-[#F5F6F8] rounded-lg border border-[#E5E5E5] hover:border-[#5ED6FF] hover:bg-[#E6F9FF]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#2E2E2E]">{result.title}</p>
                          <p className="text-xs text-[#969696] mt-0.5">{result.source} • {result.date}</p>
                          <p className="text-xs text-[#5A5A5A] mt-1">{result.summary}</p>
                        </div>
                        <Badge variant={result.priority === 'high' ? 'error' : result.priority === 'medium' ? 'warning' : 'default'}>
                          {result.priority === 'high' ? 'Yuksek' : result.priority === 'medium' ? 'Orta' : 'Dusuk'}
                        </Badge>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Row (from backend) */}
            {!isScanning && scanResults.length === 0 && data?.stats && (
              <div className="flex gap-4">
                <div className="flex-1 text-center p-3 bg-[#F5F6F8] rounded-lg">
                  <p className="text-2xl font-bold text-[#2E2E2E]">{data.stats.last_7_days}</p>
                  <p className="text-xs text-[#969696]">Son 7 gun</p>
                </div>
                <div className="flex-1 text-center p-3 bg-[#F5F6F8] rounded-lg">
                  <p className="text-2xl font-bold text-[#2E2E2E]">{data.stats.last_30_days}</p>
                  <p className="text-xs text-[#969696]">Son 30 gun</p>
                </div>
                <div className="flex-1 text-center p-3 bg-[#FFFBEB] rounded-lg">
                  <p className="text-2xl font-bold text-[#FA841E]">{data.pending_count}</p>
                  <p className="text-xs text-[#969696]">Bekleyen</p>
                </div>
              </div>
            )}

            {/* Events List (from backend) */}
            {!isScanning && scanResults.length === 0 && data?.events && data.events.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {data.events.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2 bg-[#F5F6F8] rounded border border-[#E5E5E5]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#2E2E2E] truncate">{evt.title}</p>
                      <p className="text-xs text-[#969696]">{evt.source} • {evt.date}</p>
                    </div>
                    <Badge variant={evt.status === 'pending' ? 'warning' : evt.status === 'approved' ? 'success' : 'error'}>
                      {evt.status === 'pending' ? 'Bekliyor' : evt.status === 'approved' ? 'Onayli' : 'Red'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* No results message */}
            {!isScanning && scanResults.length === 0 && (!data?.events || data.events.length === 0) && (
              <p className="text-sm text-[#969696] text-center py-2">
                Tarama baslatmak icin asagidaki butona tiklayin
              </p>
            )}

            {/* Trusted Sources Toggle */}
            <div className="border-t border-[#E5E5E5] pt-3">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center justify-between w-full text-sm text-[#5A5A5A] hover:text-[#2E2E2E]"
              >
                <span>Guvenilir Kaynaklar ({TRUSTED_SOURCES.length})</span>
                {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showSources && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {TRUSTED_SOURCES.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-[#F5F6F8] rounded text-xs hover:bg-[#F5F6F8] transition-colors"
                    >
                      <span>{source.icon}</span>
                      <span className="flex-1 truncate text-[#5A5A5A]">{source.name}</span>
                      <ExternalLink className="w-3 h-3 text-[#969696]" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Last Scan Time */}
            {(lastScanTime || data?.last_scan) && (
              <p className="text-xs text-[#969696] text-center">
                Son tarama: {new Date(lastScanTime || data?.last_scan || '').toLocaleString('tr-TR')}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="flex-1 px-3 py-2 text-sm bg-[#0049AA] text-white rounded-lg hover:bg-[#0049AA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? 'Taraniyor...' : 'Simdi Tara'}
              </button>
              <button
                onClick={handleStopTracking}
                disabled={isScanning}
                className="px-3 py-2 text-sm text-[#BF192B] border border-[#FFC7C9] rounded-lg hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
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
