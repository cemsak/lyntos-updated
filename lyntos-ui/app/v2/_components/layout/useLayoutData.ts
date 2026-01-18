'use client';

/**
 * LYNTOS Layout Data Hook
 * Sprint MOCK-006 - Mock data removed, uses only API data
 *
 * Fetches user, clients, and periods from backend
 * Uses centralized auth for DEV_HKOZKAN fallback in development
 */
import { useState, useEffect, useCallback } from 'react';
import type { User, Client, Period } from './types';
import { API_BASE_URL } from '../../_lib/config/api';
import { getAuthToken } from '../../_lib/auth';

const API_BASE = API_BASE_URL;

interface UseLayoutDataResult {
  user: User | null;
  clients: Client[];
  periods: Period[];
  loading: boolean;
  error: string | null;
  refreshClients: () => Promise<void>;
  refreshPeriods: (clientId: string) => Promise<void>;
}

async function fetchWithAuth<T>(endpoint: string): Promise<T | null> {
  // Uses centralized getAuthToken which has DEV_HKOZKAN fallback
  const token = getAuthToken();
  if (!token) {
    console.warn('[Auth] Token bulunamadi');
    return null;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useLayoutData(): UseLayoutDataResult {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user on mount
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const userData = await fetchWithAuth<User>('/api/v1/user/me');
        if (mounted) {
          if (userData) {
            setUser(userData);
            setError(null);
          } else {
            // Token yok - gecici mod, hata gosterme
            setUser(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[useLayoutData] User fetch failed:', err);
        if (mounted) {
          setUser(null);
          setError('Kullanici bilgileri yuklenemedi');
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch clients when user is available
  const refreshClients = useCallback(async () => {
    if (!user) return;

    try {
      const clientsData = await fetchWithAuth<Client[]>('/api/v1/user/me/clients');
      if (clientsData) {
        setClients(clientsData);
        setError(null);
      }
    } catch (err) {
      console.error('[useLayoutData] Clients fetch failed:', err);
      setClients([]);
      setError('Mukellef listesi yuklenemedi');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshClients();
    }
  }, [user, refreshClients]);

  // Fetch periods for a specific client
  const refreshPeriods = useCallback(async (clientId: string) => {
    if (!clientId) {
      setPeriods([]);
      return;
    }

    try {
      const periodsData = await fetchWithAuth<Period[]>(`/api/v1/user/clients/${clientId}/periods`);
      if (periodsData) {
        setPeriods(periodsData);
        setError(null);
      }
    } catch (err) {
      console.error('[useLayoutData] Periods fetch failed:', err);
      setPeriods([]);
      setError('Donem listesi yuklenemedi');
    }
  }, []);

  // Set loading to false once we have user data or error
  useEffect(() => {
    if (user !== null || error !== null) {
      setLoading(false);
    }
  }, [user, error]);

  return {
    user,
    clients,
    periods,
    loading,
    error,
    refreshClients,
    refreshPeriods,
  };
}
