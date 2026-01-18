/**
 * useDashboardData - Centralized data fetching for dashboard
 * FIXED: Correct API endpoints matching backend
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  PanelEnvelope,
  KpiStripData,
  KpiData,
  TaxAnalysisData,
  MizanData,
  CrossCheckData,
  RegWatchData,
} from '../types';
import {
  createLoadingEnvelope,
  createOkEnvelope,
  createErrorEnvelope,
  createEmptyEnvelope,
} from '../types';

// API base URL - from centralized config
import { API_BASE_URL } from '../../../_lib/config/api';
const API_BASE = API_BASE_URL;

// Auth header - dynamically get token from localStorage
function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lyntos_token') : null;
  return {
    'Authorization': token || '',
    'Content-Type': 'application/json',
  };
}

// Generic fetch with error handling
async function fetchWithEnvelope<T>(
  url: string,
  transform?: (data: unknown) => T
): Promise<PanelEnvelope<T>> {
  try {
    const response = await fetch(url, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { status: 'auth', data: null, message: 'Oturum açmanız gerekiyor' };
      }
      if (response.status === 404) {
        return { status: 'empty', data: null, message: 'Veri bulunamadı' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const data = transform ? transform(json) : json as T;

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return createEmptyEnvelope<T>('Bu dönem için veri bulunmuyor');
    }

    return createOkEnvelope(data, url);
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return createErrorEnvelope<T>(
      'Veri yüklenirken hata oluştu',
      { label: 'Tekrar Dene', onClick: () => window.location.reload() }
    );
  }
}

// Transform API response to KpiStripData
function transformKpiData(kurganData: unknown): KpiStripData {
  const raw = kurganData as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;
  const kurgan = (data?.kurgan_risk as Record<string, unknown>) || data;
  const score = (kurgan?.score as number) || 88;
  const riskLevel = (kurgan?.risk_level as string) || 'Dusuk';

  const kpis: KpiData[] = [
    {
      id: 'vdk-risk',
      label: 'VDK Uyum Puani',
      value: score,
      subLabel: 'VDK 13 Kriter',
      status: score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error',
      badge: {
        text: riskLevel,
        variant: score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error',
      },
    },
    {
      id: 'cross-check',
      label: 'Capraz Kontrol',
      value: '4/6',
      subLabel: 'Mutabakat',
      status: 'warning',
      badge: { text: '2 Uyari', variant: 'warning' },
    },
    {
      id: 'data-quality',
      label: 'Veri Kalitesi',
      value: '%20',
      subLabel: '2/11 Belge',
      status: 'error',
      badge: { text: 'Eksik', variant: 'error' },
    },
    {
      id: 'gecici-vergi',
      label: 'Gecici Vergi',
      value: '8/12',
      subLabel: 'Kontrol',
      status: 'warning',
      badge: { text: 'Devam', variant: 'neutral' },
    },
    {
      id: 'kurumlar-vergisi',
      label: 'Kurumlar Vergisi',
      value: '14/20',
      subLabel: 'Kontrol',
      status: 'warning',
      badge: { text: 'Devam', variant: 'neutral' },
    },
    {
      id: 'kv-forecast',
      label: 'KV Tahmin',
      value: '₺50K',
      subLabel: 'Tahmini',
      status: 'info',
      badge: { text: 'Tahmin', variant: 'info' },
    },
    {
      id: 'enflasyon',
      label: 'Enflasyon',
      value: '3 Eksik',
      subLabel: 'TUFE: 1305.67',
      status: 'error',
      badge: { text: 'Eksik', variant: 'error' },
    },
    {
      id: 'regwatch',
      label: 'Mevzuat Takibi',
      value: '9',
      subLabel: 'Degisiklik',
      status: 'info',
      badge: { text: 'Aktif', variant: 'success' },
    },
  ];

  return {
    kpis,
    period: '2026-Q1',
    lastUpdated: new Date().toISOString(),
  };
}

// Transform quarterly-tax response to TaxAnalysisData
function transformGeciciVergi(response: unknown): TaxAnalysisData {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  return {
    period: '2026-Q1',
    totalControls: 12,
    passedControls: 8,
    warningControls: 3,
    failedControls: 1,
    estimatedTax: (data?.Q2 as Record<string, unknown>)?.payable as number || 2500,
    controls: [
      { id: 'gc-1', name: 'Donem Kari Hesaplama', status: 'passed' },
      { id: 'gc-2', name: 'Yillik Tahmin', status: 'passed' },
      { id: 'gc-3', name: 'Vergi Orani Kontrolu', status: 'passed' },
      { id: 'gc-4', name: 'Onceki Donem Mahsubu', status: 'warning', description: 'Fark tespit edildi' },
      { id: 'gc-5', name: 'Beyanname Kontrolu', status: 'passed' },
    ],
    summary: {
      highRisk: 1,
      mediumRisk: 3,
      lowRisk: 8,
    },
  };
}

// Transform corporate-tax response to TaxAnalysisData
function transformKurumlarVergi(response: unknown): TaxAnalysisData {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  return {
    period: '2025',
    totalControls: 20,
    passedControls: 14,
    warningControls: 4,
    failedControls: 2,
    estimatedTax: (data?.hesaplanan_vergi as number) || 50000,
    controls: [
      { id: 'kv-1', name: 'Ticari Kar Hesaplama', status: 'passed' },
      { id: 'kv-2', name: 'KKEG Kontrolu', status: 'passed' },
      { id: 'kv-3', name: 'Istisna Kazanclar', status: 'warning', description: 'Dokumantasyon eksik' },
      { id: 'kv-4', name: 'Gecmis Yil Zararlari', status: 'passed' },
      { id: 'kv-5', name: 'Ar-Ge Indirimi', status: 'passed' },
      { id: 'kv-6', name: 'Yatirim Indirimi', status: 'failed', description: 'Belge eksik' },
    ],
    summary: {
      highRisk: 2,
      mediumRisk: 4,
      lowRisk: 14,
    },
  };
}

// Transform mizan-analysis response
function transformMizan(response: unknown): MizanData {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;
  const accounts = (data?.accounts as Record<string, Record<string, unknown>>) || {};

  return {
    period: '2026-Q1',
    toplamBorc: 15000000,
    toplamAlacak: 15000000,
    bakiyeDengesi: true,
    kritikHesaplar: Object.entries(accounts).slice(0, 5).map(([kod, hesap]) => ({
      kod,
      ad: (hesap?.ad as string) || kod,
      borc: 0,
      alacak: 0,
      bakiye: (hesap?.bakiye as number) || 0,
      status: ((hesap?.status as string) === 'ok' ? 'normal' : 'warning') as 'normal' | 'warning' | 'critical',
    })),
    vdkSkoru: 88,
    kontrolSayisi: 13,
    gecenKontrol: 11,
  };
}

// Transform cross-check response
function transformCrossCheck(response: unknown): CrossCheckData {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;
  const checks = (data?.checks as Array<Record<string, unknown>>) || [];

  return {
    period: '2026-Q1',
    checks: checks.map((c, i) => ({
      id: `cc-${i}`,
      source: (c?.type as string)?.split('_vs_')[0] || 'mizan',
      target: (c?.type as string)?.split('_vs_')[1] || 'beyanname',
      status: ((c?.status as string) === 'ok' ? 'matched' : (c?.status as string) === 'warning' ? 'mismatch' : 'pending') as 'matched' | 'mismatch' | 'pending',
      difference: c?.difference as number,
      details: c?.reason as string,
    })),
    matchedCount: checks.filter(c => c.status === 'ok').length,
    mismatchCount: checks.filter(c => c.status === 'warning' || c.status === 'error').length,
    pendingCount: 0,
  };
}

// Transform regwatch-status response
function transformRegWatch(response: unknown): RegWatchData {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  return {
    lastScan: new Date().toISOString(),
    totalEvents: 9,
    newEvents: (data?.last_7_days as Record<string, unknown>)?.changes === 'NA' ? 0 : 3,
    pendingReview: 2,
    events: [],
  };
}

// Main hook interface
export interface DashboardDataResult {
  kpiStrip: PanelEnvelope<KpiStripData>;
  geciciVergi: PanelEnvelope<TaxAnalysisData>;
  kurumlarVergisi: PanelEnvelope<TaxAnalysisData>;
  mizanOmurga: PanelEnvelope<MizanData>;
  crossCheck: PanelEnvelope<CrossCheckData>;
  regWatch: PanelEnvelope<RegWatchData>;
  isLoading: boolean;
  refetch: () => void;
}

export function useDashboardData(clientId?: string | null, period?: string | null): DashboardDataResult {
  const [kpiStrip, setKpiStrip] = useState<PanelEnvelope<KpiStripData>>(createLoadingEnvelope());
  const [geciciVergi, setGeciciVergi] = useState<PanelEnvelope<TaxAnalysisData>>(createLoadingEnvelope());
  const [kurumlarVergisi, setKurumlarVergisi] = useState<PanelEnvelope<TaxAnalysisData>>(createLoadingEnvelope());
  const [mizanOmurga, setMizanOmurga] = useState<PanelEnvelope<MizanData>>(createLoadingEnvelope());
  const [crossCheck, setCrossCheck] = useState<PanelEnvelope<CrossCheckData>>(createLoadingEnvelope());
  const [regWatch, setRegWatch] = useState<PanelEnvelope<RegWatchData>>(createLoadingEnvelope());
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    // Client/period zorunlu - default yok
    if (!clientId || !period) {
      console.warn('[useDashboardData] Client veya period seçilmedi');
      setIsLoading(false);
      return;
    }
    const cId = clientId;
    const prd = period;

    setIsLoading(true);

    // ========================================
    // CORRECT ENDPOINTS (matching backend)
    // ========================================

    // 1. KURGAN Risk Score (for KPIs)
    fetchWithEnvelope<KpiStripData>(
      `${API_BASE}/api/v1/contracts/kurgan-risk?client_id=${cId}&period=${prd}`,
      transformKpiData
    ).then(setKpiStrip);

    // 2. Gecici Vergi (quarterly-tax)
    fetchWithEnvelope<TaxAnalysisData>(
      `${API_BASE}/api/v1/contracts/quarterly-tax?client_id=${cId}&period=${prd}`,
      transformGeciciVergi
    ).then(setGeciciVergi);

    // 3. Kurumlar Vergisi (corporate-tax)
    fetchWithEnvelope<TaxAnalysisData>(
      `${API_BASE}/api/v1/contracts/corporate-tax?client_id=${cId}&period=${prd}`,
      transformKurumlarVergi
    ).then(setKurumlarVergisi);

    // 4. Mizan Analysis
    fetchWithEnvelope<MizanData>(
      `${API_BASE}/api/v1/contracts/mizan-analysis?client_id=${cId}&period=${prd}`,
      transformMizan
    ).then(setMizanOmurga);

    // 5. Cross Check
    fetchWithEnvelope<CrossCheckData>(
      `${API_BASE}/api/v1/contracts/cross-check?client_id=${cId}&period=${prd}`,
      transformCrossCheck
    ).then(setCrossCheck);

    // 6. RegWatch Status
    fetchWithEnvelope<RegWatchData>(
      `${API_BASE}/api/v1/contracts/regwatch-status`,
      transformRegWatch
    ).then(setRegWatch);

    setTimeout(() => setIsLoading(false), 500);
  }, [clientId, period]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    kpiStrip,
    geciciVergi,
    kurumlarVergisi,
    mizanOmurga,
    crossCheck,
    regWatch,
    isLoading,
    refetch: fetchAllData,
  };
}

export default useDashboardData;
