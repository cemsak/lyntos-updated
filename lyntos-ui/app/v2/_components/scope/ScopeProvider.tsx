'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export interface DashboardScope {
  smmm_id: string;
  client_id: string;
  period: string;
  advanced: boolean;
}

interface ScopeContextValue {
  scope: DashboardScope;
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
  const isInitialMount = useRef(true);

  // Initialize from URL on mount
  useEffect(() => {
    const urlScope: DashboardScope = {
      smmm_id: searchParams.get('smmm') || searchParams.get('smmm_id') || '',
      client_id: searchParams.get('client') || searchParams.get('client_id') || '',
      period: searchParams.get('period') || '',
      advanced: searchParams.get('adv') === 'true',
    };

    // Try localStorage fallback if URL is empty
    if (!urlScope.smmm_id || !urlScope.client_id || !urlScope.period) {
      try {
        const stored = localStorage.getItem('lyntos_scope');
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<DashboardScope>;
          urlScope.smmm_id = urlScope.smmm_id || parsed.smmm_id || '';
          urlScope.client_id = urlScope.client_id || parsed.client_id || '';
          urlScope.period = urlScope.period || parsed.period || '';
        }
      } catch {
        // Ignore parse errors
      }
    }

    setScopeState(urlScope);
    setIsReady(true);
    isInitialMount.current = false;
  }, [searchParams]);

  // Sync scope changes to URL (separate effect to avoid setState-in-render)
  useEffect(() => {
    // Skip on initial mount to avoid unnecessary URL update
    if (isInitialMount.current || !isReady) return;

    const params = new URLSearchParams();
    if (scope.smmm_id) params.set('smmm', scope.smmm_id);
    if (scope.client_id) params.set('client', scope.client_id);
    if (scope.period) params.set('period', scope.period);
    if (scope.advanced) params.set('adv', 'true');

    const newUrl = `${pathname}?${params.toString()}`;
    const currentUrl = `${pathname}?${searchParams.toString()}`;

    // Only update if URL actually changed
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [scope, pathname, router, searchParams, isReady]);

  // Update scope without direct router call
  const setScope = useCallback((updates: Partial<DashboardScope>) => {
    setScopeState(prev => {
      const next = { ...prev, ...updates };
      // Save to localStorage
      localStorage.setItem('lyntos_scope', JSON.stringify(next));
      return next;
    });
  }, []);

  return <ScopeContext.Provider value={{ scope, setScope, isReady }}>{children}</ScopeContext.Provider>;
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
