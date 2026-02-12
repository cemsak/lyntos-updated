'use client';

/**
 * VERGUS Tax Analysis Hook
 * Sprint 9.0 - LYNTOS V2
 *
 * Handles VERGUS API calls and state management
 */

import { useState, useCallback } from 'react';
import { api } from '../../_lib/api/client';
import type { TaxAnalysisResult, FinancialDataInput } from './types';

interface UseVergusAnalysisOptions {
  clientId: string;
  period: string;
}

export function useVergusAnalysis({
  clientId,
  period,
}: UseVergusAnalysisOptions) {
  const [analysis, setAnalysis] = useState<TaxAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(
    async (financialData?: Partial<FinancialDataInput>) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await api.post<TaxAnalysisResult>('/api/v1/vergus/analyze', {
          client_id: clientId,
          period,
          financial_data: financialData || null,
        });

        if (!res.ok || !res.data) {
          throw new Error(res.error || 'Analiz basarisiz');
        }

        setAnalysis(res.data);
        return res.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Bir hata olustu';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, period]
  );

  const quickCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.get<unknown>(
        `/api/v1/vergus/quick-check/${clientId}`,
        { params: { period } }
      );

      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Kontrol basarisiz');
      }

      return res.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bir hata olustu';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clientId, period]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    runAnalysis,
    quickCheck,
    clearAnalysis,
  };
}
