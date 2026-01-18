/**
 * LYNTOS Mizan Sync API Client
 * Syncs parsed mizan data to backend
 */

// ============== TYPES ==============

export interface MizanEntry {
  hesap_kodu: string;
  hesap_adi?: string;
  borc_toplam: number;
  alacak_toplam: number;
  borc_bakiye: number;
  alacak_bakiye: number;
  row_index?: number;
}

export interface MizanMeta {
  tenant_id: string;
  client_id: string;
  period_id: string;
  source_file?: string;
  uploaded_at?: string;
}

export interface MizanSyncPayload {
  meta: MizanMeta;
  entries: MizanEntry[];
  summary?: Record<string, number>;
}

export interface MizanSyncResponse {
  success: boolean;
  synced_count: number;
  error_count: number;
  period_id: string;
  totals: {
    borc_toplam: number;
    alacak_toplam: number;
    borc_bakiye: number;
    alacak_bakiye: number;
  };
  errors: string[];
  missing_data?: { reason?: string; fields?: string[] };
  actions?: string[];
}

export interface MizanSummary {
  period_id: string;
  tenant_id: string;
  client_id: string;
  entry_count: number;
  toplam_borc: number;
  toplam_alacak: number;
  borc_bakiye_toplam: number;
  alacak_bakiye_toplam: number;
  aktif_toplam: number;
  pasif_toplam: number;
  gelir_toplam: number;
  gider_toplam: number;
  synced_at?: string;
}

// ============== API CONFIG ==============

import { API_BASE_URL } from '../config/api';

// ============== SYNC FUNCTION ==============

export async function syncMizanToBackend(payload: MizanSyncPayload): Promise<MizanSyncResponse> {
  const url = `${API_BASE_URL}/api/v2/mizan/sync`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        synced_count: 0,
        error_count: 1,
        period_id: payload.meta.period_id,
        totals: { borc_toplam: 0, alacak_toplam: 0, borc_bakiye: 0, alacak_bakiye: 0 },
        errors: [`HTTP ${response.status}: ${errorText}`],
        missing_data: { reason: 'Backend request failed' },
        actions: ['Check backend is running', 'Verify API URL'],
      };
    }

    return await response.json();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      synced_count: 0,
      error_count: 1,
      period_id: payload.meta.period_id,
      totals: { borc_toplam: 0, alacak_toplam: 0, borc_bakiye: 0, alacak_bakiye: 0 },
      errors: [`Network error: ${errorMessage}`],
      missing_data: { reason: 'Could not reach backend' },
      actions: ['Check network connection'],
    };
  }
}

// ============== GET SUMMARY ==============

export async function getMizanSummary(
  periodId: string,
  tenantId: string,
  clientId: string
): Promise<MizanSummary | null> {
  const url = `${API_BASE_URL}/api/v2/mizan/summary/${encodeURIComponent(periodId)}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ============== GET ENTRIES ==============

export async function getMizanEntries(
  periodId: string,
  tenantId: string,
  clientId: string,
  options?: { hesapPrefix?: string; limit?: number; offset?: number }
): Promise<{
  period_id: string;
  entries: MizanEntry[];
  total: number;
  limit: number;
  offset: number;
} | null> {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    client_id: clientId,
  });

  if (options?.hesapPrefix) params.append('hesap_prefix', options.hesapPrefix);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const url = `${API_BASE_URL}/api/v2/mizan/entries/${encodeURIComponent(periodId)}?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ============== CLEAR MIZAN ==============

export async function clearMizanData(
  periodId: string,
  tenantId: string,
  clientId: string
): Promise<{ success: boolean; deleted_count: number; period_id: string } | null> {
  const url = `${API_BASE_URL}/api/v2/mizan/clear/${encodeURIComponent(periodId)}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

  try {
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
