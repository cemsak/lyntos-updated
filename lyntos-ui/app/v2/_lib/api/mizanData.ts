/**
 * LYNTOS Frontend - Mizan Data API Client
 * Fetches mizan data from backend for Dashboard display
 *
 * This enables Dashboard to display REAL data from disk
 * without requiring manual file upload.
 */

import { api } from './client';

// ============== TYPES ==============

export interface MizanHesap {
  hesap_kodu: string;
  hesap_adi: string | null;
  borc_toplam: number;
  alacak_toplam: number;
  borc_bakiye: number;
  alacak_bakiye: number;
  status: 'ok' | 'unreliable';
  warnings: string[];
}

export interface MizanValidation {
  is_balanced: boolean;
  toplam_borc: number;
  toplam_alacak: number;
  fark: number;
  fark_yuzde: number;
  warnings: string[];
}

export interface MizanSummary {
  aktif_toplam: number;
  pasif_toplam: number;
  ozsermaye: number;
  yabanci_kaynak: number;
  borc_toplam: number;
  alacak_toplam: number;
  gelir_toplam: number;
  gider_toplam: number;
  net_kar: number;
}

export interface VdkData {
  kasa_bakiye: number;
  banka_bilanco: number;
  alicilar: number;
  ortaklardan_alacak: number;
  stoklar: number;
  devreden_kdv: number;
  indirilecek_kdv: number;
  saticilar: number;
  ortaklara_borc: number;
  sermaye: number;
  gecmis_yil_karlari: number;
  gecmis_yil_zararlari: number;
  net_satislar: number;
  satilan_mal_maliyeti: number;
  faaliyet_giderleri: number;
  aktif_toplam: number;
  pasif_toplam: number;
  ozsermaye: number;
  brut_kar: number;
  brut_kar_marji: number;
  cari_oran: number;
}

export interface MizanDataResponse {
  ok: boolean;
  smmm_id: string;
  client_id: string;
  period: string;
  source_file: string;
  row_count: number;
  validation: MizanValidation;
  summary: MizanSummary;
  accounts: MizanHesap[];
  vdk_data: VdkData | null;
}

export interface AvailableData {
  smmm_id: string;
  client_id: string;
  period: string;
  folder: string;
  mizan_size: number;
  has_beyanname: boolean;
  has_tahakkuk: boolean;
}

export interface AvailableDataResponse {
  available: AvailableData[];
  count: number;
}

export interface MizanAnalysisResponse {
  ok: boolean;
  smmm_id: string;
  client_id: string;
  period: string;
  accounts: Record<string, unknown>;
  summary: Record<string, unknown>;
  analysis: Record<string, unknown>;
}

export interface AccountDetailResponse {
  hesap_kodu: string;
  match_count: number;
  toplam_borc: number;
  toplam_alacak: number;
  borc_bakiye: number;
  alacak_bakiye: number;
  net_bakiye: number;
  alt_hesaplar: {
    hesap_kodu: string;
    hesap_adi: string | null;
    borc_bakiye: number;
    alacak_bakiye: number;
  }[];
}

// ============== API FUNCTIONS ==============

/**
 * List all available SMMM/Client/Period combinations with mizan data on disk.
 */
export async function fetchAvailableMizanData(): Promise<AvailableDataResponse> {
  const { data, error } = await api.get<AvailableDataResponse>('/api/v2/mizan-data/available');
  if (error || !data) throw new Error(error || 'Failed to fetch available data');
  return data;
}

/**
 * Load mizan data from disk for a specific SMMM/Client/Period.
 * This is the main function for Dashboard to get REAL mizan data.
 */
export async function loadMizanData(
  smmmId: string,
  clientId: string,
  period: string,
  includeAccounts: boolean = true
): Promise<MizanDataResponse> {
  const urlPath = `/api/v2/mizan-data/load/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`;
  const { data, error } = await api.get<MizanDataResponse>(urlPath, {
    params: { include_accounts: includeAccounts.toString() },
  });
  if (error || !data) throw new Error(error || 'Failed to load mizan data');
  return data;
}

/**
 * Run mizan omurga (backbone) analysis on the data.
 * Returns VDK-based risk analysis for critical accounts.
 */
export async function analyzeMizan(
  smmmId: string,
  clientId: string,
  period: string
): Promise<MizanAnalysisResponse> {
  const urlPath = `/api/v2/mizan-data/analyze/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`;
  const { data, error } = await api.get<MizanAnalysisResponse>(urlPath);
  if (error || !data) throw new Error(error || 'Failed to analyze mizan');
  return data;
}

/**
 * Get detailed information for a specific account code.
 */
export async function getAccountDetail(
  smmmId: string,
  clientId: string,
  period: string,
  hesapKodu: string
): Promise<AccountDetailResponse> {
  const urlPath = `/api/v2/mizan-data/account/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}/${encodeURIComponent(hesapKodu)}`;
  const { data, error } = await api.get<AccountDetailResponse>(urlPath);
  if (error || !data) throw new Error(error || 'Failed to get account detail');
  return data;
}

// ============== HELPER FUNCTIONS ==============
// Re-export from central format library for backwards compatibility
export { formatPeriod as formatPeriodDisplay, formatCurrency, formatPercent } from '../format';

/**
 * Format percentage value for display (legacy: value is 0-100, not 0-1)
 * @deprecated Use formatPercent from '../format' instead (which expects 0-1 range)
 */
export function formatPercentLegacy(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}
