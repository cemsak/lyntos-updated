'use client';

/**
 * LYNTOS RegWatch Scan Hook
 * Sprint MOCK-006 - Mock data removed, uses only API data
 *
 * Fetches regulatory events from backend - no mock fallback
 */
import { useState, useCallback, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

// Trusted sources for scanning animation
export const TRUSTED_SOURCES = [
  { id: 'resmi-gazete', name: 'Resmi Gazete', url: 'https://www.resmigazete.gov.tr', icon: '📜' },
  { id: 'gib', name: 'Gelir Idaresi Baskanligi', url: 'https://www.gib.gov.tr', icon: '🏛️' },
  { id: 'turmob', name: 'TURMOB', url: 'https://www.turmob.org.tr', icon: '📊' },
  { id: 'vdk', name: 'Vergi Denetim Kurulu', url: 'https://www.vdk.gov.tr', icon: '🔍' },
  { id: 'kgk', name: 'KGK', url: 'https://www.kgk.gov.tr', icon: '📋' },
  { id: 'sgk', name: 'SGK', url: 'https://www.sgk.gov.tr', icon: '👥' },
  { id: 'ticaret', name: 'Ticaret Bakanligi', url: 'https://www.ticaret.gov.tr', icon: '🏢' },
  { id: 'hazine', name: 'Hazine ve Maliye', url: 'https://www.hmb.gov.tr', icon: '💰' },
];

export interface ScanResult {
  id: string;
  title: string;
  source: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  summary: string;
  url?: string;
}

interface ApiEvent {
  id: number | string;
  event_type?: string;
  source: string;
  title: string;
  canonical_url?: string;
  published_date?: string;
  impact_rules?: string[];
  detected_at?: string;
  status?: string;
}

interface ApiStatusResponse {
  data?: {
    items?: ApiEvent[];
    pending_count?: number;
    status?: string;
    last_check?: string;
  };
}

interface ApiPendingResponse {
  data?: {
    pending_events?: ApiEvent[];
    total?: number;
  };
}

interface UseRegWatchScanResult {
  scanResults: ScanResult[];
  isScanning: boolean;
  scanProgress: number;
  currentSourceIndex: number;
  lastScanTime: string | null;
  error: string | null;
  triggerScan: () => Promise<void>;
  clearResults: () => void;
}

// Map source ID to display name
function mapSourceToDisplayName(source: string): string {
  const sourceMap: Record<string, string> = {
    'gib': 'Gelir Idaresi Baskanligi',
    'resmigazete': 'Resmi Gazete',
    'turmob': 'TURMOB',
    'sgk': 'SGK',
    'vdk': 'Vergi Denetim Kurulu',
    'kgk': 'KGK',
    'ticaret': 'Ticaret Bakanligi',
    'hazine': 'Hazine ve Maliye',
  };
  return sourceMap[source.toLowerCase()] || source;
}

// Determine priority based on event type and impact rules
function determinePriority(event: ApiEvent): 'high' | 'medium' | 'low' {
  // Amendment events or those with many impact rules are high priority
  if (event.event_type === 'amendment') return 'high';
  if (event.impact_rules && event.impact_rules.length > 3) return 'high';
  if (event.impact_rules && event.impact_rules.length > 1) return 'medium';
  return 'low';
}

// Generate summary from impact rules
function generateSummary(event: ApiEvent): string {
  if (event.impact_rules && event.impact_rules.length > 0) {
    const rules = event.impact_rules.slice(0, 3).join(', ');
    return `Etkilenen kurallar: ${rules}${event.impact_rules.length > 3 ? '...' : ''}`;
  }
  return event.event_type === 'amendment' ? 'Mevzuat degisikligi' : 'Yeni duzenleme';
}

// Map API event to ScanResult
function mapApiEventToScanResult(event: ApiEvent): ScanResult {
  return {
    id: String(event.id),
    title: event.title,
    source: mapSourceToDisplayName(event.source),
    date: event.published_date || new Date().toISOString().split('T')[0],
    priority: determinePriority(event),
    summary: generateSummary(event),
    url: event.canonical_url || `/v2/regwatch/${event.id}`,
  };
}

export function useRegWatchScan(): UseRegWatchScanResult {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(-1);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const triggerScan = useCallback(async () => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsScanning(true);
    setScanProgress(0);
    setCurrentSourceIndex(0);
    setScanResults([]);
    setError(null);

    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('lyntos_token')
        : null;
      if (!token) {
        setError('Oturum bulunamadi. Lutfen giris yapin.');
        setIsScanning(false);
        return;
      }

      // Animate scanning through sources (visual feedback)
      for (let i = 0; i < TRUSTED_SOURCES.length; i++) {
        if (controller.signal.aborted) return;
        setCurrentSourceIndex(i);
        setScanProgress(Math.round(((i + 1) / TRUSTED_SOURCES.length) * 90)); // Up to 90%
        await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      }

      // Try to trigger actual scrape (may fail for non-admin)
      try {
        await fetch(`${API_BASE}/api/v1/regwatch/scrape`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });
      } catch {
        // Scrape endpoint requires admin - this is expected to fail for regular users
        console.info('[useRegWatchScan] Scrape endpoint requires admin, fetching cached results');
      }

      // Fetch latest events from status endpoint (always works)
      const statusResponse = await fetch(`${API_BASE}/api/v1/regwatch/status`, {
        signal: controller.signal,
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      if (controller.signal.aborted) return;
      setScanProgress(95);

      if (!statusResponse.ok) {
        throw new Error(`HTTP ${statusResponse.status}`);
      }

      const statusData: ApiStatusResponse = await statusResponse.json();
      const items = statusData.data?.items || [];

      if (items.length > 0) {
        // Map API events to ScanResult format
        const results = items.slice(0, 10).map(mapApiEventToScanResult);
        setScanResults(results);
        setError(null);
      } else {
        // No items from API, try pending endpoint
        const pendingResponse = await fetch(`${API_BASE}/api/v1/regwatch/pending`, {
          signal: controller.signal,
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
          },
        });

        if (pendingResponse.ok) {
          const pendingData: ApiPendingResponse = await pendingResponse.json();
          const pendingEvents = pendingData.data?.pending_events || [];
          if (pendingEvents.length > 0) {
            const results = pendingEvents.slice(0, 10).map(mapApiEventToScanResult);
            setScanResults(results);
            setError(null);
          } else {
            setScanResults([]);
          }
        } else {
          setScanResults([]);
        }
      }

      // Update last scan time
      const now = new Date().toISOString();
      setLastScanTime(now);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lyntos-regwatch-last-scan', now);
      }

    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }

      console.error('[useRegWatchScan] Fetch failed:', err);
      setScanResults([]);
      setError('Mevzuat taramasi yapilamadi');

      const now = new Date().toISOString();
      setLastScanTime(now);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lyntos-regwatch-last-scan', now);
      }
    } finally {
      setScanProgress(100);
      setCurrentSourceIndex(-1);
      setIsScanning(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setScanResults([]);
    setError(null);
  }, []);

  return {
    scanResults,
    isScanning,
    scanProgress,
    currentSourceIndex,
    lastScanTime,
    error,
    triggerScan,
    clearResults,
  };
}
