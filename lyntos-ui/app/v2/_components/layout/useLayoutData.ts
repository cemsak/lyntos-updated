'use client';

/**
 * LYNTOS Layout Data Hook
 * Fetches user, clients, and periods from backend
 * Uses centralized api client with Bearer JWT token
 */
import { useState, useEffect, useCallback } from 'react';
import type { User, Client, Period } from './types';
import { API_ENDPOINTS } from '../../_lib/config/api';
import { api } from '../../_lib/api/client';

interface UseLayoutDataResult {
  user: User | null;
  clients: Client[];
  periods: Period[];
  loading: boolean;
  error: string | null;
  refreshClients: () => Promise<Client[]>;
  refreshPeriods: (clientId: string) => Promise<void>;
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
        const { data, ok } = await api.get<User>(API_ENDPOINTS.user.me);
        if (mounted) {
          if (ok && data) {
            setUser(data);
            setError(null);
            setLoading(false);
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
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch clients when user is available — returns updated list
  const refreshClients = useCallback(async (): Promise<Client[]> => {
    if (!user) return [];

    try {
      const { data, ok } = await api.get<Client[]>(API_ENDPOINTS.user.clients);
      const updatedClients = ok && data ? data : [];
      setClients(updatedClients);
      setError(null);
      return updatedClients;
    } catch (err) {
      console.error('[useLayoutData] Clients fetch failed:', err);
      setClients([]);
      setError('Mukellef listesi yuklenemedi');
      return [];
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
      const { data, ok } = await api.get<Period[]>(API_ENDPOINTS.user.clientPeriods(clientId));
      if (ok && data) {
        setPeriods(data);
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
