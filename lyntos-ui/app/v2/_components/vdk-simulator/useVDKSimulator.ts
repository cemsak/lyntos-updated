'use client';

/**
 * VDK Simulator Hook
 * Sprint 8.0 - LYNTOS V2
 *
 * Handles simulation API calls and state management
 */

import { useState, useCallback } from 'react';
import { api } from '../../_lib/api/client';
import type { SimulationResult, SimulationResponse } from './types';

interface UseVDKSimulatorOptions {
  onSuccess?: (result: SimulationResult) => void;
  onError?: (error: string) => void;
}

export function useVDKSimulator({
  onSuccess,
  onError,
}: UseVDKSimulatorOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (clientId: string, period?: string): Promise<SimulationResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const queryParams: Record<string, string> = { client_id: clientId };
        if (period) queryParams.period = period;

        const res = await api.post<SimulationResponse>(
          '/api/v1/vdk-simulator/analyze',
          null,
          { params: queryParams }
        );

        if (!res.ok || !res.data) {
          throw new Error(res.error || 'Simulasyon basarisiz');
        }

        const json = res.data;
        if (!json.success || !json.data) {
          throw new Error('Simulasyon sonucu alinamadi');
        }

        setResult(json.data);
        onSuccess?.(json.data);
        return json.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Simulasyon basarisiz';
        setError(message);
        onError?.(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  // runDemo fonksiyonu KALDIRILDI - Demo veri uretimi yasak

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyze,
    reset,
    isLoading,
    result,
    error,
  };
}
