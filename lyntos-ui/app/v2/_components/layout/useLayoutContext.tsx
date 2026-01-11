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
  const { user, clients, periods: fetchedPeriods, loading, error, refreshPeriods } = useLayoutData();

  const [periods, setPeriods] = useState<Period[]>(fetchedPeriods);
  const [selectedClient, setSelectedClientState] = useState<Client | null>(null);
  const [selectedPeriod, setSelectedPeriodState] = useState<Period | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Track initialization to prevent infinite loops
  const initializedRef = useRef(false);
  const refreshPeriodsRef = useRef(refreshPeriods);
  refreshPeriodsRef.current = refreshPeriods;

  // Update periods when fetched periods change
  useEffect(() => {
    if (fetchedPeriods.length > 0) {
      setPeriods(fetchedPeriods);
    }
  }, [fetchedPeriods]);

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
        const period = fetchedPeriods.find(p => p.id === storedPeriodId);
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
              localStorage.setItem(STORAGE_KEYS.selectedPeriod, currentPeriod.id);
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
        localStorage.setItem(STORAGE_KEYS.selectedPeriod, period.id);
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
