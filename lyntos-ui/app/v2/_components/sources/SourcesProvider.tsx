'use client';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setSourceCache } from '../contracts/map';

interface Source {
  id: string;
  baslik: string;
  url?: string;
  code?: string;
  kategori?: string;
}

interface SourcesContextValue {
  sources: Source[];
  isLoaded: boolean;
  getSource: (id: string) => Source | undefined;
}

const SourcesContext = createContext<SourcesContextValue | null>(null);

export function SourcesProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchSources() {
      try {
        const token = localStorage.getItem('lyntos_token');
        if (!token) {
          console.warn('[SourcesProvider] No auth token found');
          setIsLoaded(true);
          return;
        }

        const response = await fetch('/api/v1/contracts/sources', {
          headers: { 'Authorization': token },
        });

        if (response.ok) {
          const json = await response.json();
          // Backend returns { data: { sources: [...] } }
          const sourceList = json.data?.sources || json.sources || [];

          // Map backend format to our interface
          const mapped: Source[] = sourceList.map((s: Record<string, unknown>) => ({
            id: String(s.id || ''),
            baslik: String(s.baslik || s.title || s.id || ''),
            url: s.canonical_url ? String(s.canonical_url) : s.url ? String(s.url) : undefined,
            code: s.tur ? String(s.tur) : s.code ? String(s.code) : undefined,
          }));

          setSources(mapped);

          // Populate the cache in map.ts
          setSourceCache(mapped);

          // Debug: log SRC-0034 specifically
          const src34 = mapped.find(s => s.id === 'SRC-0034');
          console.log('[SourcesProvider] SRC-0034:', src34);
          console.log('[SourcesProvider] Loaded', mapped.length, 'sources');
        } else {
          console.error('[SourcesProvider] Failed to fetch:', response.status);
        }
      } catch (error) {
        console.error('[SourcesProvider] Error:', error);
      } finally {
        setIsLoaded(true);
      }
    }

    fetchSources();
  }, []);

  const getSource = (id: string) => sources.find(s => s.id === id);

  return (
    <SourcesContext.Provider value={{ sources, isLoaded, getSource }}>
      {children}
    </SourcesContext.Provider>
  );
}

export function useSources() {
  const context = useContext(SourcesContext);
  if (!context) throw new Error('useSources must be used within SourcesProvider');
  return context;
}
