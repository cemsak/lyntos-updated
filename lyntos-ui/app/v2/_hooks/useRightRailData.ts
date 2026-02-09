/**
 * LYNTOS RightRail Data Hook
 * Aggregates data from multiple APIs for the right rail summary
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { BIG_6_DOC_TYPES } from '../_lib/constants/docTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface RightRailData {
  // Risk counts
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;

  // Document status
  missingDocCount: number;
  presentDocCount: number;
  totalDocCategories: number;

  // Completion
  completionPercent: number;

  // Evidence bundle
  evidenceBundleStatus: 'not_started' | 'in_progress' | 'ready' | 'error';
  evidenceBundlePercent: number;

  // Data quality
  dataQualityScore: number;

  // Recommendations
  topRecommendations: string[];

  // Completed documents
  completedDocuments: string[];

  // Timestamps
  lastUpdated: string | null;
}

export interface RightRailState {
  data: RightRailData;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_DATA: RightRailData = {
  criticalCount: 0,
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  missingDocCount: 6, // All missing by default
  presentDocCount: 0,
  totalDocCategories: 6,
  completionPercent: 0,
  evidenceBundleStatus: 'not_started',
  evidenceBundlePercent: 0,
  dataQualityScore: 0,
  topRecommendations: [],
  completedDocuments: [],
  lastUpdated: null,
};

// ============================================================================
// DOC TYPE LABELS (for completed documents display)
// ============================================================================

const DOC_TYPE_LABELS: Record<string, string> = {
  MIZAN: 'Mizan',
  BEYANNAME: 'Beyanname',
  TAHAKKUK: 'Tahakkuk',
  BANKA: 'Banka',
  EDEFTER_BERAT: 'e-Defter',
  EFATURA_ARSIV: 'e-Fatura',
};

// ============================================================================
// API CONFIG
// ============================================================================

import { getApiBaseUrl } from '../_lib/config/api';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function safeFetch<T>(url: string, defaultValue: T): Promise<T> {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return defaultValue;
    return await response.json();
  } catch {
    return defaultValue;
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useRightRailData(
  period: string | null,
  tenantId: string = 'default',
  clientId: string = 'default'
): RightRailState & { refetch: () => Promise<void> } {

  const [data, setData] = useState<RightRailData>(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!period) {
      setData(DEFAULT_DATA);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const apiBase = getApiBaseUrl();

    try {
      // Fetch all APIs in parallel
      const [rightRailSummary, donemStatus, dataQualityResponse] = await Promise.all([
        // 0. NEW: Right rail summary API (aggregated data)
        safeFetch<{
          data?: {
            kritikSayisi?: number;
            yuksekSayisi?: number;
            eksikBelgeSayisi?: number;
            oneriler?: Array<{ baslik: string; aciklama: string; oncelik: string }>;
            kanitPaketi?: {
              durum?: string;
              tamamlanan?: string[];
              progress?: number;
            };
          };
        }>(`${apiBase}/api/v1/contracts/right-rail-summary?period=${encodeURIComponent(period)}&smmm_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`, {}),

        // 1. Donem status (eksik belgeler) - our v2 API
        safeFetch<{
          byDocType?: Record<string, unknown[]>;
          totalCount?: number;
        }>(`${apiBase}/api/v2/donem/status/${encodeURIComponent(period)}?tenant_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`, {}),

        // 2. Data quality (v1 API)
        safeFetch<{
          data?: {
            score?: number;
            quality_score?: number;
          };
          score?: number;
        }>(`${apiBase}/api/v1/contracts/data-quality?period=${encodeURIComponent(period)}&smmm_id=${encodeURIComponent(tenantId)}&client_id=${encodeURIComponent(clientId)}`, {}),
      ]);

      // Extract right rail summary data (new aggregated endpoint)
      const summaryData = rightRailSummary.data || {};
      const kritikSayisi = summaryData.kritikSayisi ?? 0;
      const yuksekSayisi = summaryData.yuksekSayisi ?? 0;
      const kanitPaketiFromApi = summaryData.kanitPaketi || {};
      const onerilerFromApi = summaryData.oneriler || [];

      // Process document status
      const byDocType = donemStatus.byDocType || {};
      let presentDocCount = 0;
      const completedDocuments: string[] = [];

      BIG_6_DOC_TYPES.forEach(docType => {
        const files = byDocType[docType];
        if (files && Array.isArray(files) && files.length > 0) {
          presentDocCount++;
          completedDocuments.push(DOC_TYPE_LABELS[docType] || docType);
        }
      });

      const missingDocCount = BIG_6_DOC_TYPES.length - presentDocCount;

      // Process data quality
      const dataQualityScore = dataQualityResponse.data?.score ??
                               dataQualityResponse.data?.quality_score ??
                               dataQualityResponse.score ?? 0;

      // Calculate completion percentage
      // Formula: (presentDocs / totalDocs) * 100
      const completionPercent = Math.round((presentDocCount / BIG_6_DOC_TYPES.length) * 100);

      // Evidence bundle status (based on document completion)
      let evidenceBundleStatus: RightRailData['evidenceBundleStatus'] = 'not_started';
      let evidenceBundlePercent = 0;

      if (presentDocCount === BIG_6_DOC_TYPES.length) {
        evidenceBundleStatus = 'ready';
        evidenceBundlePercent = 100;
      } else if (presentDocCount > 0) {
        evidenceBundleStatus = 'in_progress';
        evidenceBundlePercent = Math.round((presentDocCount / BIG_6_DOC_TYPES.length) * 100);
      }

      // Generate recommendations based on status
      const topRecommendations: string[] = [];

      if (missingDocCount > 0) {
        topRecommendations.push('Eksik belgeleri tamamlayin');
      }
      if (dataQualityScore < 80) {
        topRecommendations.push('Veri kalitesini iyilestirin');
      }
      if (presentDocCount > 0 && presentDocCount < BIG_6_DOC_TYPES.length) {
        topRecommendations.push('Kanit paketini tamamlayin');
      }
      if (topRecommendations.length === 0) {
        topRecommendations.push('Tum belgeler tamam');
      }

      // Use data from right-rail-summary API if available, otherwise use calculated values
      // Also merge oneriler from API with generated recommendations
      const apiRecommendations = onerilerFromApi.map((o: { baslik: string }) => o.baslik);
      const mergedRecommendations = apiRecommendations.length > 0
        ? apiRecommendations
        : topRecommendations;

      // Evidence bundle status from API if available
      if (kanitPaketiFromApi.durum) {
        switch (kanitPaketiFromApi.durum) {
          case 'hazir':
            evidenceBundleStatus = 'ready';
            evidenceBundlePercent = 100;
            break;
          case 'eksik':
            evidenceBundleStatus = 'in_progress';
            evidenceBundlePercent = kanitPaketiFromApi.progress ?? evidenceBundlePercent;
            break;
        }
      }

      // Completed documents from API
      const apiCompletedDocs = kanitPaketiFromApi.tamamlanan || [];
      const mergedCompletedDocs = apiCompletedDocs.length > 0
        ? apiCompletedDocs.map((d: string) => DOC_TYPE_LABELS[d.toUpperCase()] || d)
        : completedDocuments;

      setData({
        criticalCount: kritikSayisi,
        highCount: yuksekSayisi,
        mediumCount: 0,
        lowCount: 0,
        missingDocCount: summaryData.eksikBelgeSayisi ?? missingDocCount,
        presentDocCount,
        totalDocCategories: BIG_6_DOC_TYPES.length,
        completionPercent,
        evidenceBundleStatus,
        evidenceBundlePercent,
        dataQualityScore,
        topRecommendations: mergedRecommendations,
        completedDocuments: mergedCompletedDocs,
        lastUpdated: new Date().toISOString(),
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Veri alinamadi';
      console.error('[RightRailData] Error:', errorMessage);
      setError(errorMessage);
      setIsError(true);
      // Keep default data on error
    } finally {
      setIsLoading(false);
    }
  }, [period, tenantId, clientId]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchAllData,
  };
}

export default useRightRailData;
