'use client';

/**
 * LYNTOS Layout Context
 * Sprint 7.3 - Stripe Dashboard Shell
 * Provides global layout state: user, client, period
 */
import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, Client, Period, LayoutContextType } from './types';
import { MOCK_USER, MOCK_CLIENTS, MOCK_PERIODS } from './mockData';

const LayoutContext = createContext<LayoutContextType | null>(null);

const STORAGE_KEYS = {
  selectedClient: 'lyntos-selected-client',
  selectedPeriod: 'lyntos-selected-period',
};

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [user] = useState<User | null>(MOCK_USER);
  const [clients] = useState<Client[]>(MOCK_CLIENTS);
  const [periods] = useState<Period[]>(MOCK_PERIODS);
  const [selectedClient, setSelectedClientState] = useState<Client | null>(null);
  const [selectedPeriod, setSelectedPeriodState] = useState<Period | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setIsHydrated(true);

    try {
      const storedClientId = localStorage.getItem(STORAGE_KEYS.selectedClient);
      const storedPeriodId = localStorage.getItem(STORAGE_KEYS.selectedPeriod);

      if (storedClientId) {
        const client = clients.find(c => c.id === storedClientId);
        if (client) setSelectedClientState(client);
      }

      if (storedPeriodId) {
        const period = periods.find(p => p.id === storedPeriodId);
        if (period) setSelectedPeriodState(period);
      } else {
        // Default to current period
        const currentPeriod = periods.find(p => p.isCurrent);
        if (currentPeriod) setSelectedPeriodState(currentPeriod);
      }
    } catch {
      // localStorage not available (SSR)
    }
  }, [clients, periods]);

  const setSelectedClient = useCallback((client: Client | null) => {
    setSelectedClientState(client);
    try {
      if (client) {
        localStorage.setItem(STORAGE_KEYS.selectedClient, client.id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.selectedClient);
      }
    } catch {
      // localStorage not available
    }
  }, []);

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
  if (!isHydrated) {
    return (
      <LayoutContext.Provider
        value={{
          user,
          selectedClient: null,
          selectedPeriod: null,
          clients,
          periods,
          setSelectedClient,
          setSelectedPeriod,
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
        setSelectedClient,
        setSelectedPeriod,
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
