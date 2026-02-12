'use client';
/**
 * LYNTOS V2 - Unified Dönem Data Hook
 * TEK HOOK - TÜM VERİ
 *
 * Bu hook Dashboard'un ihtiyaç duyduğu tüm veriyi tek bir endpoint'ten alır.
 * localStorage KULLANMAZ - tüm veri Backend'den gelir.
 *
 * Kullanım:
 *   const { data, isLoading, error, refetch } = useDonemData();
 *   const mizan = data?.mizan;
 *   const vdkRisks = data?.analysis?.vdk_risks;
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDashboardScope, useScopeComplete } from '../_components/scope/useDashboardScope';
import { api } from '../_lib/api/client';
import { getAuthToken } from '../_lib/auth';

// ============== TYPES ==============

export interface DonemFileSummary {
  id: string;
  doc_type: string;
  original_filename: string;
  parse_status: string;
  row_count?: number;
  uploaded_at: string;
}

export interface MizanHesap {
  hesap_kodu: string;
  hesap_adi?: string;
  borc_toplam?: number;
  alacak_toplam?: number;
  borc_bakiye: number;
  alacak_bakiye: number;
}

export interface MizanSummary {
  hesap_sayisi: number;
  toplam_borc: number;
  toplam_alacak: number;
  fark: number;
  dengeli: boolean;
  aktif_toplam: number;
  pasif_toplam: number;
  ozsermaye: number;
  yabanci_kaynak: number;
  gelir_toplam: number;
  gider_toplam: number;
  net_kar: number;
  sermaye?: number;
  ciro?: number;
  satilan_mal?: number;
}

export interface VdkRiskItem {
  kriter_kodu: string;
  kriter_adi: string;
  severity: 'kritik' | 'uyari' | 'bilgi';
  hesaplanan_deger: number;
  esik_deger: number;
  durum: 'asim' | 'normal' | 'eksik_veri';
  aciklama: string;
  oneri?: string;
  mevzuat_ref?: string;
}

export interface DonemAnalysis {
  vdk_risks: VdkRiskItem[];
  risk_score: number;
  risk_level: 'dusuk' | 'orta' | 'yuksek' | 'kritik' | 'bilinmiyor';
  oranlar: {
    cari_oran?: number;
    likidite_oran?: number;
    borc_ozkaynak?: number;
    net_kar_marji?: number;
    [key: string]: number | undefined;
  };
}

export interface DonemMeta {
  smmm_id: string;
  client_id: string;
  period: string;
  status: 'no_data' | 'partial' | 'ready' | 'error' | 'unknown';
  has_mizan: boolean;
  has_beyanname: boolean;
  has_banka: boolean;
  file_count: number;
  uploaded_at?: string;
  analyzed_at?: string;
}

export interface EDefterDurum {
  has_yevmiye: boolean;
  has_kebir: boolean;
  has_yevmiye_berat: boolean;
  has_kebir_berat: boolean;
  has_defter_raporu: boolean;
  yevmiye_satir: number;
  kebir_satir: number;
  yevmiye_berat_satir: number;
  kebir_berat_satir: number;
  defter_tipi_list: string[];
}

export interface DonemData {
  ok: boolean;
  has_data: boolean;
  meta: DonemMeta;
  files: DonemFileSummary[];
  mizan?: {
    summary: MizanSummary;
    hesaplar: MizanHesap[];
  };
  analysis?: DonemAnalysis;
  edefter_durum?: EDefterDurum;
  message?: string;
}

export type DonemDataStatus = 'idle' | 'loading' | 'success' | 'error' | 'no_scope';

export interface UseDonemDataReturn {
  data: DonemData | null;
  status: DonemDataStatus;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Convenience selectors
  mizan: DonemData['mizan'] | null;
  mizanSummary: MizanSummary | null;
  vdkRisks: VdkRiskItem[];
  analysis: DonemAnalysis | null;
  files: DonemFileSummary[];
  meta: DonemMeta | null;
  hasData: boolean;
  edefterDurum: EDefterDurum | null;
}

// ============== API FUNCTION ==============

async function fetchDonemData(
  smmmId: string,
  clientId: string,
  period: string,
  includeAccounts: boolean = true
): Promise<DonemData> {
  const { data, error, status } = await api.get<DonemData>(
    `/api/v2/donem/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`,
    { params: { smmm_id: smmmId, include_accounts: includeAccounts } }
  );

  if (error || !data) {
    if (status === 401) {
      throw new Error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
    }
    if (status === 404) {
      throw new Error('Bu dönem için veri bulunamadı.');
    }
    throw new Error(error || 'API Hatası');
  }

  return data;
}

// ============== MAIN HOOK ==============

export function useDonemData(options: {
  includeAccounts?: boolean;
  enabled?: boolean;
} = {}): UseDonemDataReturn {
  const { includeAccounts = true, enabled = true } = options;

  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  const [data, setData] = useState<DonemData | null>(null);
  const [status, setStatus] = useState<DonemDataStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Scope kontrolü
    if (!scopeComplete || !scope.smmm_id || !scope.client_id || !scope.period) {
      setStatus('no_scope');
      setData(null);
      setError(null);
      return;
    }

    // Token kontrolü
    const token = getAuthToken();
    if (!token) {
      setStatus('no_scope');
      setData(null);
      setError('Veri yüklemek için önce dönem seçin.');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const result = await fetchDonemData(
        scope.smmm_id,
        scope.client_id,
        scope.period,
        includeAccounts
      );

      setData(result);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(message);
      setStatus('error');
      setData(null);
    }
  }, [scope.smmm_id, scope.client_id, scope.period, scopeComplete, includeAccounts]);

  // Scope değiştiğinde veya enabled olduğunda fetch et
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [fetchData, enabled]);

  // Convenience selectors - memoized
  const mizan = useMemo(() => data?.mizan ?? null, [data?.mizan]);
  const mizanSummary = useMemo(() => data?.mizan?.summary ?? null, [data?.mizan?.summary]);
  const vdkRisks = useMemo(() => data?.analysis?.vdk_risks ?? [], [data?.analysis?.vdk_risks]);
  const analysis = useMemo(() => data?.analysis ?? null, [data?.analysis]);
  const files = useMemo(() => data?.files ?? [], [data?.files]);
  const meta = useMemo(() => data?.meta ?? null, [data?.meta]);
  const hasData = useMemo(() => data?.has_data ?? false, [data?.has_data]);
  const edefterDurum = useMemo(() => data?.edefter_durum ?? null, [data?.edefter_durum]);

  return {
    data,
    status,
    isLoading: status === 'loading',
    error,
    refetch: fetchData,
    // Selectors
    mizan,
    mizanSummary,
    vdkRisks,
    analysis,
    files,
    meta,
    hasData,
    edefterDurum,
  };
}

// ============== SELECTOR HOOKS ==============

/**
 * Sadece mizan verisi için lightweight hook
 */
export function useDonemMizan() {
  const { mizan, mizanSummary, isLoading, error } = useDonemData({ includeAccounts: true });
  return { mizan, mizanSummary, isLoading, error };
}

/**
 * Sadece VDK risk analizi için hook
 */
export function useDonemVdkRisks() {
  const { vdkRisks, analysis, isLoading, error } = useDonemData({ includeAccounts: false });
  return {
    vdkRisks,
    riskScore: analysis?.risk_score ?? 0,
    riskLevel: analysis?.risk_level ?? 'bilinmiyor',
    oranlar: analysis?.oranlar ?? {},
    isLoading,
    error
  };
}

/**
 * Sadece dosya listesi için hook
 */
export function useDonemFiles() {
  const { files, meta, isLoading, error } = useDonemData({ includeAccounts: false });
  return {
    files,
    fileCount: meta?.file_count ?? 0,
    hasMizan: meta?.has_mizan ?? false,
    hasBeyanname: meta?.has_beyanname ?? false,
    hasBanka: meta?.has_banka ?? false,
    isLoading,
    error
  };
}

/**
 * Dönem meta bilgisi için hook
 */
export function useDonemMeta() {
  const { meta, hasData, isLoading, error } = useDonemData({ includeAccounts: false });
  return { meta, hasData, isLoading, error };
}

export default useDonemData;
