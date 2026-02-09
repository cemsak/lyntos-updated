'use client';

/**
 * LYNTOS Layout Context
 * Sprint 7.3 - Stripe Dashboard Shell
 * Sprint MOCK-006 - Mock data removed, uses only API data
 *
 * Provides global layout state: user, client, period
 * Fetches real data from backend - no mock fallback
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { User, Client, Period, LayoutContextType } from './types';
import { useLayoutData } from './useLayoutData';

const LayoutContext = createContext<LayoutContextType | null>(null);

const STORAGE_KEYS = {
  selectedClient: 'lyntos-selected-client',
  selectedPeriod: 'lyntos-selected-period',
};

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  // Fetch data from API - no mock fallback
  const { user, clients, periods: fetchedPeriods, loading, error, refreshPeriods, refreshClients: rawRefreshClients } = useLayoutData();

  const [periods, setPeriods] = useState<Period[]>(fetchedPeriods);
  const [selectedClient, setSelectedClientState] = useState<Client | null>(null);
  const [selectedPeriod, setSelectedPeriodState] = useState<Period | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [highlightSelectors, setHighlightSelectors] = useState(false);

  // Track initialization to prevent infinite loops
  const initializedRef = useRef(false);
  const refreshPeriodsRef = useRef(refreshPeriods);
  refreshPeriodsRef.current = refreshPeriods;

  // selectedClient ref — refreshClients callback'inde güncel değere erişim için
  const selectedClientRef = useRef(selectedClient);
  selectedClientRef.current = selectedClient;

  // ── refreshClients wrapper: API'den yeni listeyi aldıktan sonra selectedClient'ı validate et ──
  const refreshClients = useCallback(async () => {
    const updatedClients = await rawRefreshClients();
    // State henüz güncellenmemiş olabilir — dönen listeyi kullanarak hemen validate et
    const current = selectedClientRef.current;
    if (current && !updatedClients.find(c => c.id === current.id)) {
      console.log('[LayoutContext] refreshClients: selectedClient artık listede yok, temizleniyor:', current.id);
      setSelectedClientState(null);
      setSelectedPeriodState(null);
      setPeriods([]);
      try {
        localStorage.removeItem(STORAGE_KEYS.selectedClient);
        localStorage.removeItem(STORAGE_KEYS.selectedPeriod);
      } catch {
        // localStorage not available
      }
    }
  }, [rawRefreshClients]);

  // Update periods when fetched periods change
  useEffect(() => {
    if (fetchedPeriods.length > 0) {
      setPeriods(fetchedPeriods);
    }
  }, [fetchedPeriods]);

  // ── Dropdown validasyonu: Mükellef silindiğinde selectedClient temizle ──
  // loading=false olduğunda API yanıtı gelmiş demektir.
  // selectedClient listede yoksa → temizle (son mükellef silindiğinde clients=[] olur)
  useEffect(() => {
    if (loading) return; // API yanıtı henüz gelmedi
    if (selectedClient && !clients.find(c => c.id === selectedClient.id)) {
      console.log('[LayoutContext] selectedClient artık listede yok, temizleniyor:', selectedClient.id);
      setSelectedClientState(null);
      setSelectedPeriodState(null);
      setPeriods([]);
      try {
        localStorage.removeItem(STORAGE_KEYS.selectedClient);
        localStorage.removeItem(STORAGE_KEYS.selectedPeriod);
      } catch {
        // localStorage not available
      }
    }
  }, [clients, selectedClient, loading]);

  // Load from localStorage on mount (runs only once when clients are ready)
  useEffect(() => {
    if (initializedRef.current || clients.length === 0) return;
    initializedRef.current = true;
    setIsHydrated(true);

    try {
      const storedClientId = localStorage.getItem(STORAGE_KEYS.selectedClient);
      const storedPeriodId = localStorage.getItem(STORAGE_KEYS.selectedPeriod);

      if (storedClientId) {
        const client = clients.find(c => c.id === storedClientId);
        if (client) {
          setSelectedClientState(client);
          // Fetch periods for this client
          refreshPeriodsRef.current(client.id);
        }
      }

      if (storedPeriodId && fetchedPeriods.length > 0) {
        // Madde 1: period.code ile eşleştir (id dinamik, code sabit)
        const period = fetchedPeriods.find(p => p.code === storedPeriodId);
        if (period) setSelectedPeriodState(period);
      } else if (fetchedPeriods.length > 0) {
        // Default to current period
        const currentPeriod = fetchedPeriods.find(p => p.isCurrent);
        if (currentPeriod) setSelectedPeriodState(currentPeriod);
      }
    } catch {
      // localStorage not available (SSR)
    }
  }, [clients, fetchedPeriods]);

  // Handle hydration separately
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // When client changes, refresh periods for that client
  const setSelectedClient = useCallback((client: Client | null) => {
    setSelectedClientState(client);
    try {
      if (client) {
        localStorage.setItem(STORAGE_KEYS.selectedClient, client.id);
        // Fetch periods for the selected client
        refreshPeriods(client.id).then(() => {
          // After fetching, select the current period if available
          setPeriods(prev => {
            const currentPeriod = prev.find(p => p.isCurrent);
            if (currentPeriod) {
              setSelectedPeriodState(currentPeriod);
              // Madde 1: code kaydet (id dinamik değişiyor)
              localStorage.setItem(STORAGE_KEYS.selectedPeriod, currentPeriod.code);
            }
            return prev;
          });
        });
      } else {
        localStorage.removeItem(STORAGE_KEYS.selectedClient);
        // Clear periods when no client selected
        setPeriods([]);
      }
    } catch {
      // localStorage not available
    }
  }, [refreshPeriods]);

  const setSelectedPeriod = useCallback((period: Period | null) => {
    setSelectedPeriodState(period);
    try {
      if (period) {
        // Madde 1: code kaydet (id dinamik değişiyor, code sabit "2025-Q1" formatında)
        localStorage.setItem(STORAGE_KEYS.selectedPeriod, period.code);
      } else {
        localStorage.removeItem(STORAGE_KEYS.selectedPeriod);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  // Prevent hydration mismatch
  if (!isHydrated || loading) {
    return (
      <LayoutContext.Provider
        value={{
          user,
          selectedClient: null,
          selectedPeriod: null,
          clients,
          periods,
          loading,
          error,
          setSelectedClient,
          setSelectedPeriod,
          refreshPeriods,
          refreshClients,
          highlightSelectors,
          setHighlightSelectors,
        }}
      >
        {children}
      </LayoutContext.Provider>
    );
  }

  return (
    <LayoutContext.Provider
      value={{
        user,
        selectedClient,
        selectedPeriod,
        clients,
        periods,
        loading,
        error,
        setSelectedClient,
        setSelectedPeriod,
        refreshPeriods,
        refreshClients,
        highlightSelectors,
        setHighlightSelectors,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext(): LayoutContextType {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within LayoutProvider');
  }
  return context;
}
