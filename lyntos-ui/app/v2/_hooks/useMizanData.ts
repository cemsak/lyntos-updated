'use client';
/**
 * LYNTOS - useMizanData Hook
 * Fetches mizan data from backend API
 *
 * This hook enables Dashboard components to display REAL data
 * from disk without requiring manual file upload.
 */

import { useState, useEffect, useCallback } from 'react';
import { useDashboardScope } from '../_components/scope/ScopeProvider';
import {
  loadMizanData,
  analyzeMizan,
  type MizanDataResponse,
  type MizanAnalysisResponse,
  type VdkData,
  type MizanSummary,
} from '../_lib/api/mizanData';

interface UseMizanDataOptions {
  /** Fetch accounts list (can be large) */
  includeAccounts?: boolean;
  /** Auto-fetch when scope changes */
  autoFetch?: boolean;
}

interface UseMizanDataReturn {
  /** Mizan data from backend */
  data: MizanDataResponse | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch data */
  refetch: () => Promise<void>;
  /** VDK data extracted from mizan (for risk analysis) */
  vdkData: VdkData | null;
  /** Mizan summary (aktif, pasif, etc.) */
  summary: MizanSummary | null;
  /** Is mizan balanced? */
  isBalanced: boolean;
  /** Is data available in scope? */
  isAvailable: boolean;
}

/**
 * Hook to fetch mizan data from backend API.
 *
 * Example usage:
 * ```tsx
 * const { data, isLoading, error, vdkData } = useMizanData();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorState error={error} />;
 * if (!data) return <EmptyState />;
 *
 * // Use data.summary, data.accounts, vdkData, etc.
 * ```
 */
export function useMizanData(options: UseMizanDataOptions = {}): UseMizanDataReturn {
  const { includeAccounts = false, autoFetch = true } = options;

  const { scope, isReady } = useDashboardScope();
  const [data, setData] = useState<MizanDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasScope = Boolean(scope.smmm_id && scope.client_id && scope.period);

  const fetchData = useCallback(async () => {
    if (!hasScope) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Map frontend IDs to backend format
      // Frontend: CLIENT_048_5F970880 -> Backend: OZKAN_KIRTASIYE
      // For now, we'll use a simple mapping based on known data
      // TODO: Add proper client ID resolution

      const smmmId = scope.smmm_id;
      const clientId = scope.client_id;

      const result = await loadMizanData(smmmId, clientId, scope.period, includeAccounts);

      setData(result);
    } catch (err) {
      console.error('[useMizanData] Error fetching mizan data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [hasScope, scope.smmm_id, scope.client_id, scope.period, includeAccounts]);

  // Auto-fetch when scope changes
  useEffect(() => {
    if (autoFetch && isReady && hasScope) {
      fetchData();
    }
  }, [autoFetch, isReady, hasScope, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    vdkData: data?.vdk_data ?? null,
    summary: data?.summary ?? null,
    isBalanced: data?.validation?.is_balanced ?? false,
    isAvailable: !!data && data.ok,
  };
}

// ============== ANALYSIS HOOK ==============

interface UseMizanAnalysisReturn {
  analysis: MizanAnalysisResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch mizan omurga analysis from backend.
 * Returns VDK-based risk analysis for critical accounts.
 */
export function useMizanAnalysis(): UseMizanAnalysisReturn {
  const { scope, isReady } = useDashboardScope();
  const [analysis, setAnalysis] = useState<MizanAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const hasScope = Boolean(scope.smmm_id && scope.client_id && scope.period);

  const fetchAnalysis = useCallback(async () => {
    if (!hasScope) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const smmmId = scope.smmm_id;
      const clientId = scope.client_id;

      const result = await analyzeMizan(smmmId, clientId, scope.period);
      setAnalysis(result);
    } catch (err) {
      console.error('[useMizanAnalysis] Error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, [hasScope, scope.smmm_id, scope.client_id, scope.period]);

  useEffect(() => {
    if (isReady && hasScope) {
      fetchAnalysis();
    }
  }, [isReady, hasScope, fetchAnalysis]);

  return {
    analysis,
    isLoading,
    error,
    refetch: fetchAnalysis,
  };
}

// ============== VDK-SPECIFIC HOOK ==============

interface UseVdkDataReturn {
  vdkData: VdkData | null;
  isLoading: boolean;
  error: Error | null;
  /** Kasa/Aktif oranı (%15 üzeri risk) */
  kasaAktifOrani: number;
  /** Ortaklardan Alacak/Özsermaye oranı (%25 üzeri risk) */
  ortakAlacakOrani: number;
  /** Cari oran (< 0.5 veya > 5 risk) */
  cariOran: number;
  /** Brüt kar marjı */
  brutKarMarji: number;
}

/**
 * Hook specifically for VDK risk analysis data.
 * Extracts key ratios from mizan for KURGAN/RAM criteria.
 */
export function useVdkData(): UseVdkDataReturn {
  const { data, isLoading, error } = useMizanData({ includeAccounts: false });

  const vdkData = data?.vdk_data ?? null;

  // Calculate ratios
  const kasaAktifOrani = vdkData && vdkData.aktif_toplam > 0
    ? (vdkData.kasa_bakiye / vdkData.aktif_toplam) * 100
    : 0;

  const ortakAlacakOrani = vdkData && vdkData.ozsermaye > 0
    ? (vdkData.ortaklardan_alacak / vdkData.ozsermaye) * 100
    : 0;

  const cariOran = vdkData?.cari_oran ?? 0;
  const brutKarMarji = vdkData?.brut_kar_marji ?? 0;

  return {
    vdkData,
    isLoading,
    error,
    kasaAktifOrani,
    ortakAlacakOrani,
    cariOran,
    brutKarMarji,
  };
}
