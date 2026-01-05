'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthHeaders } from '../../../../../lib/auth';

// ════════════════════════════════════════════════════════════════════════════
// useDashboardScope - Merkezi Scope Yonetimi
// Priority: 1) URL params, 2) localStorage, 3) defaults
// ════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'lyntos_dashboard_scope';

export interface Taxpayer {
  id: string;
  name: string;
  vkn: string;
  active: boolean;
}

export interface Period {
  id: string;
  label: string;
  status: string;
}

export interface DashboardScope {
  smmm: string;
  client: string;
  period: string;
}

// localStorage helpers
function loadFromStorage(): Partial<DashboardScope> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveToStorage(scope: Partial<DashboardScope>) {
  if (typeof window === 'undefined') return;
  try {
    const current = loadFromStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...scope }));
  } catch {}
}

export interface UseDashboardScopeReturn {
  scope: DashboardScope;
  isReady: boolean;
  taxpayers: Taxpayer[];
  periods: Period[];
  loadingTaxpayers: boolean;
  loadingPeriods: boolean;
  setClient: (clientId: string) => void;
  setPeriod: (periodId: string) => void;
  authHeaders: HeadersInit;
}

export function useDashboardScope(smmm: string): UseDashboardScopeReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);

  // State
  const [taxpayers, setTaxpayers] = useState<Taxpayer[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loadingTaxpayers, setLoadingTaxpayers] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);

  // Priority: URL > localStorage > empty
  const stored = loadFromStorage();
  const client = searchParams.get('client') || stored.client || '';
  const period = searchParams.get('period') || stored.period || '';

  const authHeaders = getAuthHeaders(smmm);

  // URL guncelleme (replace, push degil - history kirletmemek icin)
  const updateUrl = useCallback((newClient: string, newPeriod: string) => {
    const params = new URLSearchParams();
    params.set('smmm', smmm);
    if (newClient) params.set('client', newClient);
    if (newPeriod) params.set('period', newPeriod);
    
    // localStorage kaydet
    saveToStorage({ smmm, client: newClient, period: newPeriod });
    
    // URL guncelle
    router.replace('/v1?' + params.toString());
  }, [router, smmm]);

  // Initialize: URL bossa ama localStorage doluysa, URL'i guncelle
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    const urlClient = searchParams.get('client');
    const urlPeriod = searchParams.get('period');
    
    // URL bos ama localStorage dolu ise, localStorage'dan yukle
    if (!urlClient && stored.client) {
      updateUrl(stored.client, stored.period || '');
    }
  }, [searchParams, stored, updateUrl]);

  // Fetch taxpayers
  useEffect(() => {
    const fetchTaxpayers = async () => {
      setLoadingTaxpayers(true);
      try {
        const res = await fetch('/api/v1/tenants/' + smmm + '/taxpayers', {
          headers: authHeaders
        });
        if (res.ok) {
          const data = await res.json();
          setTaxpayers(data.data?.taxpayers || []);
        }
      } catch (err) {
        console.error('Taxpayer fetch error:', err);
      } finally {
        setLoadingTaxpayers(false);
      }
    };
    fetchTaxpayers();
  }, [smmm]);

  // Fetch periods when client changes
  useEffect(() => {
    if (!client) {
      setPeriods([]);
      return;
    }

    const fetchPeriods = async () => {
      setLoadingPeriods(true);
      try {
        const res = await fetch('/api/v1/tenants/' + smmm + '/taxpayers/' + client + '/periods', {
          headers: authHeaders
        });
        if (res.ok) {
          const data = await res.json();
          setPeriods(data.data?.periods || []);
        }
      } catch (err) {
        console.error('Period fetch error:', err);
      } finally {
        setLoadingPeriods(false);
      }
    };
    fetchPeriods();
  }, [smmm, client]);

  // Actions
  const setClient = useCallback((clientId: string) => {
    updateUrl(clientId, '');
  }, [updateUrl]);

  const setPeriod = useCallback((periodId: string) => {
    updateUrl(client, periodId);
  }, [updateUrl, client]);

  const isReady = Boolean(smmm && client && period);

  return {
    scope: { smmm, client, period },
    isReady,
    taxpayers,
    periods,
    loadingTaxpayers,
    loadingPeriods,
    setClient,
    setPeriod,
    authHeaders,
  };
}

export default useDashboardScope;
