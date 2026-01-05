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

export function useFailSoftFetch<T>(
  endpoint: string,
  normalizer: (raw: unknown, requestId?: string) => PanelEnvelope<T>,
  options: FetchOptions = {}
): PanelEnvelope<T> {
  const { scope } = useDashboardScope();
  const scopeComplete = useScopeComplete();
  const [envelope, setEnvelope] = useState<PanelEnvelope<T>>(createLoadingEnvelope<T>());
  const abortRef = useRef<AbortController | null>(null);
  const { timeout, retries, retryDelay } = { ...DEFAULT_OPTIONS, ...options };

  const fetchData = useCallback(async (attempt = 0) => {
    if (abortRef.current) abortRef.current.abort();

    if (!scopeComplete) {
      setEnvelope(createMissingEnvelope<T>('Scope secilmedi. Lutfen SMMM, Mukellef ve Donem secin.'));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setEnvelope(createLoadingEnvelope<T>());

    try {
      const scopeParams: ScopeParams = {
        smmm_id: scope.smmm_id,
        client_id: scope.client_id,
        period: scope.period,
      };
      const url = buildScopedUrl(endpoint, scopeParams);
      const token = localStorage.getItem('lyntos_token') || 'DEV_HKOZKAN';
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
