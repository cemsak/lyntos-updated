'use client';
/**
 * LYNTOS V2 API Fetch Hook
 * Backend v2 endpoint'leri için - AUTH GEREKMEZ
 *
 * useFailSoftFetch'den farklı olarak:
 * - Token kontrolü yapmaz
 * - Scope'u URL'e otomatik ekler
 * - Backend'e doğrudan erişir (Next.js proxy değil)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PanelEnvelope,
  createLoadingEnvelope,
  createErrorEnvelope,
  createMissingEnvelope,
} from '../contracts/envelope';
import { useDashboardScope, useScopeComplete } from '../scope/useDashboardScope';

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: FetchOptions = { timeout: 15000, retries: 1, retryDelay: 1000 };

// Empty state envelope
function createEmptyEnvelope<T>(reason: string): PanelEnvelope<T> {
  return {
    ...createMissingEnvelope<T>(reason),
    status: 'empty',
  };
}

/**
 * V2 API fetch hook - NO AUTH REQUIRED
 *
 * @param buildUrl - Function to build URL from scope (smmm_id, client_id, period)
 * @param normalizer - Function to normalize response to PanelEnvelope
 * @param options - Fetch options (timeout, retries)
 */
export function useV2Fetch<T>(
  buildUrl: (smmm_id: string, client_id: string, period: string) => string,
  normalizer: (raw: unknown, requestId?: string) => PanelEnvelope<T>,
  options: FetchOptions = {}
): PanelEnvelope<T> {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  const [isHydrated, setIsHydrated] = useState(false);

  const getInitialState = useCallback((): PanelEnvelope<T> => {
    if (typeof window === 'undefined') {
      return createEmptyEnvelope<T>('Veri yüklemek için dönem seçin.');
    }
    if (!scopeComplete) {
      return createMissingEnvelope<T>('Scope seçilmedi. Lütfen SMMM, Mükellef ve Dönem seçin.');
    }
    return createLoadingEnvelope<T>();
  }, [scopeComplete]);

  const [envelope, setEnvelope] = useState<PanelEnvelope<T>>(getInitialState);
  const abortRef = useRef<AbortController | null>(null);
  const { timeout, retries, retryDelay } = { ...DEFAULT_OPTIONS, ...options };

  useEffect(() => {
    setIsHydrated(true);
    setEnvelope(getInitialState());
  }, [getInitialState]);

  const fetchData = useCallback(
    async (attempt = 0) => {
      if (abortRef.current) abortRef.current.abort();

      if (!scopeComplete) {
        setEnvelope(
          createMissingEnvelope<T>('Scope seçilmedi. Lütfen SMMM, Mükellef ve Dönem seçin.')
        );
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      setEnvelope(createLoadingEnvelope<T>());

      try {
        const url = buildUrl(scope.smmm_id, scope.client_id, scope.period);
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // V2 API - NO AUTH REQUIRED
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // 404 = veri yok, hata değil - empty state göster
          if (response.status === 404) {
            setEnvelope(createEmptyEnvelope<T>('Bu dönem için veri bulunamadı.'));
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const raw = await response.json();
        setEnvelope(normalizer(raw, requestId));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        if (attempt < (retries || 0)) {
          setTimeout(() => fetchData(attempt + 1), retryDelay);
          return;
        }

        // Network error - backend çalışmıyor olabilir
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          setEnvelope(
            createErrorEnvelope<T>(
              'Sunucu bağlantısı kurulamadı. Lütfen tekrar deneyin.',
              requestId
            )
          );
        } else {
          setEnvelope(createErrorEnvelope<T>(`Veri yüklenemedi: ${errorMessage}`, requestId));
        }
      }
    },
    [buildUrl, normalizer, scope.smmm_id, scope.client_id, scope.period, scopeComplete, timeout, retries, retryDelay]
  );

  useEffect(() => {
    if (isHydrated) {
      fetchData();
    }
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData, isHydrated]);

  return envelope;
}

export default useV2Fetch;
