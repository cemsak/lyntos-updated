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

const REGWATCH_ACTIVE_KEY = 'lyntos-regwatch-active';

// Trusted sources for regulatory monitoring
const TRUSTED_SOURCES = [
  { id: 'resmi-gazete', name: 'Resmi Gazete', url: 'https://www.resmigazete.gov.tr', icon: '📜' },
  { id: 'gib', name: 'Gelir Idaresi Baskanligi', url: 'https://www.gib.gov.tr', icon: '🏛️' },
  { id: 'turmob', name: 'TURMOB', url: 'https://www.turmob.org.tr', icon: '📊' },
  { id: 'vdk', name: 'Vergi Denetim Kurulu', url: 'https://www.vdk.gov.tr', icon: '🔍' },
  { id: 'kgk', name: 'KGK', url: 'https://www.kgk.gov.tr', icon: '📋' },
  { id: 'sgk', name: 'SGK', url: 'https://www.sgk.gov.tr', icon: '👥' },
  { id: 'ticaret', name: 'Ticaret Bakanligi', url: 'https://www.ticaret.gov.tr', icon: '🏢' },
  { id: 'hazine', name: 'Hazine ve Maliye', url: 'https://www.hmb.gov.tr', icon: '💰' },
];

// Mock scan results for demo
const MOCK_SCAN_RESULTS = [
  {
    id: 'scan-001',
    title: 'KDV Genel Uygulama Tebligi Degisikligi',
    source: 'Gelir Idaresi Baskanligi',
    date: new Date().toISOString().split('T')[0],
    priority: 'high' as const,
    summary: 'Iade sureleri ve belge gereksinimleri guncellendi',
  },
  {
    id: 'scan-002',
    title: 'Enflasyon Muhasebesi Uygulama Esaslari',
    source: 'TURMOB',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium' as const,
    summary: 'TMS 29 uygulamasina iliskin aciklamalar',
  },
  {
    id: 'scan-003',
    title: 'E-Fatura Zorunluluk Siniri Degisikligi',
    source: 'Resmi Gazete',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    priority: 'high' as const,
    summary: 'Brut satis hasilati siniri 2M TL olarak belirlendi',
  },
];

interface ScanResult {
  id: string;
  title: string;
  source: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  summary: string;
}

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

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(-1);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(REGWATCH_ACTIVE_KEY);
      if (stored === 'true') {
        setLocalActive(true);
      }
      const storedLastScan = localStorage.getItem('lyntos-regwatch-last-scan');
      if (storedLastScan) {
        setLastScanTime(storedLastScan);
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

  const handleScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setCurrentSourceIndex(0);
    setScanResults([]);

    // Simulate scanning each source
    for (let i = 0; i < TRUSTED_SOURCES.length; i++) {
      setCurrentSourceIndex(i);
      setScanProgress(Math.round(((i + 1) / TRUSTED_SOURCES.length) * 100));
      // Random delay between 300-800ms per source
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
    }

    // Complete scan
    setCurrentSourceIndex(-1);
    setScanResults(MOCK_SCAN_RESULTS);
    const now = new Date().toISOString();
    setLastScanTime(now);
    localStorage.setItem('lyntos-regwatch-last-scan', now);
    setIsScanning(false);
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
          // ACTIVE - Show scan UI and results
          <div className="space-y-4">
            {/* Scanning Animation */}
            {isScanning && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-800">Tarama Devam Ediyor</p>
                    <p className="text-xs text-blue-600">
                      {currentSourceIndex >= 0 && currentSourceIndex < TRUSTED_SOURCES.length
                        ? `${TRUSTED_SOURCES[currentSourceIndex].icon} ${TRUSTED_SOURCES[currentSourceIndex].name}`
                        : 'Baslaniyor...'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{scanProgress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Scan Complete - Results */}
            {!isScanning && scanResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-green-600" />
                    {scanResults.length} degisiklik bulundu
                  </p>
                  <Badge variant="success">Tarama Tamamlandi</Badge>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {scanResults.map((result) => (
                    <a
                      key={result.id}
                      href={`/v2/regwatch/${result.id}`}
                      className="block p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{result.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{result.source} • {result.date}</p>
                          <p className="text-xs text-slate-600 mt-1">{result.summary}</p>
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

            {/* Events List (from backend) */}
            {!isScanning && scanResults.length === 0 && data?.events && data.events.length > 0 && (
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
            )}

            {/* No results message */}
            {!isScanning && scanResults.length === 0 && (!data?.events || data.events.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-2">
                Tarama baslatmak icin asagidaki butona tiklayin
              </p>
            )}

            {/* Trusted Sources Toggle */}
            <div className="border-t border-slate-200 pt-3">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center justify-between w-full text-sm text-slate-600 hover:text-slate-900"
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
                      className="flex items-center gap-2 p-2 bg-slate-50 rounded text-xs hover:bg-slate-100 transition-colors"
                    >
                      <span>{source.icon}</span>
                      <span className="flex-1 truncate text-slate-700">{source.name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Last Scan Time */}
            {(lastScanTime || data?.last_scan) && (
              <p className="text-xs text-slate-400 text-center">
                Son tarama: {new Date(lastScanTime || data?.last_scan || '').toLocaleString('tr-TR')}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? 'Taraniyor...' : 'Simdi Tara'}
              </button>
              <button
                onClick={handleStopTracking}
                disabled={isScanning}
                className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
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
