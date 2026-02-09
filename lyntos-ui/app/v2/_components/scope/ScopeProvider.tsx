'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useLayoutContext } from '../layout/useLayoutContext';
import type { Client, Period, User } from '../layout/types';

export interface DashboardScope {
  smmm_id: string;
  client_id: string;
  period: string;
  advanced: boolean;
}

interface ScopeContextValue {
  scope: DashboardScope;
  selectedClient: Client | null;
  selectedPeriod: Period | null;
  user: User | null;
  setScope: (updates: Partial<DashboardScope>) => void;
  isReady: boolean;
}

const DEFAULT_SCOPE: DashboardScope = { smmm_id: '', client_id: '', period: '', advanced: false };
const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [scope, setScopeState] = useState<DashboardScope>(DEFAULT_SCOPE);
  const [isReady, setIsReady] = useState(false);

  // LayoutContext'ten seçimleri al - BU KRİTİK BAĞLANTI!
  const { selectedClient, selectedPeriod, user } = useLayoutContext();

  // Track if we've done initial load - ONLY ONCE
  const hasInitialized = useRef(false);
  // Track if we're updating URL ourselves (to prevent re-reading)
  const isUpdatingUrl = useRef(false);

  // SMMM GÜVENİ: Boş başlat
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // URL parametrelerini temizle (varsa)
    const currentParams = new URLSearchParams(searchParams.toString());
    if (currentParams.has('smmm') || currentParams.has('client') || currentParams.has('period')) {
      router.replace(pathname, { scroll: false });
    }

    // Boş scope ile başla
    setScopeState(DEFAULT_SCOPE);
    setIsReady(true);
  }, []); // Empty dependency - run only once

  // LayoutContext değişikliklerini ScopeProvider'a senkronize et
  // Bu kritik! Header'daki dropdown seçimleri dashboard'a yansısın
  useEffect(() => {
    if (!isReady) return;

    // LYNTOS Sprint Fix: period.code kullan (2025-Q1 formatı)
    // period.id = CLIENT_048_5F970880_2025_Q1 (frontend internal)
    // period.code = 2025-Q1 (database formatı - API için kullan)
    const newScope: DashboardScope = {
      smmm_id: user?.id || '',  // SMMM ID = user ID
      client_id: selectedClient?.id || '',
      period: selectedPeriod?.code || '',  // code kullan, id değil!
      advanced: scope.advanced, // Mevcut değeri koru
    };

    // Sadece değişiklik varsa güncelle
    if (
      newScope.smmm_id !== scope.smmm_id ||
      newScope.client_id !== scope.client_id ||
      newScope.period !== scope.period
    ) {
      setScopeState(newScope);
    }
  }, [selectedClient, selectedPeriod, user, isReady]);

  // Sync scope changes to URL
  useEffect(() => {
    if (!isReady || !hasInitialized.current) return;

    const params = new URLSearchParams();
    if (scope.smmm_id) params.set('smmm', scope.smmm_id);
    if (scope.client_id) params.set('client', scope.client_id);
    if (scope.period) params.set('period', scope.period);
    if (scope.advanced) params.set('adv', 'true');

    const newUrl = `${pathname}?${params.toString()}`;
    const currentUrl = `${pathname}?${searchParams.toString()}`;

    // Only update if URL actually changed
    if (newUrl !== currentUrl) {
      isUpdatingUrl.current = true;
      router.replace(newUrl, { scroll: false });
      // Reset flag after a tick
      setTimeout(() => { isUpdatingUrl.current = false; }, 100);
    }
  }, [scope, pathname, router, searchParams, isReady]);

  // Update scope - this is the ONLY way to change scope after init
  const setScope = useCallback((updates: Partial<DashboardScope>) => {
    setScopeState(prev => {
      const next = { ...prev, ...updates };
      // Save to localStorage
      localStorage.setItem('lyntos_scope', JSON.stringify(next));
      return next;
    });
  }, []);

  return <ScopeContext.Provider value={{ scope, selectedClient, selectedPeriod, user, setScope, isReady }}>{children}</ScopeContext.Provider>;
}

export function useDashboardScope(): ScopeContextValue {
  const context = useContext(ScopeContext);
  if (!context) throw new Error('useDashboardScope must be used within ScopeProvider');
  return context;
}

export function useScopeComplete(): boolean {
  const { scope, isReady } = useDashboardScope();
  return isReady && Boolean(scope.smmm_id && scope.client_id && scope.period);
}

// SMMM GÜVENİ: Scope'u sıfırla (test ve debug için)
export function clearScopeStorage(): void {
  try {
    localStorage.removeItem('lyntos_scope');
  } catch {
    // Ignore
  }
}
