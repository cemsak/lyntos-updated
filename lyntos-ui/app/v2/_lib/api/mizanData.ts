/**
 * LYNTOS Frontend - Mizan Data API Client
 * Fetches mizan data from backend for Dashboard display
 *
 * This enables Dashboard to display REAL data from disk
 * without requiring manual file upload.
 */

// Use relative URLs for browser (via Next.js proxy) to avoid CORS
// In browser: /api/v2/mizan-data/... -> Next.js proxy -> Backend
// On server: Direct to backend
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser - use relative URL to go through Next.js proxy
    return '';
  }
  // Server-side - use backend URL directly
  return process.env.LYNTOS_BACKEND_BASE || 'http://localhost:8000';
}

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
  const response = await fetch(`${getBaseUrl()}/api/v2/mizan-data/available`);

  if (!response.ok) {
    throw new Error(`Failed to fetch available data: ${response.statusText}`);
  }

  return response.json();
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
  const baseUrl = getBaseUrl();
  const urlPath = `/api/v2/mizan-data/load/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`;
  const url = baseUrl ? new URL(urlPath, baseUrl) : new URL(urlPath, window.location.origin);
  url.searchParams.set('include_accounts', includeAccounts.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load mizan data: ${response.statusText}`);
  }

  return response.json();
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
  const response = await fetch(
    `${getBaseUrl()}/api/v2/mizan-data/analyze/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to analyze mizan: ${response.statusText}`);
  }

  return response.json();
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
  const response = await fetch(
    `${getBaseUrl()}/api/v2/mizan-data/account/${encodeURIComponent(smmmId)}/${encodeURIComponent(clientId)}/${encodeURIComponent(period)}/${encodeURIComponent(hesapKodu)}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to get account detail: ${response.statusText}`);
  }

  return response.json();
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
