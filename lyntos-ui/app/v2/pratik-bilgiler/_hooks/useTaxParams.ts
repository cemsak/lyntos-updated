'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';

interface TaxParam {
  id: string;
  category: string;
  param_key: string;
  param_value: number | null;
  param_unit: string | null;
  valid_from: string;
  valid_until: string | null;
  legal_reference: string | null;
  source_url: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
}

interface Deadline {
  id: number;
  deadline_type: string;
  title: string;
  description: string | null;
  deadline_date: string;
  applicable_to: string;
  frequency: string | null;
  legal_reference: string | null;
  days_remaining: number;
}

interface UseTaxParamsResult {
  data: TaxParam[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseDeadlinesResult {
  data: Deadline[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Vergi parametrelerini kategori bazında API'den çek.
 * Fail-soft: API başarısız olursa boş dizi döner.
 */
export function useTaxParams(category: string): UseTaxParamsResult {
  const [data, setData] = useState<TaxParam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = API_ENDPOINTS.taxParams.byCategory(category);
      const result = await api.get<TaxParam[]>(url);
      if (result.error || !result.data) {
        setError(result.error || 'Bilinmeyen hata');
        setData([]);
      } else {
        setData(Array.isArray(result.data) ? result.data : []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(msg);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

/**
 * Beyan tarihlerini API'den çek.
 */
export function useDeadlines(options?: { upcoming?: boolean; limit?: number }): UseDeadlinesResult {
  const [data, setData] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const upcoming = options?.upcoming ?? true;
  const limit = options?.limit ?? 10;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = upcoming
        ? API_ENDPOINTS.taxParams.deadlinesUpcoming
        : API_ENDPOINTS.taxParams.deadlines;
      const params = upcoming
        ? { limit }
        : { year: new Date().getFullYear() };
      const result = await api.get<Deadline[]>(url, { params });
      if (result.error || !result.data) {
        setError(result.error || 'Bilinmeyen hata');
        setData([]);
      } else {
        setData(Array.isArray(result.data) ? result.data : []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(msg);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [upcoming, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refresh: fetchData };
}

/**
 * Vergi parametresini kullanılabilir formata dönüştür.
 * metadata JSON'unu parse eder.
 */
export function paramValue(param: TaxParam): number {
  return param.param_value ?? 0;
}

export function paramMeta<T = Record<string, unknown>>(param: TaxParam): T {
  return (param.metadata ?? {}) as T;
}

/**
 * Kategorideki parametreleri key bazlı map'e dönüştür.
 */
export function paramsToMap(params: TaxParam[]): Record<string, TaxParam> {
  const map: Record<string, TaxParam> = {};
  for (const p of params) {
    map[p.param_key] = p;
  }
  return map;
}
