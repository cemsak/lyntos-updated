'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { PanelEnvelope, createLoadingEnvelope, createErrorEnvelope, createMissingEnvelope } from '../contracts/envelope';
import { useDashboardScope, useScopeComplete } from '../scope/useDashboardScope';
import { buildScopedUrl, type ScopeParams } from '../contracts/endpoints';

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: FetchOptions = { timeout: 12000, retries: 1, retryDelay: 1000 };

// Create empty state envelope for demo mode
function createEmptyEnvelope<T>(reason: string): PanelEnvelope<T> {
  return {
    ...createMissingEnvelope<T>(reason),
    status: 'empty',
  };
}

export function useFailSoftFetch<T>(
  endpoint: string,
  normalizer: (raw: unknown, requestId?: string) => PanelEnvelope<T>,
  options: FetchOptions = {}
): PanelEnvelope<T> {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();

  // Hydration state - prevent loading spinner during SSR/hydration
  const [isHydrated, setIsHydrated] = useState(false);

  // Determine initial state synchronously based on conditions
  // This prevents showing loading spinner when we know we won't fetch
  const getInitialState = useCallback((): PanelEnvelope<T> => {
    // During SSR or before hydration, show empty state (not loading)
    if (typeof window === 'undefined') {
      return createEmptyEnvelope<T>('Veri yüklemek için dönem seçin.');
    }
    // Check token synchronously
    const token = localStorage.getItem('lyntos_token');
    if (!token) {
      return createEmptyEnvelope<T>('Veri yüklemek için önce dönem seçin.');
    }
    // If scope not complete, show missing state
    if (!scopeComplete) {
      return createMissingEnvelope<T>('Scope seçilmedi. Lütfen SMMM, Mükellef ve Dönem seçin.');
    }
    // Only show loading if we'll actually fetch
    return createLoadingEnvelope<T>();
  }, [scopeComplete]);

  const [envelope, setEnvelope] = useState<PanelEnvelope<T>>(getInitialState);
  const abortRef = useRef<AbortController | null>(null);
  const { timeout, retries, retryDelay } = { ...DEFAULT_OPTIONS, ...options };

  // Set hydration state on mount
  useEffect(() => {
    setIsHydrated(true);
    // Re-evaluate initial state after hydration
    setEnvelope(getInitialState());
  }, [getInitialState]);

  const fetchData = useCallback(async (attempt = 0) => {
    if (abortRef.current) abortRef.current.abort();

    // Check preconditions BEFORE setting loading state
    if (!scopeComplete) {
      setEnvelope(createMissingEnvelope<T>('Scope seçilmedi. Lütfen SMMM, Mükellef ve Dönem seçin.'));
      return;
    }

    const token = localStorage.getItem('lyntos_token');
    if (!token) {
      // Token yoksa empty state döndür (demo mode) - NO loading flash
      setEnvelope(createEmptyEnvelope<T>('Veri yüklemek için önce dönem seçin.'));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Only show loading if we're actually going to fetch
    setEnvelope(createLoadingEnvelope<T>());

    try {
      const scopeParams: ScopeParams = {
        smmm_id: scope.smmm_id,
        client_id: scope.client_id,
        period: scope.period,
      };
      const url = buildScopedUrl(endpoint, scopeParams);
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          setEnvelope({ ...createErrorEnvelope<T>('Oturum suresi dolmus.', requestId), status: 'auth' });
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
      setEnvelope(createErrorEnvelope<T>(`Veri yuklenemedi: ${(error as Error).message}`, requestId));
    }
  }, [endpoint, normalizer, scope.smmm_id, scope.client_id, scope.period, scopeComplete, timeout, retries, retryDelay]);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchData]);

  return envelope;
}
