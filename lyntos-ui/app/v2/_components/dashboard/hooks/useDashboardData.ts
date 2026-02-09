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
  RegWatchEvent,
} from '../types';
import {
  createLoadingEnvelope,
  createOkEnvelope,
  createErrorEnvelope,
  createEmptyEnvelope,
} from '../types';

// API base URL - from centralized config
import { API_BASE_URL } from '../../../_lib/config/api';
import { getAuthToken } from '../../../_lib/auth';
const API_BASE = API_BASE_URL;

// Auth header - uses centralized getAuthToken with dev bypass support
function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return {
    'Authorization': token || '',
    'Content-Type': 'application/json',
  };
}

// Generic fetch with error handling
// SMMM GÜVENİ: Transform null döndürürse empty envelope döndür
async function fetchWithEnvelope<T>(
  url: string,
  transform?: (data: unknown) => T | null
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

    // SMMM GÜVENİ: Transform null döndürdüyse veya veri boşsa
    if (data === null || data === undefined || (Array.isArray(data) && data.length === 0)) {
      // Empty data returned from transform
      return createEmptyEnvelope<T>('Bu dönem için analiz verisi bulunamadı');
    }

    return createOkEnvelope(data, url);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Fetch error for ${url}:`, error);
    }
    // onClick callback will be provided by the component using refetch
    return createErrorEnvelope<T>(
      'Veri yüklenirken hata oluştu'
    );
  }
}

// Transform API response to KpiStripData
// SMMM GÜVENİ: Gerçek veri yoksa null döndür, hardcoded değer KULLANMA
function transformKpiData(kurganData: unknown): KpiStripData | null {
  const raw = kurganData as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;
  const kurgan = (data?.kurgan_risk as Record<string, unknown>) || data;

  // Gerçek veri kontrolü - score yoksa null döndür
  const score = kurgan?.score as number | undefined;
  if (score === undefined || score === null) {
    // No real data available
    return null;
  }

  const riskLevel = (kurgan?.risk_level as string) || 'Bilinmiyor';

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
    // Diğer KPI'lar gerçek API verilerinden gelecek
    // Şimdilik sadece VDK Risk göster
  ];

  return {
    kpis,
    period: (data?.period as string) || '',
    lastUpdated: new Date().toISOString(),
  };
}

// Transform quarterly-tax response to TaxAnalysisData
// Backend format: { data: { ok, Q1: { current_profit, matrah, calculated_tax, payable }, Q2, ... } }
function transformGeciciVergi(response: unknown): TaxAnalysisData | null {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  // Gerçek veri kontrolü
  if (!data || data.has_data === false || data.data_source === 'no_data') {
    // No real data available
    return null;
  }

  // Backend'den gelen Q1 verisi
  const q1 = data?.Q1 as Record<string, unknown> | null;
  const q2 = data?.Q2 as Record<string, unknown> | null;

  // Vergi hesaplaması
  const q1Tax = (q1?.calculated_tax as number) || (q1?.payable as number) || 0;
  const q2Tax = (q2?.calculated_tax as number) || (q2?.payable as number) || 0;
  const totalTax = q1Tax + q2Tax;

  // Kar/zarar
  const q1Profit = (q1?.current_profit as number) || (q1?.matrah as number) || 0;

  // Kontrol listesi oluştur (backend'den controls gelmiyorsa)
  const controls: Array<{id: string; name: string; status: 'passed' | 'warning' | 'failed'; description?: string}> = [];

  if (q1) {
    controls.push({
      id: 'q1-beyan',
      name: 'Q1 Geçici Vergi Beyannamesi',
      status: 'passed',
      description: `Matrah: ${q1Profit.toLocaleString('tr-TR')} TL, Vergi: ${q1Tax.toLocaleString('tr-TR')} TL`
    });
  }

  if (q1Profit < 0) {
    controls.push({
      id: 'q1-zarar',
      name: 'Dönem Zararı',
      status: 'warning',
      description: `Q1 döneminde ${Math.abs(q1Profit).toLocaleString('tr-TR')} TL zarar var`
    });
  }

  return {
    period: (data?.period as string) || '',
    totalControls: controls.length,
    passedControls: controls.filter(c => c.status === 'passed').length,
    warningControls: controls.filter(c => c.status === 'warning').length,
    failedControls: controls.filter(c => c.status === 'failed').length,
    estimatedTax: totalTax,
    controls,
    summary: {
      highRisk: 0,
      mediumRisk: q1Profit < 0 ? 1 : 0,
      lowRisk: 0,
    },
  };
}

// Transform corporate-tax response to TaxAnalysisData
// Backend format: { data: { ticari_kar, mali_kar, matrah, hesaplanan_vergi, odenecek_vergi, ... } }
function transformKurumlarVergi(response: unknown): TaxAnalysisData | null {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  // Gerçek veri kontrolü
  if (!data || data.has_data === false || data.data_source === 'no_data') {
    // No real data available
    return null;
  }

  // Backend'den gelen veriler
  const ticariKar = data?.ticari_kar as Record<string, unknown> | null;
  const maliKar = data?.mali_kar as Record<string, unknown> | null;
  const matrah = (data?.matrah as number) || 0;
  const hesaplananVergi = (data?.hesaplanan_vergi as number) || 0;
  const odenecekVergi = (data?.odenecek_vergi as number) || 0;

  // Kar/zarar değerleri
  const donemKari = (ticariKar?.net_donem_kari as number) || (ticariKar?.donem_kari as number) || 0;
  const maliKarDegeri = (maliKar?.mali_kar as number) || matrah;

  // Kontrol listesi
  const controls: Array<{id: string; name: string; status: 'passed' | 'warning' | 'failed'; description?: string}> = [];

  // Ticari kar kontrolü
  if (donemKari !== 0) {
    controls.push({
      id: 'ticari-kar',
      name: 'Ticari Bilanço Kar/Zarar',
      status: donemKari > 0 ? 'passed' : 'warning',
      description: `${donemKari > 0 ? 'Kar' : 'Zarar'}: ${Math.abs(donemKari).toLocaleString('tr-TR')} TL`
    });
  }

  // Kurumlar vergisi matrah
  if (matrah > 0) {
    controls.push({
      id: 'kv-matrah',
      name: 'Kurumlar Vergisi Matrahı',
      status: 'passed',
      description: `Matrah: ${matrah.toLocaleString('tr-TR')} TL, Vergi (%25): ${hesaplananVergi.toLocaleString('tr-TR')} TL`
    });
  }

  return {
    period: (data?.period as string) || '',
    totalControls: controls.length,
    passedControls: controls.filter(c => c.status === 'passed').length,
    warningControls: controls.filter(c => c.status === 'warning').length,
    failedControls: controls.filter(c => c.status === 'failed').length,
    estimatedTax: hesaplananVergi || odenecekVergi,
    controls,
    summary: {
      highRisk: 0,
      mediumRisk: donemKari < 0 ? 1 : 0,
      lowRisk: 0,
    },
  };
}

// Transform mizan-analysis response
// Backend format: { data: { accounts: [...], summary: { total_accounts, ok, warn, error, total_borc, total_alacak } } }
function transformMizan(response: unknown): MizanData | null {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  // Gerçek veri kontrolü
  if (!data || data.has_data === false || data.data_source === 'no_data') {
    // No real data available
    return null;
  }

  // Backend accounts array döndürüyor: [{hesap_kodu, hesap_adi, borc, alacak, bakiye, bakiye_turu, status, anomaly}]
  const accounts = (data?.accounts as Array<Record<string, unknown>>) || [];
  const summary = (data?.summary as Record<string, unknown>) || {};

  // Summary'den toplam değerleri al
  const toplamBorc = (summary?.total_borc as number) || 0;
  const toplamAlacak = (summary?.total_alacak as number) || 0;
  const totalAccounts = (summary?.total_accounts as number) || accounts.length;
  const okCount = (summary?.ok as number) || 0;
  const warnCount = (summary?.warn as number) || 0;
  const errorCount = (summary?.error as number) || 0;

  // Kritik hesaplar (warn veya error status olanlar önce)
  const sortedAccounts = [...accounts].sort((a, b) => {
    const statusOrder: Record<string, number> = { 'ERROR': 0, 'WARN': 1, 'OK': 2 };
    const aOrder = statusOrder[(a.status as string) || 'OK'] ?? 2;
    const bOrder = statusOrder[(b.status as string) || 'OK'] ?? 2;
    return aOrder - bOrder;
  });

  const kritikHesaplar = sortedAccounts.slice(0, 10).map((hesap) => ({
    kod: (hesap?.hesap_kodu as string) || '',
    ad: (hesap?.hesap_adi as string) || '',
    borc: (hesap?.borc as number) || 0,
    alacak: (hesap?.alacak as number) || 0,
    bakiye: (hesap?.bakiye as number) || 0,
    status: ((hesap?.status as string) === 'OK' ? 'normal' :
             (hesap?.status as string) === 'WARN' ? 'warning' : 'critical') as 'normal' | 'warning' | 'critical',
  }));

  return {
    period: (data?.period as string) || '',
    toplamBorc,
    toplamAlacak,
    bakiyeDengesi: Math.abs(toplamBorc - toplamAlacak) < 0.01,
    kritikHesaplar,
    vdkSkoru: totalAccounts > 0 ? Math.round((okCount / totalAccounts) * 100) : 0,
    kontrolSayisi: totalAccounts,
    gecenKontrol: okCount,
  };
}

// Transform cross-check response
// Backend format: { data: { checks: [{type, status, difference, reason, evidence, actions}], summary: {total_checks, errors, warnings, ok, overall_status} } }
function transformCrossCheck(response: unknown): CrossCheckData | null {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  // Gerçek veri kontrolü
  if (!data || data.has_data === false || data.data_source === 'no_data') {
    // No real data available
    return null;
  }

  const checks = (data?.checks as Array<Record<string, unknown>>) || [];
  const summary = (data?.summary as Record<string, unknown>) || {};

  // Summary'den değerleri al
  const okCount = (summary?.ok as number) || 0;
  const errorCount = (summary?.errors as number) || 0;
  const warningCount = (summary?.warnings as number) || 0;

  return {
    period: (data?.period as string) || '',
    checks: checks.map((c, i) => {
      // type formatı: "mizan_vs_kdv", "banka_vs_mizan" gibi
      const typeStr = (c?.type as string) || '';
      const parts = typeStr.split('_vs_');
      return {
        id: `cc-${i}`,
        source: parts[0] || typeStr,
        target: parts[1] || '',
        status: ((c?.status as string) === 'ok' ? 'matched' :
                 (c?.status as string) === 'error' ? 'mismatch' : 'pending') as 'matched' | 'mismatch' | 'pending',
        difference: (c?.difference as number) || 0,
        details: (c?.reason as string) || '',
      };
    }),
    matchedCount: okCount,
    mismatchCount: errorCount + warningCount,
    pendingCount: 0,
  };
}

// Transform regwatch-status response
// SMMM GÜVENİ: Gerçek veri yoksa null döndür
function transformRegWatch(response: unknown): RegWatchData | null {
  const raw = response as Record<string, unknown>;
  const data = (raw?.data as Record<string, unknown>) || raw;

  // Gerçek veri kontrolü
  if (!data || Object.keys(data).length === 0) {
    // Debug removed('[transformRegWatch] Gerçek veri yok, null döndürülüyor');
    return null;
  }

  return {
    lastScan: (data?.last_scan as string) || new Date().toISOString(),
    totalEvents: (data?.total_events as number) || 0,
    newEvents: (data?.new_events as number) || 0,
    pendingReview: (data?.pending_review as number) || 0,
    events: (data?.events as RegWatchEvent[]) || [],
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
