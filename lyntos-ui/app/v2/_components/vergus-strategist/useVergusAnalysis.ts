'use client';

/**
 * VERGUS Tax Analysis Hook
 * Sprint 9.0 - LYNTOS V2
 *
 * Handles VERGUS API calls and state management
 */

import { useState, useCallback } from 'react';
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
        const response = await fetch('/api/v1/vergus/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'DEV_HKOZKAN',
          },
          body: JSON.stringify({
            client_id: clientId,
            period,
            financial_data: financialData || null,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || 'Analiz basarisiz');
        }

        const data: TaxAnalysisResult = await response.json();
        setAnalysis(data);
        return data;
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
      const response = await fetch(
        `/api/v1/vergus/quick-check/${clientId}?period=${period}`,
        {
          headers: {
            Authorization: 'DEV_HKOZKAN',
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Kontrol basarisiz');
      }

      return await response.json();
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
