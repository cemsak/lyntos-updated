'use client';

/**
 * VERGUS Registry API Hooks
 * Sprint T2
 */
import { useState, useEffect, useCallback } from 'react';
import type {
  Company,
  CompanyChange,
  PortfolioItem,
  TradeRegistryOffice,
  ChangeStats,
  TTSGSearchResult
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================
// COMPANY HOOKS
// ============================================

export function useCompanies(filters?: {
  city?: string;
  status?: string;
  company_type?: string;
  is_tracked?: boolean;
  limit?: number;
}) {
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters?.city) params.append('city', filters.city);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.company_type) params.append('company_type', filters.company_type);
      if (filters?.is_tracked !== undefined) params.append('is_tracked', String(filters.is_tracked));
      if (filters?.limit) params.append('limit', String(filters.limit));

      const res = await fetch(`${API_BASE}/api/v1/registry/companies?${params}`);
      if (!res.ok) throw new Error('Failed to fetch companies');

      const json = await res.json();
      setData(json.companies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters?.city, filters?.status, filters?.company_type, filters?.is_tracked, filters?.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCompany(taxNumber: string | null) {
  const [data, setData] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!taxNumber) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/registry/companies/${taxNumber}`);
      if (!res.ok) throw new Error('Company not found');

      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [taxNumber]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useTrackCompany() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const track = useCallback(async (taxNumber: string, smmmId: string = 'default') => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/v1/registry/companies/${taxNumber}/track?smmm_id=${smmmId}`,
        { method: 'POST' }
      );

      if (!res.ok) throw new Error('Failed to track company');
      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const untrack = useCallback(async (taxNumber: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${API_BASE}/api/v1/registry/companies/${taxNumber}/track`,
        { method: 'DELETE' }
      );

      if (!res.ok) throw new Error('Failed to untrack company');
      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { track, untrack, loading, error };
}

// ============================================
// CHANGES HOOKS
// ============================================

export function useCompanyChanges(filters?: {
  change_type?: string;
  reviewed?: boolean;
  limit?: number;
}) {
  const [data, setData] = useState<CompanyChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters?.change_type) params.append('change_type', filters.change_type);
        if (filters?.reviewed !== undefined) params.append('reviewed', String(filters.reviewed));
        if (filters?.limit) params.append('limit', String(filters.limit));

        const res = await fetch(`${API_BASE}/api/v1/registry/changes?${params}`);
        if (!res.ok) throw new Error('Failed to fetch changes');

        const json = await res.json();
        setData(json.changes || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters?.change_type, filters?.reviewed, filters?.limit]);

  return { data, loading, error };
}

export function useChangeStats() {
  const [data, setData] = useState<ChangeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/registry/changes/stats`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        setData(await res.json());
      } catch (err) {
        console.error('Failed to fetch change stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading };
}

// ============================================
// PORTFOLIO HOOKS
// ============================================

export function usePortfolio(smmmId: string = 'default') {
  const [data, setData] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/registry/portfolio/${smmmId}`);
      if (!res.ok) throw new Error('Failed to fetch portfolio');

      const json = await res.json();
      setData(json.clients || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [smmmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addToPortfolio = useCallback(async (taxNumber: string, companyName?: string) => {
    const res = await fetch(`${API_BASE}/api/v1/registry/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smmm_id: smmmId,
        tax_number: taxNumber,
        company_name: companyName,
        relationship_type: 'accounting'
      })
    });

    if (!res.ok) throw new Error('Failed to add to portfolio');
    await fetchData();
    return await res.json();
  }, [smmmId, fetchData]);

  const removeFromPortfolio = useCallback(async (portfolioId: string) => {
    const res = await fetch(`${API_BASE}/api/v1/registry/portfolio/${portfolioId}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Failed to remove from portfolio');
    await fetchData();
    return await res.json();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, addToPortfolio, removeFromPortfolio };
}

// ============================================
// TTSG HOOKS
// ============================================

export function useTTSGSearch() {
  const [results, setResults] = useState<TTSGSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, city?: string, changeType?: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/v1/registry/ttsg/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, city, change_type: changeType })
      });

      if (!res.ok) throw new Error('Search failed');

      const json = await res.json();
      setResults(json.results || []);
      return json;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}

// ============================================
// OFFICES HOOK
// ============================================

export function useOffices(pilotOnly: boolean = false) {
  const [data, setData] = useState<TradeRegistryOffice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = pilotOnly ? '?pilot_only=true' : '';
        const res = await fetch(`${API_BASE}/api/v1/registry/offices${params}`);
        if (!res.ok) throw new Error('Failed to fetch offices');

        const json = await res.json();
        setData(json.offices || []);
      } catch (err) {
        console.error('Failed to fetch offices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pilotOnly]);

  return { data, loading };
}
