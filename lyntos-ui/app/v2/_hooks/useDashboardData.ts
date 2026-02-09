/**
 * LYNTOS Dashboard Data Hook
 * Fetches period sync status from backend API
 *
 * GET /api/v2/donem/status/{period}?tenant_id={tenantId}&client_id={clientId}
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface DocTypeCount {
  docType: string;
  count: number;
  label: string;
}

export interface SyncedFile {
  id: string;
  filename: string;
  parseStatus: string;
  parserName: string;
  confidence: number;
  updatedAt: string;
}

export interface DashboardPeriodData {
  periodId: string;
  tenantId: string;
  clientId: string;
  totalCount: number;
  byDocType: Record<string, SyncedFile[]>;
  syncedAt: string | null;
}

export interface DashboardState {
  data: DashboardPeriodData | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  isEmpty: boolean;
}

// ============================================================================
// DOC TYPE LABELS (Turkish)
// ============================================================================

const DOC_TYPE_LABELS: Record<string, string> = {
  MIZAN: 'Mizan',
  BEYANNAME: 'Beyanname',
  TAHAKKUK: 'Tahakkuk',
  BANKA: 'Banka Ekstre',
  EDEFTER_BERAT: 'e-Defter Berat',
  EFATURA_ARSIV: 'e-Fatura/Arşiv',
};

// ============================================================================
// API CONFIGURATION
// ============================================================================

import { getApiBaseUrl } from '../_lib/config/api';

// ============================================================================
// HOOK
// ============================================================================

export function useDashboardData(
  period: string | null,
  tenantId: string = 'default',
  clientId: string = 'default'
): DashboardState & {
  refetch: () => Promise<void>;
  docTypeCounts: DocTypeCount[];
} {
  const [data, setData] = useState<DashboardPeriodData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // No period selected - reset state
    if (!period) {
      setData(null);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const apiBase = getApiBaseUrl();
    const url = `${apiBase}/api/v2/donem/status/${encodeURIComponent(period)}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          // No data for this period - not an error, just empty
          setData(null);
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      setData({
        periodId: result.periodId || period,
        tenantId: result.tenantId || tenantId,
        clientId: result.clientId || clientId,
        totalCount: result.totalCount || 0,
        byDocType: result.byDocType || {},
        syncedAt: result.syncedAt || null,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('[DashboardData] Error:', errorMessage);
      setError(errorMessage);
      setIsError(true);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [period, tenantId, clientId]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute doc type counts with labels
  const docTypeCounts: DocTypeCount[] = useMemo(() => {
    if (!data?.byDocType) return [];

    return Object.entries(data.byDocType).map(([docType, files]) => ({
      docType,
      count: Array.isArray(files) ? files.length : 0,
      label: DOC_TYPE_LABELS[docType] || docType,
    }));
  }, [data?.byDocType]);

  return {
    data,
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && (!data || data.totalCount === 0),
    refetch: fetchData,
    docTypeCounts,
  };
}

// ============================================================================
// STANDALONE FETCH (for non-hook usage)
// ============================================================================

export async function fetchDashboardData(
  period: string,
  tenantId: string = 'default',
  clientId: string = 'default'
): Promise<DashboardPeriodData | null> {
  const apiBase = getApiBaseUrl();
  const url = `${apiBase}/api/v2/donem/status/${encodeURIComponent(period)}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const result = await response.json();
    return {
      periodId: result.periodId || period,
      tenantId: result.tenantId || tenantId,
      clientId: result.clientId || clientId,
      totalCount: result.totalCount || 0,
      byDocType: result.byDocType || {},
      syncedAt: result.syncedAt || null,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// HELPER: Get file count by doc type
// ============================================================================

export function getFileCountByDocType(
  data: DashboardPeriodData | null,
  docType: string
): number {
  if (!data?.byDocType?.[docType]) return 0;
  return Array.isArray(data.byDocType[docType])
    ? data.byDocType[docType].length
    : 0;
}

// ============================================================================
// HELPER: Check if a doc type has files
// ============================================================================

export function hasDocType(
  data: DashboardPeriodData | null,
  docType: string
): boolean {
  return getFileCountByDocType(data, docType) > 0;
}
